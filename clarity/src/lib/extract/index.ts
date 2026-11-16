/**
 * Text extraction. Everything here runs in the browser: the file's bytes are
 * read locally and never uploaded.
 */
import type { DocKind, ExtractedDocument } from "../types";
import { pagesToBlocks } from "../text";
import { itemsToText, type PdfTextItem } from "./pdf-layout";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".markdown"];
export const ACCEPT_ATTRIBUTE =
  ".pdf,.docx,.txt,.md,.markdown,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** An extraction problem with a message written for the person uploading. */
export class ExtractionError extends Error {
  constructor(
    message: string,
    public hint?: string,
  ) {
    super(message);
  }
}

export function detectKind(name: string, mime = ""): DocKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) return "docx";
  if (lower.endsWith(".md") || lower.endsWith(".markdown") || mime === "text/markdown") return "md";
  if (lower.endsWith(".txt") || mime === "text/plain") return "txt";
  return null;
}

export function validateFile(file: { name: string; size: number; type?: string }): DocKind {
  const kind = detectKind(file.name, file.type);
  if (!kind) {
    if (/\.doc$/i.test(file.name)) {
      throw new ExtractionError("Old Word .doc files are not supported.", "Open it in Word or Google Docs and save it as .docx or PDF, then try again.");
    }
    if (/\.(png|jpe?g|heic|webp|tiff?)$/i.test(file.name)) {
      throw new ExtractionError("Images cannot be read.", "Clarity reads text, not pictures of text. Use a PDF with selectable text, or a DOCX/TXT file.");
    }
    throw new ExtractionError("This file type is not supported.", "Clarity reads PDF, DOCX, TXT and Markdown files.");
  }
  if (file.size === 0) throw new ExtractionError("This file is empty.");
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractionError("This file is larger than 25 MB.", "Try splitting it or exporting a smaller version.");
  }
  return kind;
}

/** Build the final document from per-page text. Shared by all formats. */
export function assemble(name: string, kind: DocKind, size: number, pages: string[], paged: boolean, warnings: string[] = []): ExtractedDocument {
  const blocks = pagesToBlocks(pages);
  const charCount = blocks.reduce((n, b) => n + b.text.length, 0);
  if (charCount < 20) {
    throw new ExtractionError("No readable text was found in this file.", "The file seems to be empty or contains only images.");
  }
  return { name, kind, size, pageCount: paged ? pages.length : 1, paged, blocks, charCount, warnings };
}

async function extractPdf(file: File): Promise<{ pages: string[]; warnings: string[] }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "PasswordException") {
      throw new ExtractionError("This PDF is password-protected.", "Remove the password (for example by printing it to a new PDF) and try again.");
    }
    throw new ExtractionError("This PDF could not be opened.", "The file may be damaged. Try re-downloading or re-exporting it.");
  }

  const pages: string[] = [];
  const emptyPages: number[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = itemsToText(content.items as unknown as PdfTextItem[]);
      if (text.replace(/\s/g, "").length < 8) emptyPages.push(i);
      pages.push(text);
    }
  } finally {
    void pdf.loadingTask.destroy();
  }

  const warnings: string[] = [];
  if (emptyPages.length === pages.length) {
    throw new ExtractionError(
      "This PDF contains scanned images, not text.",
      "Clarity cannot read scanned pages because text recognition (OCR) is not available. Run the file through an OCR tool first, or use the original digital document.",
    );
  }
  if (emptyPages.length) {
    warnings.push(
      `No text could be read on page${emptyPages.length === 1 ? "" : "s"} ${formatPages(emptyPages)} (probably scanned images). Nothing from ${emptyPages.length === 1 ? "that page" : "those pages"} is included in the analysis.`,
    );
  }
  return { pages, warnings };
}

function formatPages(pages: number[]): string {
  return pages.length > 8 ? `${pages.slice(0, 8).join(", ")} and ${pages.length - 8} more` : pages.join(", ");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  } catch {
    throw new ExtractionError("This Word document could not be read.", "Make sure it is a .docx file and not password-protected.");
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^```[\s\S]*?^```/gm, (code) => code.replace(/^```.*$/gm, ""))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/gm, "");
}

export async function extractDocument(file: File): Promise<ExtractedDocument> {
  const kind = validateFile(file);
  if (kind === "pdf") {
    const { pages, warnings } = await extractPdf(file);
    return assemble(file.name, kind, file.size, pages, true, warnings);
  }
  if (kind === "docx") {
    return assemble(file.name, kind, file.size, [await extractDocx(file)], false);
  }
  const raw = await file.text();
  if (raw.includes("\u0000")) throw new ExtractionError("This file does not look like plain text.", "It may be a binary file with a .txt extension.");
  return assemble(file.name, kind, file.size, [kind === "md" ? stripMarkdown(raw) : raw], false);
}

import type { Block } from "./types";

/** Collapse whitespace and unify typographic quotes/dashes for comparisons. */
export function normalize(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEADING_MAX = 90;

export function looksLikeHeading(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > HEADING_MAX || t.includes("\n")) return false;
  if (/^#{1,6}\s/.test(t)) return true;
  if (/[.;,]$/.test(t)) return false;
  if (/^(section|article|clause|part|schedule|appendix|annex)\s+[\divxlc]+/i.test(t)) return true;
  if (/^\d+(\.\d+)*\.?\s+\p{Lu}/u.test(t) && t.split(/\s+/).length <= 9) return true;
  const letters = t.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return true;
  return false;
}

/**
 * Split raw page text into paragraph blocks. Paragraphs are separated by blank
 * lines; single line breaks inside a paragraph are joined (PDF line wrapping),
 * except for list items and headings, which stay on their own.
 */
export function pagesToBlocks(pages: string[]): Block[] {
  const blocks: Block[] = [];
  let id = 1;
  pages.forEach((pageText, i) => {
    const paragraphs = pageText.replace(/\r\n?/g, "\n").split(/\n\s*\n+/);
    for (const para of paragraphs) {
      for (const piece of splitParagraph(para)) {
        const text = piece.trim();
        if (!text) continue;
        const heading = looksLikeHeading(text);
        blocks.push({
          id: id++,
          page: i + 1,
          text: text.replace(/^#{1,6}\s+/, ""),
          ...(heading ? { heading: true } : {}),
        });
      }
    }
  });
  return blocks;
}

const LIST_ITEM = /^\s*(?:[-*•▪◦–]|\(?[a-z\d]{1,3}[.)])\s+/i;

function splitParagraph(para: string): string[] {
  const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  let current = "";
  const flush = () => {
    if (current) out.push(current);
    current = "";
  };
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line) || (looksLikeHeading(line) && !current)) {
      flush();
      out.push(line);
    } else if (LIST_ITEM.test(line)) {
      flush();
      current = line;
    } else {
      current = current ? `${current} ${line}` : line;
    }
  }
  flush();
  return out;
}

export interface Sentence {
  text: string;
  blockId: number;
  page: number;
  /** Index of the sentence within the whole document. */
  index: number;
  heading: boolean;
}

const ABBREVIATIONS =
  /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|No|Nos|Art|Sec|Inc|Ltd|Co|Corp|vs|etc|e\.g|i\.e|approx|est|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|p|pp|para|cl)\.$/i;

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const re = /[.!?]+["')\]]?\s+(?=["'(\[]?[\p{Lu}\d])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].trimEnd().length;
    const candidate = text.slice(start, end);
    // Do not split after abbreviations, single initials or list numbering.
    if (ABBREVIATIONS.test(candidate) || /(?:^|\s)\p{Lu}\.$/u.test(candidate) || /^\s*\(?\d{1,3}[.)]$/.test(candidate)) {
      continue;
    }
    out.push(candidate.trim());
    start = m.index + m[0].length;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

export function toSentences(blocks: Block[]): Sentence[] {
  const sentences: Sentence[] = [];
  let index = 0;
  for (const b of blocks) {
    const parts = b.heading ? [b.text] : splitSentences(b.text);
    for (const text of parts) {
      sentences.push({ text, blockId: b.id, page: b.page, index: index++, heading: !!b.heading });
    }
  }
  return sentences;
}

const STOPWORDS = new Set(
  "a an and are as at be been being but by can could did do does for from had has have he her his i if in into is it its may me might my no nor not of on or our shall she should so such than that the their them then there these they this those to under upon was we were what when where which who whom whose why will with would you your yours about above after again all also any because before below between both during each few further here how more most other out over own same some too until up very must".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return (normalize(text).toLowerCase().match(/[\p{L}\p{N}]+(?:'[\p{L}]+)?/gu) ?? []).map(stem);
}

export function contentTokens(text: string): string[] {
  return tokenize(text).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** A deliberately light stemmer: enough to match plurals and common verb forms. */
export function stem(word: string): string {
  let w = word.replace(/'s$/, "");
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("sses")) return w.slice(0, -2);
  if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("es") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) w = w.slice(0, -1);
  if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
  // "submitt" -> "submit", "paymen" stays
  if (/([bdfglmnprt])\1$/.test(w)) w = w.slice(0, -1);
  return w;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).replace(/[,;:\s]+$/, "")}…`;
}

/**
 * Locate a quote inside the document. Returns the block containing it, or
 * undefined when the quote is not present (ignoring whitespace/quote style).
 * Used to verify that citations returned by an AI model really exist.
 */
export function findQuote(blocks: Block[], quote: string, pageHint?: number): Block | undefined {
  const q = normalize(quote).toLowerCase().replace(/^["'…. ]+|["'…. ]+$/g, "");
  if (q.length < 8) return undefined;
  const ordered = pageHint ? [...blocks].sort((a, b) => Number(b.page === pageHint) - Number(a.page === pageHint)) : blocks;
  for (const b of ordered) {
    if (normalize(b.text).toLowerCase().includes(q)) return b;
  }
  // Model quotes sometimes use an ellipsis to skip text: require every part.
  const parts = q.split(/\s*(?:\.\.\.|…|\[\.\.\.\])\s*/).filter((p) => p.length >= 8);
  if (parts.length > 1) {
    for (const b of ordered) {
      const t = normalize(b.text).toLowerCase();
      if (parts.every((p) => t.includes(p))) return b;
    }
  }
  return undefined;
}

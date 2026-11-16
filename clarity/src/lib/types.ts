/**
 * Core data model for Clarity.
 *
 * Every piece of information shown to the user carries a `basis` describing
 * where it came from, and (wherever possible) a `source` pointing at the exact
 * passage of the document that supports it.
 */

/** How a piece of information relates to the document. */
export type Basis =
  /** Quoted or directly restated from the document. */
  | "stated"
  /** A reading, paraphrase or general explanation produced by the engine. */
  | "interpreted"
  /** Could not be confirmed against the text, or is ambiguous. Check the source. */
  | "verify";

export type DocKind = "pdf" | "docx" | "txt" | "md";

export type EngineId = "local" | "claude";

/** A paragraph-sized unit of the extracted document text. */
export interface Block {
  /** Sequential id, also used as the paragraph number (1-based). */
  id: number;
  /** 1-based page number. Always 1 for formats without pages. */
  page: number;
  text: string;
  heading?: boolean;
}

export interface SourceRef {
  blockId: number;
  page: number;
  /** Verbatim passage from the document. */
  quote: string;
}

export interface Insight {
  id: string;
  text: string;
  basis: Basis;
  source?: SourceRef;
  /** Optional short explanation, e.g. why something needs verification. */
  note?: string;
}

export type Priority = "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  detail: string;
  /** ISO date (yyyy-mm-dd), only when the document gives a concrete date. */
  due?: string;
  /** The deadline wording as it appears in the document. */
  dueText?: string;
  priority: Priority;
  done: boolean;
  doneAt?: string;
  basis: Basis;
  source?: SourceRef;
  note?: string;
}

export type DateKind = "deadline" | "event";

export interface DateItem {
  id: string;
  /** ISO date (yyyy-mm-dd). Absent for relative deadlines ("within 30 days"). */
  iso?: string;
  /** The date wording as written in the document. */
  raw: string;
  /** What the date is about. */
  label: string;
  kind: DateKind;
  basis: Basis;
  source?: SourceRef;
  note?: string;
  starred: boolean;
  done: boolean;
  /** Linked task, when the deadline belongs to an extracted action. */
  taskId?: string;
}

export interface Term {
  id: string;
  term: string;
  definition: string;
  /** "stated" when the document itself defines the term. */
  basis: Basis;
  source?: SourceRef;
}

export interface Analysis {
  engine: EngineId;
  createdAt: string;
  docType: string;
  understand: {
    purpose: Insight;
    summary: Insight[];
    keyPoints: Insight[];
  };
  tasks: Task[];
  dates: DateItem[];
  details: {
    requirements: Insight[];
    conditions: Insight[];
    documentsNeeded: Insight[];
    dontOverlook: Insight[];
  };
  glossary: Term[];
}

export interface Citation {
  page: number;
  blockId: number;
  quote: string;
}

export interface QAMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  /** Assistant only. False when the document does not answer the question. */
  answerable?: boolean;
  citations?: Citation[];
  engine?: EngineId;
  /** Citations the engine returned that could not be found in the document. */
  droppedCitations?: number;
}

export interface StoredDocument {
  id: string;
  name: string;
  kind: DocKind;
  size: number;
  addedAt: string;
  pageCount: number;
  /** True when the format has real pages (PDF). Otherwise we cite paragraphs. */
  paged: boolean;
  blocks: Block[];
  charCount: number;
  warnings: string[];
  isSample?: boolean;
  /** True once the user has agreed to send this document's text to Claude. */
  cloudConsent?: boolean;
  analysis: Analysis;
  qa: QAMessage[];
}

export interface ExtractedDocument {
  name: string;
  kind: DocKind;
  size: number;
  pageCount: number;
  paged: boolean;
  blocks: Block[];
  charCount: number;
  warnings: string[];
}

/** Human readable locator for a source: "p. 3" for PDFs, "¶ 12" otherwise. */
export function locator(doc: Pick<StoredDocument, "paged">, ref: { page: number; blockId: number }): string {
  return doc.paged ? `p. ${ref.page}` : `¶ ${ref.blockId}`;
}

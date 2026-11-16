/**
 * Grounding: turns raw model output into Clarity's data model while checking
 * every quoted passage against the actual document text.
 *
 * A model can misquote or invent a citation. Anything we cannot find in the
 * document is downgraded to "verify" (or dropped, for Q&A citations) so that a
 * guess is never presented as a fact.
 */
import type { Analysis, Basis, Block, Citation, DateItem, Insight, SourceRef, Task, Term } from "../types";
import { findQuote, truncate } from "../text";
import { NOT_ENOUGH } from "../qa/local";
import type { ModelAnalysis, ModelAnswer } from "./schema";

const UNMATCHED = "The quoted passage could not be matched to the document text. Check the source paragraph.";
const NO_SOURCE = "No supporting passage could be located in the document.";

let n = 0;
const uid = (p: string) => `${p}-c${(n++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

interface Grounded {
  source?: SourceRef;
  /** exact = quote found; block = only the paragraph exists; none = nothing matched. */
  match: "exact" | "block" | "none";
}

export function ground(blocks: Block[], paragraph: number, quote: string): Grounded {
  const hinted = blocks.find((b) => b.id === paragraph);
  const found = findQuote(blocks, quote, hinted?.page);
  if (found) return { source: { blockId: found.id, page: found.page, quote: quote.trim() }, match: "exact" };
  if (hinted) return { source: { blockId: hinted.id, page: hinted.page, quote: truncate(hinted.text, 320) }, match: "block" };
  return { match: "none" };
}

function resolveBasis(claimed: Basis, g: Grounded): { basis: Basis; note?: string } {
  if (g.match === "exact") return { basis: claimed };
  if (g.match === "block") return { basis: "verify", note: UNMATCHED };
  return { basis: "verify", note: NO_SOURCE };
}

function validIso(value: string | null | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? value : undefined;
}

export function groundAnalysis(model: ModelAnalysis, blocks: Block[], now: Date = new Date()): Analysis {
  const toInsight = (i: ModelAnalysis["summary"][number]): Insight => {
    const g = ground(blocks, i.paragraph, i.quote);
    const { basis, note } = resolveBasis(i.basis, g);
    return { id: uid("i"), text: i.text, basis, ...(g.source ? { source: g.source } : {}), ...(note ? { note } : {}) };
  };

  const tasks: Task[] = model.tasks.map((t) => {
    const g = ground(blocks, t.paragraph, t.quote);
    const due = validIso(t.dueDate);
    // A model-written title and explanation is an interpretation of the passage.
    const resolved = resolveBasis("interpreted", g);
    return {
      id: uid("t"),
      title: t.title,
      detail: t.detail,
      ...(due ? { due } : {}),
      ...(t.dueText ? { dueText: t.dueText } : {}),
      priority: t.priority,
      done: false,
      basis: resolved.basis,
      ...(g.source ? { source: g.source } : {}),
      ...(resolved.note ? { note: resolved.note } : {}),
    };
  });

  const dates: DateItem[] = model.dates.map((d) => {
    const g = ground(blocks, d.paragraph, d.quote);
    const iso = validIso(d.date);
    let basis: Basis = "stated";
    let note: string | undefined;
    if (g.match !== "exact") ({ basis, note } = resolveBasis("stated", g));
    else if (d.yearAssumed) {
      basis = "verify";
      note = "The document does not state the year; it was inferred.";
    } else if (!iso) note = "Relative deadline: work out the calendar date from the event it refers to.";
    const linked = iso ? tasks.find((t) => t.due === iso && t.source?.blockId === g.source?.blockId) : undefined;
    return {
      id: uid("d"),
      ...(iso ? { iso } : {}),
      raw: d.raw,
      label: d.label,
      kind: d.kind,
      basis,
      ...(g.source ? { source: g.source } : {}),
      ...(note ? { note } : {}),
      starred: false,
      done: false,
      ...(linked ? { taskId: linked.id } : {}),
    };
  });

  const glossary: Term[] = model.glossary.map((t) => {
    const g = ground(blocks, t.paragraph, t.quote);
    const claimed: Basis = t.definedInDocument ? "stated" : "interpreted";
    // A general definition stays an interpretation even if the citation is off;
    // a claimed in-document definition must be verifiable.
    const basis: Basis = claimed === "stated" && g.match !== "exact" ? "verify" : claimed;
    return { id: uid("g"), term: t.term, definition: t.definition, basis, ...(g.source ? { source: g.source } : {}) };
  });

  return {
    engine: "claude",
    createdAt: now.toISOString(),
    docType: model.docType,
    understand: {
      purpose: toInsight(model.purpose),
      summary: model.summary.map(toInsight),
      keyPoints: model.keyPoints.map(toInsight),
    },
    tasks,
    dates,
    details: {
      requirements: model.requirements.map(toInsight),
      conditions: model.conditions.map(toInsight),
      documentsNeeded: model.documentsNeeded.map(toInsight),
      dontOverlook: model.dontOverlook.map(toInsight),
    },
    glossary,
  };
}

export interface GroundedAnswer {
  answerable: boolean;
  text: string;
  citations: Citation[];
  droppedCitations: number;
}

export function groundAnswer(model: ModelAnswer, blocks: Block[]): GroundedAnswer {
  const citations: Citation[] = [];
  let dropped = 0;
  for (const c of model.citations) {
    const found = findQuote(blocks, c.quote, blocks.find((b) => b.id === c.paragraph)?.page);
    if (found) citations.push({ page: found.page, blockId: found.id, quote: c.quote.trim() });
    else dropped++;
  }
  if (!model.answerable) {
    return { answerable: false, text: model.answer.trim() || NOT_ENOUGH, citations: [], droppedCitations: dropped };
  }
  // An answer with no verifiable support is not presented as grounded.
  if (citations.length === 0) {
    return {
      answerable: false,
      text: `${NOT_ENOUGH} An answer was generated, but none of its supporting quotes could be found in the document, so it is not shown.`,
      citations: [],
      droppedCitations: dropped,
    };
  }
  return { answerable: true, text: model.answer.trim(), citations, droppedCitations: dropped };
}

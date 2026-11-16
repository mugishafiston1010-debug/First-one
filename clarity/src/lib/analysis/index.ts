/**
 * The AI service layer as seen by the UI. Two interchangeable engines:
 *  - "local":  rule-based, runs in the browser, nothing leaves the device.
 *  - "claude": sends the document text to this app's server, which calls the
 *              Anthropic API. Only used after the user explicitly agrees.
 */
import type { Analysis, Block, Citation, EngineId, QAMessage } from "../types";
import type { GroundedAnswer } from "../ai/ground";
import { answerLocally } from "../qa/local";
import { analyzeLocally } from "./local";

export interface EngineDocument {
  name: string;
  paged: boolean;
  blocks: Block[];
}

export interface Answer {
  answerable: boolean;
  text: string;
  citations: Citation[];
  droppedCitations?: number;
}

export class EngineError extends Error {}

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new EngineError("Could not reach the Clarity server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) throw new EngineError(data?.error ?? `The server returned an error (${res.status}).`);
  return data;
}

export async function analyze(doc: EngineDocument, engine: EngineId): Promise<Analysis> {
  if (engine === "local") return analyzeLocally(doc.blocks);
  const { analysis } = await post<{ analysis: Analysis }>("/api/analyze", { name: doc.name, paged: doc.paged, blocks: doc.blocks });
  return analysis;
}

export async function ask(doc: EngineDocument, question: string, history: QAMessage[], engine: EngineId): Promise<Answer> {
  if (engine === "local") return answerLocally(doc.blocks, question);
  const { answer } = await post<{ answer: GroundedAnswer }>("/api/ask", {
    name: doc.name,
    paged: doc.paged,
    blocks: doc.blocks,
    question,
    history: history.slice(-8).map((m) => ({ role: m.role, text: m.text })),
  });
  return answer;
}

export interface EngineStatus {
  claude: boolean;
  model: string | null;
}

export async function fetchStatus(): Promise<EngineStatus> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    if (!res.ok) return { claude: false, model: null };
    return (await res.json()) as EngineStatus;
  } catch {
    return { claude: false, model: null };
  }
}

/**
 * Shapes shared by the browser and the server for the optional Claude engine.
 * `Model*` schemas describe what the model must return; `*Request` schemas
 * validate what the browser sends to our API routes.
 */
import { z } from "zod";

export const MAX_DOCUMENT_CHARS = 600_000;
export const MAX_QUESTION_CHARS = 1_000;

const BlockSchema = z.object({
  id: z.number().int().positive(),
  page: z.number().int().positive(),
  text: z.string().min(1).max(20_000),
  heading: z.boolean().optional(),
});

const DocumentPayload = z.object({
  name: z.string().min(1).max(300),
  paged: z.boolean(),
  blocks: z.array(BlockSchema).min(1).max(8_000),
});

export const AnalyzeRequest = DocumentPayload;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

export const AskRequest = DocumentPayload.extend({
  question: z.string().trim().min(2).max(MAX_QUESTION_CHARS),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(8_000) }))
    .max(12)
    .default([]),
});
export type AskRequest = z.infer<typeof AskRequest>;

// ---- What the model returns ----------------------------------------------

const basis = z.enum(["stated", "interpreted"]).describe("stated = the document says this directly; interpreted = your own reading or explanation");
const paragraph = z.number().int().describe("The paragraph number (the ¶ id) that supports this item");
const quote = z.string().describe("A short passage copied character-for-character from that paragraph");

const ModelInsight = z.object({ text: z.string(), basis, paragraph, quote });

export const ModelAnalysis = z.object({
  docType: z.string().describe("Short label for the kind of document, e.g. 'Residential lease agreement'"),
  purpose: ModelInsight.describe("One or two plain sentences: what this document is and why the reader received it"),
  summary: z.array(ModelInsight).describe("3-6 plain-language sentences explaining the document to a non-expert"),
  keyPoints: z.array(ModelInsight).describe("The most important facts the reader should know"),
  tasks: z.array(
    z.object({
      title: z.string().describe("Imperative, under 10 words"),
      detail: z.string().describe("One or two sentences: what exactly to do and why"),
      dueDate: z.string().nullable().describe("yyyy-mm-dd, ONLY if the document states a concrete calendar date for this task; otherwise null"),
      dueText: z.string().nullable().describe("The deadline wording exactly as written in the document, or null"),
      priority: z.enum(["high", "medium", "low"]),
      paragraph,
      quote,
    }),
  ),
  dates: z.array(
    z.object({
      date: z.string().nullable().describe("yyyy-mm-dd, or null for relative deadlines such as 'within 30 days'"),
      raw: z.string().describe("The date wording exactly as written"),
      label: z.string().describe("What happens on / by this date, under 12 words"),
      kind: z.enum(["deadline", "event"]),
      yearAssumed: z.boolean().describe("true if the document does not state the year and you inferred it"),
      paragraph,
      quote,
    }),
  ),
  requirements: z.array(ModelInsight),
  conditions: z.array(ModelInsight),
  documentsNeeded: z.array(ModelInsight).describe("Documents or items the reader must provide or bring"),
  dontOverlook: z.array(ModelInsight).describe("Penalties, fees, automatic renewals, forfeitures and other easily missed consequences"),
  glossary: z.array(
    z.object({
      term: z.string(),
      definition: z.string().describe("Plain-language meaning in one sentence"),
      definedInDocument: z.boolean().describe("true only if the document itself defines the term"),
      paragraph,
      quote,
    }),
  ),
});
export type ModelAnalysis = z.infer<typeof ModelAnalysis>;

export const ModelAnswer = z.object({
  answerable: z.boolean().describe("false if the document does not contain enough information to answer"),
  answer: z.string().describe("The answer in plain language. If not answerable, say what is missing."),
  citations: z.array(z.object({ paragraph, quote })).describe("Passages that support the answer. Empty when not answerable."),
});
export type ModelAnswer = z.infer<typeof ModelAnswer>;

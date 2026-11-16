import { describe, expect, it } from "vitest";
import { pagesToBlocks } from "../text";
import { groundAnalysis, groundAnswer } from "./ground";
import { AnalyzeRequest, AskRequest, MAX_QUESTION_CHARS, type ModelAnalysis } from "./schema";
import { renderDocument } from "./server";

const blocks = pagesToBlocks([
  "Parking notice\n\nYour permit expires on 30 June 2027. You must pay the fee of $120 no later than 15 June 2027.",
  "If the permit is not renewed, vehicles may be fined $60 per day.",
]);
const feeBlock = blocks.find((b) => b.text.includes("$120"))!;

const insight = (text: string, quote: string, paragraph = feeBlock.id, basis: "stated" | "interpreted" = "stated") => ({ text, basis, paragraph, quote });

const model: ModelAnalysis = {
  docType: "Parking notice",
  purpose: insight("Your parking permit is about to expire.", "Your permit expires on 30 June 2027", feeBlock.id, "interpreted"),
  summary: [insight("You have to pay $120.", "pay the fee of $120")],
  keyPoints: [insight("The fee is $500.", "the fee is five hundred dollars")],
  tasks: [
    { title: "Pay the renewal fee", detail: "Pay $120.", dueDate: "2027-06-15", dueText: "no later than 15 June 2027", priority: "high", paragraph: feeBlock.id, quote: "You must pay the fee of $120 no later than 15 June 2027." },
    { title: "Call the office", detail: "Invented.", dueDate: "2027-02-31", dueText: null, priority: "low", paragraph: 999, quote: "Please call the office" },
  ],
  dates: [
    { date: "2027-06-15", raw: "15 June 2027", label: "Pay the fee", kind: "deadline", yearAssumed: false, paragraph: feeBlock.id, quote: "no later than 15 June 2027" },
    { date: "2027-07-01", raw: "1 July", label: "Hearing", kind: "event", yearAssumed: false, paragraph: 999, quote: "hearing on 1 July" },
  ],
  requirements: [],
  conditions: [insight("A fine applies if you do not renew.", "vehicles may be fined  $60 per day", 1)],
  documentsNeeded: [],
  dontOverlook: [],
  glossary: [
    { term: "Permit", definition: "Official permission.", definedInDocument: false, paragraph: feeBlock.id, quote: "Your permit expires" },
    { term: "Zone", definition: "An area.", definedInDocument: true, paragraph: 999, quote: "Zone means the area" },
  ],
};

describe("grounding model output", () => {
  const analysis = groundAnalysis(model, blocks);

  it("keeps the claimed basis when the quote is in the document", () => {
    expect(analysis.understand.summary[0]).toMatchObject({ basis: "stated", source: { blockId: feeBlock.id, page: 1 } });
    expect(analysis.understand.purpose.basis).toBe("interpreted");
  });

  it("downgrades a fabricated quote to 'verify' and explains why", () => {
    expect(analysis.understand.keyPoints[0].basis).toBe("verify");
    expect(analysis.understand.keyPoints[0].note).toMatch(/could not be matched/);
  });

  it("finds a quote on another page than the model claimed, ignoring whitespace", () => {
    expect(analysis.details.conditions[0]).toMatchObject({ basis: "stated", source: { page: 2 } });
  });

  it("never shows a model-written task as a direct statement", () => {
    expect(analysis.tasks[0]).toMatchObject({ basis: "interpreted", due: "2027-06-15" });
  });

  it("drops impossible dates and flags unsupported items", () => {
    expect(analysis.tasks[1].due).toBeUndefined();
    expect(analysis.tasks[1]).toMatchObject({ basis: "verify" });
    expect(analysis.tasks[1].source).toBeUndefined();
    expect(analysis.dates[1]).toMatchObject({ basis: "verify" });
  });

  it("links a verified deadline to its task", () => {
    expect(analysis.dates[0]).toMatchObject({ basis: "stated", taskId: analysis.tasks[0].id });
  });

  it("requires proof for definitions attributed to the document", () => {
    expect(analysis.glossary[0].basis).toBe("interpreted");
    expect(analysis.glossary[1].basis).toBe("verify");
  });
});

describe("grounding answers", () => {
  it("keeps verified citations and counts removed ones", () => {
    const a = groundAnswer(
      { answerable: true, answer: "The fee is $120.", citations: [{ paragraph: feeBlock.id, quote: "pay the fee of $120" }, { paragraph: 1, quote: "the fee can be waived on request" }] },
      blocks,
    );
    expect(a).toMatchObject({ answerable: true, droppedCitations: 1 });
    expect(a.citations).toEqual([{ page: 1, blockId: feeBlock.id, quote: "pay the fee of $120" }]);
  });

  it("withholds an answer whose every quote is fabricated", () => {
    const a = groundAnswer({ answerable: true, answer: "You can park anywhere.", citations: [{ paragraph: 1, quote: "parking is allowed everywhere" }] }, blocks);
    expect(a.answerable).toBe(false);
    expect(a.text).not.toContain("park anywhere");
    expect(a.text).toMatch(/does not provide enough information/);
  });

  it("passes through an honest 'not in the document'", () => {
    const a = groundAnswer({ answerable: false, answer: "The document does not say who to call.", citations: [] }, blocks);
    expect(a).toMatchObject({ answerable: false, text: "The document does not say who to call.", citations: [] });
  });
});

describe("request validation and prompt rendering", () => {
  const doc = { name: "notice.pdf", paged: true, blocks };

  it("accepts a well-formed request and rejects malformed ones", () => {
    expect(AnalyzeRequest.safeParse(doc).success).toBe(true);
    expect(AnalyzeRequest.safeParse({ ...doc, blocks: [] }).success).toBe(false);
    expect(AskRequest.safeParse({ ...doc, question: "x".repeat(MAX_QUESTION_CHARS + 1) }).success).toBe(false);
    expect(AskRequest.safeParse({ ...doc, question: "When is it due?" }).success).toBe(true);
  });

  it("numbers paragraphs and pages for the model", () => {
    const rendered = renderDocument(doc.name, true, blocks);
    expect(rendered).toContain(`[¶${feeBlock.id} · page 1]`);
    expect(renderDocument(doc.name, false, blocks)).not.toContain("page 1");
  });
});

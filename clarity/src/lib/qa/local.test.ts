import { describe, expect, it } from "vitest";
import { SAMPLE_SOURCES, buildSample } from "../samples";
import { findQuote, pagesToBlocks } from "../text";
import { NOT_ENOUGH, answerLocally } from "./local";

const now = new Date(2026, 10, 16);
const lease = buildSample(SAMPLE_SOURCES[0], now).blocks;
const offer = buildSample(SAMPLE_SOURCES[2], now).blocks;

describe("on-device question answering", () => {
  it.each([
    ["How much is the security deposit?", /\$2,175/],
    ["Can I have a pet?", /Pets are permitted only if/],
    ["When is the first rent due?", /no later than 30 November 2026/],
    ["What happens if I pay rent late?", /late fee of \$75/],
    ["How do I end the lease early?", /early termination fee/],
    ["Can I smoke?", /Smoking is prohibited/],
  ])("answers %s from the text", (question, expected) => {
    const r = answerLocally(lease, question);
    expect(r.answerable).toBe(true);
    expect(r.text).toMatch(expected);
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it("treats 'due' as a request for a date, not a word to find", () => {
    const blocks = pagesToBlocks(["Travel policy\n\nReceipts must be uploaded to the finance portal by 20 February 2027. Expenses without receipts will not be reimbursed."]);
    const r = answerLocally(blocks, "When are receipts due?");
    expect(r.answerable).toBe(true);
    expect(r.text).toMatch(/20 February 2027/);
  });

  it("answers from a different document too", () => {
    expect(answerLocally(offer, "What is the salary?").text).toMatch(/\$64,000/);
    expect(answerLocally(offer, "How many days of annual leave do I get?").text).toMatch(/25 days/);
  });

  it.each(["What is the wifi password?", "Is there a swimming pool?", "Who is the president of France?", "Does the apartment have a parking garage?"])(
    "says the document does not answer: %s",
    (question) => {
      const r = answerLocally(lease, question);
      expect(r.answerable).toBe(false);
      expect(r.text).toContain(NOT_ENOUGH);
    },
  );

  it("only ever cites passages that exist in the document, with the right page", () => {
    for (const q of ["How much is the rent?", "When does the tenancy start?", "What must I provide before moving in?"]) {
      for (const c of answerLocally(lease, q).citations) {
        const block = findQuote(lease, c.quote);
        expect(block).toBeDefined();
        expect(block!.page).toBe(c.page);
      }
    }
  });

  it("refuses questions with nothing to search for", () => {
    expect(answerLocally(lease, "what is it?").answerable).toBe(false);
    expect(answerLocally([], "How much is the rent?").answerable).toBe(false);
  });
});

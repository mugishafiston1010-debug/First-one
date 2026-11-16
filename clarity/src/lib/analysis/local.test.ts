import { describe, expect, it } from "vitest";
import { SAMPLE_SOURCES, buildSample } from "../samples";
import { findQuote, pagesToBlocks } from "../text";
import type { Analysis, Block, Insight } from "../types";
import { analyzeLocally } from "./local";

const now = new Date(2026, 10, 16);
const analyse = (text: string) => analyzeLocally(pagesToBlocks(text.split("\f")), { now });

function everySource(a: Analysis): Array<{ blockId: number; page: number; quote: string }> {
  const insights: Insight[] = [a.understand.purpose, ...a.understand.summary, ...a.understand.keyPoints, ...Object.values(a.details).flat()];
  return [...insights, ...a.tasks, ...a.dates, ...a.glossary].flatMap((x) => (x.source ? [x.source] : []));
}

describe("on-device analysis of the sample documents", () => {
  const samples = SAMPLE_SOURCES.map((s) => {
    const doc = buildSample(s, now);
    return { name: s.name, blocks: doc.blocks as Block[], analysis: analyzeLocally(doc.blocks, { now }) };
  });

  it.each(samples)("$name: every source quote exists verbatim in the document", ({ blocks, analysis }) => {
    const sources = everySource(analysis);
    expect(sources.length).toBeGreaterThan(20);
    for (const s of sources) {
      const block = findQuote(blocks, s.quote);
      expect(block, `quote not found: ${s.quote}`).toBeDefined();
      expect(blocks.find((b) => b.id === s.blockId)?.page).toBe(s.page);
    }
  });

  it.each(samples)("$name: deadlines and requirements all carry a source", ({ analysis }) => {
    for (const d of analysis.dates) expect(d.source).toBeDefined();
    for (const t of analysis.tasks) expect(t.source).toBeDefined();
    for (const r of [...analysis.details.requirements, ...analysis.details.conditions, ...analysis.details.dontOverlook]) expect(r.source).toBeDefined();
  });

  it("recognises the document types", () => {
    expect(samples.map((s) => s.analysis.docType)).toEqual(["Residential lease agreement", "Admission or enrolment letter", "Employment offer or contract"]);
  });

  it("lease: extracts the reader's tasks with their deadlines", () => {
    const { tasks } = samples[0].analysis;
    const deposit = tasks.find((t) => /security deposit/i.test(t.title));
    expect(deposit).toMatchObject({ title: "Pay a security deposit of $2,175", due: "2026-11-23", priority: "high", basis: "stated" });
    expect(tasks.find((t) => /first month's rent/i.test(t.title))?.due).toBe("2026-11-30");
    expect(tasks.find((t) => /inventory checklist/i.test(t.title))).toMatchObject({ dueText: "within 7 days of moving in" });
    expect(tasks.find((t) => /inventory checklist/i.test(t.title))?.due).toBeUndefined();
  });

  it("lease: does not turn the landlord's duties or prohibitions into tasks", () => {
    const titles = samples[0].analysis.tasks.map((t) => t.title.toLowerCase()).join(" | ");
    expect(titles).not.toMatch(/keep the structure|respond to urgent|sublet|commence/);
  });

  it("lease: lists required documents and easily missed consequences", () => {
    const { documentsNeeded, dontOverlook } = samples[0].analysis.details;
    const docs = documentsNeeded.map((d) => d.text.toLowerCase());
    expect(docs).toEqual(expect.arrayContaining(["proof of renters insurance", "government-issued id"]));
    const warnings = dontOverlook.map((d) => d.text).join(" ");
    expect(warnings).toMatch(/late fee of \$75/);
    expect(warnings).toMatch(/automatically renew/);
    expect(warnings).toMatch(/non-refundable/);
  });

  it("separates terms the document defines from general explanations", () => {
    const { glossary } = samples[0].analysis;
    expect(glossary.find((g) => g.term === "Tenant")).toMatchObject({ basis: "stated", definition: expect.stringContaining("Daniel Okafor") });
    expect(glossary.find((g) => g.term === "Sublet")).toMatchObject({ basis: "interpreted" });
  });

  it("admission letter: finds conditional and list-based instructions", () => {
    const { tasks, dates } = samples[1].analysis;
    const titles = tasks.map((t) => t.title);
    expect(titles).toEqual(expect.arrayContaining(["Sign and return the enclosed acceptance form", "Submit the housing application form"]));
    expect(tasks.find((t) => /register with the international office/i.test(t.title))).toMatchObject({ priority: "high" });
    expect(dates.filter((d) => d.kind === "event").map((d) => d.label).join(" ")).toMatch(/Orientation/);
  });

  it("links a deadline to its task", () => {
    const { tasks, dates } = samples[2].analysis;
    const sign = tasks.find((t) => /sign and return this letter/i.test(t.title))!;
    expect(dates.find((d) => d.taskId === sign.id)).toMatchObject({ iso: sign.due, kind: "deadline" });
  });
});

describe("on-device analysis edge cases", () => {
  it("marks tasks with an assumed year as needing verification", () => {
    const a = analyse("Notice\n\nYou must return the signed form by 5 January. Otherwise the offer lapses.");
    expect(a.tasks[0]).toMatchObject({ due: "2027-01-05", basis: "verify" });
    expect(a.tasks[0].note).toMatch(/no year/);
  });

  it("labels reworded sentences as interpretation, verbatim ones as stated", () => {
    const a = analyse(
      "Lease\n\nThe Tenant shall remit the rent prior to the first day of each month by bank transfer.\n\nThe rent for the first month covers the period from the first day of the tenancy. The Landlord confirms each bank transfer of rent in writing every month.",
    );
    const reworded = a.understand.summary.find((s) => /must pay the rent before/.test(s.text));
    expect(reworded).toMatchObject({ basis: "interpreted" });
    expect(reworded?.source?.quote).toMatch(/shall remit the rent prior to/);
  });

  it("copes with a document that contains no instructions or dates", () => {
    const a = analyse("The river was calm that morning. Birds crossed the valley while the mist was lifting slowly over the fields.");
    expect(a.tasks).toEqual([]);
    expect(a.dates).toEqual([]);
    expect(a.docType).toBe("General document");
    expect(a.understand.summary.map((s) => s.text).join(" ")).toMatch(/No clear instructions/);
  });

  it("does not invent content for near-empty input", () => {
    const a = analyzeLocally([], { now });
    expect(a.tasks).toEqual([]);
    expect(a.understand.purpose.basis).toBe("verify");
  });
});

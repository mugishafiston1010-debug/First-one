import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { analyzeLocally } from "./analysis/local";
import { ExtractionError, assemble, detectKind, validateFile } from "./extract";
import { itemsToText } from "./extract/pdf-layout";
import { buildIcs } from "./ics";
import { SAMPLE_SOURCES, buildSample, renderTemplate } from "./samples";
import { allDates, outstandingTasks, upcomingDeadlines } from "./selectors";
import { deleteAllDocuments, deleteDocument, loadDocuments, saveDocument } from "./store/db";
import { replaceAnalysis, setDateDone, setDateStarred, setTaskDone } from "./store/mutations";
import { findQuote, pagesToBlocks, splitSentences } from "./text";
import type { StoredDocument } from "./types";

const now = new Date(2026, 10, 16);

function sampleDoc(i = 0): StoredDocument {
  const extracted = buildSample(SAMPLE_SOURCES[i], now);
  return { ...extracted, addedAt: new Date(now.getTime() - i * 1000).toISOString(), analysis: analyzeLocally(extracted.blocks, { now }), qa: [], isSample: true };
}

describe("text handling", () => {
  it("splits pages into paragraph blocks with page numbers", () => {
    const blocks = pagesToBlocks(["TITLE\n\nFirst paragraph wraps\nonto a second line.\n\n- item one\n- item two", "Second page text."]);
    expect(blocks.map((b) => [b.page, b.text])).toEqual([
      [1, "TITLE"],
      [1, "First paragraph wraps onto a second line."],
      [1, "- item one"],
      [1, "- item two"],
      [2, "Second page text."],
    ]);
    expect(blocks[0].heading).toBe(true);
  });

  it("does not split sentences on abbreviations or amounts", () => {
    expect(splitSentences("Northgate Ltd. owns it. Dr. Voss paid $1,450.50 on time. See Sec. 4 for details.")).toEqual([
      "Northgate Ltd. owns it.",
      "Dr. Voss paid $1,450.50 on time.",
      "See Sec. 4 for details.",
    ]);
  });

  it("verifies quotes regardless of whitespace and quote style, and rejects invented ones", () => {
    const blocks = pagesToBlocks(["The “Tenant”   must pay\nthe deposit."]);
    expect(findQuote(blocks, 'The "Tenant" must pay the deposit')).toBeDefined();
    expect(findQuote(blocks, "The Tenant must pay double the deposit")).toBeUndefined();
    expect(findQuote(blocks, "pay")).toBeUndefined();
  });
});

describe("file validation and extraction", () => {
  it("detects supported kinds", () => {
    expect(detectKind("a.PDF")).toBe("pdf");
    expect(detectKind("a.docx")).toBe("docx");
    expect(detectKind("notes.md")).toBe("md");
    expect(detectKind("notes", "text/plain")).toBe("txt");
    expect(detectKind("a.xlsx")).toBeNull();
  });

  it("explains why a file is rejected", () => {
    expect(() => validateFile({ name: "old.doc", size: 10 })).toThrow(/\.doc files are not supported/);
    expect(() => validateFile({ name: "scan.jpg", size: 10 })).toThrow(/Images cannot be read/);
    expect(() => validateFile({ name: "a.txt", size: 0 })).toThrow(/empty/);
    expect(() => validateFile({ name: "a.pdf", size: 26 * 1024 * 1024 })).toThrow(/larger than 25 MB/);
  });

  it("refuses to produce a document from a file without text", () => {
    expect(() => assemble("blank.pdf", "pdf", 100, ["", "  "], true)).toThrow(ExtractionError);
  });

  it("rebuilds lines and paragraphs from positioned PDF fragments", () => {
    const item = (str: string, x: number, y: number, width = str.length * 5) => ({ str, transform: [10, 0, 0, 10, x, y], width, height: 10 });
    const text = itemsToText([
      item("Rent is due", 50, 700),
      item("on the first.", 112, 700),
      item("Late payments incur a fee.", 50, 688),
      item("A new paragraph starts here.", 50, 660),
    ]);
    expect(text).toBe("Rent is due on the first.\nLate payments incur a fee.\n\nA new paragraph starts here.");
  });
});

describe("sample documents", () => {
  it("keeps dates relative to today so deadlines are always upcoming", () => {
    expect(renderTemplate("Due {{+7}} / {{+7|us}} / {{-3}}", now)).toBe("Due 23 November 2026 / November 23, 2026 / 13 November 2026");
  });
});

describe("task and deadline tracking", () => {
  it("completing a task completes its deadline, and the other way round", () => {
    let doc = sampleDoc();
    const linked = doc.analysis.dates.find((d) => d.taskId)!;
    doc = setTaskDone(doc, linked.taskId!, true, now);
    expect(doc.analysis.tasks.find((t) => t.id === linked.taskId)).toMatchObject({ done: true, doneAt: now.toISOString() });
    expect(doc.analysis.dates.find((d) => d.id === linked.id)?.done).toBe(true);
    doc = setDateDone(doc, linked.id, false, now);
    expect(doc.analysis.tasks.find((t) => t.id === linked.taskId)?.done).toBe(false);
    expect(doc.analysis.tasks.find((t) => t.id === linked.taskId)?.doneAt).toBeUndefined();
  });

  it("orders outstanding tasks by deadline and hides completed ones", () => {
    let doc = sampleDoc();
    const open = outstandingTasks([doc]);
    const dues = open.filter((e) => e.task.due).map((e) => e.task.due!);
    expect(dues).toEqual([...dues].sort());
    expect(open[0].task.due).toBe("2026-11-23");
    doc = setTaskDone(doc, open[0].task.id, true);
    expect(outstandingTasks([doc]).some((e) => e.task.id === open[0].task.id)).toBe(false);
  });

  it("upcoming deadlines exclude plain events unless starred, and never show past events as overdue", () => {
    let doc = sampleDoc();
    const upcoming = upcomingDeadlines([doc], now);
    expect(upcoming.every((e) => e.date.kind === "deadline")).toBe(true);
    const future = doc.analysis.dates.find((d) => d.kind === "event" && d.iso && d.iso > "2026-11-16")!;
    const past = doc.analysis.dates.find((d) => d.label === "Date of the document")!;
    doc = setDateStarred(setDateStarred(doc, future.id, true), past.id, true);
    const ids = upcomingDeadlines([doc], now).map((e) => e.date.id);
    expect(ids).toContain(future.id);
    expect(ids).not.toContain(past.id);
  });

  it("re-analysis keeps completed tasks and starred dates", () => {
    let doc = sampleDoc();
    const task = doc.analysis.tasks.find((t) => t.due)!;
    const date = doc.analysis.dates.find((d) => d.iso && !d.taskId)!;
    doc = setDateStarred(setTaskDone(doc, task.id, true, now), date.id, true);
    const next = replaceAnalysis(doc, analyzeLocally(doc.blocks, { now }));
    expect(next.analysis.tasks.find((t) => t.title === task.title)?.done).toBe(true);
    expect(next.analysis.dates.find((d) => d.iso === date.iso && d.source?.blockId === date.source?.blockId)?.starred).toBe(true);
    expect(next.analysis.dates.find((d) => d.iso === task.due && d.taskId)?.done).toBe(true);
  });
});

describe("calendar export", () => {
  const ics = buildIcs(
    [
      { uid: "a", date: "2026-12-31", title: "Due: Pay deposit; rent, fees", description: "Line one\nLine two", reminder: true },
      { uid: "b", date: "not-a-date", title: "ignored" },
      { uid: "c", date: "2027-01-05", title: "A very long title ".repeat(8).trim() },
    ],
    new Date(Date.UTC(2026, 10, 16, 9, 30, 0)),
  );
  const lines = ics.split("\r\n");

  it("produces a valid all-day event with escaping and a reminder", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101");
    expect(ics).toContain(String.raw`SUMMARY:Due: Pay deposit\; rent\, fees`);
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
    expect(ics).toContain("DTSTAMP:20261116T093000Z");
    expect(ics).toContain("TRIGGER:-P1D");
  });

  it("skips entries without a calendar date and folds long lines", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(lines.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(ics.replace(/\r\n /g, "")).toContain(`SUMMARY:${"A very long title ".repeat(8).trim()}`);
  });

  it("only exports dated entries from the library", () => {
    const entries = allDates([sampleDoc()], now);
    expect(entries.some((e) => !e.date.iso)).toBe(true);
    expect(entries.filter((e) => e.date.iso).length).toBeGreaterThan(4);
  });
});

describe("local persistence", () => {
  it("saves, updates, lists newest first, and deletes documents", async () => {
    await deleteAllDocuments();
    const a = sampleDoc(0);
    const b = sampleDoc(1);
    await saveDocument(b);
    await saveDocument(a);
    expect((await loadDocuments()).map((d) => d.id)).toEqual([a.id, b.id]);

    const task = a.analysis.tasks[0];
    await saveDocument(setTaskDone(a, task.id, true, now));
    const reloaded = (await loadDocuments()).find((d) => d.id === a.id)!;
    expect(reloaded.analysis.tasks[0].done).toBe(true);
    expect(reloaded.blocks).toEqual(a.blocks);

    await deleteDocument(a.id);
    expect((await loadDocuments()).map((d) => d.id)).toEqual([b.id]);
    await deleteAllDocuments();
    expect(await loadDocuments()).toEqual([]);
  });
});

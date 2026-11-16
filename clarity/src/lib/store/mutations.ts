/** Pure state transitions for a stored document. Kept free of React so they can be tested. */
import type { Analysis, QAMessage, StoredDocument } from "../types";

/** Completing a task also completes the deadline attached to it, and vice versa. */
export function setTaskDone(doc: StoredDocument, taskId: string, done: boolean, now: Date = new Date()): StoredDocument {
  return {
    ...doc,
    analysis: {
      ...doc.analysis,
      tasks: doc.analysis.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const { doneAt: _omit, ...rest } = t;
        void _omit;
        return done ? { ...rest, done: true, doneAt: now.toISOString() } : { ...rest, done: false };
      }),
      dates: doc.analysis.dates.map((d) => (d.taskId === taskId ? { ...d, done } : d)),
    },
  };
}

export function setDateDone(doc: StoredDocument, dateId: string, done: boolean, now: Date = new Date()): StoredDocument {
  const date = doc.analysis.dates.find((d) => d.id === dateId);
  if (!date) return doc;
  if (date.taskId) return setTaskDone(doc, date.taskId, done, now);
  return { ...doc, analysis: { ...doc.analysis, dates: doc.analysis.dates.map((d) => (d.id === dateId ? { ...d, done } : d)) } };
}

export function setDateStarred(doc: StoredDocument, dateId: string, starred: boolean): StoredDocument {
  return { ...doc, analysis: { ...doc.analysis, dates: doc.analysis.dates.map((d) => (d.id === dateId ? { ...d, starred } : d)) } };
}

export function appendMessages(doc: StoredDocument, ...messages: QAMessage[]): StoredDocument {
  return { ...doc, qa: [...doc.qa, ...messages] };
}

/**
 * Replace the analysis after a re-run, keeping the user's progress where an
 * item clearly matches one from the previous analysis.
 */
export function replaceAnalysis(doc: StoredDocument, next: Analysis): StoredDocument {
  const key = (source?: { blockId: number }, extra = "") => `${source?.blockId ?? "x"}|${extra}`;
  const doneTasks = new Map(doc.analysis.tasks.filter((t) => t.done).map((t) => [key(t.source, t.due ?? ""), t.doneAt]));
  const starred = new Set(doc.analysis.dates.filter((d) => d.starred).map((d) => key(d.source, d.iso ?? d.raw)));
  const tasks = next.tasks.map((t) => {
    const k = key(t.source, t.due ?? "");
    return doneTasks.has(k) ? { ...t, done: true, doneAt: doneTasks.get(k) ?? new Date().toISOString() } : t;
  });
  const doneIds = new Set(tasks.filter((t) => t.done).map((t) => t.id));
  const dates = next.dates.map((d) => ({
    ...d,
    starred: starred.has(key(d.source, d.iso ?? d.raw)),
    done: d.taskId ? doneIds.has(d.taskId) : d.done,
  }));
  return { ...doc, analysis: { ...next, tasks, dates } };
}

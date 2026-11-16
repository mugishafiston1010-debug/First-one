/** Read-only views across the whole library, used by the dashboard and trackers. */
import { daysUntil } from "./analysis/dates";
import type { DateItem, StoredDocument, Task } from "./types";

export interface TaskEntry {
  doc: StoredDocument;
  task: Task;
}

export interface DateEntry {
  doc: StoredDocument;
  date: DateItem;
  /** Days from today; undefined for relative deadlines. */
  inDays?: number;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

/** Soonest deadline first, then priority; undated tasks last. */
export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
  if (a.due && !b.due) return -1;
  if (!a.due && b.due) return 1;
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

export function allTasks(docs: StoredDocument[]): TaskEntry[] {
  return docs
    .flatMap((doc) => doc.analysis.tasks.map((task) => ({ doc, task })))
    .sort((a, b) => compareTasks(a.task, b.task));
}

export function outstandingTasks(docs: StoredDocument[]): TaskEntry[] {
  return allTasks(docs).filter((e) => !e.task.done);
}

export function allDates(docs: StoredDocument[], now: Date = new Date()): DateEntry[] {
  return docs
    .flatMap((doc) =>
      doc.analysis.dates.map((date) => ({ doc, date, ...(date.iso ? { inDays: daysUntil(date.iso, now) } : {}) })),
    )
    .sort((a, b) => {
      if (a.date.iso && b.date.iso) return a.date.iso.localeCompare(b.date.iso);
      return a.date.iso ? -1 : b.date.iso ? 1 : 0;
    });
}

/** Open deadlines from today onwards (overdue ones first), plus starred dates. */
export function upcomingDeadlines(docs: StoredDocument[], now: Date = new Date()): DateEntry[] {
  return allDates(docs, now).filter(
    (e) =>
      e.date.iso &&
      !e.date.done &&
      // Open deadlines stay visible for a month after they pass; starred events only while still ahead.
      (e.date.kind === "deadline" ? (e.inDays ?? 0) >= -30 : e.date.starred && (e.inDays ?? 0) >= 0),
  );
}

export function documentProgress(doc: StoredDocument): { done: number; total: number } {
  const total = doc.analysis.tasks.length;
  return { done: doc.analysis.tasks.filter((t) => t.done).length, total };
}

export function nextDeadline(doc: StoredDocument, now: Date = new Date()): DateEntry | undefined {
  return upcomingDeadlines([doc], now).find((e) => (e.inDays ?? -1) >= 0);
}

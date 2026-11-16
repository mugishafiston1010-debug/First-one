"use client";

import Link from "next/link";
import { formatDate, parseIso, relativeLabel } from "@/lib/analysis/dates";
import { buildIcs, downloadIcs, type CalendarEvent } from "@/lib/ics";
import type { DateEntry } from "@/lib/selectors";
import { useLibrary } from "@/lib/store/library";
import { locator } from "@/lib/types";
import { BasisMark, SourceChip } from "./Provenance";
import { Checkbox } from "./TaskRow";
import { Button, Icon, useToast } from "./ui";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function entriesToEvents(entries: DateEntry[]): CalendarEvent[] {
  return entries
    .filter((e) => e.date.iso)
    .map((e) => ({
      uid: `${e.doc.id}-${e.date.id}`,
      date: e.date.iso!,
      title: `${e.date.kind === "deadline" ? "Due: " : ""}${e.date.label}`,
      description: [
        `From "${e.doc.name}"${e.date.source ? ` (${locator(e.doc, e.date.source)})` : ""}.`,
        e.date.source ? `Source: "${e.date.source.quote}"` : "",
        e.date.basis === "verify" ? `Check this date against the document. ${e.date.note ?? ""}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      reminder: e.date.kind === "deadline",
    }));
}

export function ExportButton({ entries, filename, label = "Export to calendar" }: { entries: DateEntry[]; filename: string; label?: string }) {
  const toast = useToast();
  const events = entriesToEvents(entries);
  return (
    <Button
      icon="download"
      disabled={events.length === 0}
      title={events.length === 0 ? "There are no calendar dates to export" : "Download an .ics file for Google Calendar, Apple Calendar or Outlook"}
      onClick={() => {
        downloadIcs(filename, buildIcs(events));
        toast(`${events.length} event${events.length === 1 ? "" : "s"} exported as .ics`);
      }}
      data-testid="export-ics"
    >
      {label}
    </Button>
  );
}

function DateRow({ entry, showDocument }: { entry: DateEntry; showDocument: boolean }) {
  const { toggleDate, starDate } = useLibrary();
  const { date, doc } = entry;
  const past = (entry.inDays ?? 0) < 0;
  const overdue = past && date.kind === "deadline" && !date.done;
  const soon = !date.done && date.kind === "deadline" && entry.inDays !== undefined && entry.inDays >= 0 && entry.inDays <= 7;
  const day = date.iso ? parseIso(date.iso) : null;

  return (
    <li className="relative grid grid-cols-[52px_1fr] gap-4 pb-6 last:pb-0 sm:grid-cols-[64px_1fr]" data-testid="date-row">
      {/* Date column and rail */}
      <div className="relative flex flex-col items-center">
        <div
          className={`tabular z-10 flex w-full flex-col items-center rounded-xl border py-1.5 ${
            date.done ? "border-line bg-surface text-ink-3" : overdue || soon ? "border-accent bg-accent text-on-accent" : date.kind === "deadline" ? "border-ink bg-ink text-bg" : "border-line-strong bg-raised text-ink"
          }`}
        >
          {day ? (
            <>
              <span className="font-display text-[22px] leading-none">{day.getDate()}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">{MONTHS[day.getMonth()].slice(0, 3)}</span>
            </>
          ) : (
            <Icon name="calendar" size={18} className="my-1.5" />
          )}
        </div>
        <span className="absolute bottom-[-24px] top-0 w-px bg-line" aria-hidden="true" />
      </div>

      <div className="min-w-0 pt-0.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className={`text-[15px] font-medium leading-snug ${date.done ? "text-ink-3 line-through decoration-line-strong" : ""}`}>{date.label}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-ink-2">
              <span className={`font-medium ${overdue ? "text-accent-ink" : ""}`}>
                {date.kind === "deadline" ? "Deadline" : "Date"}
                {date.iso ? ` · ${overdue ? "overdue, " : ""}${relativeLabel(date.iso).toLowerCase()}` : " · no fixed date"}
              </span>
              <span className="text-ink-3">written as &ldquo;{date.raw}&rdquo;</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-pressed={date.starred}
              aria-label={date.starred ? "Remove from important dates" : "Mark as important"}
              title={date.starred ? "Marked important" : "Mark as important"}
              onClick={() => starDate(doc.id, date.id, !date.starred)}
              className={`grid size-8 place-items-center rounded-full transition-colors ${date.starred ? "text-accent" : "text-ink-3 hover:bg-sunken hover:text-ink"}`}
            >
              <Icon name="star" size={16} filled={date.starred} />
            </button>
            <Checkbox checked={date.done} onChange={(next) => toggleDate(doc.id, date.id, next)} label={`Mark "${date.label}" as ${date.done ? "not done" : "done"}`} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <BasisMark basis={date.basis} short />
          {showDocument ? (
            <Link href={`/d/${doc.id}?tab=deadlines`} className="inline-flex max-w-[240px] items-center gap-1 truncate text-[12px] text-ink-3 hover:text-ink">
              <Icon name="doc" size={12} />
              <span className="truncate">
                {doc.name.replace(/\.[a-z]+$/i, "")}
                {date.source ? ` · ${locator(doc, date.source)}` : ""}
              </span>
            </Link>
          ) : (
            <SourceChip source={date.source} />
          )}
        </div>
        {date.note && <p className="mt-1.5 text-[12.5px] leading-snug text-accent-ink">{date.note}</p>}
      </div>
    </li>
  );
}

/** A vertical timeline of dates, grouped by month, with relative deadlines listed separately. */
export function Timeline({ entries, showDocument = false }: { entries: DateEntry[]; showDocument?: boolean }) {
  const dated = entries.filter((e) => e.date.iso);
  const relative = entries.filter((e) => !e.date.iso);
  const groups: Array<{ key: string; label: string; items: DateEntry[] }> = [];
  for (const e of dated) {
    const d = parseIso(e.date.iso!);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(e);
    else groups.push({ key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, items: [e] });
  }

  return (
    <div className="space-y-9">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="eyebrow mb-4">{g.label}</h3>
          <ol>
            {g.items.map((e) => (
              <DateRow key={`${e.doc.id}-${e.date.id}`} entry={e} showDocument={showDocument} />
            ))}
          </ol>
        </section>
      ))}
      {relative.length > 0 && (
        <section>
          <h3 className="eyebrow">Deadlines without a calendar date</h3>
          <p className="mb-4 mt-1 text-[13px] text-ink-2">These depend on another event, so they cannot be placed on the timeline or exported.</p>
          <ol>
            {relative.map((e) => (
              <DateRow key={`${e.doc.id}-${e.date.id}`} entry={e} showDocument={showDocument} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export { formatDate };

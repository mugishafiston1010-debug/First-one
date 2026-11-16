"use client";

import Link from "next/link";
import { useState } from "react";
import { daysUntil, formatDate, relativeLabel } from "@/lib/analysis/dates";
import type { Priority, StoredDocument, Task } from "@/lib/types";
import { Provenance } from "./Provenance";
import { Icon } from "./ui";

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`grid size-[22px] shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
        checked ? "border-ink bg-ink text-bg" : "border-line-strong bg-raised text-transparent hover:border-ink-2"
      }`}
    >
      <Icon name="check" size={13} className={checked ? "check-pop" : ""} />
    </button>
  );
}

const PRIORITY_LABEL: Record<Priority, string> = { high: "High priority", medium: "Medium priority", low: "Low priority" };

export function PriorityMark({ priority }: { priority: Priority }) {
  const level = { high: 3, medium: 2, low: 1 }[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-3" title={PRIORITY_LABEL[priority]}>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} style={{ height: 3 + i * 3 }} className={`w-[3px] rounded-[1px] ${i <= level ? (priority === "high" ? "bg-accent" : "bg-ink-2") : "bg-line-strong"}`} />
        ))}
      </span>
      {priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low"}
    </span>
  );
}

export function DueChip({ due, dueText, done }: { due?: string; dueText?: string; done?: boolean }) {
  if (!due && !dueText) return null;
  if (!due) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-ink-2" title="The document gives a relative deadline, not a calendar date">
        <Icon name="calendar" size={12} className="text-ink-3" />
        {dueText}
      </span>
    );
  }
  const n = daysUntil(due);
  const urgent = !done && n <= 7;
  return (
    <span className={`tabular inline-flex items-center gap-1 text-[12px] font-medium ${urgent ? "text-accent-ink" : "text-ink-2"}`} title={dueText ? `Document says: ${dueText}` : undefined}>
      <Icon name="calendar" size={12} />
      {formatDate(due)}
      {!done && <span className="font-normal opacity-80">· {n < 0 ? `overdue, ${relativeLabel(due).toLowerCase()}` : relativeLabel(due).toLowerCase()}</span>}
    </span>
  );
}

export function TaskRow({
  task,
  doc,
  onToggle,
  showDocument = false,
  defaultOpen = false,
}: {
  task: Task;
  doc: StoredDocument;
  onToggle: (done: boolean) => void;
  showDocument?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="group flex gap-3.5 py-4" data-testid="task-row" data-done={task.done}>
      <div className="pt-0.5">
        <Checkbox checked={task.done} onChange={onToggle} label={`Mark "${task.title}" as ${task.done ? "not done" : "done"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-2 text-left">
          <span className={`flex-1 text-[15px] font-medium leading-snug transition-colors ${task.done ? "text-ink-3 line-through decoration-line-strong" : "text-ink"}`}>{task.title}</span>
          <Icon name="chevron" size={15} className={`mt-1 text-ink-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        </button>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <DueChip due={task.due} dueText={task.dueText} done={task.done} />
          <PriorityMark priority={task.priority} />
          {showDocument && (
            <Link href={`/d/${doc.id}?tab=actions`} className="inline-flex max-w-[220px] items-center gap-1 truncate text-[12px] text-ink-3 hover:text-ink">
              <Icon name="doc" size={12} />
              <span className="truncate">{doc.name.replace(/\.[a-z]+$/i, "")}</span>
            </Link>
          )}
        </div>
        {open && (
          <div className="mt-3 animate-fade rounded-xl bg-sunken/60 px-4 py-3">
            <p className="text-[13.5px] leading-relaxed text-ink-2">{task.detail}</p>
            <Provenance basis={task.basis} source={task.source} note={task.note} />
          </div>
        )}
      </div>
    </li>
  );
}

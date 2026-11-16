"use client";

import Link from "next/link";
import { useState } from "react";
import { FilterPills } from "@/components/DocumentView";
import { Page, PageHeader } from "@/components/Shell";
import { TaskRow } from "@/components/TaskRow";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { daysUntil } from "@/lib/analysis/dates";
import { allTasks, type TaskEntry } from "@/lib/selectors";
import { useLibrary } from "@/lib/store/library";

type Filter = "open" | "done" | "all";

function bucket(e: TaskEntry): string {
  if (e.task.done) return "Completed";
  if (!e.task.due) return e.task.dueText ? "Relative deadline" : "No deadline";
  const n = daysUntil(e.task.due);
  if (n < 0) return "Overdue";
  if (n <= 7) return "This week";
  if (n <= 31) return "This month";
  return "Later";
}

const ORDER = ["Overdue", "This week", "This month", "Later", "Relative deadline", "No deadline", "Completed"];

export default function ActionsPage() {
  const { docs, ready, toggleTask } = useLibrary();
  const [filter, setFilter] = useState<Filter>("open");
  const all = allTasks(docs);
  const open = all.filter((e) => !e.task.done);
  const done = all.filter((e) => e.task.done);
  const shown = filter === "open" ? open : filter === "done" ? done : all;

  const groups = new Map<string, TaskEntry[]>();
  for (const e of shown) groups.set(bucket(e), [...(groups.get(bucket(e)) ?? []), e]);

  return (
    <Page width="max-w-3xl">
      <PageHeader eyebrow="Across all documents" title="Actions">
        Everything your documents ask you to do, soonest first.
      </PageHeader>

      {!ready ? (
        <Skeleton className="mt-10 h-72" />
      ) : all.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon="list"
            title="No actions yet"
            action={
              <Link href="/" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg">
                Add a document
              </Link>
            }
          >
            When you analyse a document, the tasks it contains are collected here.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <FilterPills
              value={filter}
              onChange={setFilter}
              options={[
                { id: "open", label: `To do ${open.length}` },
                { id: "done", label: `Completed ${done.length}` },
                { id: "all", label: `All ${all.length}` },
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <p className="mt-12 text-center text-sm text-ink-3">{filter === "open" ? "Nothing left to do. Everything is complete." : "No completed actions yet."}</p>
          ) : (
            <div className="mt-8 space-y-8">
              {ORDER.filter((k) => groups.has(k)).map((k) => (
                <section key={k} className="animate-rise">
                  <h2 className={`eyebrow mb-2.5 ${k === "Overdue" ? "!text-accent-ink" : ""}`}>
                    {k} <span className="tabular ml-1 font-normal">{groups.get(k)!.length}</span>
                  </h2>
                  <Card className="px-5">
                    <ul className="divide-y divide-line">
                      {groups.get(k)!.map(({ doc, task }) => (
                        <TaskRow key={`${doc.id}-${task.id}`} task={task} doc={doc} showDocument onToggle={(d) => toggleTask(doc.id, task.id, d)} />
                      ))}
                    </ul>
                  </Card>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}

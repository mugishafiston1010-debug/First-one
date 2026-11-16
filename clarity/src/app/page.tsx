"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Page } from "@/components/Shell";
import { DueChip, PriorityMark, Checkbox } from "@/components/TaskRow";
import { UploadPanel } from "@/components/UploadPanel";
import { Button, Card, Icon, Skeleton, useToast } from "@/components/ui";
import { formatDate, parseIso, relativeLabel } from "@/lib/analysis/dates";
import { documentProgress, nextDeadline, outstandingTasks, upcomingDeadlines } from "@/lib/selectors";
import { useLibrary } from "@/lib/store/library";
import type { StoredDocument } from "@/lib/types";

export default function Dashboard() {
  const { docs, ready, loadSamples, toggleTask, storageError } = useLibrary();
  const router = useRouter();
  const toast = useToast();
  const [loadingSamples, setLoadingSamples] = useState(false);

  const tasks = outstandingTasks(docs);
  const deadlines = upcomingDeadlines(docs);
  const hasSamples = docs.some((d) => d.isSample);

  const addSamples = async () => {
    setLoadingSamples(true);
    try {
      const created = await loadSamples();
      toast(`${created.length} sample documents analysed on this device`);
      if (docs.length === 0 && created[0]) router.push(`/d/${created[0].id}`);
    } catch {
      toast("The sample documents could not be loaded.", "error");
    } finally {
      setLoadingSamples(false);
    }
  };

  return (
    <Page width="max-w-6xl">
      <header className="animate-rise">
        <p className="eyebrow">Document to action</p>
        <h1 className="font-display mt-2 max-w-3xl text-[36px] leading-[1.05] sm:text-[50px]">
          Don&rsquo;t just understand a document. <em className="text-accent">Know exactly what to do next.</em>
        </h1>
        <p className="mt-4 max-w-xl text-[15.5px] text-ink-2">
          Clarity reads contracts, letters and notices, explains them in plain language, and turns them into tasks and deadlines, each linked to the passage it came from.
        </p>
      </header>

      {storageError && (
        <p role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl bg-accent-soft px-4 py-3 text-[13px] text-accent-ink">
          <Icon name="alert" size={15} className="mt-0.5" />
          <span>
            <strong className="font-semibold">Storage problem.</strong> {storageError} Documents will only be kept until you close this tab.
          </span>
        </p>
      )}

      <div className="mt-9 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0 animate-rise [animation-delay:60ms]">
          <UploadPanel />
          {ready && !hasSamples && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13.5px] text-ink-2">
                <span className="font-medium text-ink">No document at hand?</span> Explore with a lease, an admission letter and a job offer.
              </p>
              <Button size="sm" variant="primary" icon="spark" busy={loadingSamples} onClick={addSamples} data-testid="load-samples" className="shrink-0 self-start sm:self-auto">
                Try sample documents
              </Button>
            </div>
          )}
        </div>

        <div className="flex min-w-0 animate-rise flex-col gap-6 [animation-delay:120ms]">
          <Card className="p-5">
            <PanelHeader title="Outstanding actions" count={tasks.length} href="/actions" />
            {!ready ? (
              <PanelSkeleton />
            ) : tasks.length === 0 ? (
              <PanelEmpty>{docs.length ? "Nothing left to do. Well done." : "Tasks found in your documents will appear here."}</PanelEmpty>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {tasks.slice(0, 4).map(({ doc, task }) => (
                  <li key={`${doc.id}-${task.id}`} className="flex gap-3 py-3 last:pb-0">
                    <div className="pt-0.5">
                      <Checkbox checked={task.done} onChange={(d) => toggleTask(doc.id, task.id, d)} label={`Mark "${task.title}" as done`} />
                    </div>
                    <Link href={`/d/${doc.id}?tab=actions`} className="group min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium group-hover:text-accent-ink">{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <DueChip due={task.due} dueText={task.dueText} />
                        {!task.due && !task.dueText && <PriorityMark priority={task.priority} />}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <PanelHeader title="Upcoming deadlines" count={deadlines.length} href="/deadlines" />
            {!ready ? (
              <PanelSkeleton />
            ) : deadlines.length === 0 ? (
              <PanelEmpty>{docs.length ? "No open deadlines with a calendar date." : "Dates and deadlines will be collected here."}</PanelEmpty>
            ) : (
              <ul className="mt-3 space-y-3">
                {deadlines.slice(0, 4).map(({ doc, date, inDays }) => {
                  const d = parseIso(date.iso!);
                  const urgent = (inDays ?? 99) <= 7;
                  return (
                    <li key={`${doc.id}-${date.id}`}>
                      <Link href={`/d/${doc.id}?tab=deadlines`} className="group flex items-center gap-3.5">
                        <span className={`tabular flex w-11 shrink-0 flex-col items-center rounded-lg py-1 ${urgent ? "bg-accent text-on-accent" : "bg-sunken text-ink"}`}>
                          <span className="font-display text-[18px] leading-none">{d.getDate()}</span>
                          <span className="text-[9.5px] font-semibold uppercase tracking-wider opacity-80">{formatDate(date.iso!, "short").split(" ")[1]}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-medium group-hover:text-accent-ink">{date.label}</span>
                          <span className={`block truncate text-[12.5px] ${urgent ? "text-accent-ink" : "text-ink-3"}`}>
                            {(inDays ?? 0) < 0 && date.kind === "deadline" ? "Overdue · " : ""}
                            {relativeLabel(date.iso!)} · {doc.name.replace(/\.[a-z]+$/i, "")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display whitespace-nowrap text-[26px] leading-tight">Recently analysed</h2>
          {docs.length > 0 && (
            <span className="tabular whitespace-nowrap text-[13px] text-ink-3">
              {docs.length} document{docs.length === 1 ? "" : "s"}
              <span className="hidden sm:inline"> on this device</span>
            </span>
          )}
        </div>
        {!ready ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
            <p className="font-display text-xl">Your documents will appear here</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-2">Drop a file above, or load the samples to see how a finished analysis looks.</p>
          </div>
        ) : (
          <div className="stagger mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}

function PanelHeader({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-baseline gap-2 text-[15px] font-semibold">
        {title}
        {count > 0 && <span className="tabular text-[13px] font-normal text-ink-3">{count}</span>}
      </h2>
      <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
        View all <Icon name="arrow" size={12} />
      </Link>
    </div>
  );
}

function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-xl bg-sunken/60 px-4 py-5 text-center text-[13px] text-ink-3">{children}</p>;
}

function PanelSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
    </div>
  );
}

function DocumentCard({ doc }: { doc: StoredDocument }) {
  const progress = documentProgress(doc);
  const next = nextDeadline(doc);
  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;
  return (
    <Link
      href={`/d/${doc.id}`}
      data-testid="doc-card"
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow flex items-center gap-2">
          <span className="rounded bg-ink px-1.5 py-0.5 text-[9.5px] tracking-wider text-bg">{doc.kind.toUpperCase()}</span>
          {doc.isSample ? "Sample" : formatDate(doc.addedAt.slice(0, 10))}
        </span>
        <Icon name="arrow" size={15} className="text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <h3 className="font-display mt-4 line-clamp-2 text-[21px] leading-[1.2]">{doc.name.replace(/\.[a-z]+$/i, "")}</h3>
      <p className="mt-1 truncate text-[13px] text-ink-2">{doc.analysis.docType}</p>
      <div className="mt-auto pt-6">
        <div className="flex items-center justify-between text-[12.5px] text-ink-2">
          <span className="tabular">{progress.total ? `${progress.done}/${progress.total} actions done` : "No actions"}</span>
          {next && (
            <span className={`tabular inline-flex items-center gap-1 ${(next.inDays ?? 99) <= 7 ? "font-medium text-accent-ink" : ""}`}>
              <Icon name="calendar" size={12} />
              {formatDate(next.date.iso!, "short")}
            </span>
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}

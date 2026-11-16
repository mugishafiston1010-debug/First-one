"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { EngineError } from "@/lib/analysis";
import { formatDate } from "@/lib/analysis/dates";
import { allDates, compareTasks, documentProgress } from "@/lib/selectors";
import { useLibrary } from "@/lib/store/library";
import type { EngineId, Insight, StoredDocument, Term } from "@/lib/types";
import { AskPanel } from "./AskPanel";
import { CloudConsentDialog } from "./CloudConsent";
import { BasisLegend, BasisMark, Provenance, SourceChip, SourceProvider } from "./Provenance";
import { Page } from "./Shell";
import { TaskRow } from "./TaskRow";
import { ExportButton, Timeline } from "./Timeline";
import { Button, Card, Dialog, EmptyState, Icon, useToast } from "./ui";

const TABS = [
  { id: "understand", label: "Understand" },
  { id: "actions", label: "Take action" },
  { id: "details", label: "Important details" },
  { id: "simplify", label: "Simplify" },
  { id: "ask", label: "Ask" },
  { id: "deadlines", label: "Deadlines" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const KIND_LABEL = { pdf: "PDF", docx: "DOCX", txt: "TXT", md: "MD" } as const;

export function DocumentView({ doc }: { doc: StoredDocument }) {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("tab") as TabId | null;
  const tab: TabId = TABS.some((t) => t.id === requested) ? requested! : "understand";
  const setTab = (id: TabId) => router.replace(`/d/${doc.id}${id === "understand" ? "" : `?tab=${id}`}`, { scroll: false });

  const { analysis } = doc;
  const progress = documentProgress(doc);
  const counts: Partial<Record<TabId, number>> = {
    actions: analysis.tasks.filter((t) => !t.done).length,
    deadlines: analysis.dates.length,
    simplify: analysis.glossary.length,
  };
  const words = useMemo(() => doc.blocks.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0), [doc.blocks]);

  return (
    <SourceProvider doc={doc}>
      <Page>
        <header className="animate-rise">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
            <Icon name="arrow" size={13} className="rotate-180" />
            All documents
          </Link>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] tracking-wider text-bg">{KIND_LABEL[doc.kind]}</span>
                <span>{analysis.docType}</span>
                {doc.isSample && <span className="rounded-full border border-line-strong px-2 py-px normal-case tracking-normal">Sample</span>}
              </p>
              <h1 className="font-display mt-2.5 break-words text-[30px] leading-[1.1] sm:text-[38px]" data-testid="doc-title">
                {doc.name.replace(/\.[a-z]+$/i, "")}
              </h1>
              <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
                <span>{doc.paged ? `${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}` : `${doc.blocks.length} paragraphs`}</span>
                <span className="text-line-strong">·</span>
                <span>{words.toLocaleString("en")} words</span>
                <span className="text-line-strong">·</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name={analysis.engine === "claude" ? "cloud" : "device"} size={13} />
                  {analysis.engine === "claude" ? "Analysed by Claude" : "Analysed on this device"}
                </span>
                <span className="text-line-strong">·</span>
                <span>Added {formatDate(doc.addedAt.slice(0, 10))}</span>
              </p>
            </div>
            <DocumentMenu doc={doc} />
          </div>

          {doc.warnings.map((w) => (
            <p key={w} role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl bg-accent-soft px-4 py-3 text-[13px] text-accent-ink">
              <Icon name="alert" size={15} className="mt-0.5" />
              {w}
            </p>
          ))}
        </header>

        {/* Tabs */}
        <div className="sticky top-[53px] z-20 -mx-4 mt-7 border-b border-line bg-bg/92 px-4 backdrop-blur sm:-mx-8 sm:px-8 lg:top-0 lg:-mx-12 lg:px-12">
          <div className="no-scrollbar -mb-px flex gap-6 overflow-x-auto" role="tablist" aria-label="Document sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 py-3.5 text-sm transition-colors ${
                  tab === t.id ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {t.label}
                {counts[t.id] ? <span className="tabular rounded-full bg-sunken px-1.5 text-[11px] font-medium leading-5 text-ink-2">{counts[t.id]}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="animate-rise pt-8">
          {tab === "understand" && <UnderstandTab doc={doc} progress={progress} goTo={setTab} />}
          {tab === "actions" && <ActionsTab doc={doc} />}
          {tab === "details" && <DetailsTab doc={doc} />}
          {tab === "simplify" && <SimplifyTab doc={doc} />}
          {tab === "ask" && <AskPanel doc={doc} />}
          {tab === "deadlines" && <DeadlinesTab doc={doc} />}
        </div>
      </Page>
    </SourceProvider>
  );
}

// ---- Header menu ----------------------------------------------------------

function DocumentMenu({ doc }: { doc: StoredDocument }) {
  const { remove, reanalyse, status } = useLibrary();
  const router = useRouter();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<EngineId | null>(null);

  const rerun = async (engine: EngineId) => {
    setBusy(engine);
    try {
      await reanalyse(doc.id, engine);
      toast(engine === "claude" ? "Re-analysed with Claude" : "Re-analysed on this device");
    } catch (err) {
      toast(err instanceof EngineError ? err.message : "The analysis failed. Your previous results are unchanged.", "error");
    } finally {
      setBusy(null);
    }
  };

  const other: EngineId = doc.analysis.engine === "claude" ? "local" : "claude";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {status.claude && (
        <Button size="sm" icon={other === "claude" ? "cloud" : "device"} busy={busy === other} disabled={busy !== null} onClick={() => (other === "claude" ? setConsent(true) : void rerun("local"))}>
          {other === "claude" ? "Analyse with Claude" : "Analyse on device"}
        </Button>
      )}
      <Button size="sm" icon="refresh" busy={busy === doc.analysis.engine} disabled={busy !== null} onClick={() => void rerun(doc.analysis.engine)} title="Run the analysis again. Completed tasks are kept.">
        Re-analyse
      </Button>
      <Button size="sm" icon="trash" onClick={() => setConfirmDelete(true)} data-testid="delete-doc">
        Delete
      </Button>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this document?"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button
              variant="danger"
              icon="trash"
              data-testid="confirm-delete"
              onClick={async () => {
                await remove(doc.id);
                toast("Document deleted from this device");
                router.push("/");
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p>
          <strong className="font-medium text-ink">{doc.name}</strong>, its extracted text, analysis, task progress and questions will be removed from this browser. This cannot be undone.
        </p>
        {doc.cloudConsent && <p className="mt-2">Text already sent to Anthropic for analysis is not affected by deleting it here.</p>}
      </Dialog>

      <CloudConsentDialog
        open={consent}
        name={doc.name}
        chars={doc.charCount}
        model={status.model}
        purpose="analyse"
        onCancel={() => setConsent(false)}
        onConfirm={() => {
          setConsent(false);
          void rerun("claude");
        }}
      />
    </div>
  );
}

// ---- Shared bits ----------------------------------------------------------

function InsightItem({ insight, lead = false }: { insight: Insight; lead?: boolean }) {
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <p className={lead ? "font-display text-[19px] leading-relaxed" : "text-[14.5px] leading-relaxed"}>{insight.text}</p>
      <Provenance basis={insight.basis} source={insight.source} note={insight.note} />
    </li>
  );
}

function Section({ title, hint, count, children, action }: { title: string; hint?: string; count?: number; children: ReactNode; action?: ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[23px] leading-tight">
            {title}
            {count !== undefined && <span className="tabular ml-2 font-sans text-[13px] font-normal text-ink-3">{count}</span>}
          </h2>
          {hint && <p className="mt-1 text-[13px] text-ink-2">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InsightList({ items, empty }: { items: Insight[]; empty: string }) {
  if (!items.length) return <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-[13.5px] text-ink-3">{empty}</p>;
  return (
    <Card className="px-5 py-4">
      <ul className="divide-y divide-line">
        {items.map((i) => (
          <InsightItem key={i.id} insight={i} />
        ))}
      </ul>
    </Card>
  );
}

// ---- Tabs -----------------------------------------------------------------

function UnderstandTab({ doc, progress, goTo }: { doc: StoredDocument; progress: { done: number; total: number }; goTo: (t: TabId) => void }) {
  const { analysis } = doc;
  const { toggleTask } = useLibrary();
  const next = [...analysis.tasks].sort(compareTasks).filter((t) => !t.done).slice(0, 3);
  const local = analysis.engine === "local";

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-10">
        <Section title="What this document is">
          <Card className="px-6 py-5">
            <p className="font-display text-[21px] leading-[1.5]">{analysis.understand.purpose.text}</p>
            <Provenance basis={analysis.understand.purpose.basis} source={analysis.understand.purpose.source} note={analysis.understand.purpose.note} />
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3.5 text-[13px] text-ink-2">
              Recognised as: <span className="font-medium text-ink">{analysis.docType}</span>
              <BasisMark basis="interpreted" short />
            </p>
          </Card>
        </Section>

        <Section title="In plain language" hint={local ? "Built on this device from the document's own sentences, with formal wording simplified." : "Written by Claude and checked against the document text."}>
          <Card className="px-6 py-5">
            <ul className="divide-y divide-line">
              {analysis.understand.summary.map((i) => (
                <InsightItem key={i.id} insight={i} />
              ))}
            </ul>
          </Card>
        </Section>

        <Section title="Key information" count={analysis.understand.keyPoints.length}>
          <InsightList items={analysis.understand.keyPoints} empty="No standout facts were identified." />
        </Section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <Card className="p-5">
          <p className="eyebrow">What to do next</p>
          {analysis.tasks.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-ink-2">No actions were found in this document.</p>
          ) : next.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-[13.5px] text-ink-2">
              <Icon name="check" size={15} /> Everything is done.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {next.map((t) => (
                <TaskRow key={t.id} task={t} doc={doc} onToggle={(d) => toggleTask(doc.id, t.id, d)} />
              ))}
            </ul>
          )}
          {analysis.tasks.length > 0 && (
            <>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-sunken">
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[12.5px] text-ink-2">
                <span className="tabular">
                  {progress.done} of {progress.total} done
                </span>
                <button type="button" onClick={() => goTo("actions")} className="inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink">
                  All actions <Icon name="arrow" size={12} />
                </button>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <p className="eyebrow">How to read this</p>
          <div className="mt-3 flex flex-col gap-2">
            <BasisLegend />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
            Tap a <Icon name="quote" size={11} className="inline align-[-1px]" /> reference to read the original passage. Clarity helps you read a document; it is not legal advice.
          </p>
        </Card>
      </aside>
    </div>
  );
}

function ActionsTab({ doc }: { doc: StoredDocument }) {
  const { toggleTask } = useLibrary();
  const tasks = [...doc.analysis.tasks].sort(compareTasks);
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  if (!tasks.length) {
    return (
      <EmptyState icon="list" title="No actions found">
        This document does not seem to ask you to do anything. Check Important details for conditions that may still matter.
      </EmptyState>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-9">
      <Section title="To do" count={open.length} hint="Sorted by deadline, then priority. Open a task to see the passage it comes from.">
        {open.length ? (
          <Card className="px-5">
            <ul className="divide-y divide-line">
              {open.map((t) => (
                <TaskRow key={t.id} task={t} doc={doc} onToggle={(d) => toggleTask(doc.id, t.id, d)} />
              ))}
            </ul>
          </Card>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-5 text-[13.5px] text-ink-2">
            <Icon name="check" size={15} /> All actions for this document are complete.
          </p>
        )}
      </Section>
      {done.length > 0 && (
        <Section title="Completed" count={done.length}>
          <Card className="px-5">
            <ul className="divide-y divide-line">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} doc={doc} onToggle={(d) => toggleTask(doc.id, t.id, d)} />
              ))}
            </ul>
          </Card>
        </Section>
      )}
    </div>
  );
}

function DetailsTab({ doc }: { doc: StoredDocument }) {
  const { details, dates } = doc.analysis;
  const dated = dates.filter((d) => d.iso);
  return (
    <div className="grid gap-x-10 gap-y-10 lg:grid-cols-2">
      <Section title="Do not overlook" count={details.dontOverlook.length} hint="Fees, penalties, automatic renewals and other consequences.">
        <InsightList items={details.dontOverlook} empty="No penalties or easily missed consequences were found." />
      </Section>
      <Section title="Documents you may need" count={details.documentsNeeded.length} hint="Items the document asks you to provide or bring.">
        {details.documentsNeeded.length ? (
          <Card className="px-5 py-2">
            <ul className="divide-y divide-line">
              {details.documentsNeeded.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-2.5 text-[14.5px]">
                    <Icon name="doc" size={15} className="text-ink-3" />
                    <span className="truncate">{d.text}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    {d.basis !== "stated" && <BasisMark basis={d.basis} short />}
                    <SourceChip source={d.source} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-[13.5px] text-ink-3">The document does not ask for any supporting documents.</p>
        )}
      </Section>
      <Section title="Requirements" count={details.requirements.length} hint="What the document says must, or must not, happen.">
        <InsightList items={details.requirements} empty="No explicit requirements were found." />
      </Section>
      <Section title="Conditions" count={details.conditions.length} hint="Things that apply only if something else is true.">
        <InsightList items={details.conditions} empty="No conditions were found." />
      </Section>
      <div className="lg:col-span-2">
        <Section title="Dates mentioned" count={dated.length}>
          {dated.length ? (
            <Card className="px-5 py-2">
              <ul className="divide-y divide-line">
                {[...dated].sort((a, b) => a.iso!.localeCompare(b.iso!)).map((d) => (
                  <li key={d.id} className="grid gap-x-5 gap-y-1 py-3 sm:grid-cols-[150px_1fr_auto] sm:items-center">
                    <span className="tabular text-[14px] font-medium">{formatDate(d.iso!)}</span>
                    <span className="text-[14px] text-ink-2">{d.label}</span>
                    <span className="flex items-center gap-2.5">
                      <BasisMark basis={d.basis} short />
                      <SourceChip source={d.source} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-[13.5px] text-ink-3">No calendar dates appear in this document.</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function SimplifyTab({ doc }: { doc: StoredDocument }) {
  const [query, setQuery] = useState("");
  const terms = doc.analysis.glossary;
  const q = query.trim().toLowerCase();
  const filtered = q ? terms.filter((t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)) : terms;
  const own = filtered.filter((t) => t.basis !== "interpreted");
  const general = filtered.filter((t) => t.basis === "interpreted");

  if (!terms.length) {
    return (
      <EmptyState icon="book" title="Nothing to simplify">
        No specialised or legal terminology was recognised in this document.
      </EmptyState>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <label className="flex items-center gap-2.5 rounded-full border border-line-strong bg-raised px-4 py-2.5 focus-within:border-ink-3">
        <Icon name="search" size={16} className="text-ink-3" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${terms.length} terms`} aria-label="Search terms" className="flex-1 bg-transparent text-sm bare-focus outline-none placeholder:text-ink-3" />
      </label>
      {filtered.length === 0 && <p className="mt-8 text-center text-sm text-ink-3">No term matches &ldquo;{query}&rdquo;.</p>}
      {own.length > 0 && (
        <div className="mt-8">
          <Section title="Defined by this document" count={own.length} hint="Names and terms the document gives its own meaning to.">
            <TermList terms={own} />
          </Section>
        </div>
      )}
      {general.length > 0 && (
        <div className="mt-9">
          <Section title="Terms explained" count={general.length} hint="General meanings in plain language. They are explanations, not quotes: the document may use a term more narrowly.">
            <TermList terms={general} />
          </Section>
        </div>
      )}
    </div>
  );
}

function TermList({ terms }: { terms: Term[] }) {
  return (
    <Card className="px-5 py-1">
      <dl className="divide-y divide-line">
        {terms.map((t) => (
          <div key={t.id} className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[170px_1fr]">
            <dt className="font-display text-[18px] leading-snug">{t.term}</dt>
            <dd>
              <p className="text-[14.5px] leading-relaxed text-ink-2">{t.definition}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <BasisMark basis={t.basis} short />
                <SourceChip source={t.source} label={t.basis === "interpreted" ? "Where it appears" : undefined} />
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function DeadlinesTab({ doc }: { doc: StoredDocument }) {
  const entries = allDates([doc]);
  const [filter, setFilter] = useState<"all" | "deadlines" | "starred">("all");
  const shown = entries.filter((e) => (filter === "deadlines" ? e.date.kind === "deadline" : filter === "starred" ? e.date.starred : true));

  if (!entries.length) {
    return (
      <EmptyState icon="calendar" title="No dates found">
        This document does not mention any dates or deadlines.
      </EmptyState>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: `All ${entries.length}` },
            { id: "deadlines", label: `Deadlines ${entries.filter((e) => e.date.kind === "deadline").length}` },
            { id: "starred", label: `Important ${entries.filter((e) => e.date.starred).length}` },
          ]}
        />
        <ExportButton entries={shown} filename={`${doc.name.replace(/\.[a-z]+$/i, "")} - dates`} />
      </div>
      {shown.length ? <Timeline entries={shown} /> : <p className="py-10 text-center text-sm text-ink-3">Nothing matches this filter. Star a date to mark it as important.</p>}
    </div>
  );
}

export function FilterPills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ id: T; label: string }> }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`tabular h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
            value === o.id ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

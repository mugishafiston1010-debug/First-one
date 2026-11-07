"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { ChecklistGroup } from "@/content/checklist";
import { createLocalProgressStore, type ProgressStore } from "@/lib/checklist-store";

type L = { progress: string; reset: string; resetConfirm: string };

export function Checklist({ groups, labels }: { groups: ChecklistGroup[]; labels: L }) {
  // One store per mount. Later: swap for an account-backed store with the same interface.
  const store = useMemo<ProgressStore>(() => createLocalProgressStore(), []);
  const done = useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const count = groups.reduce((n, g) => n + g.items.filter((i) => done.has(i.id)).length, 0);
  const pct = total ? Math.round((count / total) * 100) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="card p-6">
          <div className="flex items-end justify-between">
            <p className="font-display text-4xl font-extrabold text-ink" aria-live="polite">{ready ? pct : 0}%</p>
            <p className="text-sm text-muted">{ready ? count : 0}/{total} {labels.progress}</p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-brand-50" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-leaf-500 transition-all duration-500" style={{ width: `${ready ? pct : 0}%` }} />
          </div>
          <nav className="mt-6 hidden space-y-1 lg:block" aria-label="Checklist sections">
            {groups.map((g) => {
              const n = g.items.filter((i) => done.has(i.id)).length;
              return (
                <a key={g.id} href={`#cl-${g.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas">
                  {g.title}<span className={`text-xs ${n === g.items.length ? "font-semibold text-leaf-600" : "text-muted"}`}>{ready ? n : 0}/{g.items.length}</span>
                </a>
              );
            })}
          </nav>
          <button type="button" onClick={() => confirm(labels.resetConfirm) && store.reset()} className="btn-ghost btn-sm mt-6 w-full"><RotateCcw className="h-3.5 w-3.5" />{labels.reset}</button>
        </div>
      </aside>

      <div className="space-y-8">
        {groups.map((g, gi) => (
          <section key={g.id} id={`cl-${g.id}`} className="scroll-mt-24" aria-labelledby={`h-${g.id}`}>
            <h2 id={`h-${g.id}`} className="mb-3 flex items-center gap-3 text-xl font-extrabold text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">{gi + 1}</span>{g.title}
            </h2>
            <ul className="card divide-y divide-line overflow-hidden">
              {g.items.map((it) => {
                const checked = ready && done.has(it.id);
                return (
                  <li key={it.id} className={`flex gap-4 p-4 transition sm:p-5 ${checked ? "bg-leaf-50/50" : ""}`}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-labelledby={`t-${it.id}`}
                      onClick={() => store.toggle(it.id)}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${checked ? "border-leaf-500 bg-leaf-500 text-white" : "border-slate-300 bg-white hover:border-brand-400"}`}
                    >
                      {checked && <Check className="h-4 w-4" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0">
                      <p id={`t-${it.id}`} onClick={() => store.toggle(it.id)} className={`cursor-pointer font-medium ${checked ? "text-muted line-through decoration-leaf-500/60" : "text-ink"}`}>{it.title}</p>
                      {it.detail && <p className="mt-1 text-sm text-muted">{it.detail}</p>}
                      {it.link && <Link href={it.link.href} className="mt-1.5 inline-block text-sm font-semibold text-brand-600 hover:underline">{it.link.label} →</Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

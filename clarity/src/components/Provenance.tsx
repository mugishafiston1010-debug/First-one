"use client";

/**
 * Provenance UI: how Clarity shows where a piece of information comes from.
 * A filled dot means the document says it; a ring means it is an
 * interpretation; a dashed ring means it needs checking against the source.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { normalize } from "@/lib/text";
import { locator, type Basis, type SourceRef, type StoredDocument } from "@/lib/types";
import { Icon } from "./ui";

export const BASIS_LABEL: Record<Basis, string> = {
  stated: "Stated in the document",
  interpreted: "Interpretation",
  verify: "Needs verification",
};

const BASIS_HELP: Record<Basis, string> = {
  stated: "Taken directly from the text. Open the source to read it in context.",
  interpreted: "An explanation or summary produced by the analysis engine, not a quote.",
  verify: "Could not be fully confirmed against the text, or the text is ambiguous. Check the source before relying on it.",
};

export function BasisGlyph({ basis, size = 9 }: { basis: Basis; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 10 10", "aria-hidden": true } as const;
  if (basis === "stated") return <svg {...common} className="text-ink"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>;
  if (basis === "interpreted")
    return <svg {...common} className="text-ink-2"><circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
  return (
    <svg {...common} className="text-accent">
      <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 1.6" />
    </svg>
  );
}

export function BasisMark({ basis, short = false }: { basis: Basis; short?: boolean }) {
  return (
    <span title={BASIS_HELP[basis]} className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${basis === "verify" ? "text-accent-ink" : "text-ink-3"}`}>
      <BasisGlyph basis={basis} />
      {short ? { stated: "Stated", interpreted: "Interpretation", verify: "Verify" }[basis] : BASIS_LABEL[basis]}
    </span>
  );
}

export function BasisLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
      {(["stated", "interpreted", "verify"] as Basis[]).map((b) => (
        <BasisMark key={b} basis={b} />
      ))}
    </div>
  );
}

// ---- Source viewer --------------------------------------------------------

interface SourceContextValue {
  open(ref: SourceRef): void;
  doc: StoredDocument;
}

const SourceContext = createContext<SourceContextValue | null>(null);

export function useSource() {
  return useContext(SourceContext);
}

/** Button that opens the source viewer at the cited passage. */
export function SourceChip({ source, label }: { source?: SourceRef; label?: string }) {
  const ctx = useSource();
  if (!source || !ctx) return null;
  return (
    <button
      type="button"
      onClick={() => ctx.open(source)}
      title="Show this passage in the document"
      className="tabular inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 text-[11.5px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent-ink"
    >
      <Icon name="quote" size={11} />
      {label ?? locator(ctx.doc, source)}
    </button>
  );
}

/** Footer row shown under most extracted items: basis + source + optional note. */
export function Provenance({ basis, source, note }: { basis: Basis; source?: SourceRef; note?: string }) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <BasisMark basis={basis} short />
        <SourceChip source={source} />
      </div>
      {note && <p className="mt-1.5 text-[12.5px] leading-snug text-accent-ink">{note}</p>}
    </div>
  );
}

function highlight(text: string, quote: string): ReactNode {
  // Match ignoring whitespace differences by mapping normalised offsets back.
  const target = normalize(quote).toLowerCase();
  if (target.length < 4) return text;
  let norm = "";
  const map: number[] = [];
  let lastSpace = true;
  for (let i = 0; i < text.length; i++) {
    const ch = normalize(text[i]) || (/\s/.test(text[i]) ? " " : "");
    if (ch === "" || ch === " ") {
      if (!lastSpace) {
        norm += " ";
        map.push(i);
        lastSpace = true;
      }
      continue;
    }
    for (const c of ch) {
      norm += c.toLowerCase();
      map.push(i);
    }
    lastSpace = false;
  }
  const at = norm.indexOf(target);
  if (at < 0) return text;
  const start = map[at];
  const end = (map[at + target.length - 1] ?? text.length - 1) + 1;
  return (
    <>
      {text.slice(0, start)}
      <mark className="cite">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

export function SourceProvider({ doc, children }: { doc: StoredDocument; children: ReactNode }) {
  const [active, setActive] = useState<SourceRef | null>(null);
  const value = useMemo(() => ({ open: setActive, doc }), [doc]);
  return (
    <SourceContext.Provider value={value}>
      {children}
      {active && <SourceDrawer doc={doc} source={active} onClose={() => setActive(null)} />}
    </SourceContext.Provider>
  );
}

function SourceDrawer({ doc, source, onClose }: { doc: StoredDocument; source: SourceRef; onClose: () => void }) {
  const targetRef = useRef<HTMLParagraphElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    targetRef.current?.scrollIntoView({ block: "center" });
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [source, onClose]);

  const found = doc.blocks.some((b) => b.id === source.blockId);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Source passage">
      <button type="button" aria-label="Close source" onClick={onClose} className="absolute inset-0 animate-fade cursor-default bg-black/35 backdrop-blur-[2px]" />
      <aside className="absolute inset-x-0 bottom-0 flex max-h-[86dvh] animate-sheet flex-col rounded-t-3xl border border-line bg-raised shadow-pop sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(560px,92vw)] sm:animate-slide-in sm:rounded-none sm:border-y-0 sm:border-r-0">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <p className="eyebrow">Source · {locator(doc, source)}</p>
            <p className="mt-1 truncate text-sm font-medium">{doc.name}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-ink">
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!found && (
            <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-[13px] text-accent-ink">The cited paragraph could not be located. The full text is shown below.</p>
          )}
          <div className="font-display text-[16.5px] leading-[1.7] text-ink-2">
            {doc.blocks.map((b, i) => {
              const isTarget = b.id === source.blockId;
              const newPage = doc.paged && (i === 0 || doc.blocks[i - 1].page !== b.page);
              return (
                <div key={b.id}>
                  {newPage && (
                    <div className="eyebrow my-5 flex items-center gap-3 font-sans first:mt-0">
                      <span>Page {b.page}</span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  <p
                    ref={isTarget ? targetRef : undefined}
                    className={`relative mb-3 scroll-mt-10 ${b.heading ? "font-sans text-[12px] font-semibold uppercase tracking-wider text-ink-3" : ""} ${
                      isTarget ? "-mx-3 rounded-lg border-l-2 border-accent bg-accent-soft/40 px-3 py-2 text-ink" : ""
                    }`}
                  >
                    {isTarget ? highlight(b.text, source.quote) : b.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <footer className="border-t border-line px-6 py-3 text-[12px] text-ink-3">
          Text as extracted from your file. Layout and images are not shown.
        </footer>
      </aside>
    </div>
  );
}

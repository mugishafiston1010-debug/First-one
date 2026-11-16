"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { EngineError } from "@/lib/analysis";
import { useLibrary } from "@/lib/store/library";
import { locator, type EngineId, type QAMessage, type StoredDocument } from "@/lib/types";
import { CloudConsentDialog } from "./CloudConsent";
import { useSource } from "./Provenance";
import { Button, Icon, Spinner } from "./ui";

function suggestions(doc: StoredDocument): string[] {
  const out: string[] = [];
  const dated = doc.analysis.tasks.find((t) => t.due);
  if (dated) out.push(`When do I need to ${dated.title.charAt(0).toLowerCase()}${dated.title.slice(1).replace(/…$/, "")}?`);
  if (doc.analysis.details.documentsNeeded.length) out.push("Which documents do I need to provide?");
  if (/\$|€|£|₽|\bfee\b|\bpay/i.test(doc.blocks.map((b) => b.text).join(" "))) out.push("How much do I have to pay?");
  if (doc.analysis.details.dontOverlook.length) out.push("What happens if I miss a deadline?");
  out.push("How can this be cancelled or ended?");
  return out.slice(0, 4);
}

export function AskPanel({ doc }: { doc: StoredDocument }) {
  const { askQuestion, clearConversation, status } = useLibrary();
  const source = useSource();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<EngineId>(doc.analysis.engine === "claude" && status.claude ? "claude" : "local");
  const [consentFor, setConsentFor] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!status.claude && engine === "claude") setEngine("local");
  }, [status.claude, engine]);

  useEffect(() => {
    if (doc.qa.length || pending) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [doc.qa.length, pending]);

  const send = async (question: string, confirmed = false) => {
    const q = question.trim();
    if (q.length < 2 || pending) return;
    if (engine === "claude" && !doc.cloudConsent && !confirmed) {
      setConsentFor(q);
      return;
    }
    setError(null);
    setPending(q);
    setText("");
    try {
      await askQuestion(doc.id, q, engine);
    } catch (err) {
      setError(err instanceof EngineError ? err.message : "The question could not be answered because of an unexpected error.");
      setText(q);
    } finally {
      setPending(null);
      inputRef.current?.focus();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  const empty = doc.qa.length === 0 && !pending;

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      {/* Where the question goes */}
      <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-[12.5px] text-ink-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-start gap-2">
          <Icon name={engine === "claude" ? "cloud" : "device"} size={15} className="mt-px text-ink-3" />
          {engine === "claude"
            ? "Answers come from Claude. Each question is sent to Anthropic together with the document text."
            : "Answers are found on this device by matching your question to passages. They are quotes, not reasoning."}
        </span>
        {status.claude && (
          <span className="inline-flex shrink-0 self-start rounded-full border border-line bg-raised p-0.5" role="radiogroup" aria-label="Answer engine">
            {(["local", "claude"] as EngineId[]).map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={engine === id}
                onClick={() => setEngine(id)}
                className={`h-7 rounded-full px-3 text-[12px] font-medium transition-colors ${engine === id ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
              >
                {id === "local" ? "On device" : "Claude"}
              </button>
            ))}
          </span>
        )}
      </div>

      {empty ? (
        <div className="animate-rise py-6 text-center">
          <h3 className="font-display text-[26px] leading-tight">Ask this document anything</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
            Every answer points to the passage it comes from. If the document does not say, Clarity tells you so instead of guessing.
          </p>
          <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
            {suggestions(doc).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-full border border-line bg-surface px-3.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="space-y-6 pb-2" aria-live="polite">
          <li className="flex justify-end">
            <Button variant="ghost" size="sm" icon="trash" onClick={() => clearConversation(doc.id)}>
              Clear conversation
            </Button>
          </li>
          {doc.qa.map((m) => (
            <Message key={m.id} message={m} doc={doc} onOpen={(c) => source?.open(c)} />
          ))}
          {pending && (
            <>
              <li className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14.5px] text-bg">{pending}</p>
              </li>
              <li className="flex items-center gap-2.5 text-[13px] text-ink-2" role="status">
                <Spinner size={14} />
                {engine === "claude" ? "Asking Claude…" : "Searching the document…"}
              </li>
            </>
          )}
        </ol>
      )}
      <div ref={endRef} />

      {error && (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-accent-soft px-4 py-3 text-[13px] text-accent-ink">
          <Icon name="alert" size={15} className="mt-0.5" />
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="sticky bottom-[64px] z-10 -mx-2 mt-6 bg-gradient-to-t from-bg from-70% to-transparent px-2 pb-3 pt-6 lg:bottom-0 lg:pb-6">
        <div className="flex items-end gap-2 rounded-[26px] border border-line-strong bg-raised p-2 pl-5 shadow-card focus-within:border-ink-3">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Ask about this document…"
            aria-label="Your question"
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-[15px] bare-focus outline-none placeholder:text-ink-3"
          />
          <button
            type="submit"
            disabled={text.trim().length < 2 || !!pending}
            aria-label="Ask"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-opacity disabled:opacity-30"
          >
            <Icon name="send" size={17} />
          </button>
        </div>
      </form>

      <CloudConsentDialog
        open={consentFor !== null}
        name={doc.name}
        chars={doc.charCount}
        model={status.model}
        purpose="ask"
        onCancel={() => setConsentFor(null)}
        onConfirm={() => {
          const q = consentFor;
          setConsentFor(null);
          if (q) void send(q, true);
        }}
      />
    </div>
  );
}

function Message({ message, doc, onOpen }: { message: QAMessage; doc: StoredDocument; onOpen: (c: { page: number; blockId: number; quote: string }) => void }) {
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14.5px] text-bg">{message.text}</p>
      </li>
    );
  }
  const citations = message.citations ?? [];
  const answerable = message.answerable !== false;
  return (
    <li className="animate-rise" data-testid="answer" data-answerable={answerable}>
      {!answerable && (
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent-ink">
          <Icon name="info" size={12} />
          Not in the document
        </p>
      )}
      {answerable && message.engine === "local" ? (
        <blockquote className="font-display border-l-2 border-ink pl-4 text-[18px] leading-relaxed">{message.text}</blockquote>
      ) : (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.text}</p>
      )}

      {citations.length > 0 && (
        <div className="mt-3.5">
          <p className="eyebrow">{answerable ? "Supporting passages" : "Closest passages"}</p>
          <ul className="mt-2 space-y-2">
            {citations.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onOpen(c)}
                  className="group flex w-full items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-accent"
                >
                  <span className="tabular mt-0.5 shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-2 group-hover:bg-accent-soft group-hover:text-accent-ink">
                    {locator(doc, c)}
                  </span>
                  <span className="line-clamp-3 text-[13px] leading-relaxed text-ink-2">&ldquo;{c.quote}&rdquo;</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2.5 text-[11.5px] text-ink-3">
        {message.engine === "claude" ? "Answered by Claude · quotes verified against the document" : answerable ? "Quoted from the document on this device" : "Searched on this device"}
        {message.droppedCitations ? ` · ${message.droppedCitations} unverifiable quote${message.droppedCitations === 1 ? "" : "s"} removed` : ""}
      </p>
    </li>
  );
}

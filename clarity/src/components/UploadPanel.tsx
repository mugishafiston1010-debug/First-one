"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { EngineError } from "@/lib/analysis";
import { ACCEPT_ATTRIBUTE, ExtractionError } from "@/lib/extract";
import { useLibrary, type ImportStage } from "@/lib/store/library";
import type { EngineId, ExtractedDocument } from "@/lib/types";
import { CloudConsentDialog } from "./CloudConsent";
import { Button, Icon, useToast } from "./ui";

type State =
  | { kind: "idle" }
  | { kind: "working"; name: string; stage: ImportStage }
  | { kind: "consent"; extracted: ExtractedDocument }
  | { kind: "error"; title: string; hint?: string; extracted?: ExtractedDocument };

const STAGE_LABEL: Record<ImportStage, string> = {
  reading: "Reading the file on this device…",
  analysing: "Finding actions, dates and conditions…",
  saving: "Saving to this browser…",
};

export function UploadPanel() {
  const { extract, analyseAndStore, status } = useLibrary();
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const [engine, setEngine] = useState<EngineId>("local");
  const dragDepth = useRef(0);

  const run = useCallback(
    async (extracted: ExtractedDocument, chosen: EngineId) => {
      setState({ kind: "working", name: extracted.name, stage: "analysing" });
      try {
        const doc = await analyseAndStore(extracted, chosen, (stage) => setState({ kind: "working", name: extracted.name, stage }));
        toast(`${doc.analysis.tasks.length} action${doc.analysis.tasks.length === 1 ? "" : "s"} and ${doc.analysis.dates.length} date${doc.analysis.dates.length === 1 ? "" : "s"} found`);
        setState({ kind: "idle" });
        router.push(`/d/${doc.id}`);
      } catch (err) {
        setState({
          kind: "error",
          title: chosen === "claude" ? "Claude could not analyse this document." : "The analysis failed.",
          hint: err instanceof EngineError ? err.message : "An unexpected error occurred. Nothing was saved.",
          extracted,
        });
      }
    },
    [analyseAndStore, router, toast],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setState({ kind: "working", name: file.name, stage: "reading" });
      let extracted: ExtractedDocument;
      try {
        extracted = await extract(file);
      } catch (err) {
        setState(
          err instanceof ExtractionError
            ? { kind: "error", title: err.message, hint: err.hint }
            : { kind: "error", title: "This file could not be read.", hint: "An unexpected error occurred while reading it. Nothing was uploaded or saved." },
        );
        return;
      }
      if (engine === "claude" && status.claude) setState({ kind: "consent", extracted });
      else await run(extracted, "local");
    },
    [engine, extract, run, status.claude],
  );

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    if (files.length > 1) toast("One document at a time: analysing the first file.");
    void handleFile(files[0]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (state.kind === "working") return;
    onFiles(e.dataTransfer.files);
  };

  const busy = state.kind === "working";

  return (
    <div>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={onDrop}
        data-testid="dropzone"
        className={`relative overflow-hidden rounded-3xl border bg-surface transition-[border-color,box-shadow,transform] duration-200 ${
          dragging ? "scale-[1.005] border-accent shadow-card" : "border-line"
        }`}
      >
        <div className="pointer-events-none absolute inset-3 rounded-[18px] border border-dashed border-line-strong" />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          aria-label="Choose a document"
          data-testid="file-input"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="relative flex min-h-[248px] flex-col items-center justify-center px-6 py-10 text-center">
          {state.kind === "working" ? (
            <div className="w-full max-w-sm animate-fade" role="status" aria-live="polite">
              <p className="truncate text-sm font-medium">{state.name}</p>
              <div className="progress-sweep mt-4 h-1 w-full rounded-full bg-sunken" />
              <p className="mt-3 text-[13px] text-ink-2">{STAGE_LABEL[state.stage]}</p>
            </div>
          ) : state.kind === "error" ? (
            <div className="max-w-md animate-fade" role="alert">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-accent-soft text-accent-ink">
                <Icon name="alert" size={20} />
              </span>
              <p className="font-display mt-4 text-[22px] leading-tight">{state.title}</p>
              {state.hint && <p className="mt-2 text-sm text-ink-2">{state.hint}</p>}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {state.extracted && (
                  <Button variant="primary" icon="device" onClick={() => void run(state.extracted!, "local")}>
                    Analyse on this device instead
                  </Button>
                )}
                <Button onClick={() => setState({ kind: "idle" })}>Choose another file</Button>
              </div>
            </div>
          ) : (
            <>
              <span className={`grid size-12 place-items-center rounded-full transition-colors duration-200 ${dragging ? "bg-accent text-on-accent" : "bg-ink text-bg"}`}>
                <Icon name="upload" size={20} />
              </span>
              <p className="font-display mt-5 text-[26px] leading-tight">{dragging ? "Drop it to begin" : "Drop a document here"}</p>
              <p className="mt-1.5 text-sm text-ink-2">A contract, a letter, a policy, a notice. PDF, DOCX, TXT or Markdown, up to 25 MB.</p>
              <Button variant="primary" className="mt-6" onClick={() => inputRef.current?.click()}>
                Choose a file
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Engine choice: always visible, so it is clear where the document goes. */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex shrink-0 self-start rounded-full border border-line bg-surface p-0.5" role="radiogroup" aria-label="Analysis engine">
          <EngineOption active={engine === "local"} onClick={() => setEngine("local")} icon="device" disabled={busy}>
            On this device
          </EngineOption>
          <EngineOption
            active={engine === "claude"}
            onClick={() => setEngine("claude")}
            icon="cloud"
            disabled={busy || !status.claude}
            title={status.claude ? undefined : "Not available: this server has no Anthropic API key configured"}
          >
            Claude AI
          </EngineOption>
        </div>
        <p className="text-[12.5px] text-ink-3">
          {engine === "claude" && status.claude
            ? "The document text will be sent to Anthropic. You will be asked to confirm first."
            : status.claude
              ? "The file is read and analysed in your browser. Nothing is uploaded."
              : "Demo mode: files are read and analysed in your browser. Nothing is uploaded."}
        </p>
      </div>

      {state.kind === "consent" && (
        <CloudConsentDialog
          open
          name={state.extracted.name}
          chars={state.extracted.charCount}
          model={status.model}
          purpose="analyse"
          onCancel={() => setState({ kind: "idle" })}
          onLocal={() => void run(state.extracted, "local")}
          onConfirm={() => void run(state.extracted, "claude")}
        />
      )}
    </div>
  );
}

function EngineOption({
  active,
  onClick,
  icon,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: "device" | "cloud";
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors ${
        active ? "bg-ink text-bg" : "text-ink-2 hover:text-ink disabled:text-ink-3 disabled:opacity-60"
      }`}
    >
      <Icon name={icon} size={14} />
      {children}
    </button>
  );
}

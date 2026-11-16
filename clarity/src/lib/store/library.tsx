"use client";

/**
 * The library: all documents on this device, loaded from IndexedDB once and
 * kept in memory. Every change is written back immediately.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { analyze, ask, fetchStatus, type EngineStatus } from "../analysis";
import { extractDocument } from "../extract";
import { SAMPLE_SOURCES, buildSample } from "../samples";
import type { EngineId, ExtractedDocument, QAMessage, StoredDocument } from "../types";
import { deleteAllDocuments, deleteDocument, destroyDatabase, loadDocuments, saveDocument } from "./db";
import { appendMessages, replaceAnalysis, setDateDone, setDateStarred, setTaskDone } from "./mutations";

export type ImportStage = "reading" | "analysing" | "saving";

interface LibraryValue {
  ready: boolean;
  /** Set when local storage cannot be used; the app then works for this session only. */
  storageError: string | null;
  docs: StoredDocument[];
  status: EngineStatus;
  /** Read a file on this device. No network involved. */
  extract(file: File): Promise<ExtractedDocument>;
  /** Analyse extracted text with the chosen engine and store the result. */
  analyseAndStore(extracted: ExtractedDocument, engine: EngineId, onStage?: (s: ImportStage) => void): Promise<StoredDocument>;
  reanalyse(id: string, engine: EngineId): Promise<void>;
  askQuestion(id: string, question: string, engine: EngineId): Promise<void>;
  clearConversation(id: string): void;
  toggleTask(docId: string, taskId: string, done: boolean): void;
  toggleDate(docId: string, dateId: string, done: boolean): void;
  starDate(docId: string, dateId: string, starred: boolean): void;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
  loadSamples(): Promise<StoredDocument[]>;
}

const LibraryContext = createContext<LibraryValue | null>(null);

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function messageId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [status, setStatus] = useState<EngineStatus>({ claude: false, model: null });
  const docsRef = useRef<StoredDocument[]>([]);
  docsRef.current = docs;

  useEffect(() => {
    let cancelled = false;
    loadDocuments()
      .then((loaded) => !cancelled && setDocs(loaded))
      .catch((err: unknown) => !cancelled && setStorageError(err instanceof Error ? err.message : "Local storage is unavailable."))
      .finally(() => !cancelled && setReady(true));
    void fetchStatus().then((s) => !cancelled && setStatus(s));
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((doc: StoredDocument) => {
    saveDocument(doc).catch((err: unknown) =>
      setStorageError(err instanceof Error ? `Changes could not be saved: ${err.message}` : "Changes could not be saved."),
    );
  }, []);

  const commit = useCallback(
    (id: string, mutate: (doc: StoredDocument) => StoredDocument) => {
      const current = docsRef.current.find((d) => d.id === id);
      if (!current) return;
      const next = mutate(current);
      docsRef.current = docsRef.current.map((d) => (d.id === id ? next : d));
      setDocs(docsRef.current);
      persist(next);
    },
    [persist],
  );

  const put = useCallback(
    (doc: StoredDocument) => {
      docsRef.current = [doc, ...docsRef.current.filter((d) => d.id !== doc.id)];
      setDocs(docsRef.current);
      persist(doc);
    },
    [persist],
  );

  const value = useMemo<LibraryValue>(
    () => ({
      ready,
      storageError,
      docs,
      status,
      extract: (file) => extractDocument(file),
      async analyseAndStore(extracted, engine, onStage) {
        onStage?.("analysing");
        // Let the progress state paint before the (synchronous) local engine runs.
        await new Promise((r) => setTimeout(r, 30));
        const analysis = await analyze(extracted, engine);
        onStage?.("saving");
        const doc: StoredDocument = {
          ...extracted,
          id: newId(),
          addedAt: new Date().toISOString(),
          analysis,
          qa: [],
          ...(engine === "claude" ? { cloudConsent: true } : {}),
        };
        put(doc);
        return doc;
      },
      async reanalyse(id, engine) {
        const doc = docsRef.current.find((d) => d.id === id);
        if (!doc) return;
        const analysis = await analyze(doc, engine);
        commit(id, (d) => ({ ...replaceAnalysis(d, analysis), ...(engine === "claude" ? { cloudConsent: true } : {}) }));
      },
      async askQuestion(id, question, engine) {
        const doc = docsRef.current.find((d) => d.id === id);
        if (!doc) return;
        const userMessage: QAMessage = { id: messageId(), role: "user", text: question, at: new Date().toISOString() };
        commit(id, (d) => appendMessages(d, userMessage));
        try {
          const answer = await ask(doc, question, doc.qa, engine);
          commit(id, (d) =>
            appendMessages(d, {
              id: messageId(),
              role: "assistant",
              text: answer.text,
              at: new Date().toISOString(),
              answerable: answer.answerable,
              citations: answer.citations,
              engine,
              ...(answer.droppedCitations ? { droppedCitations: answer.droppedCitations } : {}),
            }),
          );
        } catch (err) {
          // Do not leave an unanswered question in the history.
          commit(id, (d) => ({ ...d, qa: d.qa.filter((m) => m.id !== userMessage.id) }));
          throw err;
        }
      },
      clearConversation: (id) => commit(id, (d) => ({ ...d, qa: [] })),
      toggleTask: (docId, taskId, done) => commit(docId, (d) => setTaskDone(d, taskId, done)),
      toggleDate: (docId, dateId, done) => commit(docId, (d) => setDateDone(d, dateId, done)),
      starDate: (docId, dateId, starred) => commit(docId, (d) => setDateStarred(d, dateId, starred)),
      async remove(id) {
        docsRef.current = docsRef.current.filter((d) => d.id !== id);
        setDocs(docsRef.current);
        await deleteDocument(id);
      },
      async removeAll() {
        docsRef.current = [];
        setDocs([]);
        await deleteAllDocuments();
        await destroyDatabase();
        try {
          for (const key of Object.keys(localStorage)) if (key.startsWith("clarity:")) localStorage.removeItem(key);
        } catch {
          /* storage may be unavailable */
        }
      },
      async loadSamples() {
        const created: StoredDocument[] = [];
        for (const [i, source] of SAMPLE_SOURCES.entries()) {
          const extracted = buildSample(source);
          const analysis = await analyze(extracted, "local");
          const doc: StoredDocument = {
            ...extracted,
            // Stagger timestamps so the samples keep a stable order.
            addedAt: new Date(Date.now() - i * 1000).toISOString(),
            isSample: true,
            analysis,
            qa: [],
          };
          created.push(doc);
        }
        for (const doc of [...created].reverse()) put(doc);
        return created;
      },
    }),
    [ready, storageError, docs, status, commit, put],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}

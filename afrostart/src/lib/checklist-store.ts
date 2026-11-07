import { ALL_ITEM_IDS, CHECKLIST_VERSION } from "@/content/checklist";

/**
 * Where checklist progress lives. The UI only depends on this interface, so a future
 * account-backed store (saving to the database) can replace localStorage without UI changes.
 */
export interface ProgressStore {
  get(): Set<string>;
  getServerSnapshot(): Set<string>;
  subscribe(cb: () => void): () => void;
  toggle(id: string): void;
  reset(): void;
}

const KEY = "afrostart.checklist";
const EMPTY = new Set<string>();

export function parseProgress(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const data = JSON.parse(raw) as { v?: number; done?: unknown };
    if (!Array.isArray(data.done)) return new Set();
    const known = new Set(ALL_ITEM_IDS);
    return new Set(data.done.filter((x): x is string => typeof x === "string" && known.has(x)));
  } catch {
    return new Set();
  }
}

export function serializeProgress(done: Set<string>): string {
  return JSON.stringify({ v: CHECKLIST_VERSION, done: [...done], updatedAt: new Date().toISOString() });
}

export function createLocalProgressStore(): ProgressStore {
  let cache: Set<string> | null = null;
  const listeners = new Set<() => void>();
  const read = () => {
    try { return parseProgress(localStorage.getItem(KEY)); } catch { return new Set<string>(); }
  };
  const write = (s: Set<string>) => {
    cache = s;
    try { localStorage.setItem(KEY, serializeProgress(s)); } catch { /* storage blocked: keep in memory */ }
    listeners.forEach((l) => l());
  };
  return {
    get: () => (cache ??= read()),
    getServerSnapshot: () => EMPTY,
    subscribe(cb) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = read(); cb(); } };
      window.addEventListener("storage", onStorage);
      return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
    },
    toggle(id) {
      const next = new Set(cache ?? read());
      if (next.has(id)) next.delete(id); else next.add(id);
      write(next);
    },
    reset: () => write(new Set()),
  };
}

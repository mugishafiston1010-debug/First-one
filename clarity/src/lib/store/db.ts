/**
 * Persistence. Documents and everything derived from them live in the
 * browser's IndexedDB - on this device only. There is no server database.
 */
import type { StoredDocument } from "../types";

const DB_NAME = "clarity";
const DB_VERSION = 1;
const STORE = "documents";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not support local storage (IndexedDB)."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open local storage."));
    req.onblocked = () => reject(new Error("Local storage is blocked by another open tab."));
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error ?? new Error("Local storage request failed."));
      tx.onabort = () => reject(tx.error ?? new Error("Local storage request was aborted."));
    });
  } finally {
    db.close();
  }
}

export async function loadDocuments(): Promise<StoredDocument[]> {
  const all = (await run<StoredDocument[]>("readonly", (s) => s.getAll())) ?? [];
  return all.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export async function saveDocument(doc: StoredDocument): Promise<void> {
  await run("readwrite", (s) => s.put(doc));
}

export async function deleteDocument(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

export async function deleteAllDocuments(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}

/** Removes the database itself, leaving nothing behind. */
export function destroyDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("Could not delete local storage."));
    req.onblocked = () => resolve();
  });
}

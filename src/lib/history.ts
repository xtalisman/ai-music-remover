/* Browser-local job history (IndexedDB). No login, no server.
   Stores result stems as WAV blobs so past jobs can be re-downloaded
   while they remain in browser storage. */

export interface HistoryEntry {
  id: string;
  tool: string;
  fileName: string;
  createdAt: number;
  durationSec: number;
  stems: Record<string, Blob>; // stem name -> WAV blob
}

const DB_NAME = 'aimr-history';
const STORE = 'jobs';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function saveJob(entry: HistoryEntry): Promise<void> {
  await tx('readwrite', (s) => s.put(entry));
}

export async function listJobs(): Promise<Omit<HistoryEntry, 'stems'>[]> {
  const all = await tx<HistoryEntry[]>('readonly', (s) => s.getAll());
  return (all || [])
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ stems: _stems, ...rest }) => rest);
}

export async function getJob(id: string): Promise<HistoryEntry | undefined> {
  return tx<HistoryEntry | undefined>('readonly', (s) => s.get(id));
}

export async function deleteJob(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

export async function clearJobs(): Promise<void> {
  await tx('readwrite', (s) => s.clear());
}

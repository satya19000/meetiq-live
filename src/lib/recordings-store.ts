import { openDB, type IDBPDatabase } from "idb";

export interface RecordingMeta {
  id: string;
  name: string;
  createdAt: number;
  durationMs: number;
  size: number;
  mimeType: string;
}

export interface RecordingRecord extends RecordingMeta {
  blob: Blob;
}

const DB_NAME = "meetiq-live";
const STORE = "recordings";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveRecording(rec: RecordingRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE, rec);
}

export async function listRecordings(): Promise<RecordingMeta[]> {
  const db = await getDB();
  const all = (await db.getAll(STORE)) as RecordingRecord[];
  return all
    .map(({ blob: _blob, ...meta }) => meta)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRecording(id: string): Promise<RecordingRecord | undefined> {
  const db = await getDB();
  return (await db.get(STORE, id)) as RecordingRecord | undefined;
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

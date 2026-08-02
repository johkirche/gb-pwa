/**
 * Helpers for exercising useOfflineDownload.ts against a real (fake) IndexedDB.
 *
 * Two environment quirks drive the design here:
 *
 * 1. fake-indexeddb clones values with the *global* `structuredClone`, which is
 *    Node's. Node has no idea what happy-dom's `Blob` is, so it degrades one to
 *    a plain `{ type }` object and silently drops the bytes. Node's own `Blob`
 *    IS structured-cloneable, so every blob in these tests is a Node Blob.
 * 2. fake-indexeddb drives its request queue with `setImmediate`. Vitest's fake
 *    timers fake `setImmediate` by default, which freezes every IndexedDB
 *    transaction. Only ever fake `Date` here (`toFake: ["Date"]`).
 */
import { IDBFactory } from "fake-indexeddb";
import { Blob as NodeBlob } from "node:buffer";

export const DB_NAME = "GesangbuchOfflineDB";
export const CURRENT_DB_VERSION = 3;
export const SONGS_STORE = "songs";
export const PIECES_STORE = "pieces";
export const ASSETS_STORE = "assets";
export const META_STORE = "metadata";
export const META_KEY = "offline-meta";
export const SOUNDFONT_ID_KEY = "gb-pwa.offline.soundfontId";
/** Mirrors the value vitest.config.ts pins for VITE_PUBLIC_DIRECTUS_URL. */
export const DIRECTUS_URL = "https://directus.test";

/* -------------------------------------------------------------------------
 * IndexedDB lifecycle
 * ---------------------------------------------------------------------- */

/**
 * Swap in a brand-new empty fake IndexedDB. Deleting the database instead would
 * block forever whenever a previous module instance still holds a connection
 * open, which it always does after `vi.resetModules()`.
 */
export function resetIndexedDb(): void {
  stashedFactory = null;
  globalThis.indexedDB = new IDBFactory();
}

let stashedFactory: IDBFactory | null = null;

/**
 * Replace `indexedDB` with one that blows up on `open()`.
 *
 * Note this only bites a manager that has not opened its connection yet — the
 * source caches the `IDBDatabase` after the first call, and an already-open
 * connection keeps working. Load a fresh module copy first when you need a
 * *later* operation to fail.
 */
export function breakIndexedDb(message = "IndexedDB unavailable"): void {
  stashedFactory = globalThis.indexedDB;
  globalThis.indexedDB = {
    open() {
      throw new Error(message);
    },
  } as unknown as IDBFactory;
}

/** Undo `breakIndexedDb`, keeping whatever data the real factory still holds. */
export function restoreIndexedDb(): void {
  if (stashedFactory) globalThis.indexedDB = stashedFactory;
  stashedFactory = null;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Open the offline DB directly, bypassing the composable. Pass `version` +
 * `upgrade` to fabricate an older schema; omit both to inspect whatever the
 * source code created.
 */
export function openRaw(
  version?: number,
  upgrade?: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = version === undefined
      ? indexedDB.open(DB_NAME)
      : indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => upgrade?.(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function rawPut(
  db: IDBDatabase,
  store: string,
  value: unknown,
  key?: string,
): Promise<IDBValidKey> {
  const tx = db.transaction([store], "readwrite");
  const os = tx.objectStore(store);
  return promisify(key === undefined ? os.put(value) : os.put(value, key));
}

export function rawGet<T = unknown>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  const tx = db.transaction([store], "readonly");
  return promisify(tx.objectStore(store).get(key) as IDBRequest<T | undefined>);
}

export function rawGetAll<T = unknown>(db: IDBDatabase, store: string): Promise<T[]> {
  const tx = db.transaction([store], "readonly");
  return promisify(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}

/* -------------------------------------------------------------------------
 * Blobs and fetch stubs
 * ---------------------------------------------------------------------- */

/** A Node Blob (see the file header) typed as a DOM Blob for the source code. */
export function makeBlob(bytes: number[], type?: string): Blob {
  return new NodeBlob([new Uint8Array(bytes)], type ? { type } : undefined) as unknown as Blob;
}

export async function bytesOf(blob: Blob | null): Promise<number[] | null> {
  if (!blob) return null;
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

/** Deterministic per-asset payload so a blob can be traced back to its id. */
export function bytesFor(id: string): number[] {
  return Array.from(id).map((c) => c.charCodeAt(0));
}

/** Minimal stand-in for the parts of `Response` the source actually touches. */
export function okResponse(blob: Blob, status = 200): Response {
  return {
    ok: true,
    status,
    blob: async () => blob,
    arrayBuffer: () => blob.arrayBuffer(),
  } as unknown as Response;
}

export function errorResponse(status: number): Response {
  const boom = () => Promise.reject(new Error("body should never be read on a failed response"));
  return {
    ok: false,
    status,
    blob: boom,
    arrayBuffer: boom,
  } as unknown as Response;
}

export function assetUrl(id: string): string {
  return `${DIRECTUS_URL}/assets/${id}`;
}

/* -------------------------------------------------------------------------
 * navigator.storage — happy-dom does not implement it at all
 * ---------------------------------------------------------------------- */

export function setStorageManager(manager: unknown): void {
  Object.defineProperty(navigator, "storage", { configurable: true, value: manager });
}

export function restoreStorageManager(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).storage;
}

/* -------------------------------------------------------------------------
 * Fixtures
 * ---------------------------------------------------------------------- */

export interface FileRef {
  id: string;
  type?: string;
}

export interface SongOptions {
  titel?: string;
  strophen?: string[];
  noten?: FileRef[];
  satz?: FileRef[];
  midiIntro?: FileRef;
  midiMain?: FileRef;
  midiOutro?: FileRef;
}

/** Shaped like the codegen `Gesangbuchlied` in the fields the source reads. */
export function makeSong(id: string, options: SongOptions = {}) {
  return {
    id,
    titel: options.titel ?? `Lied ${id}`,
    melodieId: options.noten
      ? {
          id: `mel-${id}`,
          noten: options.noten.map((f) => ({ id: `n-${f.id}`, directus_files_id: f })),
        }
      : null,
    gesangbuchlied_satz_mit_melodie_und_text:
      options.satz?.map((f) => ({ id: `satz-${f.id}`, directus_files_id: f })) ?? null,
    textId: options.strophen
      ? {
          id: `text-${id}`,
          strophenEinzeln: options.strophen.map((strophe, i) => ({ nummer: i + 1, strophe })),
        }
      : null,
    midi_intro: options.midiIntro ?? null,
    midi_main: options.midiMain ?? null,
    midi_outro: options.midiOutro ?? null,
  };
}

export function makePiece(id: string, midiFile?: FileRef) {
  return {
    id,
    name: `Stück ${id}`,
    komponist: "J. S. Bach",
    dauer_sek: 90,
    tags: [],
    midi_file: midiFile ?? null,
  };
}

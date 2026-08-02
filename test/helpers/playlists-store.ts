/**
 * Helpers for testing src/stores/playlists.ts.
 *
 * The playlist store talks to IndexedDB directly, so the tests need two things
 * the global harness cannot give them: a database that is genuinely empty at the
 * start of every test, and a way to read the persisted rows *without* going back
 * through the store (otherwise "it persisted" would only ever assert that the
 * in-memory array still holds what we just put there).
 */
import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { vi } from "vitest";

import { type Playlist, usePlaylistStore } from "@/stores/playlists";

/**
 * Mirrors the private constants in src/stores/playlists.ts. Duplicated on
 * purpose: these names are the on-disk contract, so a rename in the store should
 * fail the tests rather than silently move the data somewhere else.
 */
export const DB_NAME = "PlaylistsDB";
export const DB_VERSION = 1;
export const STORE_NAME = "playlists";

/**
 * Swap in a brand-new in-memory IndexedDB for the current test.
 *
 * `test/setup.ts` registers fake-indexeddb once per file, which makes the
 * database a per-file singleton — playlists written by one test would still be
 * there in the next. Deleting the database instead is not an option: the store
 * never closes its connection, so `deleteDatabase` would block forever.
 * `unstubGlobals` in vitest.config.ts puts the original factory back afterwards.
 */
export function installFreshIndexedDB(): void {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

/** Replace IndexedDB with one whose `open()` always fails (private mode, quota, corrupt profile). */
export function breakIndexedDB(): void {
  vi.stubGlobal("indexedDB", {
    open: () => {
      const request = {
        error: new Error("IndexedDB unavailable"),
        onerror: null as null | (() => void),
        onsuccess: null as null | (() => void),
        onupgradeneeded: null as null | (() => void),
      };
      // A microtask, so the caller has assigned its handlers by the time we fire.
      queueMicrotask(() => request.onerror?.());
      return request;
    },
  });
}

/**
 * A store instance backed by a fresh pinia — i.e. what the app gets after a
 * reload. The store's IndexedDB connection lives in its setup closure, so this
 * is the only way to exercise "state was rebuilt from disk".
 */
export function newStoreInstance(): ReturnType<typeof usePlaylistStore> {
  setActivePinia(createPinia());
  return usePlaylistStore();
}

function openRawDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    // Same schema the store creates, so a read before the store's first write
    // cannot leave a store-less database behind that the store then chokes on.
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        objectStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

/** Every persisted row, straight out of IndexedDB, in key order. */
export async function readPersistedPlaylists(): Promise<Playlist[]> {
  const db = await openRawDb();
  try {
    return await new Promise<Playlist[]>((resolve, reject) => {
      const request = db.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as Playlist[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** The persisted row for one id, or undefined if it is not on disk. */
export async function readPersisted(id: string): Promise<Playlist | undefined> {
  const rows = await readPersistedPlaylists();
  return rows.find((row) => row.id === id);
}

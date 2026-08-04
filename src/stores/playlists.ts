import { defineStore } from "pinia";

import { computed, ref, toRaw } from "vue";

// A playlist is a user-curated group of Gesangbuchlied IDs. We only store the
// Directus IDs (strings) — the song catalogue is the canonical source, so a
// rename or content update on a song shows up in every playlist automatically.
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  // Free-form visual marker — single emoji glyph the user picks from a curated
  // grid in the create/edit dialog. Stored as a plain string (no normalization)
  // so future picker upgrades can use any unicode without a migration.
  emoji?: string;
  songIds: string[];
  createdAt: string;
  updatedAt: string;
}


const DB_NAME = "PlaylistsDB";
const DB_VERSION = 1;
const PLAYLISTS_STORE = "playlists";

class PlaylistDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
          const store = db.createObjectStore(PLAYLISTS_STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  async putPlaylist(playlist: Playlist): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([PLAYLISTS_STORE], "readwrite");
      const store = tx.objectStore(PLAYLISTS_STORE);
      const req = store.put(playlist);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getPlaylist(id: string): Promise<Playlist | undefined> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([PLAYLISTS_STORE], "readonly");
      const store = tx.objectStore(PLAYLISTS_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as Playlist | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([PLAYLISTS_STORE], "readonly");
      const store = tx.objectStore(PLAYLISTS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as Playlist[]).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deletePlaylist(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([PLAYLISTS_STORE], "readwrite");
      const store = tx.objectStore(PLAYLISTS_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const usePlaylistStore = defineStore("playlists", () => {
  const playlists = ref<Playlist[]>([]);
  const isLoading = ref(false);

  const dbManager = new PlaylistDBManager();
  let dbInitialized = false;

  const initDB = async () => {
    if (!dbInitialized) {
      await dbManager.init();
      dbInitialized = true;
    }
  };

  const loadPlaylists = async () => {
    try {
      isLoading.value = true;
      await initDB();
      playlists.value = await dbManager.getAllPlaylists();
    } catch (error) {
      console.error("Failed to load playlists:", error);
      // Only blank the list if there was nothing to lose. A refresh that fails
      // — a locked database, an eviction, private mode — used to wipe playlists
      // the user could still see and still needed: this store is read during a
      // service, and the reload happens every time the detail view mounts.
      if (playlists.value.length === 0) playlists.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const getPlaylist = (id: string): Playlist | undefined =>
    playlists.value.find((p) => p.id === id);

  // The row a mutation is about to change, resolved through in-memory state
  // first and IndexedDB second. Mutations must not depend on the store having
  // been hydrated: before loadPlaylists() resolves `playlists.value` is empty,
  // and every mutation used to silently no-op against it.
  const readPlaylist = async (id: string): Promise<Playlist | undefined> => {
    const inMemory = getPlaylist(id);
    if (inMemory) return toRaw(inMemory);
    await initDB();
    return dbManager.getPlaylist(id);
  };

  // Mutations run one at a time. Each one reads the row it is about to write
  // only after the previous write has landed, which is what stops two taps in
  // the add-songs picker from both building a new songIds array out of the same
  // stale snapshot and the second overwriting the first.
  let mutationQueue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = mutationQueue.then(task);
    // The queue itself must never reject, or one failed write would skip every
    // mutation queued behind it. The caller still sees `run` reject.
    mutationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const createPlaylist = (
    name: string,
    description?: string,
    emoji?: string,
  ): Promise<Playlist> =>
    enqueue(async () => {
      await initDB();
      const now = new Date().toISOString();
      const playlist: Playlist = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || undefined,
        emoji: emoji || undefined,
        songIds: [],
        createdAt: now,
        updatedAt: now,
      };
      await dbManager.putPlaylist(playlist);
      await loadPlaylists();
      return playlist;
    });

  /**
   * The write half of every patch. Already inside the mutation queue — callers
   * that are themselves queued must use this rather than `updatePlaylist`, or
   * they would wait on a queue slot they are holding themselves.
   */
  const applyPatch = async (
    id: string,
    patch: Partial<Pick<Playlist, "name" | "description" | "emoji" | "songIds">>,
  ) => {
    await initDB();
    const existing = await readPlaylist(id);
    if (!existing) {
      // Not in state and not on disk: the playlist genuinely does not exist.
      // Still a no-op rather than a throw — the detail view calls this straight
      // from swipe and dialog handlers — but a dropped write leaves a trace.
      console.warn(`Ignoring update for unknown playlist ${id}`);
      return;
    }
    // `readPlaylist` may return an element of a reactive ref, so `existing` can
    // be a Proxy and `existing.songIds` read through it a Proxy too. Spreading
    // only flattens the top level, and IndexedDB's structured clone algorithm
    // rejects a Proxy with DataCloneError — which broke every patch that did
    // not happen to supply a freshly built songIds array (e.g. the rename in
    // PlaylistDetailView). Unwrap the base object and always store a plain array.
    const updated: Playlist = {
      ...toRaw(existing),
      ...patch,
      songIds: [...(patch.songIds ?? existing.songIds)],
      updatedAt: new Date().toISOString(),
    };
    // Normalise here rather than trusting the caller: createPlaylist has always
    // trimmed, so the same padded input being cleaned on create and preserved on
    // rename left a name that sorted and rendered differently from the typed one.
    if (patch.name !== undefined) updated.name = patch.name.trim();
    if (patch.description !== undefined) {
      updated.description = patch.description.trim() || undefined;
    }
    await dbManager.putPlaylist(updated);
    await loadPlaylists();
  };

  const updatePlaylist = (
    id: string,
    patch: Partial<Pick<Playlist, "name" | "description" | "emoji" | "songIds">>,
  ) => enqueue(() => applyPatch(id, patch));

  const deletePlaylist = (id: string) =>
    enqueue(async () => {
      await initDB();
      await dbManager.deletePlaylist(id);
      await loadPlaylists();
    });

  const addSongToPlaylist = (playlistId: string, songId: string) =>
    enqueue(async () => {
      const pl = await readPlaylist(playlistId);
      if (!pl || pl.songIds.includes(songId)) return;
      await applyPatch(playlistId, { songIds: [...pl.songIds, songId] });
    });

  const removeSongFromPlaylist = (playlistId: string, songId: string) =>
    enqueue(async () => {
      const pl = await readPlaylist(playlistId);
      // The membership guard mirrors addSongToPlaylist's. Without it `filter`
      // returned an equal-but-new array, so a remove that changed nothing still
      // wrote and still stamped a new updatedAt — the sort key of the overview,
      // which would jump the playlist to the top for a no-op.
      if (!pl || !pl.songIds.includes(songId)) return;
      await applyPatch(playlistId, { songIds: pl.songIds.filter((id) => id !== songId) });
    });

  // True iff at least one playlist exists — used by SongSelector to decide
  // whether the "Playlists" tab is worth showing.
  const hasAnyPlaylist = computed(() => playlists.value.length > 0);

  return {
    playlists,
    isLoading,
    hasAnyPlaylist,

    loadPlaylists,
    getPlaylist,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
  };
});

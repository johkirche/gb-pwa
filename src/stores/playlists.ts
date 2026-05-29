import { defineStore } from "pinia";

import { computed, ref } from "vue";

// A playlist is a user-curated group of Gesangbuchlied IDs. We only store the
// Directus IDs (strings) — the song catalogue is the canonical source, so a
// rename or content update on a song shows up in every playlist automatically.
export interface Playlist {
  id: string;
  name: string;
  description?: string;
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
      playlists.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const getPlaylist = (id: string): Playlist | undefined =>
    playlists.value.find((p) => p.id === id);

  const createPlaylist = async (name: string, description?: string): Promise<Playlist> => {
    await initDB();
    const now = new Date().toISOString();
    const playlist: Playlist = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim() || undefined,
      songIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await dbManager.putPlaylist(playlist);
    await loadPlaylists();
    return playlist;
  };

  const updatePlaylist = async (
    id: string,
    patch: Partial<Pick<Playlist, "name" | "description" | "songIds">>,
  ) => {
    await initDB();
    const existing = getPlaylist(id);
    if (!existing) return;
    const updated: Playlist = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await dbManager.putPlaylist(updated);
    await loadPlaylists();
  };

  const deletePlaylist = async (id: string) => {
    await initDB();
    await dbManager.deletePlaylist(id);
    await loadPlaylists();
  };

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    const pl = getPlaylist(playlistId);
    if (!pl || pl.songIds.includes(songId)) return;
    await updatePlaylist(playlistId, { songIds: [...pl.songIds, songId] });
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    const pl = getPlaylist(playlistId);
    if (!pl) return;
    await updatePlaylist(playlistId, { songIds: pl.songIds.filter((id) => id !== songId) });
  };

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

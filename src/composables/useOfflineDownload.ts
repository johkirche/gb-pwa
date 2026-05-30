import { useAuthStore } from "@/stores/auth";
import axios from "axios";

import { useGesangbuchlied } from "./useGesangbuchlied";

import { onMounted, readonly, ref } from "vue";

import type { FreiesMusikstueck } from "@/gql/extra-types";
import type { Gesangbuchlied } from "@/gql/graphql";

export interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
  isComplete: boolean;
}

export interface OfflineContent {
  songs: Gesangbuchlied[];
  pieces: FreiesMusikstueck[];
  lastUpdated: string;
  version: string;
}

export interface OfflineMeta {
  count?: number;
  pieceCount?: number;
  lastUpdated?: string;
  version: string;
}

// Add interface for asset precaching progress (images and audio)
export interface AssetPrecacheProgress {
  current: number;
  total: number;
  percentage: number;
  currentAsset?: string;
}

// IndexedDB setup
//
// v1 → v2: added the `pieces` store for `freie_musikstuecke` (Vor-/Nachspiele).
//          Existing data in `songs` and `metadata` is preserved.
// v2 → v3: added the `assets` store — Blob payloads for every Directus file we
//          want playable/displayable offline (MIDI, MusicXML, images, audio,
//          soundfont). Owns asset storage outright; the SW `/assets/*` runtime
//          cache rule has been removed so there's only ONE source of truth.
const DB_NAME = "GesangbuchOfflineDB";
const DB_VERSION = 3;
const SONGS_STORE = "songs";
const PIECES_STORE = "pieces";
const ASSETS_STORE = "assets";
const META_STORE = "metadata";

// Shape of a row in the `assets` store. The blob is the raw bytes returned by
// Directus for that asset id — we never transform (no width/height query
// params), so the same blob serves thumbnails and full-size renders.
export interface OfflineAsset {
  id: string;
  type?: string;
  blob: Blob;
}

interface IndexedDBStore {
  put(storeName: string, data: unknown, key?: string): Promise<void>;
  get(storeName: string, key: string): Promise<unknown>;
  delete(storeName: string, key: string): Promise<void>;
  clear(storeName: string): Promise<void>;
}

class IndexedDBManager implements IndexedDBStore {
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

        // Create songs store
        if (!db.objectStoreNames.contains(SONGS_STORE)) {
          db.createObjectStore(SONGS_STORE, { keyPath: "id" });
        }

        // Create pieces store (freie_musikstuecke — Vor-/Nachspiele)
        if (!db.objectStoreNames.contains(PIECES_STORE)) {
          db.createObjectStore(PIECES_STORE, { keyPath: "id" });
        }

        // Create assets store (Blob payloads, keyed by Directus file id)
        if (!db.objectStoreNames.contains(ASSETS_STORE)) {
          db.createObjectStore(ASSETS_STORE, { keyPath: "id" });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };
    });
  }

  async put(storeName: string, data: unknown, key?: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = key ? store.put(data, key) : store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(storeName: string, key: string): Promise<unknown> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllFromStore(storeName: string): Promise<unknown[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async count(storeName: string): Promise<number> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// Module-level singleton — one IndexedDB connection per tab is enough, and it
// lets us expose standalone helpers (`fetchAssetByUrl`, `getOfflineAssetBlob`)
// outside the Vue setup() context.
const dbManager = new IndexedDBManager();

// `${directusUrl}/assets/<uuid>?params...` → "<uuid>". Returns null when the
// URL doesn't point at a Directus asset (e.g. external URL, blob URL).
export function extractDirectusAssetId(url: string): string | null {
  const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
  if (!directusUrl || !url.startsWith(directusUrl)) return null;
  const path = url.slice(directusUrl.length);
  const match = /^\/assets\/([^?#/]+)/.exec(path);
  return match ? match[1] : null;
}

// Read a single asset Blob from IDB. Returns null when missing (caller falls
// back to network). Safe to call from anywhere — uses the shared DB manager.
export async function getOfflineAssetBlob(id: string): Promise<Blob | null> {
  try {
    const row = (await dbManager.get(ASSETS_STORE, id)) as OfflineAsset | undefined;
    return row?.blob ?? null;
  } catch (error) {
    console.error("Error reading offline asset:", error);
    return null;
  }
}

export async function hasOfflineAsset(id: string): Promise<boolean> {
  return (await getOfflineAssetBlob(id)) !== null;
}

// Count songs stored offline in IndexedDB. Module-level so it can be called
// from outside a Vue setup() context (e.g. the stats store) without spinning
// up the full composable and its onMounted hook. Returns 0 on error/empty.
export async function getOfflineSongCount(): Promise<number> {
  try {
    return await dbManager.count(SONGS_STORE);
  } catch (error) {
    console.error("Error counting offline songs:", error);
    return 0;
  }
}

/**
 * Fetch an asset by URL with an IndexedDB pre-check. Drop-in replacement for
 * the `fetch(url).then(r => r.arrayBuffer())` pattern used by MIDI/MusicXML
 * loaders. If the URL points at a cached Directus asset, the blob is read
 * from IDB; otherwise we hit the network.
 */
export async function fetchAssetByUrl(url: string): Promise<ArrayBuffer> {
  const id = extractDirectusAssetId(url);
  if (id) {
    const blob = await getOfflineAssetBlob(id);
    if (blob) return blob.arrayBuffer();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

/**
 * Fetch a single Directus asset and persist it to the IDB `assets` store so
 * later reads via `getOfflineAssetBlob` / `fetchAssetByUrl` hit the cache.
 * Used by the Settings page to let users precache the soundfont on demand
 * without triggering a full content download.
 */
export async function cacheAssetById(id: string, type?: string): Promise<void> {
  const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
  if (!directusUrl) throw new Error("VITE_PUBLIC_DIRECTUS_URL is not configured");
  const res = await fetch(`${directusUrl}/assets/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  await dbManager.put(ASSETS_STORE, { id, type, blob } satisfies OfflineAsset);
}

export const useOfflineDownload = () => {
  const isDownloading = ref(false);
  const downloadProgress = ref<DownloadProgress>({
    current: 0,
    total: 0,
    percentage: 0,
    isComplete: false,
  });
  const hasOfflineContent = ref(false);
  const offlineContentInfo = ref<{
    count: number;
    pieceCount: number;
    lastUpdated: string;
  } | null>(null);

  // Add state for asset precaching (images and audio)
  const isPrecachingAssets = ref(false);
  const assetPrecacheProgress = ref<AssetPrecacheProgress>({
    current: 0,
    total: 0,
    percentage: 0,
  });

  // Check if offline content exists
  const checkOfflineContent = async () => {
    try {
      if (typeof window === "undefined") return;

      const meta = (await dbManager.get(META_STORE, "offline-meta")) as OfflineMeta | undefined;
      if (meta) {
        hasOfflineContent.value = true;
        offlineContentInfo.value = {
          count: meta.count || 0,
          pieceCount: meta.pieceCount || 0,
          lastUpdated: meta.lastUpdated || "Unknown",
        };
      } else {
        hasOfflineContent.value = false;
        offlineContentInfo.value = null;
      }
    } catch (error) {
      console.error("Error checking offline content:", error);
      hasOfflineContent.value = false;
    }
  };

  // Inline GraphQL fetch for the freie_musikstuecke collection. We deliberately
  // duplicate the query shape from stores/freieMusikstuecke.ts (rather than
  // depending on it from a non-setup context) — keeping this composable
  // standalone is worth a few lines of duplication.
  const fetchAllPiecesFromApi = async (): Promise<FreiesMusikstueck[]> => {
    const authStore = useAuthStore();
    const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
    if (!directusUrl) {
      throw new Error("VITE_PUBLIC_DIRECTUS_URL is not configured");
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    const gql = `
      query {
        freie_musikstuecke(sort: ["name"]) {
          id
          name
          komponist
          dauer_sek
          tags
          midi_file {
            id
            title
            type
            filename_download
            filesize
          }
        }
      }
    `;

    const res = await axios.post<{
      data?: { freie_musikstuecke?: FreiesMusikstueck[] };
      errors?: { message: string }[];
    }>(`${directusUrl}/graphql`, { query: gql }, { headers });

    if (res.data.errors?.length) {
      throw new Error(res.data.errors.map((e) => e.message).join(", "));
    }
    return res.data.data?.freie_musikstuecke ?? [];
  };

  // Fetch the soundfont file id from the Directus `settings` singleton so we
  // can precache it alongside song/piece MIDIs. Returns null when no
  // soundfont is configured.
  const fetchSoundfontId = async (): Promise<string | null> => {
    try {
      const authStore = useAuthStore();
      const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
      if (!directusUrl) return null;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authStore.accessToken) {
        headers["Authorization"] = `Bearer ${authStore.accessToken}`;
      }

      const res = await axios.post<{
        data?: { settings?: { soundfont?: { id?: string } | null } | null };
      }>(
        `${directusUrl}/graphql`,
        { query: "query { settings { soundfont { id } } }" },
        { headers },
      );
      return res.data.data?.settings?.soundfont?.id ?? null;
    } catch (err) {
      console.warn("Failed to fetch soundfont id for offline precache:", err);
      return null;
    }
  };

  // Get offline content
  const getOfflineContent = async (): Promise<OfflineContent | null> => {
    try {
      if (typeof window === "undefined") return null;

      const songs = (await dbManager.getAllFromStore(SONGS_STORE)) as Gesangbuchlied[];
      const pieces = (await dbManager.getAllFromStore(PIECES_STORE)) as FreiesMusikstueck[];
      const meta = (await dbManager.get(META_STORE, "offline-meta")) as OfflineMeta | undefined;

      if (songs && meta) {
        return {
          songs,
          pieces: pieces ?? [],
          lastUpdated: meta.lastUpdated || "Unknown",
          version: meta.version,
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting offline content:", error);
      return null;
    }
  };

  // Store offline content
  const storeOfflineContent = async (content: OfflineContent) => {
    try {
      if (typeof window === "undefined") return;

      // Store all songs individually for better performance
      for (const song of content.songs) {
        await dbManager.put(SONGS_STORE, song);
      }

      // Store all pieces individually as well
      for (const piece of content.pieces) {
        await dbManager.put(PIECES_STORE, piece);
      }

      // Store metadata
      const meta: OfflineMeta = {
        count: content.songs.length,
        pieceCount: content.pieces.length,
        lastUpdated: content.lastUpdated,
        version: content.version,
      };

      await dbManager.put(META_STORE, meta, "offline-meta");

      hasOfflineContent.value = true;
      offlineContentInfo.value = {
        count: content.songs.length,
        pieceCount: content.pieces.length,
        lastUpdated: content.lastUpdated,
      };
    } catch (error) {
      console.error("Error storing offline content:", error);
      throw new Error("Failed to store offline content. Your device may be out of storage space.");
    }
  };

  // Precache every Directus asset referenced by the downloaded songs/pieces.
  // Each asset is fetched once, converted to a Blob, and stored in the IDB
  // `assets` store. Consumers read from IDB via `useOfflineAsset(id)` (for
  // <img>/<audio> URLs) or `fetchAssetByUrl(url)` (for fetch-based loaders).
  //
  // Stale assets (in IDB but no longer referenced) are pruned at the end so
  // repeated downloads don't grow the store unboundedly.
  const precacheAssets = async (
    songs: Gesangbuchlied[],
    pieces: FreiesMusikstueck[] = [],
  ) => {
    try {
      if (typeof window === "undefined") return;

      isPrecachingAssets.value = true;
      const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;

      if (!directusUrl) {
        console.warn("Directus URL not configured, skipping asset precaching");
        return;
      }

      // Collect (id → file metadata) so we can dedupe by id and keep the
      // Directus type for later (helpful when picking blob MIME types).
      const desired = new Map<string, { id: string; type?: string }>();

      const note = (id?: string | null, type?: string | null) => {
        if (!id) return;
        if (!desired.has(id)) desired.set(id, { id, type: type ?? undefined });
      };

      for (const song of songs) {
        // Files in melodieId.noten (sheet music PDFs, PNGs, MP3 etc.)
        if (song.melodieId?.noten && Array.isArray(song.melodieId.noten)) {
          for (const n of song.melodieId.noten) {
            note(n?.directus_files_id?.id, n?.directus_files_id?.type);
          }
        }

        // Files in gesangbuchlied_satz_mit_melodie_und_text
        if (
          song.gesangbuchlied_satz_mit_melodie_und_text &&
          Array.isArray(song.gesangbuchlied_satz_mit_melodie_und_text)
        ) {
          for (const f of song.gesangbuchlied_satz_mit_melodie_und_text) {
            note(f?.directus_files_id?.id, f?.directus_files_id?.type);
          }
        }

        // MIDI trio — fields not yet in codegen output, read via cast.
        const s = song as Gesangbuchlied & {
          midi_intro?: { id?: string; type?: string } | null;
          midi_main?: { id?: string; type?: string } | null;
          midi_outro?: { id?: string; type?: string } | null;
        };
        for (const midi of [s.midi_intro, s.midi_main, s.midi_outro]) {
          note(midi?.id, midi?.type);
        }
      }

      // Piece MIDI files (Vor-/Nachspiele).
      for (const piece of pieces) {
        note(piece.midi_file?.id, piece.midi_file?.type);
      }

      // Soundfont — referenced from `settings.soundfont`, fetched once here so
      // the browser synth has its bank available offline too.
      const sfId = await fetchSoundfontId();
      if (sfId) note(sfId);

      const desiredList = Array.from(desired.values());
      const totalAssets = desiredList.length;

      if (totalAssets === 0) {
        console.log("No assets found to precache");
        return;
      }

      assetPrecacheProgress.value = {
        current: 0,
        total: totalAssets,
        percentage: 0,
        currentAsset: "Starting asset precaching...",
      };

      console.log(`Starting to precache ${totalAssets} assets into IndexedDB`);

      // Fetch in batches so the browser/Directus aren't slammed with a wave.
      const batchSize = 5;
      for (let i = 0; i < desiredList.length; i += batchSize) {
        const batch = desiredList.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async ({ id, type }) => {
            const assetUrl = `${directusUrl}/assets/${id}`;
            try {
              assetPrecacheProgress.value.currentAsset = `Precaching asset ${
                assetPrecacheProgress.value.current + 1
              }/${totalAssets}`;

              const response = await fetch(assetUrl);
              if (!response.ok) {
                console.warn(`Failed to precache asset ${id}: HTTP ${response.status}`);
                return;
              }
              const blob = await response.blob();
              await dbManager.put(ASSETS_STORE, { id, type, blob } satisfies OfflineAsset);
            } catch (error) {
              console.warn(`Error precaching asset ${id}:`, error);
            } finally {
              assetPrecacheProgress.value.current++;
              assetPrecacheProgress.value.percentage = Math.round(
                (assetPrecacheProgress.value.current / totalAssets) * 100,
              );
            }
          }),
        );

        if (i + batchSize < desiredList.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Prune stale entries — anything in IDB that's no longer referenced by
      // a song or piece is dead weight.
      try {
        const existing = (await dbManager.getAllFromStore(ASSETS_STORE)) as OfflineAsset[];
        for (const row of existing) {
          if (!desired.has(row.id)) {
            await dbManager.delete(ASSETS_STORE, row.id);
          }
        }
      } catch (err) {
        console.warn("Asset pruning failed:", err);
      }

      assetPrecacheProgress.value.currentAsset = `Completed precaching ${totalAssets} assets`;
      console.log(`Completed precaching ${totalAssets} assets into IndexedDB`);
    } catch (error) {
      console.error("Error precaching assets:", error);
      assetPrecacheProgress.value.currentAsset = "Asset precaching failed";
    } finally {
      isPrecachingAssets.value = false;
    }
  };

  // Download all content for offline usage
  const downloadAllContent = async () => {
    if (isDownloading.value) return;

    try {
      isDownloading.value = true;
      downloadProgress.value = {
        current: 0,
        total: 0,
        percentage: 0,
        currentItem: "Initializing...",
        isComplete: false,
      };

      // Ask the browser to promote storage to "persistent" — without this,
      // iOS Safari (and Chrome under heavy disk pressure) may evict the IDB
      // contents after a period of inactivity. Idempotent and silent on
      // browsers that don't support the API.
      if (navigator.storage?.persist) {
        try {
          const persisted = await navigator.storage.persist();
          console.log(`navigator.storage.persist() → ${persisted}`);
        } catch (err) {
          console.warn("Failed to request persistent storage:", err);
        }
      }

      const { queryGesangbuchlied } = useGesangbuchlied();

      // First, get the total count
      downloadProgress.value.currentItem = "Fetching song list...";

      // Fetch all songs in batches to avoid overwhelming the API
      const batchSize = 100;
      let allSongs: Gesangbuchlied[] = [];
      let offset = 0;
      let hasMore = true;

      // Get total count first (rough estimate)
      await queryGesangbuchlied({
        limit: 1,
        offset: 0,
        filter: {
          bewertungKleinerKreis: { rangfolge: { _eq: 5 } },
        },
      });

      // Now fetch all songs in batches
      while (hasMore) {
        downloadProgress.value.currentItem = `Downloading songs ${
          offset + 1
        } to ${offset + batchSize}...`;

        const batch = await queryGesangbuchlied({
          limit: batchSize,
          offset,
          filter: {
            bewertungKleinerKreis: { rangfolge: { _eq: 5 } },
          },
        });

        if (batch.length === 0) {
          hasMore = false;
        } else {
          allSongs = [...allSongs, ...batch];
          offset += batchSize;

          // Update progress
          downloadProgress.value.current = allSongs.length;
          downloadProgress.value.total =
            allSongs.length + (batch.length === batchSize ? batchSize : 0);
          downloadProgress.value.percentage = Math.round(
            (allSongs.length / downloadProgress.value.total) * 100,
          );

          // If we got less than the batch size, we're done
          if (batch.length < batchSize) {
            hasMore = false;
          }

          // Small delay to prevent overwhelming the API
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Pieces (freie_musikstuecke). Small collection — fetched in one shot.
      downloadProgress.value.currentItem = "Downloading pieces...";
      let allPieces: FreiesMusikstueck[] = [];
      try {
        allPieces = await fetchAllPiecesFromApi();
      } catch (err) {
        // Pieces failing shouldn't block the songs download — log and continue.
        console.warn("Failed to fetch pieces for offline use:", err);
      }

      // Update final progress
      downloadProgress.value.total = allSongs.length;
      downloadProgress.value.current = allSongs.length;
      downloadProgress.value.percentage = 100;
      downloadProgress.value.currentItem = "Saving to device...";

      // Store the content
      const offlineContent: OfflineContent = {
        songs: allSongs,
        pieces: allPieces,
        lastUpdated: new Date().toISOString(),
        version: "1.0",
      };

      await storeOfflineContent(offlineContent);

      // Mark songs download as complete
      downloadProgress.value.isComplete = true;
      downloadProgress.value.currentItem = `Downloaded ${allSongs.length} songs and ${allPieces.length} pieces successfully!`;

      // Start asset precaching after content is downloaded
      downloadProgress.value.currentItem = "Starting asset precaching...";
      await precacheAssets(allSongs, allPieces);

      // Final completion message
      downloadProgress.value.currentItem = `Download complete! ${allSongs.length} songs, ${allPieces.length} pieces and assets cached.`;

      return allSongs.length;
    } catch (error) {
      console.error("Error downloading content:", error);
      downloadProgress.value.currentItem = "Download failed";
      throw error;
    } finally {
      isDownloading.value = false;
    }
  };

  // Clear offline content
  const clearOfflineContent = async () => {
    try {
      if (typeof window === "undefined") return;

      await dbManager.clear(SONGS_STORE);
      await dbManager.clear(PIECES_STORE);
      await dbManager.clear(ASSETS_STORE);
      await dbManager.delete(META_STORE, "offline-meta");

      hasOfflineContent.value = false;
      offlineContentInfo.value = null;
    } catch (error) {
      console.error("Error clearing offline content:", error);
    }
  };

  // Get offline songs (for use when offline)
  const getOfflineSongs = async (
    searchQuery?: string,
    limit?: number,
  ): Promise<Gesangbuchlied[]> => {
    try {
      const songs = (await dbManager.getAllFromStore(SONGS_STORE)) as Gesangbuchlied[];
      if (!songs) return [];

      let filteredSongs = songs;

      // Apply search filter if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredSongs = songs.filter(
          (song) =>
            song.titel?.toLowerCase().includes(query) ||
            song.textId?.strophenEinzeln?.some((strophe: unknown) => {
              if (strophe && typeof strophe === "object" && "strophe" in strophe) {
                const stropheText = (strophe as { strophe?: string }).strophe;
                return stropheText?.toLowerCase().includes(query);
              }
              return false;
            }),
        );
      }

      // Apply limit if provided
      if (limit) {
        filteredSongs = filteredSongs.slice(0, limit);
      }

      return filteredSongs;
    } catch (error) {
      console.error("Error getting offline songs:", error);
      return [];
    }
  };

  // Get a single song by ID from IndexedDB
  const getOfflineSongById = async (id: string | number): Promise<Gesangbuchlied | null> => {
    try {
      const song = (await dbManager.get(SONGS_STORE, id.toString())) as Gesangbuchlied | undefined;
      return song || null;
    } catch (error) {
      console.error("Error getting offline song by ID:", error);
      return null;
    }
  };

  // Get all pieces (freie_musikstuecke) from IndexedDB for offline use.
  const getOfflinePieces = async (): Promise<FreiesMusikstueck[]> => {
    try {
      const pieces = (await dbManager.getAllFromStore(PIECES_STORE)) as FreiesMusikstueck[];
      return pieces ?? [];
    } catch (error) {
      console.error("Error getting offline pieces:", error);
      return [];
    }
  };

  const getOfflinePieceById = async (id: string): Promise<FreiesMusikstueck | null> => {
    try {
      const piece = (await dbManager.get(PIECES_STORE, id)) as FreiesMusikstueck | undefined;
      return piece || null;
    } catch (error) {
      console.error("Error getting offline piece by ID:", error);
      return null;
    }
  };

  // Get storage usage info. Asset blob sizes are far more accurate when read
  // from `navigator.storage.estimate()` than `JSON.stringify(blob).length`,
  // which doesn't include binary payloads — so we use the browser estimate
  // when available and fall back to JSON serialization of metadata only.
  const getStorageInfo = async () => {
    try {
      if (typeof window === "undefined") return null;

      const songs = (await dbManager.getAllFromStore(SONGS_STORE)) as Gesangbuchlied[];
      const pieces = (await dbManager.getAllFromStore(PIECES_STORE)) as FreiesMusikstueck[];
      const assetCount = await dbManager.count(ASSETS_STORE);

      let sizeInBytes: number;
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        sizeInBytes = est.usage ?? 0;
      } else {
        sizeInBytes =
          JSON.stringify(songs).length + JSON.stringify(pieces).length;
      }
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

      return {
        sizeInBytes,
        sizeInMB,
        itemCount: songs.length,
        pieceCount: pieces.length,
        assetCount,
      };
    } catch (error) {
      console.error("Error getting storage info:", error);
      return null;
    }
  };

  // Initialize on mount
  if (typeof window !== "undefined") {
    onMounted(async () => {
      await dbManager.init();
      await checkOfflineContent();
    });
  }

  return {
    // State
    isDownloading: readonly(isDownloading),
    downloadProgress: readonly(downloadProgress),
    hasOfflineContent: readonly(hasOfflineContent),
    offlineContentInfo: readonly(offlineContentInfo),
    isPrecachingAssets: readonly(isPrecachingAssets),
    assetPrecacheProgress: readonly(assetPrecacheProgress),

    // Actions
    downloadAllContent,
    clearOfflineContent,
    checkOfflineContent,
    getOfflineSongs,
    getOfflineSongById,
    getOfflinePieces,
    getOfflinePieceById,
    getOfflineContent,
    getStorageInfo,
    precacheAssets,
  };
};

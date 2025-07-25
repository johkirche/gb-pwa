import { useGesangbuchlied } from "./useGesangbuchlied";

import { onMounted, readonly, ref } from "vue";

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
  lastUpdated: string;
  version: string;
}

export interface OfflineMeta {
  count?: number;
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
const DB_NAME = "GesangbuchOfflineDB";
const DB_VERSION = 1;
const SONGS_STORE = "songs";
const META_STORE = "metadata";

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
  const offlineContentInfo = ref<{ count: number; lastUpdated: string } | null>(null);

  // Add state for asset precaching (images and audio)
  const isPrecachingAssets = ref(false);
  const assetPrecacheProgress = ref<AssetPrecacheProgress>({
    current: 0,
    total: 0,
    percentage: 0,
  });

  // IndexedDB instance
  const dbManager = new IndexedDBManager();

  // Check if offline content exists
  const checkOfflineContent = async () => {
    try {
      if (typeof window === "undefined") return;

      const meta = (await dbManager.get(META_STORE, "offline-meta")) as OfflineMeta | undefined;
      if (meta) {
        hasOfflineContent.value = true;
        offlineContentInfo.value = {
          count: meta.count || 0,
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

  // Get offline content
  const getOfflineContent = async (): Promise<OfflineContent | null> => {
    try {
      if (typeof window === "undefined") return null;

      const songs = (await dbManager.getAllFromStore(SONGS_STORE)) as Gesangbuchlied[];
      const meta = (await dbManager.get(META_STORE, "offline-meta")) as OfflineMeta | undefined;

      if (songs && meta) {
        return {
          songs,
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

      // Store metadata
      const meta = {
        count: content.songs.length,
        lastUpdated: content.lastUpdated,
        version: content.version,
      };

      await dbManager.put(META_STORE, meta, "offline-meta");

      hasOfflineContent.value = true;
      offlineContentInfo.value = {
        count: content.songs.length,
        lastUpdated: content.lastUpdated,
      };
    } catch (error) {
      console.error("Error storing offline content:", error);
      throw new Error("Failed to store offline content. Your device may be out of storage space.");
    }
  };

  // Precache images and audio files from songs
  const precacheAssets = async (songs: Gesangbuchlied[]) => {
    try {
      if (typeof window === "undefined") return;

      isPrecachingAssets.value = true;
      const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;

      if (!directusUrl) {
        console.warn("Directus URL not configured, skipping asset precaching");
        return;
      }

      // Collect all unique asset URLs from songs (images and audio)
      const assetUrls = new Set<string>();

      for (const song of songs) {
        // Check for files in melodieId.noten (images and audio)
        if (song.melodieId?.noten && Array.isArray(song.melodieId.noten)) {
          for (const note of song.melodieId.noten) {
            if (note?.directus_files_id?.id) {
              // Add all file types - images (PNG, JPG, etc.) and audio files
              const assetUrl = `${directusUrl}/assets/${note.directus_files_id.id}`;
              assetUrls.add(assetUrl);
            }
          }
        }

        // Check for files in gesangbuchlied_satz_mit_melodie_und_text (images and audio)
        if (
          song.gesangbuchlied_satz_mit_melodie_und_text &&
          Array.isArray(song.gesangbuchlied_satz_mit_melodie_und_text)
        ) {
          for (const file of song.gesangbuchlied_satz_mit_melodie_und_text) {
            if (file?.directus_files_id?.id) {
              const assetUrl = `${directusUrl}/assets/${file.directus_files_id.id}`;
              assetUrls.add(assetUrl);
            }
          }
        }

        // Check for audio files in other potential fields
        // Add other audio file fields here if they exist in your schema
        // For example, if there are dedicated audio fields:
        // if (song.audioFiles && Array.isArray(song.audioFiles)) {
        //   for (const audioFile of song.audioFiles) {
        //     if (audioFile?.directus_files_id?.id) {
        //       const audioUrl = `${directusUrl}/assets/${audioFile.directus_files_id.id}`;
        //       assetUrls.add(audioUrl);
        //     }
        //   }
        // }
      }

      const uniqueAssetUrls = Array.from(assetUrls);
      const totalAssets = uniqueAssetUrls.length;

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

      console.log(`Starting to precache ${totalAssets} assets (images and audio)`);

      // Precache assets in batches to avoid overwhelming the browser
      const batchSize = 5;
      for (let i = 0; i < uniqueAssetUrls.length; i += batchSize) {
        const batch = uniqueAssetUrls.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (assetUrl) => {
            try {
              assetPrecacheProgress.value.currentAsset = `Precaching asset ${
                assetPrecacheProgress.value.current + 1
              }/${totalAssets}`;

              // Make a fetch request to trigger caching by the service worker
              const response = await fetch(assetUrl, {
                method: "GET",
                mode: "cors",
                cache: "force-cache", // Prefer cached version if available
              });

              if (response.ok) {
                console.log(`Successfully precached asset: ${assetUrl}`);
              } else {
                console.warn(`Failed to precache asset: ${assetUrl}, status: ${response.status}`);
              }
            } catch (error) {
              console.warn(`Error precaching asset ${assetUrl}:`, error);
            } finally {
              assetPrecacheProgress.value.current++;
              assetPrecacheProgress.value.percentage = Math.round(
                (assetPrecacheProgress.value.current / totalAssets) * 100,
              );
            }
          }),
        );

        // Small delay between batches to prevent overwhelming the browser
        if (i + batchSize < uniqueAssetUrls.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      assetPrecacheProgress.value.currentAsset = `Completed precaching ${totalAssets} assets`;
      console.log(`Completed precaching ${totalAssets} assets (images and audio)`);
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
          status: { _eq: "published" },
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
            status: { _eq: "published" },
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

      // Update final progress
      downloadProgress.value.total = allSongs.length;
      downloadProgress.value.current = allSongs.length;
      downloadProgress.value.percentage = 100;
      downloadProgress.value.currentItem = "Saving to device...";

      // Store the content
      const offlineContent: OfflineContent = {
        songs: allSongs,
        lastUpdated: new Date().toISOString(),
        version: "1.0",
      };

      await storeOfflineContent(offlineContent);

      // Mark songs download as complete
      downloadProgress.value.isComplete = true;
      downloadProgress.value.currentItem = `Downloaded ${allSongs.length} songs successfully!`;

      // Start asset precaching after songs are downloaded
      downloadProgress.value.currentItem = "Starting asset precaching...";
      await precacheAssets(allSongs);

      // Final completion message
      downloadProgress.value.currentItem = `Download complete! ${allSongs.length} songs and assets cached.`;

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

  // Get storage usage info
  const getStorageInfo = async () => {
    try {
      if (typeof window === "undefined") return null;

      const songs = (await dbManager.getAllFromStore(SONGS_STORE)) as Gesangbuchlied[];
      const estimatedSize = JSON.stringify(songs).length;
      const sizeInMB = (estimatedSize / (1024 * 1024)).toFixed(2);

      return {
        sizeInBytes: estimatedSize,
        sizeInMB,
        itemCount: songs.length,
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
    getOfflineContent,
    getStorageInfo,
    precacheAssets,
  };
};

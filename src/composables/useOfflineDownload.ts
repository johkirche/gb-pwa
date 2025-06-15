import { ref, readonly, onMounted } from "vue";
import { useGesangbuchlied } from "./useGesangbuchlied";

export interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
  isComplete: boolean;
}

export interface OfflineContent {
  songs: any[];
  lastUpdated: string;
  version: string;
}

// IndexedDB setup
const DB_NAME = "GesangbuchOfflineDB";
const DB_VERSION = 1;
const SONGS_STORE = "songs";
const META_STORE = "metadata";

interface IndexedDBStore {
  put(storeName: string, data: any, key?: string): Promise<void>;
  get(storeName: string, key: string): Promise<any>;
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

  async put(storeName: string, data: any, key?: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = key ? store.put(data, key) : store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(storeName: string, key: string): Promise<any> {
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

  async getAllFromStore(storeName: string): Promise<any[]> {
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
  const offlineContentInfo = ref<{ count: number; lastUpdated: string } | null>(
    null
  );

  // IndexedDB instance
  const dbManager = new IndexedDBManager();

  // Check if offline content exists
  const checkOfflineContent = async () => {
    try {
      if (typeof window === "undefined") return;

      const meta = await dbManager.get(META_STORE, "offline-meta");
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

      const songs = await dbManager.getAllFromStore(SONGS_STORE);
      const meta = await dbManager.get(META_STORE, "offline-meta");

      if (songs && meta) {
        return {
          songs,
          lastUpdated: meta.lastUpdated,
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
      throw new Error(
        "Failed to store offline content. Your device may be out of storage space."
      );
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
      const batchSize = 50;
      let allSongs: any[] = [];
      let offset = 0;
      let hasMore = true;

      // Get total count first (rough estimate)
      await queryGesangbuchlied({
        limit: 1,
        offset: 0,
        filter: { status: { _eq: "published" } },
      });

      // Now fetch all songs in batches
      while (hasMore) {
        downloadProgress.value.currentItem = `Downloading songs ${
          offset + 1
        } to ${offset + batchSize}...`;

        const batch = await queryGesangbuchlied({
          limit: batchSize,
          offset,
          filter: { status: { _eq: "published" } },
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
            (allSongs.length / downloadProgress.value.total) * 100
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

      // Mark as complete
      downloadProgress.value.isComplete = true;
      downloadProgress.value.currentItem = `Downloaded ${allSongs.length} songs successfully!`;

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
    limit?: number
  ): Promise<any[]> => {
    try {
      const songs = await dbManager.getAllFromStore(SONGS_STORE);
      if (!songs) return [];

      let filteredSongs = songs;

      // Apply search filter if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredSongs = songs.filter(
          (song) =>
            song.titel?.toLowerCase().includes(query) ||
            song.textId?.strophenEinzeln?.some((strophe: any) =>
              strophe.strophe?.toLowerCase().includes(query)
            )
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
  const getOfflineSongById = async (
    id: string | number
  ): Promise<any | null> => {
    try {
      const song = await dbManager.get(SONGS_STORE, id.toString());
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

      const songs = await dbManager.getAllFromStore(SONGS_STORE);
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

    // Actions
    downloadAllContent,
    clearOfflineContent,
    checkOfflineContent,
    getOfflineSongs,
    getOfflineSongById,
    getOfflineContent,
    getStorageInfo,
  };
};

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

  // Storage keys
  const OFFLINE_CONTENT_KEY = "gesangbuch-offline-content";
  const OFFLINE_META_KEY = "gesangbuch-offline-meta";

  // Check if offline content exists
  const checkOfflineContent = async () => {
    try {
      if (typeof window === "undefined") return;

      const storedMeta = localStorage.getItem(OFFLINE_META_KEY);
      if (storedMeta) {
        const meta = JSON.parse(storedMeta);
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
  const getOfflineContent = (): OfflineContent | null => {
    try {
      if (typeof window === "undefined") return null;

      const stored = localStorage.getItem(OFFLINE_CONTENT_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Error getting offline content:", error);
      return null;
    }
  };

  // Store offline content
  const storeOfflineContent = (content: OfflineContent) => {
    try {
      if (typeof window === "undefined") return;

      localStorage.setItem(OFFLINE_CONTENT_KEY, JSON.stringify(content));
      localStorage.setItem(
        OFFLINE_META_KEY,
        JSON.stringify({
          count: content.songs.length,
          lastUpdated: content.lastUpdated,
          version: content.version,
        })
      );

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
      const initialBatch = await queryGesangbuchlied({
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

      // Also try to cache the content in the service worker cache
      if ("serviceWorker" in navigator && "caches" in window) {
        try {
          const cache = await caches.open("api-cache");
          // We could cache API responses here, but localStorage is more reliable for structured data
        } catch (error) {
          console.warn("Could not cache in service worker:", error);
        }
      }

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
  const clearOfflineContent = () => {
    try {
      if (typeof window === "undefined") return;

      localStorage.removeItem(OFFLINE_CONTENT_KEY);
      localStorage.removeItem(OFFLINE_META_KEY);

      hasOfflineContent.value = false;
      offlineContentInfo.value = null;
    } catch (error) {
      console.error("Error clearing offline content:", error);
    }
  };

  // Get offline songs (for use when offline)
  const getOfflineSongs = (searchQuery?: string, limit?: number): any[] => {
    const content = getOfflineContent();
    if (!content?.songs) return [];

    let songs = content.songs;

    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      songs = songs.filter(
        (song) =>
          song.titel?.toLowerCase().includes(query) ||
          song.textId?.strophenEinzeln?.some((strophe: any) =>
            strophe.strophe?.toLowerCase().includes(query)
          )
      );
    }

    // Apply limit if provided
    if (limit) {
      songs = songs.slice(0, limit);
    }

    return songs;
  };

  // Get storage usage info
  const getStorageInfo = () => {
    try {
      if (typeof window === "undefined") return null;

      const content = localStorage.getItem(OFFLINE_CONTENT_KEY);
      const sizeInBytes = content ? new Blob([content]).size : 0;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

      return {
        sizeInBytes,
        sizeInMB,
        itemCount: offlineContentInfo.value?.count || 0,
      };
    } catch (error) {
      console.error("Error getting storage info:", error);
      return null;
    }
  };

  // Initialize on mount
  if (process.client) {
    onMounted(() => {
      checkOfflineContent();
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
    getOfflineContent,
    getStorageInfo,
  };
};

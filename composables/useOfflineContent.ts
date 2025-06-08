export const useOfflineContent = () => {
  const isLoading = ref(false);
  const progress = ref(0);
  const totalItems = ref(0);
  const loadedItems = ref(0);

  /**
   * Preload content for offline access
   * Call this after successful authentication
   */
  const preloadContent = async () => {
    if (!navigator.onLine) {
      console.warn("Cannot preload content while offline");
      return;
    }

    try {
      isLoading.value = true;
      progress.value = 0;
      loadedItems.value = 0;

      // Example: Preload songs, hymns, or other content
      // Replace with your actual content endpoints
      const contentEndpoints = [
        "/api/songs",
        "/api/hymns",
        "/api/categories",
        // GraphQL endpoint for caching (replace with your actual Directus URL)
        // `${process.env.NUXT_PUBLIC_DIRECTUS_URL}/graphql`,
        // Add your content endpoints here
      ];

      totalItems.value = contentEndpoints.length;

      for (const endpoint of contentEndpoints) {
        try {
          // This will trigger caching through the service worker
          await $fetch(endpoint);
          loadedItems.value++;
          progress.value = (loadedItems.value / totalItems.value) * 100;
        } catch (error) {
          console.warn(`Failed to preload ${endpoint}:`, error);
          // Continue with other endpoints even if one fails
        }
      }

      // Also preload media files if you have them
      await preloadMediaFiles();
    } catch (error) {
      console.error("Error preloading content:", error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Preload media files (audio, images, etc.)
   */
  const preloadMediaFiles = async () => {
    // Example: Preload audio files for songs
    // You would get this list from your content API
    const mediaFiles: string[] = [
      // '/media/song1.mp3',
      // '/media/song2.mp3',
      // Add your media files here
    ];

    for (const mediaFile of mediaFiles) {
      try {
        // Trigger fetch to cache the file
        await fetch(mediaFile);
        loadedItems.value++;
        progress.value = (loadedItems.value / totalItems.value) * 100;
      } catch (error) {
        console.warn(`Failed to preload media ${mediaFile}:`, error);
      }
    }
  };

  /**
   * Check if content is cached and available offline
   */
  const isContentCached = async (url: string): Promise<boolean> => {
    if ("caches" in window) {
      const cache = await caches.open("pages-cache");
      const response = await cache.match(url);
      return !!response;
    }
    return false;
  };

  /**
   * Get cache size and info
   */
  const getCacheInfo = async () => {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      let totalItems = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        totalItems += keys.length;
      }

      return { totalItems, cacheNames };
    }
    return { totalItems: 0, cacheNames: [] };
  };

  /**
   * Clear all caches (useful for testing or when user logs out)
   */
  const clearCache = async () => {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }
  };

  return {
    // State
    isLoading: readonly(isLoading),
    progress: readonly(progress),
    totalItems: readonly(totalItems),
    loadedItems: readonly(loadedItems),

    // Actions
    preloadContent,
    isContentCached,
    getCacheInfo,
    clearCache,
  };
};

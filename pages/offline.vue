<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6">Offline Content</h1>

    <!-- Online/Offline Status -->
    <div
      class="mb-6 p-4 rounded-lg"
      :class="
        isOnline
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200'
      "
    >
      <div class="flex items-center gap-2">
        <div
          class="w-3 h-3 rounded-full"
          :class="isOnline ? 'bg-green-500' : 'bg-red-500'"
        ></div>
        <span class="font-medium">{{ isOnline ? "Online" : "Offline" }}</span>
      </div>
    </div>

    <!-- Content Download Section -->
    <div class="bg-white border rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">
        Download Content for Offline Use
      </h2>

      <div v-if="!isLoading && isOnline" class="space-y-4">
        <p class="text-gray-600">
          Download content to use the app offline. This will cache songs, hymns,
          and related media files.
        </p>

        <button
          @click="startDownload"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          :disabled="isLoading"
        >
          Download Content
        </button>
      </div>

      <div v-else-if="!isOnline" class="text-center py-8">
        <p class="text-gray-500">You need to be online to download content.</p>
      </div>

      <!-- Download Progress -->
      <div v-if="isLoading" class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Downloading content...</span>
          <span class="text-sm text-gray-500"
            >{{ loadedItems }}/{{ totalItems }}</span
          >
        </div>

        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>

        <p class="text-sm text-gray-600">
          {{ Math.round(progress) }}% complete
        </p>
      </div>
    </div>

    <!-- Cache Information -->
    <div class="bg-white border rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-4">Cache Information</h2>

      <div v-if="cacheInfo" class="space-y-2">
        <p class="text-sm">
          <span class="font-medium">Cached items:</span>
          {{ cacheInfo.totalItems }}
        </p>
        <p class="text-sm">
          <span class="font-medium">Cache stores:</span>
          {{ cacheInfo.cacheNames.join(", ") }}
        </p>
      </div>

      <!-- Clear Cache -->
      <div class="mt-6 pt-4 border-t">
        <button
          @click="clearAllCache"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          :disabled="isLoading"
        >
          Clear All Cache
        </button>
        <p class="text-xs text-gray-500 mt-2">
          This will remove all downloaded content.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
});

const {
  preloadContent,
  isLoading,
  progress,
  totalItems,
  loadedItems,
  getCacheInfo,
  clearCache,
} = useOfflineContent();

// Online/offline detection
const isOnline = ref(navigator.onLine);
const cacheInfo = ref<{ totalItems: number; cacheNames: string[] } | null>(
  null
);

// Update online status
const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
};

onMounted(() => {
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  loadCacheInfo();
});

onUnmounted(() => {
  window.removeEventListener("online", updateOnlineStatus);
  window.removeEventListener("offline", updateOnlineStatus);
});

const startDownload = async () => {
  await preloadContent();
  await loadCacheInfo(); // Refresh cache info after download
};

const loadCacheInfo = async () => {
  cacheInfo.value = await getCacheInfo();
};

const clearAllCache = async () => {
  if (
    confirm(
      "Are you sure you want to clear all cached content? You will need to download it again for offline use."
    )
  ) {
    await clearCache();
    await loadCacheInfo();
  }
};
</script>

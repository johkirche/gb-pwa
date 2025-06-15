<template>
  <div>
    <!-- Update Available Banner -->
    <div
      v-if="updateAvailable"
      class="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 shadow-lg"
    >
      <div class="container mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm font-medium">A new version is available!</span>
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="reloadPage"
            class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Update Now
          </button>
          <button
            @click="dismissUpdate"
            class="text-blue-200 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Offline Banner -->
    <div
      v-if="showOfflineBanner"
      class="fixed top-0 left-0 right-0 z-40 bg-gray-800 text-white p-2 shadow-lg"
      :class="updateAvailable ? 'mt-12' : ''"
    >
      <div class="container mx-auto flex items-center justify-center space-x-2">
        <svg
          class="w-4 h-4 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-xs"
          >You're currently offline. Using cached content.</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const updateAvailable = ref(false);
const showOfflineBanner = ref(false);

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

const reloadPage = async () => {
  if (updateSW) {
    await updateSW(true);
  } else {
    window.location.reload();
  }
};

const dismissUpdate = () => {
  updateAvailable.value = false;
};

const handleOnline = () => {
  showOfflineBanner.value = false;
};

const handleOffline = () => {
  showOfflineBanner.value = true;
};

// Set up online/offline detection
const setupNetworkDetection = () => {
  if (typeof window !== "undefined") {
    showOfflineBanner.value = !navigator.onLine;
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }
};

// Set up PWA update detection
const setupPWAUpdates = async () => {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const { registerSW } = await import("virtual:pwa-register");
      updateSW = registerSW({
        onNeedRefresh() {
          updateAvailable.value = true;
        },
        onOfflineReady() {
          console.log("PWA ready to work offline");
        },
      });
    } catch (error) {
      console.log("PWA register not available:", error);
    }
  }
};

onMounted(() => {
  setupNetworkDetection();
  setupPWAUpdates();
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  }
});
</script>

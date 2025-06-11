<template>
  <div>
    <!-- Update Available Banner -->
    <div
      v-if="updateAvailable"
      class="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md mx-auto"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <Download class="w-5 h-5 flex-shrink-0" />
          <div>
            <p class="font-medium text-sm">Update available</p>
            <p class="text-xs opacity-90">A new version is ready to install</p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button
            class="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-xs font-medium transition-colors"
            @click="updateApp"
          >
            Update
          </button>
          <button
            class="text-blue-200 hover:text-white px-2 py-1 rounded text-xs transition-colors"
            @click="dismissUpdate"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Offline Status Banner -->
    <div
      v-if="showOfflineBanner"
      class="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg z-40"
    >
      <div class="flex items-center justify-center space-x-2">
        <WifiOff class="w-4 h-4" />
        <span>You're offline. Some features may not be available.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Download, X, WifiOff } from "lucide-vue-next";

// PWA update state
const updateAvailable = ref(false);
const showOfflineBanner = ref(false);

// PWA update handling (simplified)
// Note: VitePWA composable will be available when the module is properly loaded

// Online/offline detection
const checkOnlineStatus = () => {
  if (typeof window !== "undefined") {
    showOfflineBanner.value = !navigator.onLine;
  }
};

// Update the app
const updateApp = async () => {
  // For now, just refresh the page
  if (typeof window !== "undefined") {
    window.location.reload();
  }
  updateAvailable.value = false;
};

// Dismiss update notification
const dismissUpdate = () => {
  updateAvailable.value = false;
};

// Setup online/offline listeners
onMounted(() => {
  if (typeof window !== "undefined") {
    // Initial check
    checkOnlineStatus();

    // Listen for online/offline events
    window.addEventListener("online", () => {
      showOfflineBanner.value = false;
    });

    window.addEventListener("offline", () => {
      showOfflineBanner.value = true;
    });

    // Check for service worker registration errors
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });
    }
  }
});

// Cleanup listeners
onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("online", checkOnlineStatus);
    window.removeEventListener("offline", checkOnlineStatus);
  }
});
</script>

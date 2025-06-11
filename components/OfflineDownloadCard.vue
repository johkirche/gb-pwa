<template>
  <Card class="mb-6">
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <Download class="w-5 h-5" />
        <span>Offline Access</span>
      </CardTitle>
      <CardDescription>
        Download all songs for offline access when you don't have internet
        connection.
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Current Status -->
      <div
        v-if="hasOfflineContent && offlineContentInfo"
        class="bg-green-50 border border-green-200 rounded-lg p-4"
      >
        <div class="flex items-start space-x-3">
          <CheckCircle class="w-5 h-5 text-green-600 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-medium text-green-800">
              {{ offlineContentInfo.count }} songs downloaded
            </p>
            <p class="text-xs text-green-600 mt-1">
              Last updated: {{ formatDate(offlineContentInfo.lastUpdated) }}
            </p>
            <div v-if="storageInfo" class="text-xs text-green-600 mt-1">
              Storage used: {{ storageInfo.sizeInMB }} MB
            </div>
          </div>
        </div>
      </div>

      <!-- No Offline Content -->
      <div
        v-else-if="!hasOfflineContent"
        class="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div class="flex items-start space-x-3">
          <Info class="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p class="text-sm font-medium text-blue-800">
              No offline content downloaded
            </p>
            <p class="text-xs text-blue-600 mt-1">
              Download all songs to access them without internet connection.
            </p>
          </div>
        </div>
      </div>

      <!-- Download Progress -->
      <div v-if="isDownloading" class="space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium">{{ downloadProgress.currentItem }}</span>
          <span class="text-muted-foreground">
            {{ downloadProgress.current }} / {{ downloadProgress.total || "?" }}
          </span>
        </div>

        <div class="w-full bg-secondary rounded-full h-2">
          <div
            class="bg-primary h-2 rounded-full transition-all duration-300"
            :style="`width: ${downloadProgress.percentage}%`"
          ></div>
        </div>

        <p class="text-xs text-muted-foreground text-center">
          {{ downloadProgress.percentage }}% complete
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-2">
        <Button
          @click="startDownload"
          :disabled="isDownloading"
          class="flex-1"
          :variant="hasOfflineContent ? 'outline' : 'default'"
        >
          <Download class="w-4 h-4 mr-2" />
          {{ hasOfflineContent ? "Update Content" : "Download All Songs" }}
        </Button>

        <Button
          v-if="hasOfflineContent"
          @click="confirmClearContent"
          variant="outline"
          size="sm"
          :disabled="isDownloading"
        >
          <Trash2 class="w-4 h-4" />
        </Button>
      </div>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="bg-red-50 border border-red-200 rounded-lg p-3"
      >
        <div class="flex items-start space-x-2">
          <AlertCircle class="w-4 h-4 text-red-600 mt-0.5" />
          <p class="text-sm text-red-800">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Success Message -->
      <div
        v-if="successMessage"
        class="bg-green-50 border border-green-200 rounded-lg p-3"
      >
        <div class="flex items-start space-x-2">
          <CheckCircle class="w-4 h-4 text-green-600 mt-0.5" />
          <p class="text-sm text-green-800">{{ successMessage }}</p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import {
  Download,
  CheckCircle,
  Info,
  Trash2,
  AlertCircle,
} from "lucide-vue-next";

// Simple implementation without the composable for now
const isDownloading = ref(false);
const downloadProgress = ref({
  current: 0,
  total: 0,
  percentage: 0,
  currentItem: "",
  isComplete: false,
});
const hasOfflineContent = ref(false);
const offlineContentInfo = ref(null);
const errorMessage = ref("");
const successMessage = ref("");
const storageInfo = ref(null);

// Format date for display
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
};

// Check for existing offline content
const checkOfflineContent = () => {
  try {
    if (typeof window === "undefined") return;

    const storedMeta = localStorage.getItem("gesangbuch-offline-meta");
    if (storedMeta) {
      const meta = JSON.parse(storedMeta);
      hasOfflineContent.value = true;
      offlineContentInfo.value = {
        count: meta.count || 0,
        lastUpdated: meta.lastUpdated || "Unknown",
      };

      // Get storage info
      const content = localStorage.getItem("gesangbuch-offline-content");
      if (content) {
        const sizeInBytes = new Blob([content]).size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        storageInfo.value = { sizeInMB, itemCount: meta.count };
      }
    }
  } catch (error) {
    console.error("Error checking offline content:", error);
  }
};

// Start download process
const startDownload = async () => {
  if (isDownloading.value) return;

  try {
    isDownloading.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    downloadProgress.value = {
      current: 0,
      total: 0,
      percentage: 0,
      currentItem: "Initializing...",
      isComplete: false,
    };

    const { queryGesangbuchlied } = useGesangbuchlied();

    // Fetch all songs in batches
    const batchSize = 50;
    let allSongs = [];
    let offset = 0;
    let hasMore = true;

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

        downloadProgress.value.current = allSongs.length;
        downloadProgress.value.total =
          allSongs.length + (batch.length === batchSize ? batchSize : 0);
        downloadProgress.value.percentage = Math.round(
          (allSongs.length / downloadProgress.value.total) * 100
        );

        if (batch.length < batchSize) {
          hasMore = false;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Final progress update
    downloadProgress.value.total = allSongs.length;
    downloadProgress.value.current = allSongs.length;
    downloadProgress.value.percentage = 100;
    downloadProgress.value.currentItem = "Saving to device...";

    // Store the content
    const offlineContent = {
      songs: allSongs,
      lastUpdated: new Date().toISOString(),
      version: "1.0",
    };

    localStorage.setItem(
      "gesangbuch-offline-content",
      JSON.stringify(offlineContent)
    );
    localStorage.setItem(
      "gesangbuch-offline-meta",
      JSON.stringify({
        count: allSongs.length,
        lastUpdated: offlineContent.lastUpdated,
        version: offlineContent.version,
      })
    );

    downloadProgress.value.isComplete = true;
    downloadProgress.value.currentItem = `Downloaded ${allSongs.length} songs successfully!`;

    successMessage.value = `Successfully downloaded ${allSongs.length} songs for offline access!`;

    // Refresh status
    checkOfflineContent();

    setTimeout(() => {
      successMessage.value = "";
    }, 5000);
  } catch (error) {
    console.error("Download failed:", error);
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Failed to download content. Please check your connection and try again.";
  } finally {
    isDownloading.value = false;
  }
};

// Clear offline content
const confirmClearContent = () => {
  if (
    confirm(
      "Are you sure you want to remove all offline content? You'll need to download it again to access songs offline."
    )
  ) {
    try {
      localStorage.removeItem("gesangbuch-offline-content");
      localStorage.removeItem("gesangbuch-offline-meta");

      hasOfflineContent.value = false;
      offlineContentInfo.value = null;
      storageInfo.value = null;

      successMessage.value = "Offline content cleared successfully.";

      setTimeout(() => {
        successMessage.value = "";
      }, 3000);
    } catch (error) {
      errorMessage.value = "Failed to clear offline content.";
    }
  }
};

// Initialize on mount
onMounted(() => {
  checkOfflineContent();
});
</script>

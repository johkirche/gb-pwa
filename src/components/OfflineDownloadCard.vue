<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <Download class="w-5 h-5" />
        <span>{{ t("utils.offlineAccess") }}</span>
      </CardTitle>
      <CardDescription>
        {{ t("utils.downloadDescription") }}
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
              {{
                t("utils.songsDownloaded", { count: offlineContentInfo.count })
              }}
            </p>
            <p class="text-xs text-green-600 mt-1">
              {{ t("utils.lastUpdated") }}:
              {{ formatDate(offlineContentInfo.lastUpdated) }}
            </p>
            <div v-if="storageInfo" class="text-xs text-green-600 mt-1">
              {{ t("utils.storageUsed") }}: {{ storageInfo.sizeInMB }} MB
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
              {{ t("utils.noOfflineContent") }}
            </p>
            <p class="text-xs text-blue-600 mt-1">
              {{ t("utils.downloadAllSongsToAccess") }}
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
          {{
            t("utils.percentComplete", {
              percentage: downloadProgress.percentage,
            })
          }}
        </p>
      </div>

      <!-- Image Precaching Progress -->
      <div v-if="isPrecachingImages" class="space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium text-blue-700">{{
            imagePrecacheProgress.currentImage
          }}</span>
          <span class="text-muted-foreground">
            {{ imagePrecacheProgress.current }} /
            {{ imagePrecacheProgress.total || "?" }}
          </span>
        </div>

        <div class="w-full bg-secondary rounded-full h-2">
          <div
            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
            :style="`width: ${imagePrecacheProgress.percentage}%`"
          ></div>
        </div>

        <p class="text-xs text-blue-600 text-center">
          {{
            t("utils.imagesCached", {
              percentage: imagePrecacheProgress.percentage,
            })
          }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-2">
        <Button
          :disabled="isDownloading || isPrecachingImages"
          class="flex-1"
          :variant="hasOfflineContent ? 'outline' : 'default'"
          @click="startDownload"
        >
          <Download class="w-4 h-4 mr-2" />
          {{
            hasOfflineContent
              ? t("utils.updateContent")
              : t("utils.downloadAllSongs")
          }}
        </Button>

        <Button
          v-if="hasOfflineContent"
          variant="outline"
          size="sm"
          :disabled="isDownloading || isPrecachingImages"
          @click="confirmClearContent"
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
  AlertCircle,
  CheckCircle,
  Download,
  Info,
  Trash2,
} from "lucide-vue-next";

import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useOfflineDownload } from "@/composables/useOfflineDownload";

const { t } = useI18n();

// Use the new IndexedDB-based composable
const {
  isDownloading,
  downloadProgress,
  hasOfflineContent,
  offlineContentInfo,
  isPrecachingImages,
  imagePrecacheProgress,
  downloadAllContent,
  clearOfflineContent,
  checkOfflineContent,
  getStorageInfo,
} = useOfflineDownload();

const errorMessage = ref("");
const successMessage = ref("");
const storageInfo = ref<{
  sizeInBytes: number;
  sizeInMB: string;
  itemCount: number;
} | null>(null);

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
    return t("utils.unknown");
  }
};

// Update storage info
const updateStorageInfo = async () => {
  try {
    storageInfo.value = await getStorageInfo();
  } catch (error) {
    console.error("Error getting storage info:", error);
  }
};

// Start download process
const startDownload = async () => {
  try {
    errorMessage.value = "";
    successMessage.value = "";

    const songCount = await downloadAllContent();

    successMessage.value = t("utils.downloadSuccess", { count: songCount });
    await updateStorageInfo();

    setTimeout(() => {
      successMessage.value = "";
    }, 5000);
  } catch (error) {
    console.error("Download failed:", error);
    errorMessage.value =
      error instanceof Error ? error.message : t("utils.downloadError");
  }
};

// Clear offline content
const confirmClearContent = async () => {
  if (confirm(t("utils.confirmClearContent"))) {
    try {
      await clearOfflineContent();
      storageInfo.value = null;
      successMessage.value = t("utils.offlineContentCleared");

      setTimeout(() => {
        successMessage.value = "";
      }, 3000);
    } catch {
      errorMessage.value = t("utils.failedToClearContent");
    }
  }
};

// Initialize on mount
onMounted(async () => {
  await checkOfflineContent();
  await updateStorageInfo();
});
</script>

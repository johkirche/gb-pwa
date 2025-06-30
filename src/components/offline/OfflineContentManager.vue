<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <Download class="w-5 h-5" />
        <span>{{ t("offline.contentManager.title") }}</span>
      </CardTitle>
      <CardDescription>
        {{ t("offline.contentManager.description") }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- PWA Installation Required -->
      <div v-if="!isInstalled" class="space-y-4">
        <div class="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <Info class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div class="flex-1">
              <p class="text-sm font-medium text-amber-800 dark:text-amber-400">
                {{ t("offline.contentManager.pwaRequired") }}
              </p>
              <p class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {{ t("offline.contentManager.pwaRequiredDescription") }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-center">
          <Button
            v-if="isInstallable"
            @click="installPWA"
            :disabled="isInstalling"
            size="lg"
            class="flex items-center space-x-2"
          >
            <Download class="w-4 h-4" />
            <span>{{ t("offline.contentManager.installAppFirst") }}</span>
          </Button>
        </div>
      </div>

      <!-- Offline Content Management (only when PWA is installed) -->
      <template v-else>
        <!-- Current Status -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold">
            {{ t("offline.contentManager.currentStatus") }}
          </h3>

        <div
          v-if="hasOfflineContent && offlineContentInfo"
          class="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <div class="flex items-start space-x-3">
            <CheckCircle class="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div class="flex-1">
              <p class="text-sm font-medium text-green-800 dark:text-green-400">
                {{
                  t("offline.contentManager.songsDownloaded", {
                    count: offlineContentInfo.count,
                  })
                }}
              </p>
              <p class="text-xs text-green-600 dark:text-green-400 mt-1">
                {{ t("offline.contentManager.lastUpdated") }}:
                {{ formatDate(offlineContentInfo.lastUpdated) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-else-if="!hasOfflineContent"
          class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        >
          <div class="flex items-start space-x-3">
            <Info class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p class="text-sm font-medium text-blue-800 dark:text-blue-400">
                {{ t("offline.contentManager.noOfflineContent") }}
              </p>
              <p class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {{ t("offline.contentManager.downloadAllSongsToAccess") }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Download Progress -->
      <div v-if="isDownloading" class="space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t("offline.contentManager.downloadProgress") }}
        </h3>

        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ downloadProgress.currentItem }}</span>
            <span class="text-muted-foreground">
              {{ downloadProgress.current }} /
              {{ downloadProgress.total || "?" }}
            </span>
          </div>

          <Progress v-model="downloadProgress.percentage" class="w-full" />

          <p class="text-xs text-muted-foreground text-center">
            {{
              t("offline.contentManager.percentComplete", {
                percentage: downloadProgress.percentage,
              })
            }}
          </p>
        </div>
      </div>

      <!-- Asset Precaching Progress -->
      <div v-if="isPrecachingAssets" class="space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t("offline.contentManager.assetCaching") }}
        </h3>

        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-blue-700">{{ assetPrecacheProgress.currentAsset }}</span>
            <span class="text-muted-foreground">
              {{ assetPrecacheProgress.current }} /
              {{ assetPrecacheProgress.total || "?" }}
            </span>
          </div>

          <Progress
            v-model="assetPrecacheProgress.percentage"
            class="w-full bg-blue-100 dark:bg-blue-900"
          >
            <div
              class="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300"
              :style="`width: ${assetPrecacheProgress.percentage}%`"
            />
          </Progress>

          <p class="text-xs text-blue-600 dark:text-blue-400 text-center">
            {{
              t("offline.contentManager.assetsCached", {
                percentage: assetPrecacheProgress.percentage,
              })
            }}
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t("offline.contentManager.actions") }}
        </h3>

        <div class="flex flex-col sm:flex-row gap-3">
          <Button
            :disabled="isDownloading || isPrecachingAssets"
            :variant="hasOfflineContent ? 'outline' : 'default'"
            size="lg"
            class="flex-1"
            @click="startDownload"
          >
            <Download class="w-4 h-4 mr-2" />
            {{
              hasOfflineContent
                ? t("offline.contentManager.updateContent")
                : t("offline.contentManager.downloadAllSongs")
            }}
          </Button>

          <Button
            v-if="hasOfflineContent"
            variant="outline"
            :disabled="isDownloading || isPrecachingAssets"
            size="lg"
            class="flex-1"
            @click="confirmClearContent"
          >
            <Trash2 class="w-4 h-4 mr-2" />
            {{ t("offline.contentManager.clearContent") }}
          </Button>
        </div>
      </div>

      <!-- Download Statistics -->
      <div v-if="hasOfflineContent && offlineContentInfo" class="space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t("offline.contentManager.statistics") }}
        </h3>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ offlineContentInfo.count }}
            </div>
            <div class="text-xs text-gray-600">
              {{ t("offline.contentManager.totalSongs") }}
            </div>
          </div>

          <div v-if="storageInfo" class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ storageInfo.sizeInMB }}
            </div>
            <div class="text-xs text-gray-600">
              {{ t("offline.contentManager.storageUsed") }}
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              <CheckCircle class="w-8 h-8 mx-auto" />
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400">
              {{ t("offline.contentManager.readyOffline") }}
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div class="space-y-3">
        <!-- Error Message -->
        <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-start space-x-2">
            <AlertCircle class="w-4 h-4 text-red-600 mt-0.5" />
            <p class="text-sm text-red-800">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-start space-x-2">
            <CheckCircle class="w-4 h-4 text-green-600 mt-0.5" />
            <p class="text-sm text-green-800">{{ successMessage }}</p>
          </div>
        </div>
      </div>
      </template>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { AlertCircle, CheckCircle, Download, Info, Trash2 } from "lucide-vue-next";

import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { useOfflineDownload } from "@/composables/useOfflineDownload";
import { usePWA } from "@/composables/usePWA";

const { t } = useI18n();

// Use the PWA composable
const { isInstalled, isInstallable, install } = usePWA();

// Use the offline download composable
const {
  isDownloading,
  downloadProgress,
  hasOfflineContent,
  offlineContentInfo,
  isPrecachingAssets,
  assetPrecacheProgress,
  downloadAllContent,
  clearOfflineContent,
  checkOfflineContent,
  getStorageInfo,
} = useOfflineDownload();

const errorMessage = ref("");
const successMessage = ref("");
const isInstalling = ref(false);
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
    return t("offline.contentManager.unknown");
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

    successMessage.value = t("offline.contentManager.downloadSuccess", {
      count: songCount,
    });
    await updateStorageInfo();

    setTimeout(() => {
      successMessage.value = "";
    }, 5000);
  } catch (error) {
    console.error("Download failed:", error);
    errorMessage.value =
      error instanceof Error ? error.message : t("offline.contentManager.downloadError");
  }
};

// Clear offline content
const confirmClearContent = async () => {
  if (confirm(t("offline.contentManager.confirmClearContent"))) {
    try {
      await clearOfflineContent();
      storageInfo.value = null;
      successMessage.value = t("offline.contentManager.offlineContentCleared");

      setTimeout(() => {
        successMessage.value = "";
      }, 3000);
    } catch {
      errorMessage.value = t("offline.contentManager.failedToClearContent");
    }
  }
};

// Install PWA
const installPWA = async () => {
  try {
    isInstalling.value = true;
    const success = await install();
    if (success) {
      successMessage.value = t("offline.pwaStatus.installSuccess");
      setTimeout(() => {
        successMessage.value = "";
      }, 5000);
    }
  } catch (error) {
    console.error("PWA installation failed:", error);
    errorMessage.value = t("offline.pwaStatus.installError");
  } finally {
    isInstalling.value = false;
  }
};

// Initialize on mount
onMounted(async () => {
  await checkOfflineContent();
  await updateStorageInfo();
});
</script>

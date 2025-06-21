<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <HardDrive class="w-5 h-5" />
        <span>{{ t("offline.storage.title") }}</span>
      </CardTitle>
      <CardDescription>
        {{ t("offline.storage.description") }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Storage Usage Overview -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">{{ t("offline.storage.usage") }}</h3>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- IndexedDB Storage -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center space-x-2 mb-2">
              <Database class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium text-blue-800">IndexedDB</span>
            </div>
            <div class="text-lg font-bold text-blue-900">
              {{ offlineStorageInfo?.sizeInMB || "0" }} MB
            </div>
            <div class="text-xs text-blue-600">
              {{ offlineStorageInfo?.itemCount || 0 }}
              {{ t("offline.storage.items") }}
            </div>
          </div>

          <!-- Cache Storage -->
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center space-x-2 mb-2">
              <Archive class="w-4 h-4 text-green-600" />
              <span class="text-sm font-medium text-green-800">{{
                t("offline.storage.cache")
              }}</span>
            </div>
            <div class="text-lg font-bold text-green-900">
              {{ formatBytes(cacheStorageSize) }}
            </div>
            <div class="text-xs text-green-600">
              {{ cacheCount }} {{ t("offline.storage.caches") }}
            </div>
          </div>

          <!-- Available Storage -->
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div class="flex items-center space-x-2 mb-2">
              <Gauge class="w-4 h-4 text-purple-600" />
              <span class="text-sm font-medium text-purple-800">{{
                t("offline.storage.available")
              }}</span>
            </div>
            <div class="text-lg font-bold text-purple-900">
              {{ formatBytes(storageQuota?.available || 0) }}
            </div>
            <div class="text-xs text-purple-600">
              {{ t("offline.storage.free") }}
            </div>
          </div>

          <!-- Total Quota -->
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div class="flex items-center space-x-2 mb-2">
              <Disc class="w-4 h-4 text-orange-600" />
              <span class="text-sm font-medium text-orange-800">{{
                t("offline.storage.total")
              }}</span>
            </div>
            <div class="text-lg font-bold text-orange-900">
              {{ formatBytes(storageQuota?.quota || 0) }}
            </div>
            <div class="text-xs text-orange-600">
              {{ t("offline.storage.quota") }}
            </div>
          </div>
        </div>
      </div>

      <!-- Storage Usage Bar -->
      <div v-if="storageQuota" class="space-y-2">
        <div class="flex justify-between text-sm">
          <span>{{ t("offline.storage.usageProgress") }}</span>
          <span>{{ Math.round(storageUsagePercentage) }}%</span>
        </div>
        <Progress v-model="storageUsagePercentage" class="w-full" />
        <div class="text-xs text-muted-foreground">
          {{ formatBytes(storageQuota.usage) }} {{ t("offline.storage.of") }}
          {{ formatBytes(storageQuota.quota) }} {{ t("offline.storage.used") }}
        </div>
      </div>

      <!-- Browser Capabilities -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t("offline.storage.capabilities") }}
        </h3>

        <div class="grid gap-3 sm:grid-cols-2">
          <!-- Service Worker Support -->
          <div
            class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div class="flex-shrink-0">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  serviceWorkerSupported
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-red-500 dark:bg-red-400',
                ]"
              />
            </div>
            <div>
              <div class="text-sm font-medium">
                {{ t("offline.storage.serviceWorker") }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{
                  serviceWorkerSupported
                    ? t("offline.storage.supported")
                    : t("offline.storage.notSupported")
                }}
              </div>
            </div>
          </div>

          <!-- IndexedDB Support -->
          <div
            class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div class="flex-shrink-0">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  indexedDBSupported
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-red-500 dark:bg-red-400',
                ]"
              />
            </div>
            <div>
              <div class="text-sm font-medium">
                {{ t("offline.storage.indexedDB") }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{
                  indexedDBSupported
                    ? t("offline.storage.supported")
                    : t("offline.storage.notSupported")
                }}
              </div>
            </div>
          </div>

          <!-- Cache API Support -->
          <div
            class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div class="flex-shrink-0">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  cacheAPISupported
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-red-500 dark:bg-red-400',
                ]"
              />
            </div>
            <div>
              <div class="text-sm font-medium">
                {{ t("offline.storage.cacheAPI") }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{
                  cacheAPISupported
                    ? t("offline.storage.supported")
                    : t("offline.storage.notSupported")
                }}
              </div>
            </div>
          </div>

          <!-- Persistent Storage -->
          <div
            class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div class="flex-shrink-0">
              <div
                :class="[
                  'w-3 h-3 rounded-full',
                  persistentStorageGranted
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-yellow-500 dark:bg-yellow-400',
                ]"
              />
            </div>
            <div>
              <div class="text-sm font-medium">
                {{ t("offline.storage.persistent") }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{
                  persistentStorageGranted
                    ? t("offline.storage.granted")
                    : t("offline.storage.notGranted")
                }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t("offline.storage.actions") }}
        </h3>

        <div class="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" @click="refreshStorageInfo">
            <RefreshCw class="w-4 h-4 mr-2" />
            {{ t("offline.storage.refresh") }}
          </Button>

          <Button
            v-if="showPersistentStorageButton"
            variant="outline"
            size="sm"
            @click="requestPersistentStorage"
          >
            <Shield class="w-4 h-4 mr-2" />
            {{ t("offline.storage.requestPersistent") }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import {
  Archive,
  Database,
  Disc,
  Gauge,
  HardDrive,
  RefreshCw,
  Shield,
} from "lucide-vue-next";

import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { useOfflineDownload } from "@/composables/useOfflineDownload";

const { t } = useI18n();
const { getStorageInfo } = useOfflineDownload();

const offlineStorageInfo = ref<{
  sizeInBytes: number;
  sizeInMB: string;
  itemCount: number;
} | null>(null);

const storageQuota = ref<{
  quota: number;
  usage: number;
  available: number;
}>({ quota: 0, usage: 0, available: 0 });

const cacheStorageSize = ref(0);
const cacheCount = ref(0);
const serviceWorkerSupported = ref(false);
const indexedDBSupported = ref(false);
const cacheAPISupported = ref(false);
const persistentStorageGranted = ref(false);
const showPersistentStorageButton = ref(false);

const storageUsagePercentage = computed(() => {
  if (!storageQuota.value.quota) return 0;
  return (storageQuota.value.usage / storageQuota.value.quota) * 100;
});

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const checkBrowserCapabilities = () => {
  if (typeof window === "undefined") return;

  serviceWorkerSupported.value = "serviceWorker" in navigator;
  indexedDBSupported.value = "indexedDB" in window;
  cacheAPISupported.value = "caches" in window;
  showPersistentStorageButton.value =
    !persistentStorageGranted.value && "storage" in navigator;
};

const getStorageEstimate = async () => {
  if (typeof window === "undefined" || !("storage" in navigator)) return;

  try {
    const estimate = await navigator.storage.estimate();
    storageQuota.value = {
      quota: estimate.quota || 0,
      usage: estimate.usage || 0,
      available: (estimate.quota || 0) - (estimate.usage || 0),
    };
  } catch (error) {
    console.error("Error getting storage estimate:", error);
  }
};

const getCacheStorageInfo = async () => {
  if (typeof window === "undefined" || !("caches" in window)) return;

  try {
    const cacheNames = await caches.keys();
    cacheCount.value = cacheNames.length;

    let totalSize = 0;
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      for (const request of requests) {
        const response = await cache.match(request);
        if (response && response.headers.has("content-length")) {
          totalSize += parseInt(response.headers.get("content-length") || "0");
        }
      }
    }
    cacheStorageSize.value = totalSize;
  } catch (error) {
    console.error("Error getting cache storage info:", error);
  }
};

const checkPersistentStorage = async () => {
  if (typeof window === "undefined" || !("storage" in navigator)) return;

  try {
    const persistent = await navigator.storage.persisted();
    persistentStorageGranted.value = persistent;
  } catch (error) {
    console.error("Error checking persistent storage:", error);
  }
};

const requestPersistentStorage = async () => {
  if (typeof window === "undefined" || !("storage" in navigator)) return;

  try {
    const granted = await navigator.storage.persist();
    persistentStorageGranted.value = granted;
  } catch (error) {
    console.error("Error requesting persistent storage:", error);
  }
};

const refreshStorageInfo = async () => {
  await Promise.all([
    updateOfflineStorageInfo(),
    getStorageEstimate(),
    getCacheStorageInfo(),
    checkPersistentStorage(),
  ]);
};

const updateOfflineStorageInfo = async () => {
  try {
    offlineStorageInfo.value = await getStorageInfo();
  } catch (error) {
    console.error("Error getting offline storage info:", error);
  }
};

onMounted(async () => {
  checkBrowserCapabilities();
  await refreshStorageInfo();
});
</script>

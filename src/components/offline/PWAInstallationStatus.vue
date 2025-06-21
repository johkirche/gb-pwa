<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <Smartphone class="w-5 h-5" />
        <span>{{ t("offline.pwaStatus.title") }}</span>
      </CardTitle>
      <CardDescription>
        {{ t("offline.pwaStatus.description") }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- PWA Installed Status -->
      <div
        v-if="isInstalled"
        class="bg-green-50 border border-green-200 rounded-lg p-4"
      >
        <div class="flex items-start space-x-3">
          <CheckCircle class="w-5 h-5 text-green-600 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-medium text-green-800">
              {{ t("offline.pwaStatus.installed") }}
            </p>
            <p class="text-xs text-green-600 mt-1">
              {{ t("offline.pwaStatus.installedDescription") }}
            </p>
          </div>
        </div>
      </div>

      <!-- PWA Not Installed but Installable -->
      <div
        v-else-if="isInstallable"
        class="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div class="flex items-start space-x-3">
          <Download class="w-5 h-5 text-blue-600 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-medium text-blue-800">
              {{ t("offline.pwaStatus.installable") }}
            </p>
            <p class="text-xs text-blue-600 mt-1">
              {{ t("offline.pwaStatus.installableDescription") }}
            </p>
          </div>
        </div>
      </div>

      <!-- PWA Not Installable -->
      <div
        v-else
        class="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
      >
        <div class="flex items-start space-x-3">
          <AlertTriangle
            class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
          />
          <div class="flex-1">
            <p class="text-sm font-medium text-yellow-800 dark:text-yellow-400">
              {{ t("offline.pwaStatus.notInstallable") }}
            </p>
            <p class="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              {{ t("offline.pwaStatus.notInstallableDescription") }}
            </p>
          </div>
        </div>
      </div>

      <!-- Installation Button -->
      <div v-if="isInstallable && !isInstalled" class="pt-2">
        <Button
          :disabled="isInstalling"
          class="w-full"
          size="lg"
          @click="handleInstall"
        >
          <Download class="w-4 h-4 mr-2" />
          {{
            isInstalling
              ? t("offline.pwaStatus.installing")
              : t("offline.pwaStatus.installNow")
          }}
        </Button>
      </div>

      <!-- Success Message -->
      <div
        v-if="installSuccess"
        class="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3"
      >
        <div class="flex items-start space-x-2">
          <CheckCircle class="w-4 h-4 text-green-600 mt-0.5" />
          <p class="text-sm text-green-800 dark:text-green-400">
            {{ t("offline.pwaStatus.installSuccess") }}
          </p>
        </div>
      </div>

      <!-- Error Message -->
      <div
        v-if="installError"
        class="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3"
      >
        <div class="flex items-start space-x-2">
          <AlertCircle class="w-4 h-4 text-red-600 mt-0.5" />
          <p class="text-sm text-red-800 dark:text-red-400">
            {{ installError }}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  Smartphone,
} from "lucide-vue-next";

import { ref } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { usePWA } from "@/composables/usePWA";

const { t } = useI18n();
const { isInstalled, isInstallable, install } = usePWA();

const isInstalling = ref(false);
const installSuccess = ref(false);
const installError = ref("");

const handleInstall = async () => {
  if (!isInstallable.value) return;

  try {
    isInstalling.value = true;
    installError.value = "";

    const success = await install();

    if (success) {
      installSuccess.value = true;
      setTimeout(() => {
        installSuccess.value = false;
      }, 5000);
    } else {
      installError.value = t("offline.pwaStatus.installCanceled");
    }
  } catch (error) {
    console.error("Installation failed:", error);
    installError.value = t("offline.pwaStatus.installError");
  } finally {
    isInstalling.value = false;
  }
};
</script>

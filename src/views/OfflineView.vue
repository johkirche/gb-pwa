<template>
  <AppLayout>
    <main class="container mx-auto py-8 max-w-6xl space-y-8">
        <PageHeader :items="breadcrumbs" />

        <!-- Header -->
        <div>
          <h1 class="text-2xl font-bold mb-2">
            {{ t("offline.title") }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ t("offline.description") }}
          </p>
        </div>

        <!-- PWA Installation Status -->
        <PWAInstallationStatus />

        <!-- Installation Tutorial -->
        <InstallationTutorial />

        <!-- Offline Content Management -->
        <OfflineContentManager />

        <!-- Storage Information -->
        <StorageInformation />
    </main>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import AppLayout from "@/components/layout/AppLayout.vue";
import PageHeader, { type BreadcrumbItem } from "@/components/layout/PageHeader.vue";
import InstallationTutorial from "@/components/offline/InstallationTutorial.vue";
import OfflineContentManager from "@/components/offline/OfflineContentManager.vue";
import PWAInstallationStatus from "@/components/offline/PWAInstallationStatus.vue";
import StorageInformation from "@/components/offline/StorageInformation.vue";

const { t } = useI18n();

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: t("nav.home"), to: { name: "home" } },
  { label: t("offline.title") },
]);
</script>

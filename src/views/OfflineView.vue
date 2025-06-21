<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :page-title="t('songs.pageTitle')"
      :show-back-button="true"
      :back-button-text="t('songs.backButtonText')"
      back-to="/home"
    />

    <ScrollArea class="h-[calc(100vh-65px)]">
      <main class="container mx-auto py-8 space-y-8">
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
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import AppHeader from "@/components/AppHeader.vue";
import InstallationTutorial from "@/components/offline/InstallationTutorial.vue";
import OfflineContentManager from "@/components/offline/OfflineContentManager.vue";
import PWAInstallationStatus from "@/components/offline/PWAInstallationStatus.vue";
import StorageInformation from "@/components/offline/StorageInformation.vue";

const { t } = useI18n();
</script>

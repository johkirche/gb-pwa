<template>
  <!-- Surfaced wherever the app reads the catalogue from the local download
       instead of the server, so it's always clear the list/search only covers
       downloaded songs. Hidden when working against the live server. -->
  <div
    v-if="isUsingCachedData"
    class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted text-muted-foreground px-2 py-1 text-xs font-medium"
    :title="t('utils.offlineDataHint')"
  >
    <DownloadCloud class="w-3.5 h-3.5 shrink-0" />
    <span v-if="!compact" class="truncate">{{ t("utils.offlineDataBadge") }}</span>
    <span class="sr-only">{{ t("utils.offlineDataHint") }}</span>
  </div>
</template>

<script setup lang="ts">
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";
import { DownloadCloud } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import { useI18n } from "vue-i18n";

defineProps<{
  /** Icon-only variant for tight spots like the mobile top bar. */
  compact?: boolean;
}>();

const { t } = useI18n();
const { isUsingCachedData } = storeToRefs(useGesangbuchliedStore());
</script>

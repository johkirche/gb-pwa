<template>
  <div
    class="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-border"
  >
    <div
      v-for="stat in items"
      :key="stat.key"
      class="px-1 sm:px-6 sm:first:pl-0"
    >
      <div class="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight">
        {{ stat.value }}
      </div>
      <p class="text-xs text-muted-foreground mt-1">{{ stat.label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStatsStore } from "@/stores/stats";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useFavorites } from "@/composables/useFavorites";

const { t } = useI18n();
const statsStore = useStatsStore();
const { favoritesCount } = useFavorites();

const items = computed(() => [
  { key: "total", value: statsStore.stats.totalSongs, label: t("home.stats.totalSongs") },
  { key: "offline", value: statsStore.stats.offlineSongs, label: t("home.stats.offlineSongs") },
  { key: "favorites", value: favoritesCount.value, label: t("home.stats.favorites") },
  { key: "recent", value: statsStore.stats.recentlyPlayed, label: t("home.stats.recentlyPlayed") },
]);
</script>

<template>
  <div>
    <div
      class="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-border"
    >
      <div
        v-for="stat in items"
        :key="stat.key"
        class="px-1 sm:px-6 sm:first:pl-0"
      >
        <div
          v-if="stat.pending"
          class="h-8 w-14 sm:h-9 rounded bg-muted animate-pulse"
          aria-hidden="true"
        />
        <div v-else class="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight">
          {{ stat.value }}
        </div>
        <p class="text-xs text-muted-foreground mt-1">{{ stat.label }}</p>
      </div>
    </div>

    <!-- The store records why a load failed; without this a failed load read
         as a confident "0 Lieder insgesamt". -->
    <p
      v-if="statsStore.statsErrorKey"
      role="alert"
      class="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-destructive"
    >
      <span>{{ t(statsStore.statsErrorKey) }}</span>
      <Button
        variant="link"
        size="sm"
        class="h-auto p-0 text-destructive underline"
        @click="statsStore.loadStats()"
      >
        {{ t("utils.retry") }}
      </Button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useStatsStore } from "@/stores/stats";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";

import { useFavorites } from "@/composables/useFavorites";

const { t } = useI18n();
const statsStore = useStatsStore();
const { favoritesCount } = useFavorites();

const items = computed(() => {
  const loading = statsStore.isLoadingStats;
  const failed = statsStore.statsErrorKey !== null;
  return [
    {
      key: "total",
      // The network total is the one number that is unknown after a failure.
      value: failed ? "—" : statsStore.stats.totalSongs,
      label: t("home.stats.totalSongs"),
      pending: loading,
    },
    {
      key: "offline",
      value: statsStore.stats.offlineSongs,
      label: t("home.stats.offlineSongs"),
      pending: loading,
    },
    { key: "favorites", value: favoritesCount.value, label: t("home.stats.favorites"), pending: false },
    {
      key: "recent",
      value: statsStore.stats.recentlyPlayed,
      label: t("home.stats.recentlyPlayed"),
      pending: loading,
    },
  ];
});
</script>

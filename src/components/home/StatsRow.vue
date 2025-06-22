<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <Card>
      <CardContent class="flex flex-col items-center justify-center p-6">
        <div class="text-2xl font-bold text-primary">
          {{ statsStore.stats.totalSongs }}+
        </div>
        <p class="text-sm text-muted-foreground text-center">
          {{ t("home.stats.totalSongs") }}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="flex flex-col items-center justify-center p-6">
        <div class="text-2xl font-bold text-primary">
          {{ statsStore.stats.offlineSongs }}
        </div>
        <p class="text-sm text-muted-foreground text-center">
          {{ t("home.stats.offlineSongs") }}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="flex flex-col items-center justify-center p-6">
        <div class="text-2xl font-bold text-primary">
          {{ favoritesCount }}
        </div>
        <p class="text-sm text-muted-foreground text-center">
          {{ t("home.stats.favorites") }}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="flex flex-col items-center justify-center p-6">
        <div class="text-2xl font-bold text-primary">
          {{ statsStore.stats.recentlyPlayed }}
        </div>
        <p class="text-sm text-muted-foreground text-center">
          {{ t("home.stats.recentlyPlayed") }}
        </p>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useStatsStore } from "@/stores/stats";

import { useI18n } from "vue-i18n";

import { Card, CardContent } from "@/components/ui/card";

import { useFavorites } from "@/composables/useFavorites";

const { t } = useI18n();
const statsStore = useStatsStore();
const { favoritesCount } = useFavorites();
</script>

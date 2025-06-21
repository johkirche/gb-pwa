<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <Card>
      <CardContent class="flex flex-col items-center justify-center p-6">
        <div class="text-2xl font-bold text-primary">400+</div>
        <p class="text-sm text-muted-foreground text-center">
          {{ t("home.stats.totalSongs") }}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="flex flex-col items-center justify-center p-6">
        <div class="text-2xl font-bold text-primary">
          {{ stats.offlineSongs }}
        </div>
        <p class="text-sm text-muted-foreground text-center">
          {{ t("home.stats.offlineSongs") }}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="flex flex-col items-center justify-center p-6">
        <div class="text-2xl font-bold text-primary">
          {{ stats.favorites }}
        </div>
        <p class="text-sm text-muted-foreground text-center">
          {{ t("home.stats.favorites") }}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="flex flex-col items-center justify-center p-6">
        <div class="text-2xl font-bold text-primary">
          {{ stats.recentlyPlayed }}
        </div>
        <p class="text-sm text-muted-foreground text-center">
          {{ t("home.stats.recentlyPlayed") }}
        </p>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();

interface Stats {
  offlineSongs: number;
  favorites: number;
  recentlyPlayed: number;
}

defineProps<{
  stats: Stats;
}>();
</script>

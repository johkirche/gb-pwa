<template>
  <div class="flex flex-col items-center justify-center py-16 px-4">
    <div class="text-center max-w-md">
      <!-- Heart Icon -->
      <div
        class="mx-auto mb-6 w-24 h-24 rounded-full bg-muted flex items-center justify-center"
      >
        <Heart class="w-12 h-12 text-muted-foreground" />
      </div>

      <!-- Title -->
      <h3 class="text-xl font-semibold mb-3">
        {{ t("songs.noFavoritesYet") }}
      </h3>

      <!-- Description -->
      <p class="text-muted-foreground mb-6 leading-relaxed">
        {{ t("songs.noFavoritesDescription") }}
      </p>

      <!-- Instructions -->
      <div class="bg-muted/50 rounded-lg p-4 mb-6">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0 mt-1">
            <div
              class="w-8 h-8 rounded-full bg-background flex items-center justify-center relative group"
            >
              <Heart
                class="w-4 h-4 text-muted-foreground group-hover:text-red-500 transition-colors"
              />
            </div>
          </div>
          <div class="text-left">
            <p class="text-sm font-medium mb-1">
              {{ t("songs.howToAddFavorites") }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ t("songs.favoriteInstructions") }}
            </p>
          </div>
        </div>
      </div>

      <!-- Clear Filter Button -->
      <Button @click="$emit('clearFavoritesFilter')">
        {{ t("songs.showAllSongs") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Heart } from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";

const { t } = useI18n();

defineEmits<{
  clearFavoritesFilter: [];
}>();
</script>

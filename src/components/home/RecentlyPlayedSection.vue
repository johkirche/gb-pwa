<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("home.recent.title") }}</CardTitle>
      <CardDescription>{{ t("home.recent.description") }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div
          v-for="song in recentSongs"
          :key="song.id"
          role="button"
          tabindex="0"
          class="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="handleSongClick(song)"
          @keydown.enter.prevent="handleSongClick(song)"
          @keydown.space.prevent="handleSongClick(song)"
        >
          <div class="flex items-center space-x-3">
            <div
              class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center"
            >
              <span class="text-2xl">🎵</span>
            </div>
            <div>
              <p class="font-medium">{{ song.title }}</p>
              <p class="text-sm text-muted-foreground">{{ song.author }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <Badge v-if="song.isOffline" variant="secondary">
              {{ t("home.recent.offline") }}
            </Badge>
            <Badge v-if="song.isFavorite" variant="outline"> ❤️ </Badge>
            <Button
              size="sm"
              variant="ghost"
              :aria-label="t('home.recent.play')"
              @click.stop="handlePlaySong(song)"
            >
              <span aria-hidden="true">▶️</span>
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const { t } = useI18n();

export interface Song {
  id: number;
  title: string;
  author: string;
  isOffline?: boolean;
  isFavorite?: boolean;
  category?: string;
  hasAudio?: boolean;
  hasSheetMusic?: boolean;
}

defineProps<{
  recentSongs: Song[];
}>();

const emit = defineEmits<{
  songClick: [song: Song];
  playSong: [song: Song];
}>();

const handleSongClick = (song: Song) => {
  emit("songClick", song);
};

const handlePlaySong = (song: Song) => {
  emit("playSong", song);
};
</script>

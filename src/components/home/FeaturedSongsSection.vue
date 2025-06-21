<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("home.featured.title") }}</CardTitle>
      <CardDescription>{{ t("home.featured.description") }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="song in featuredSongs"
          :key="song.id"
          class="group cursor-pointer"
          @click="handleSongClick(song)"
        >
          <div
            class="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-6 group-hover:shadow-lg transition-all"
          >
            <div class="flex items-center space-x-3 mb-4">
              <div
                class="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center"
              >
                <span class="text-3xl">🎼</span>
              </div>
              <div>
                <h3 class="font-semibold">{{ song.title }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ song.author }}
                </p>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <Badge variant="secondary">{{ song.category }}</Badge>
                <Badge v-if="song.hasAudio" variant="outline">🎵</Badge>
                <Badge v-if="song.hasSheetMusic" variant="outline">🎼</Badge>
              </div>
              <Button
                size="sm"
                variant="secondary"
                @click.stop="handlePlaySong(song)"
              >
                ▶️
              </Button>
            </div>
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
  featuredSongs: Song[];
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

<template>
  <Card class="sticky top-4 z-10">
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <span>🎵</span>
        <span>{{ t("churchService.audioPlayer.title") }}</span>
      </CardTitle>
      <CardDescription>
        {{ t("churchService.audioPlayer.description") }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Current Song Info -->
      <div class="bg-muted rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium">
            {{ currentSongTitle }}
          </h4>
          <Badge variant="outline">
            {{
              t("churchService.songNumber", {
                number: currentSongPosition + 1,
                total: service.songs.length,
              })
            }}
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ t("churchService.audioPlayer.playingVerses") }}: {{ currentVerses.join(", ") }}
        </p>
      </div>

      <!-- Service Progress -->
      <div class="space-y-2">
        <div class="flex justify-between text-sm text-muted-foreground">
          <span>{{ t("churchService.progress") }}</span>
          <span>{{ currentSongPosition + 1 }} / {{ service.songs.length }}</span>
        </div>
        <div class="w-full bg-muted rounded-full h-2">
          <div
            class="bg-primary h-2 rounded-full transition-all duration-300"
            :style="{ width: `${((currentSongPosition + 1) / service.songs.length) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Songs List -->
      <div class="space-y-2">
        <h5 class="text-sm font-medium">{{ t("churchService.serviceOrder") }}:</h5>
        <div class="space-y-1">
          <div
            v-for="(serviceSong, index) in service.songs"
            :key="index"
            :class="[
              'flex items-center justify-between p-2 rounded text-sm',
              index === currentSongPosition
                ? 'bg-primary text-primary-foreground'
                : index < currentSongPosition
                  ? 'bg-green-100 text-green-800'
                  : 'bg-muted',
            ]"
          >
            <div class="flex items-center space-x-2">
              <span class="font-medium">{{ index + 1 }}.</span>
              <span>{{ serviceSong.song?.titel || t("churchService.noSongSelected") }}</span>
            </div>
            <div class="flex items-center space-x-1">
              <span class="text-xs">({{ serviceSong.verses.join(", ") }})</span>
              <CheckCircle v-if="index < currentSongPosition" class="w-4 h-4" />
              <Play v-else-if="index === currentSongPosition" class="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <!-- Audio Player -->
      <div v-if="currentAudioUrl" class="space-y-4">
        <SimpleAudioPlayer
          :key="currentAudioUrl"
          :audio-url="currentAudioUrl"
          :title="currentSongTitle"
          :autoplay="true"
          @ended="onAudioEnded"
        />
      </div>

      <!-- No Audio Message -->
      <div v-else class="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertTriangle class="w-5 h-5 text-yellow-600 mx-auto mb-2" />
        <p class="text-sm text-yellow-800">
          {{ t("churchService.audioPlayer.noAudio") }}
        </p>
      </div>

      <!-- Service Controls -->
      <div class="flex items-center justify-center gap-2 pt-4 border-t">
        <Button v-if="currentSongPosition > 0" variant="outline" size="sm" @click="previousSong">
          <SkipBack class="w-4 h-4 mr-1" />
          {{ t("churchService.audioPlayer.previous") }}
        </Button>

        <Button
          v-if="currentSongPosition < service.songs.length - 1"
          variant="outline"
          size="sm"
          @click="nextSong"
        >
          <SkipForward class="w-4 h-4 mr-1" />
          {{ t("churchService.audioPlayer.next") }}
        </Button>

        <Button variant="destructive" size="sm" @click="stopService">
          <Square class="w-4 h-4 mr-1" />
          {{ t("churchService.audioPlayer.stop") }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle, Play, SkipBack, SkipForward, Square } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import SimpleAudioPlayer from "@/components/song/SimpleAudioPlayer.vue";

import type { ChurchService } from "@/composables/useChurchService";

interface Props {
  service: ChurchService;
  currentSongPosition?: number;
}

const props = withDefaults(defineProps<Props>(), {
  currentSongPosition: 0,
});

const emit = defineEmits<{
  songCompleted: [];
  serviceCompleted: [];
  songChanged: [position: number];
  serviceStopped: [];
}>();

const { t } = useI18n();

const currentSong = computed(() => {
  if (props.currentSongPosition >= 0 && props.currentSongPosition < props.service.songs.length) {
    return props.service.songs[props.currentSongPosition].song;
  }
  return null;
});

const currentVerses = computed((): number[] => {
  if (props.currentSongPosition >= 0 && props.currentSongPosition < props.service.songs.length) {
    return props.service.songs[props.currentSongPosition].verses;
  }
  return [];
});

const currentSongTitle = computed((): string => {
  return currentSong.value?.titel || t("utils.unknown");
});

const currentAudioUrl = computed((): string | null => {
  if (!currentSong.value) return null;

  // Get first available audio file
  const audioFiles =
    currentSong.value.melodieId?.noten?.filter((note) =>
      note?.directus_files_id?.type?.includes("audio"),
    ) || [];

  if (audioFiles.length === 0) return null;

  const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
  const firstAudioFile = audioFiles[0];

  return firstAudioFile?.directus_files_id?.id
    ? `${directusUrl}/assets/${firstAudioFile.directus_files_id.id}`
    : null;
});

const onAudioEnded = () => {
  emit("songCompleted");
};

const previousSong = () => {
  if (props.currentSongPosition > 0) {
    emit("songChanged", props.currentSongPosition - 1);
  }
};

const nextSong = () => {
  if (props.currentSongPosition < props.service.songs.length - 1) {
    emit("songChanged", props.currentSongPosition + 1);
  }
};

const stopService = () => {
  emit("serviceStopped");
};
</script>

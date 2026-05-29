<template>
  <div class="space-y-6">
    <!-- Intro slot ("Vorspiel") — standalone piece from freie_musikstuecke -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-purple-600" />
          {{ t("churchService.intro") }}
          <Badge variant="outline" class="text-[10px] font-normal">
            {{ t("churchService.optional") }}
          </Badge>
        </CardTitle>
        <CardDescription class="text-xs">
          {{ t("churchService.introDescription") }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PiecePicker
          :selected-piece="store.currentService.intro"
          :placeholder="t('churchService.selectIntroPiece')"
          @piece-selected="store.setIntroPiece"
        />
      </CardContent>
    </Card>

    <!-- Main songs -->
    <Card>
      <CardContent class="pt-6">
        <SongListManager
          :songs="store.currentService.songs"
          @add-song="handleAddMainSong"
          @remove-song="store.removeSong"
          @update-song="handleUpdateMainSong"
          @update-verses="store.updateSongVerses"
          @update-speed="store.updateSongSpeed"
          @update-pitch="store.updateSongPitch"
          @reorder-songs="store.reorderSongs"
        />
      </CardContent>
    </Card>

    <!-- Outro slot ("Nachspiel") — standalone piece from freie_musikstuecke -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-base flex items-center gap-2">
          <Sunset class="w-4 h-4 text-amber-600" />
          {{ t("churchService.outro") }}
          <Badge variant="outline" class="text-[10px] font-normal">
            {{ t("churchService.optional") }}
          </Badge>
        </CardTitle>
        <CardDescription class="text-xs">
          {{ t("churchService.outroDescription") }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PiecePicker
          :selected-piece="store.currentService.outro"
          :placeholder="t('churchService.selectOutroPiece')"
          @piece-selected="store.setOutroPiece"
        />
      </CardContent>
    </Card>

    <!-- Validation banner -->
    <div
      v-if="invalidMessages.length > 0"
      class="flex items-start gap-2 text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-md p-3"
    >
      <AlertTriangle class="w-4 h-4 mt-0.5 flex-shrink-0" />
      <ul class="space-y-1">
        <li v-for="(msg, idx) in invalidMessages" :key="idx">{{ msg }}</li>
      </ul>
    </div>

    <!-- Step footer -->
    <div class="flex items-center justify-between gap-3 pt-2">
      <Button variant="outline" @click="emit('back')">
        <ChevronLeft class="w-4 h-4 mr-1" />
        {{ t("churchService.stepper.backToStart") }}
      </Button>
      <Button :disabled="!store.canAdvanceToDevice" @click="store.goToDevice">
        {{ t("churchService.stepper.nextDevice") }}
        <ChevronRight class="w-4 h-4 ml-1" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChurchServiceStore } from "@/stores/churchService";
import { AlertTriangle, ChevronLeft, ChevronRight, Sparkles, Sunset } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import PiecePicker from "./PiecePicker.vue";
import SongListManager from "./SongListManager.vue";

const emit = defineEmits<{
  back: [];
}>();

const { t } = useI18n();
const store = useChurchServiceStore();

const invalidMessages = computed(() =>
  store.invalidSetupSongs.map((entry) =>
    entry.reason === "no-midi"
      ? t("churchService.cannotPlayMissingMidi", { songs: entry.label })
      : t("churchService.cannotPlayMissingVerses", { song: entry.label }),
  ),
);

const handleAddMainSong = (song?: Gesangbuchlied) => {
  store.addSong(song);
};

const handleUpdateMainSong = (index: number, song: Gesangbuchlied) => {
  if (index < 0 || index >= store.currentService.songs.length) return;
  store.currentService.songs[index].song = song;
  store.currentService.songs[index].verses = store.getAllVerses(song);
};
</script>

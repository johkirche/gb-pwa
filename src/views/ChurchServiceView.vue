<template>
  <div class="min-h-screen bg-background">
    <AppHeader :page-title="t('churchService.title')" :show-back-button="true" />
    <ScrollArea class="h-[calc(100vh-65px)]">
      <main class="container mx-auto py-8 space-y-8">
        <!-- Current Service Setup -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <span>⛪</span>
              <span>{{ t("churchService.currentService") }}</span>
            </CardTitle>
            <CardDescription>
              {{ t("churchService.createServiceDescription") }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <!-- Song List Manager -->
            <SongListManager
              :songs="currentService.songs"
              @add-song="handleAddSong"
              @remove-song="removeSong"
              @update-song="handleUpdateSong"
              @update-verses="updateSongVerses"
              @reorder-songs="reorderSongs"
            />

            <!-- Service Controls -->
            <div class="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              <Button
                :disabled="!canPlayService"
                size="lg"
                class="flex items-center space-x-2"
                @click="playService"
              >
                <Play class="w-5 h-5" />
                <span>{{ t("churchService.playService") }}</span>
              </Button>

              <Button
                :disabled="!canSaveService"
                variant="outline"
                size="lg"
                class="flex items-center space-x-2"
                @click="saveService"
              >
                <Save class="w-5 h-5" />
                <span>{{ t("churchService.saveService") }}</span>
              </Button>

              <Button
                v-if="currentService.songs.length > 0"
                variant="outline"
                size="lg"
                class="flex items-center space-x-2"
                @click="clearService"
              >
                <X class="w-5 h-5" />
                <span>{{ t("churchService.clearService") }}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- Audio Player for Service -->
        <ServiceAudioPlayer
          v-if="isPlayingService"
          :service="currentService"
          :current-song-position="currentPlayingIndex"
          @song-completed="onSongCompleted"
          @service-completed="onServiceCompleted"
          @song-changed="currentPlayingIndex = $event"
          @service-stopped="onServiceCompleted"
        />

        <!-- Service History -->
        <ServiceHistory
          :history="serviceHistory"
          @load-service="loadService"
          @delete-service="deleteService"
        />
      </main>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { Play, Save, X } from "lucide-vue-next";

import { onMounted } from "vue";
import { useI18n } from "vue-i18n";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import AppHeader from "@/components/AppHeader.vue";
import ServiceAudioPlayer from "@/components/church-service/ServiceAudioPlayer.vue";
import ServiceHistory from "@/components/church-service/ServiceHistory.vue";
import SongListManager from "@/components/church-service/SongListManager.vue";

import { useChurchService } from "@/composables/useChurchService";

const { t } = useI18n();

const {
  currentService,
  serviceHistory,
  isPlayingService,
  currentPlayingIndex,
  canPlayService,
  canSaveService,
  addSong,
  removeSong,
  updateSongVerses,
  reorderSongs,
  playService,
  saveService,
  clearService,
  loadService,
  deleteService,
  loadHistory,
  onSongCompleted,
  onServiceCompleted,
  getAllVerses,
} = useChurchService();

const handleAddSong = (song?: Gesangbuchlied) => {
  addSong(song); // This will create a song entry with the selected song or null
};

const handleUpdateSong = (index: number, song: Gesangbuchlied) => {
  if (index >= 0 && index < currentService.value.songs.length) {
    currentService.value.songs[index].song = song;
    currentService.value.songs[index].verses = getAllVerses(song);
  }
};

onMounted(async () => {
  await loadHistory();
});
</script>

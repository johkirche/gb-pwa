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
              :songs="churchServiceStore.currentService.songs"
              @add-song="handleAddSong"
              @remove-song="churchServiceStore.removeSong"
              @update-song="handleUpdateSong"
              @update-verses="churchServiceStore.updateSongVerses"
              @reorder-songs="churchServiceStore.reorderSongs"
            />

            <!-- Service Controls -->
            <div class="flex flex-col sm:flex-row gap-4 pt-6 border-t">
              <Button
                :disabled="!churchServiceStore.canPlayService"
                size="lg"
                class="flex items-center space-x-2"
                @click="churchServiceStore.playService"
              >
                <Play class="w-5 h-5" />
                <span>{{ t("churchService.playService") }}</span>
              </Button>

              <Button
                :disabled="!churchServiceStore.canSaveService"
                variant="outline"
                size="lg"
                class="flex items-center space-x-2"
                @click="churchServiceStore.saveService"
              >
                <Save class="w-5 h-5" />
                <span>{{ t("churchService.saveService") }}</span>
              </Button>

              <Button
                v-if="churchServiceStore.currentService.songs.length > 0"
                variant="outline"
                size="lg"
                class="flex items-center space-x-2"
                @click="churchServiceStore.clearService"
              >
                <X class="w-5 h-5" />
                <span>{{ t("churchService.clearService") }}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- Audio Player for Service -->
        <ServiceAudioPlayer
          v-if="churchServiceStore.isPlayingService"
          :service="churchServiceStore.currentService"
          :current-song-position="churchServiceStore.currentPlayingIndex"
          @song-completed="churchServiceStore.onSongCompleted"
          @service-completed="churchServiceStore.onServiceCompleted"
          @song-changed="churchServiceStore.currentPlayingIndex = $event"
          @service-stopped="churchServiceStore.onServiceCompleted"
        />

        <!-- Service History -->
        <ServiceHistory
          :history="churchServiceStore.serviceHistory"
          @load-service="churchServiceStore.loadService"
          @delete-service="churchServiceStore.deleteService"
        />
      </main>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { useChurchServiceStore } from "@/stores/churchService";
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

const { t } = useI18n();

const churchServiceStore = useChurchServiceStore();

const handleAddSong = (song?: Gesangbuchlied) => {
  churchServiceStore.addSong(song); // This will create a song entry with the selected song or null
};

const handleUpdateSong = (index: number, song: Gesangbuchlied) => {
  if (index >= 0 && index < churchServiceStore.currentService.songs.length) {
    churchServiceStore.currentService.songs[index].song = song;
    churchServiceStore.currentService.songs[index].verses = churchServiceStore.getAllVerses(song);
  }
};

onMounted(async () => {
  await churchServiceStore.loadHistory();
});
</script>

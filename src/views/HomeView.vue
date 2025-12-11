<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :page-title="t('home.welcome', { userName })"
      :show-logout-button="true"
      @logout="handleLogout"
    />
    <ScrollArea class="h-[calc(100vh-65px)]">
      <!-- Main Content -->
      <main class="container mx-auto py-8 space-y-8">
        <!-- Quick Stats Row -->
        <StatsRow :stats="statsStore.stats" />

        <!-- Search Bar -->
        <SearchSection />

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            class="cursor-pointer hover:shadow-lg hover:bg-muted transition-all"
            @click="router.push({ name: 'songs' })"
          >
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <span>🎵</span>
                <span>{{ t("home.actions.browseSongs") }}</span>
              </CardTitle>
              <CardDescription>{{ t("home.actions.browseSongsDesc") }}</CardDescription>
            </CardHeader>
          </Card>

          <Card
            class="cursor-pointer hover:shadow-lg hover:bg-muted transition-all"
            @click="router.push({ name: 'offline' })"
          >
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <span>📱</span>
                <span>{{ t("home.actions.offlineManager") }}</span>
              </CardTitle>
              <CardDescription>{{ t("home.actions.offlineManagerDesc") }}</CardDescription>
            </CardHeader>
          </Card>

          <Card
            class="cursor-pointer hover:shadow-lg hover:bg-muted transition-all"
            @click="router.push({ name: 'songs', query: { favoritesOnly: 'true' } })"
          >
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <span>❤️</span>
                <span>{{ t("home.actions.favorites") }}</span>
              </CardTitle>
              <CardDescription>{{ t("home.actions.favoritesDesc") }}</CardDescription>
            </CardHeader>
          </Card>

          <Card
            class="cursor-pointer hover:shadow-lg hover:bg-muted transition-all"
            @click="router.push({ name: 'church-service' })"
          >
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <span>⛪</span>
                <span>{{ t("home.actions.churchService") }}</span>
              </CardTitle>
              <CardDescription>{{ t("home.actions.churchServiceDesc") }}</CardDescription>
            </CardHeader>
          </Card>

          <Card
            class="cursor-pointer hover:shadow-lg hover:bg-muted transition-all"
            @click="router.push({ name: 'midi-test' })"
          >
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <span>🎹</span>
                <span>MIDI Test</span>
              </CardTitle>
              <CardDescription>Test MIDI file upload and playback</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <!-- Categories -->
        <CategoriesSection />

        <!-- Service History -->
        <ServiceHistory
          :history="churchServiceStore.serviceHistory"
          @load-service="handleLoadService"
          @delete-service="churchServiceStore.deleteService"
        />

        <!-- Featured Songs -->
        <FeaturedSongsSection
          :featured-songs="mockFeaturedSongs"
          @song-click="handleSongClick"
          @play-song="handlePlaySong"
        />
      </main>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { type ServiceHistoryItem, useChurchServiceStore } from "@/stores/churchService";
import { useStatsStore } from "@/stores/stats";

import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import AppHeader from "@/components/AppHeader.vue";
import ServiceHistory from "@/components/church-service/ServiceHistory.vue";
import CategoriesSection from "@/components/home/CategoriesSection.vue";
import FeaturedSongsSection, { type Song } from "@/components/home/FeaturedSongsSection.vue";
import SearchSection from "@/components/home/SearchSection.vue";
import StatsRow from "@/components/home/StatsRow.vue";

import { useAuth } from "@/composables/useAuth";

const { t } = useI18n();
const { userName, logout } = useAuth();
const statsStore = useStatsStore();
const router = useRouter();

const churchServiceStore = useChurchServiceStore();

// Handler for loading service from home page
const handleLoadService = async (service: ServiceHistoryItem) => {
  // Load the service into the store
  churchServiceStore.loadService(service);
  // Navigate to the church service page
  await router.push({ name: "church-service" });
};

const mockFeaturedSongs = ref<Song[]>([
  {
    id: 1,
    title: "O Come, O Come Emmanuel",
    author: "Traditional",
    category: "Advent",
    hasAudio: true,
    hasSheetMusic: true,
  },
  {
    id: 2,
    title: "Silent Night",
    author: "Franz Gruber",
    category: "Weihnachten",
    hasAudio: true,
    hasSheetMusic: true,
  },
  {
    id: 3,
    title: "Christ the Lord is Risen Today",
    author: "Charles Wesley",
    category: "Ostern",
    hasAudio: false,
    hasSheetMusic: true,
  },
]);

// Load stats and service history on component mount
onMounted(async () => {
  await statsStore.loadStats();
  await churchServiceStore.loadHistory();
});

// Handler functions
const handleLogout = async () => {
  await logout();
};

const handleSongClick = (song: Song) => {
  console.log("Navigate to song:", song.title);
  // Navigate to song detail
};

const handlePlaySong = (song: Song) => {
  console.log("Play song:", song.title);
  // Start playing song
};
</script>

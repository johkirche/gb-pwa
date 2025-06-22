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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            class="cursor-pointer hover:shadow-lg hover:bg-muted transition-all"
            @click="router.push({ name: 'songs' })"
          >
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <span>🎵</span>
                <span>{{ t("home.actions.browseSongs") }}</span>
              </CardTitle>
              <CardDescription>{{
                t("home.actions.browseSongsDesc")
              }}</CardDescription>
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
              <CardDescription>{{
                t("home.actions.offlineManagerDesc")
              }}</CardDescription>
            </CardHeader>
          </Card>

          <Card
            class="cursor-pointer hover:shadow-lg hover:bg-muted transition-all"
            @click="
              router.push({ name: 'songs', query: { favoritesOnly: 'true' } })
            "
          >
            <CardHeader>
              <CardTitle class="flex items-center space-x-2">
                <span>❤️</span>
                <span>{{ t("home.actions.favorites") }}</span>
              </CardTitle>
              <CardDescription>{{
                t("home.actions.favoritesDesc")
              }}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <!-- Categories -->
        <CategoriesSection />

        <!-- Recently Played -->
        <RecentlyPlayedSection
          :recent-songs="mockRecentSongs"
          @song-click="handleSongClick"
          @play-song="handlePlaySong"
        />

        <!-- Featured Songs -->
        <FeaturedSongsSection
          :featured-songs="mockFeaturedSongs"
          @song-click="handleSongClick"
          @play-song="handlePlaySong"
        />

        <!-- Audio Formats Info -->
        <AudioFormatsSection />
      </main>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { useStatsStore } from "@/stores/stats";

import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import AppHeader from "@/components/AppHeader.vue";
import AudioFormatsSection from "@/components/home/AudioFormatsSection.vue";
import CategoriesSection from "@/components/home/CategoriesSection.vue";
import FeaturedSongsSection from "@/components/home/FeaturedSongsSection.vue";
import RecentlyPlayedSection, {
  type Song,
} from "@/components/home/RecentlyPlayedSection.vue";
import SearchSection from "@/components/home/SearchSection.vue";
import StatsRow from "@/components/home/StatsRow.vue";

import { useAuth } from "@/composables/useAuth";

const { t } = useI18n();
const { userName, logout } = useAuth();
const statsStore = useStatsStore();
const router = useRouter();

const mockRecentSongs = ref<Song[]>([
  {
    id: 1,
    title: "Amazing Grace",
    author: "John Newton",
    isOffline: true,
    isFavorite: true,
  },
  {
    id: 2,
    title: "How Great Thou Art",
    author: "Carl Boberg",
    isOffline: false,
    isFavorite: false,
  },
  {
    id: 3,
    title: "Großer Gott, wir loben dich",
    author: "Ignaz Franz",
    isOffline: true,
    isFavorite: true,
  },
  {
    id: 4,
    title: "Von guten Mächten",
    author: "Dietrich Bonhoeffer",
    isOffline: false,
    isFavorite: false,
  },
]);

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

// Load stats on component mount
onMounted(async () => {
  await statsStore.loadStats();
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

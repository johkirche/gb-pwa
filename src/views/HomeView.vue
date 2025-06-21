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
        <StatsRow :stats="mockStats" />

        <!-- Search Bar -->
        <SearchSection @search="handleSearch" />

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
            @click="handleFavorites"
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
        <CategoriesSection
          :categories="mockCategories"
          @category-click="handleCategoryClick"
        />

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
import { ref } from "vue";
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
import CategoriesSection, {
  type Category,
} from "@/components/home/CategoriesSection.vue";
import FeaturedSongsSection from "@/components/home/FeaturedSongsSection.vue";
import RecentlyPlayedSection, {
  type Song,
} from "@/components/home/RecentlyPlayedSection.vue";
import SearchSection from "@/components/home/SearchSection.vue";
import StatsRow from "@/components/home/StatsRow.vue";

import { useAuth } from "@/composables/useAuth";

const { t } = useI18n();
const { userName, logout } = useAuth();
const router = useRouter();

// Mock data for design purposes
const mockStats = ref({
  offlineSongs: 23,
  favorites: 12,
  recentlyPlayed: 8,
});

const mockCategories = ref<Category[]>([
  { id: 1, name: "Advent", icon: "🕯️", count: 45 },
  { id: 2, name: "Weihnachten", icon: "🎄", count: 62 },
  { id: 3, name: "Ostern", icon: "🐣", count: 38 },
  { id: 4, name: "Pfingsten", icon: "🕊️", count: 24 },
  { id: 5, name: "Lob & Anbetung", icon: "🙏", count: 89 },
  { id: 6, name: "Gemeinschaft", icon: "👥", count: 56 },
  { id: 7, name: "Moderne Lieder", icon: "🎸", count: 34 },
  { id: 8, name: "Klassische Hymnen", icon: "⛪", count: 78 },
]);

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

// Mock handler functions
const handleLogout = async () => {
  await logout();
};

const handleSearch = (query: string) => {
  console.log("Search for:", query);
  // Navigate to search results
};

const handleFavorites = () => {
  console.log("Navigate to favorites");
  // Navigate to favorites list
};

const handleCategoryClick = (category: Category) => {
  console.log("Navigate to category:", category.name);
  // Navigate to category songs
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

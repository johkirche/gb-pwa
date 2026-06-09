<template>
  <AppLayout>
    <main class="container mx-auto py-8 max-w-6xl space-y-6">
      <PageHeader :items="breadcrumbs" />

      <section class="space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Plus class="w-6 h-6 text-primary" />
              {{ t("playlist.addSongs") }}
            </h1>
            <p v-if="playlist" class="text-sm text-muted-foreground mt-1 truncate">
              {{ playlist.name }}
            </p>
          </div>
          <Button variant="outline" size="sm" class="flex-shrink-0" @click="done">
            {{ t("playlist.back") }}
          </Button>
        </div>

        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
          />
          <Input v-model="addSearch" :placeholder="t('churchService.searchSongs')" class="pl-10" />
        </div>

        <div class="space-y-2">
          <div
            v-for="song in addCandidates"
            :key="song.id"
            class="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
            @click="addSong(song.id)"
          >
            <div class="flex items-baseline gap-2 min-w-0">
              <span
                v-if="getLiedNumber(song) !== null"
                class="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold tabular-nums flex-shrink-0"
              >
                {{ getLiedNumber(song) }}
              </span>
              <span class="font-medium truncate">{{ song.titel }}</span>
            </div>
          </div>
          <div v-if="addCandidates.length === 0" class="text-center py-10">
            <p class="text-sm text-muted-foreground">{{ t("churchService.noSongsFound") }}</p>
          </div>
        </div>
      </section>
    </main>
  </AppLayout>
</template>

<script setup lang="ts">
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";
import { usePlaylistStore } from "@/stores/playlists";
import { Plus, Search } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import { getLiedNumber } from "@/gql/extra-types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import AppLayout from "@/components/layout/AppLayout.vue";
import PageHeader, { type BreadcrumbItem } from "@/components/layout/PageHeader.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const store = usePlaylistStore();
const songStore = useGesangbuchliedStore();
const { lieder, isUsingCachedData } = storeToRefs(songStore);
const { fetchLieder, setFilter } = songStore;

const playlistId = computed(() => route.params.id as string);
const playlist = computed(() => store.getPlaylist(playlistId.value) ?? null);

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: t("nav.home"), to: { name: "home" } },
  { label: t("nav.playlists"), to: { name: "playlists" } },
  {
    label: playlist.value?.name || t("playlist.title"),
    to: { name: "playlist-detail", params: { id: playlistId.value } },
  },
  { label: t("playlist.addSongs") },
]);

const done = () => router.push({ name: "playlist-detail", params: { id: playlistId.value } });

const addSearch = ref("");
let addSearchDebounce: ReturnType<typeof setTimeout> | undefined;

watch(addSearch, (q) => {
  clearTimeout(addSearchDebounce);
  if (isUsingCachedData.value) return;
  addSearchDebounce = setTimeout(async () => {
    setFilter("searchQuery", q);
    await fetchLieder();
  }, 300);
});

const addCandidates = computed(() => {
  const taken = new Set(playlist.value?.songIds ?? []);
  let base = lieder.value.filter((s) => !taken.has(s.id));
  if (isUsingCachedData.value && addSearch.value) {
    const q = addSearch.value.toLowerCase();
    base = base.filter((s) => s.titel?.toLowerCase().includes(q));
  }
  return [...base].sort((a, b) => (getLiedNumber(a) ?? Infinity) - (getLiedNumber(b) ?? Infinity));
});

const addSong = async (songId: string) => {
  if (!playlist.value) return;
  await store.addSongToPlaylist(playlist.value.id, songId);
};

onMounted(async () => {
  await store.loadPlaylists();
  if (lieder.value.length === 0) await fetchLieder();
});
</script>

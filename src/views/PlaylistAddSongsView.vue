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

        <p class="text-sm text-muted-foreground">
          {{ t("playlist.selectedCount", { count: selectedCount }) }}
        </p>

        <div class="space-y-2">
          <!-- Selected songs stay in the list with a filled check; tapping a row
               toggles membership so the user can add and remove without losing
               their place. -->
          <button
            v-for="song in candidates"
            :key="song.id"
            type="button"
            class="w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors"
            :class="
              isSelected(song.id)
                ? 'border-primary bg-primary/5 hover:bg-primary/10'
                : 'hover:bg-accent'
            "
            :aria-pressed="isSelected(song.id)"
            @click="toggleSong(song.id)"
          >
            <span
              class="flex-shrink-0 w-5 h-5 rounded-[5px] border flex items-center justify-center transition-colors"
              :class="
                isSelected(song.id)
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-muted-foreground/40'
              "
            >
              <Check v-if="isSelected(song.id)" class="w-3.5 h-3.5" />
            </span>

            <div class="flex items-baseline gap-2 min-w-0 flex-1">
              <span
                v-if="getLiedNumber(song) !== null"
                class="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold tabular-nums flex-shrink-0"
              >
                {{ getLiedNumber(song) }}
              </span>
              <span class="font-medium truncate">{{ song.titel }}</span>
            </div>
          </button>

          <div v-if="candidates.length === 0 && !isLoading" class="text-center py-10">
            <p class="text-sm text-muted-foreground">{{ t("churchService.noSongsFound") }}</p>
          </div>

          <!-- Server-side pagination: when the catalogue isn't fully cached
               offline, load further pages as the sentinel scrolls into view. -->
          <div v-if="hasMore && !isUsingCachedData" ref="sentinel" class="pt-2">
            <Button
              variant="outline"
              class="w-full"
              :disabled="isLoadingMore"
              @click="maybeLoadMore"
            >
              {{ isLoadingMore ? t("songs.loadingMoreSongs") : t("songs.loadMore") }}
            </Button>
          </div>
        </div>
      </section>
    </main>
  </AppLayout>
</template>

<script setup lang="ts">
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";
import { usePlaylistStore } from "@/stores/playlists";
import { useIntersectionObserver } from "@vueuse/core";
import { Check, Plus, Search } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
const { lieder, isLoading, isLoadingMore, hasMore, isUsingCachedData } = storeToRefs(songStore);
const { fetchLieder, loadMore, setFilter } = songStore;

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
  // With downloaded songs we stay on the cache (the server is weak) and filter
  // the downloaded subset locally in `candidates`. Only when nothing is cached
  // do we hit the server, where search + pagination apply.
  if (isUsingCachedData.value) return;
  addSearchDebounce = setTimeout(async () => {
    setFilter("searchQuery", q);
    await fetchLieder();
  }, 300);
});

const selectedIds = computed(() => new Set(playlist.value?.songIds ?? []));
const selectedCount = computed(() => playlist.value?.songIds.length ?? 0);
const isSelected = (id?: string | null): boolean => !!id && selectedIds.value.has(id);

const candidates = computed(() => {
  let base = lieder.value;
  if (isUsingCachedData.value && addSearch.value) {
    const q = addSearch.value.toLowerCase();
    base = base.filter((s) => s.titel?.toLowerCase().includes(q));
  }
  return [...base].sort((a, b) => (getLiedNumber(a) ?? Infinity) - (getLiedNumber(b) ?? Infinity));
});

const toggleSong = async (songId?: string | null) => {
  if (!playlist.value || !songId) return;
  if (selectedIds.value.has(songId)) {
    await store.removeSongFromPlaylist(playlist.value.id, songId);
  } else {
    await store.addSongToPlaylist(playlist.value.id, songId);
  }
};

const maybeLoadMore = () => {
  if (isLoadingMore.value || !hasMore.value || isUsingCachedData.value) return;
  void loadMore();
};

// Auto-load the next page when the sentinel scrolls near the viewport; the
// button below it stays as a manual fallback.
const sentinel = ref<HTMLElement | null>(null);
useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry?.isIntersecting) maybeLoadMore();
  },
  { rootMargin: "200px" },
);

// The song store is shared with the catalogue view, so snapshot the filters we
// touch and restore them on leave to avoid leaking the picker's ordering.
const previousFilters = {
  sortBy: songStore.filters.sortBy,
  sortDirection: songStore.filters.sortDirection,
  searchQuery: songStore.filters.searchQuery,
};

onMounted(async () => {
  await store.loadPlaylists();
  // Sort by Lied number so the server's pagination order matches the order we
  // display — otherwise newly loaded pages would be re-sorted into the middle
  // of the list and infinite scroll would feel broken.
  setFilter("searchQuery", "");
  setFilter("sortBy", "liednummer2026");
  setFilter("sortDirection", "asc");
  // Offline-first: when songs are downloaded we browse/search that cache (the
  // server is weak); with nothing cached we fall through to the server, where
  // the load-more pagination below kicks in.
  await fetchLieder();
});

onBeforeUnmount(() => {
  clearTimeout(addSearchDebounce);
  setFilter("searchQuery", previousFilters.searchQuery);
  setFilter("sortBy", previousFilters.sortBy);
  setFilter("sortDirection", previousFilters.sortDirection);
});
</script>

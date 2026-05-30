<template>
  <Card>
    <CardContent>
      <div class="flex flex-col">
        <h2 class="text-lg font-semibold mb-2">
          {{ t("home.search.title") }}
        </h2>
        <div ref="containerRef" class="relative">
          <div class="flex space-x-2">
            <Input
              v-model="searchQuery"
              :placeholder="t('home.search.placeholder')"
              class="flex-1"
              autocomplete="off"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="showDropdown"
              @focus="onFocus"
              @keydown.down.prevent="onArrowDown"
              @keydown.up.prevent="onArrowUp"
              @keydown.enter="onEnter"
              @keydown.esc="close"
            />
            <Button @click="handleSearch">
              {{ t("home.search.button") }}
            </Button>
          </div>

          <!-- Autocomplete suggestions — only when songs are cached offline -->
          <ul
            v-if="showDropdown"
            class="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
            role="listbox"
          >
            <li
              v-for="(song, index) in suggestions"
              :key="song.id"
              role="option"
              :aria-selected="index === highlightedIndex"
              :class="[
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer',
                index === highlightedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50',
              ]"
              @mouseenter="highlightedIndex = index"
              @click="selectSong(song.id)"
            >
              <span
                v-if="song.number !== null"
                class="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold tabular-nums leading-none flex-shrink-0"
              >
                {{ song.number }}
              </span>
              <span class="truncate">{{ song.title }}</span>
            </li>

            <li
              v-if="songsLoaded && suggestions.length === 0"
              class="px-3 py-2 text-sm text-muted-foreground"
            >
              {{ t("home.search.noResults") }}
            </li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { getLiedNumber } from "@/gql/extra-types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useOfflineDownload } from "@/composables/useOfflineDownload";

const MAX_SUGGESTIONS = 8;

interface SongSuggestion {
  id: string;
  title: string;
  number: number | null;
}

const { t } = useI18n();
const router = useRouter();
const { hasOfflineContent, getOfflineSongs } = useOfflineDownload();

const searchQuery = ref("");
const containerRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const highlightedIndex = ref(-1);

// Autocomplete is only available once songs are cached in IndexedDB. Without it
// we keep the original "go to the songs page with this query" behaviour and the
// dropdown never shows — the Directus-backed online search is left untouched.
const autocompleteEnabled = computed(() => hasOfflineContent.value);

// Lightweight {id, title, number} cache, loaded once from IndexedDB the first
// time the user interacts with the field.
const songs = ref<SongSuggestion[]>([]);
const songsLoaded = ref(false);

const loadSongs = async () => {
  if (songsLoaded.value || !autocompleteEnabled.value) return;
  songsLoaded.value = true; // set before the await so concurrent calls bail out
  const offlineSongs = await getOfflineSongs();
  songs.value = offlineSongs
    .filter((song) => song.id != null)
    .map((song) => ({
      id: String(song.id),
      title: song.titel || "",
      number: getLiedNumber(song),
    }));
};

const suggestions = computed<SongSuggestion[]>(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return [];
  return songs.value
    .filter((song) => song.title.toLowerCase().includes(query))
    .slice(0, MAX_SUGGESTIONS);
});

const showDropdown = computed(
  () =>
    isOpen.value &&
    autocompleteEnabled.value &&
    searchQuery.value.trim() !== "" &&
    (suggestions.value.length > 0 || songsLoaded.value),
);

const onFocus = async () => {
  if (!autocompleteEnabled.value) return;
  await loadSongs();
  if (searchQuery.value.trim()) isOpen.value = true;
};

watch(searchQuery, () => {
  highlightedIndex.value = -1;
  isOpen.value = autocompleteEnabled.value && searchQuery.value.trim() !== "";
});

const close = () => {
  isOpen.value = false;
  highlightedIndex.value = -1;
};

onClickOutside(containerRef, close);

const selectSong = (id: string) => {
  close();
  router.push(`/lied/${id}`);
};

const onArrowDown = async () => {
  if (!autocompleteEnabled.value) return;
  await loadSongs();
  if (!isOpen.value && searchQuery.value.trim()) {
    isOpen.value = true;
    return;
  }
  if (suggestions.value.length === 0) return;
  highlightedIndex.value = (highlightedIndex.value + 1) % suggestions.value.length;
};

const onArrowUp = () => {
  if (!isOpen.value || suggestions.value.length === 0) return;
  highlightedIndex.value =
    highlightedIndex.value <= 0 ? suggestions.value.length - 1 : highlightedIndex.value - 1;
};

const onEnter = () => {
  const highlighted = suggestions.value[highlightedIndex.value];
  if (isOpen.value && highlightedIndex.value >= 0 && highlighted) {
    selectSong(highlighted.id);
    return;
  }
  handleSearch();
};

const handleSearch = () => {
  close();
  if (searchQuery.value.trim()) {
    router.push({
      name: "songs",
      query: { search: searchQuery.value.trim() },
    });
  } else {
    // If empty search, just go to songs page without filter
    router.push({ name: "songs" });
  }
};
</script>

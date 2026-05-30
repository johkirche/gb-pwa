<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-medium">
        {{ selectedSong ? selectedSong.titel : placeholder }}
      </h4>
      <Button variant="outline" size="sm" @click="openSongDialog">
        {{ selectedSong ? t("churchService.changeSong") : t("churchService.selectSong") }}
      </Button>
    </div>

    <!-- Selected Song Preview -->
    <div v-if="selectedSong" class="p-4 bg-muted rounded-lg border">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2 flex-wrap">
            <span
              v-if="getLiedNumber(selectedSong) !== null"
              class="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground text-sm font-bold tabular-nums leading-tight flex-shrink-0"
            >
              {{ getLiedNumber(selectedSong) }}
            </span>
            <h5 class="font-medium break-words">{{ selectedSong.titel }}</h5>
          </div>
          <p class="text-sm text-muted-foreground mt-1 break-words">
            {{ getAuthorsText(selectedSong) }}
          </p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <Badge
              v-if="hasMidiTrio(selectedSong)"
              variant="secondary"
              class="text-xs bg-green-100 text-green-800 hover:bg-green-100"
            >
              🎹 MIDI
            </Badge>
            <Badge
              v-else
              variant="secondary"
              class="text-xs bg-orange-100 text-orange-800 hover:bg-orange-100"
            >
              <AlertTriangle class="w-3 h-3 mr-1" />
              {{ t("churchService.missingMidi") }}
            </Badge>
            <Badge
              v-for="category in getCategoriesText(selectedSong).slice(0, 2)"
              :key="category"
              variant="outline"
              class="text-xs"
            >
              {{ category }}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" @click="clearSelection" class="flex-shrink-0">
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Song Selection Dialog -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader class="flex-shrink-0">
          <DialogTitle>{{ t("churchService.selectSong") }}</DialogTitle>
          <DialogDescription>
            {{ t("churchService.searchAndSelectSong") }}
          </DialogDescription>
        </DialogHeader>

        <Tabs v-model="activeTab" class="flex-1 overflow-hidden flex flex-col">
          <TabsList class="grid grid-cols-2 w-full flex-shrink-0">
            <TabsTrigger value="all">{{ t("playlist.allSongs") }}</TabsTrigger>
            <TabsTrigger value="playlists">
              {{ t("playlist.myPlaylists") }}
              <Badge v-if="playlistStore.playlists.length > 0" variant="secondary" class="ml-2">
                {{ playlistStore.playlists.length }}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <!-- ─────────────── All Songs tab ─────────────── -->
          <TabsContent value="all" class="space-y-4 flex-1 overflow-hidden mt-4">
            <!-- Search Input -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
              />
              <Input
                v-model="searchQuery"
                :placeholder="t('churchService.searchSongs')"
                class="pl-10"
              />
            </div>

            <!-- Song List (virtualized) -->
            <div
              v-if="sortedSongs.length > 0"
              ref="scrollElement"
              class="h-[450px] overflow-auto pr-4"
            >
              <div
                :style="{
                  height: `${songVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }"
              >
                <div
                  v-for="virtualItem in songVirtualizer.getVirtualItems()"
                  :key="sortedSongs[virtualItem.index]?.id ?? virtualItem.index"
                  :data-index="virtualItem.index"
                  :ref="(el) => measureRow(el as Element | null)"
                  :style="{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: '8px',
                  }"
                >
                  <div
                    :class="[
                      'p-3 border rounded-lg cursor-pointer transition-colors',
                      'hover:bg-accent hover:border-accent-foreground/20',
                    ]"
                    @click="selectSong(sortedSongs[virtualItem.index])"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-baseline gap-2">
                          <span
                            v-if="getLiedNumber(sortedSongs[virtualItem.index]) !== null"
                            class="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground text-sm font-bold tabular-nums leading-tight flex-shrink-0"
                          >
                            {{ getLiedNumber(sortedSongs[virtualItem.index]) }}
                          </span>
                          <h6 class="font-medium truncate">
                            {{ sortedSongs[virtualItem.index].titel }}
                          </h6>
                        </div>
                        <p class="text-sm text-muted-foreground truncate">
                          {{ getAuthorsText(sortedSongs[virtualItem.index]) }}
                        </p>
                        <div class="flex flex-wrap items-center gap-2 mt-1">
                          <Badge
                            v-if="!hasMidiTrio(sortedSongs[virtualItem.index])"
                            variant="secondary"
                            class="text-xs bg-orange-100 text-orange-800 hover:bg-orange-100"
                          >
                            <AlertTriangle class="w-3 h-3 mr-1" />
                            {{ t("churchService.missingMidi") }}
                          </Badge>
                          <Badge
                            v-for="category in getCategoriesText(
                              sortedSongs[virtualItem.index],
                            ).slice(0, 2)"
                            :key="category"
                            variant="outline"
                            class="text-xs"
                          >
                            {{ category }}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        v-if="hasAudioFiles(sortedSongs[virtualItem.index])"
                        variant="ghost"
                        size="sm"
                        class="flex-shrink-0"
                        @click.stop="previewSong(sortedSongs[virtualItem.index])"
                      >
                        <Play class="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading State -->
            <div v-else-if="isLoading" class="h-[450px] flex flex-col items-center justify-center">
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"
              ></div>
              <p class="text-sm text-muted-foreground">{{ t("churchService.loadingSongs") }}</p>
            </div>

            <!-- No Results -->
            <div v-else-if="searchQuery" class="h-[450px] flex items-center justify-center">
              <p class="text-sm text-muted-foreground">{{ t("churchService.noSongsFound") }}</p>
            </div>

            <!-- Empty State -->
            <div v-else class="h-[450px] flex items-center justify-center">
              <p class="text-sm text-muted-foreground">
                {{
                  isUsingCachedData
                    ? t("churchService.noOfflineSongs")
                    : t("churchService.noSongsAvailable")
                }}
              </p>
            </div>
          </TabsContent>

          <!-- ─────────────── Playlists tab ─────────────── -->
          <TabsContent value="playlists" class="space-y-4 flex-1 overflow-hidden mt-4">
            <!-- Browsing playlist list -->
            <div v-if="!activePlaylistId">
              <div
                v-if="playlistStore.playlists.length === 0"
                class="h-[450px] flex flex-col items-center justify-center text-center px-6"
              >
                <ListMusic class="w-12 h-12 text-muted-foreground mb-3" />
                <h3 class="font-medium text-muted-foreground mb-1">
                  {{ t("playlist.noPlaylistsInDialogTitle") }}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {{ t("playlist.noPlaylistsInDialogDescription") }}
                </p>
              </div>
              <ScrollArea v-else class="h-[490px]">
                <div class="space-y-2 pr-4">
                  <div
                    v-for="pl in playlistStore.playlists"
                    :key="pl.id"
                    class="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    @click="activePlaylistId = pl.id"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-lg flex-shrink-0"
                      >
                        <span v-if="pl.emoji">{{ pl.emoji }}</span>
                        <ListMusic v-else class="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h6 class="font-medium truncate">{{ pl.name }}</h6>
                        <p
                          v-if="pl.description"
                          class="text-sm text-muted-foreground truncate mt-0.5"
                        >
                          {{ pl.description }}
                        </p>
                      </div>
                      <Badge variant="secondary" class="text-xs flex-shrink-0">
                        {{ t("playlist.songsCount", { count: pl.songIds.length }) }}
                      </Badge>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            <!-- Browsing songs within a chosen playlist -->
            <div v-else class="flex-1 flex flex-col gap-3 overflow-hidden">
              <div class="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" @click="activePlaylistId = null">
                  <ArrowLeft class="w-4 h-4 mr-1" />
                  {{ t("playlist.myPlaylists") }}
                </Button>
                <span class="text-sm font-medium truncate flex items-center gap-1.5">
                  <span v-if="activePlaylist?.emoji" class="text-base leading-none">{{
                    activePlaylist.emoji
                  }}</span>
                  {{ activePlaylist?.name }}
                </span>
                <Badge variant="secondary" class="text-xs">
                  {{ t("playlist.songsCount", { count: activePlaylistSongs.length }) }}
                </Badge>
              </div>

              <ScrollArea class="h-[440px]">
                <div v-if="activePlaylistSongs.length === 0" class="text-center py-12">
                  <p class="text-sm text-muted-foreground">
                    {{ t("playlist.noSongsInPlaylist") }}
                  </p>
                </div>
                <div v-else class="space-y-2 pr-4">
                  <div
                    v-for="song in activePlaylistSongs"
                    :key="song.id"
                    :class="[
                      'p-3 border rounded-lg cursor-pointer transition-colors',
                      'hover:bg-accent hover:border-accent-foreground/20',
                    ]"
                    @click="selectSong(song)"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-baseline gap-2">
                          <span
                            v-if="getLiedNumber(song) !== null"
                            class="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground text-sm font-bold tabular-nums leading-tight flex-shrink-0"
                          >
                            {{ getLiedNumber(song) }}
                          </span>
                          <h6 class="font-medium truncate">{{ song.titel }}</h6>
                        </div>
                        <p class="text-sm text-muted-foreground truncate">
                          {{ getAuthorsText(song) }}
                        </p>
                        <div class="flex flex-wrap items-center gap-2 mt-1">
                          <Badge
                            v-if="!hasMidiTrio(song)"
                            variant="secondary"
                            class="text-xs bg-orange-100 text-orange-800 hover:bg-orange-100"
                          >
                            <AlertTriangle class="w-3 h-3 mr-1" />
                            {{ t("churchService.missingMidi") }}
                          </Badge>
                          <Badge
                            v-for="category in getCategoriesText(song).slice(0, 2)"
                            :key="category"
                            variant="outline"
                            class="text-xs"
                          >
                            {{ category }}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <div class="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" @click="dialogOpen = false">
            {{ t("utils.cancel") }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";
import { usePlaylistStore } from "@/stores/playlists";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { AlertTriangle, ArrowLeft, ListMusic, Play, Search, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { type GesangbuchliedWithMidi, getLiedNumber } from "@/gql/extra-types";
import type { Gesangbuchlied } from "@/gql/graphql";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  selectedSong: Gesangbuchlied | null;
  placeholder: string;
}

defineProps<Props>();

const emit = defineEmits<{
  songSelected: [song: Gesangbuchlied | null];
}>();

const { t } = useI18n();

// Store
const store = useGesangbuchliedStore();
const { lieder, isLoading, isUsingCachedData, filters } = storeToRefs(store);
const { fetchLieder, setFilter, getAuthors, hasAudioFiles, getCategories } = store;

const playlistStore = usePlaylistStore();

const dialogOpen = ref(false);
const searchQuery = ref("");
const previousStoreSearch = ref<string | null>(null);
const scrollElement = ref<HTMLElement | null>(null);

// Tabs state: "all" = full catalogue, "playlists" = browse via saved playlists
const activeTab = ref<"all" | "playlists">("all");
const activePlaylistId = ref<string | null>(null);

const activePlaylist = computed(() =>
  activePlaylistId.value ? (playlistStore.getPlaylist(activePlaylistId.value) ?? null) : null,
);

const songsById = computed(() => {
  const map = new Map<string, Gesangbuchlied>();
  for (const s of lieder.value) map.set(s.id, s);
  return map;
});

const activePlaylistSongs = computed<Gesangbuchlied[]>(() => {
  if (!activePlaylist.value) return [];
  const out: Gesangbuchlied[] = [];
  for (const id of activePlaylist.value.songIds) {
    const s = songsById.value.get(id);
    if (s) out.push(s);
  }
  return out;
});

const filteredSongs = computed(() => {
  // Offline (IndexedDB): all songs are loaded, so filter client-side.
  // Online: API already applied the search filter — show whatever the store has.
  if (isUsingCachedData.value && searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    return lieder.value.filter(
      (song) =>
        song.titel?.toLowerCase().includes(q) ||
        getAuthorsText(song).toLowerCase().includes(q) ||
        getCategoriesText(song).some((cat) => cat.toLowerCase().includes(q)),
    );
  }
  return lieder.value;
});

const sortedSongs = computed(() => {
  return [...filteredSongs.value].sort(
    (a, b) => (getLiedNumber(a) ?? Infinity) - (getLiedNumber(b) ?? Infinity),
  );
});

const songVirtualizer = useVirtualizer({
  get count() {
    return filteredSongs.value.length;
  },
  getScrollElement: () => scrollElement.value,
  estimateSize: () => 96,
  overscan: 8,
});

const measureRow = (el: Element | null) => {
  if (el instanceof HTMLElement) songVirtualizer.value.measureElement(el);
};

let searchDebounce: ReturnType<typeof setTimeout> | undefined;

watch(searchQuery, (q) => {
  clearTimeout(searchDebounce);
  if (isUsingCachedData.value) return;
  searchDebounce = setTimeout(async () => {
    setFilter("searchQuery", q);
    await fetchLieder();
  }, 300);
});

const openSongDialog = async () => {
  // Snapshot any pre-existing global search so we can restore it on close
  previousStoreSearch.value = filters.value.searchQuery;
  activeTab.value = "all";
  activePlaylistId.value = null;
  dialogOpen.value = true;

  // Load songs if not already loaded
  if (lieder.value.length === 0) {
    await fetchLieder();
  }
  // Ensure playlists are available for the tab
  await playlistStore.loadPlaylists();
};

const selectSong = (song: Gesangbuchlied) => {
  emit("songSelected", song);
  dialogOpen.value = false;
  searchQuery.value = "";
};

const clearSelection = () => {
  emit("songSelected", null);
};

const previewSong = (song: Gesangbuchlied) => {
  // TODO: Implement audio preview
  console.log("Preview song:", song.titel);
};

// Helper functions
const getAuthorsText = (song: Gesangbuchlied): string => {
  const authors = getAuthors(song);
  return authors.length > 0 ? authors.join(", ") : t("utils.unknown");
};

const getCategoriesText = (song: Gesangbuchlied): string[] => {
  return getCategories(song);
};

const hasMidiTrio = (song: Gesangbuchlied): boolean => {
  const s = song as GesangbuchliedWithMidi;
  return !!(s.midi_intro && s.midi_main && s.midi_outro);
};

// Reset search when dialog closes; restore any pre-existing global filter
watch(dialogOpen, async (isOpen) => {
  if (isOpen) return;
  clearTimeout(searchDebounce);
  searchQuery.value = "";
  activePlaylistId.value = null;
  const prev = previousStoreSearch.value ?? "";
  if (filters.value.searchQuery !== prev) {
    setFilter("searchQuery", prev);
    if (!isUsingCachedData.value) await fetchLieder();
  }
  previousStoreSearch.value = null;
});

// Expose methods for parent components
defineExpose({
  openSongDialog,
});
</script>

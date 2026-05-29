<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :page-title="playlist?.name ?? t('playlist.title')"
      :show-back-button="true"
      :show-home-button="true"
      back-to="/playlists"
    />

    <main class="container mx-auto py-8 max-w-6xl space-y-6">
      <!-- Not found state: playlists are loaded but this id doesn't exist -->
      <Card v-if="loaded && !playlist">
        <CardContent class="pt-6 text-center space-y-3">
          <p class="text-sm text-muted-foreground">{{ t("playlist.notFound") }}</p>
          <Button variant="outline" @click="$router.push({ name: 'playlists' })">
            <ArrowLeft class="w-4 h-4 mr-1" />
            {{ t("playlist.myPlaylists") }}
          </Button>
        </CardContent>
      </Card>

      <template v-else-if="playlist">
        <!-- Header card: name, description, actions -->
        <Card>
          <CardHeader>
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <CardTitle class="flex items-center space-x-2 break-words">
                  <ListMusic class="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span>{{ playlist.name }}</span>
                </CardTitle>
                <CardDescription v-if="playlist.description" class="mt-1">
                  {{ playlist.description }}
                </CardDescription>
                <div class="mt-2">
                  <Badge variant="secondary" class="text-xs">
                    {{ t("playlist.songsCount", { count: songs.length }) }}
                  </Badge>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" @click="openEdit">
                  <Pencil class="w-4 h-4 mr-1" />
                  {{ t("playlist.edit") }}
                </Button>
                <Button variant="outline" size="sm" @click="deleteOpen = true">
                  <Trash2 class="w-4 h-4 mr-1" />
                  {{ t("playlist.delete") }}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <!-- Songs card -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between gap-2">
              <CardTitle class="text-base">{{ t("churchService.mainSongs") }}</CardTitle>
              <Button size="sm" @click="openAddSongs">
                <Plus class="w-4 h-4 mr-1" />
                {{ t("playlist.addSongs") }}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="songs.length === 0" class="text-center py-10">
              <ListMusic class="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p class="text-sm text-muted-foreground">{{ t("playlist.noSongs") }}</p>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="song in songs"
                :key="song.id"
                class="p-3 border rounded-lg flex items-start justify-between gap-2"
              >
                <div class="flex items-baseline gap-2 min-w-0 flex-1">
                  <span
                    v-if="getLiedNumber(song) !== null"
                    class="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-bold tabular-nums flex-shrink-0"
                  >
                    {{ getLiedNumber(song) }}
                  </span>
                  <span class="font-medium truncate">{{ song.titel }}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  :title="t('playlist.remove')"
                  @click="removeSong(song.id)"
                >
                  <X class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </template>
    </main>

    <!-- Edit name/description dialog (single dialog, not nested) -->
    <Dialog v-model:open="editOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t("playlist.edit.title") }}</DialogTitle>
        </DialogHeader>

        <div class="space-y-3 py-2">
          <div class="space-y-1">
            <Label for="playlist-name">{{ t("playlist.name") }}</Label>
            <Input
              id="playlist-name"
              v-model="formName"
              :placeholder="t('playlist.namePlaceholder')"
              @keydown.enter="saveEdit"
            />
          </div>
          <div class="space-y-1">
            <Label for="playlist-desc">{{ t("playlist.descriptionLabel") }}</Label>
            <Input
              id="playlist-desc"
              v-model="formDescription"
              :placeholder="t('playlist.descriptionPlaceholder')"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="editOpen = false">{{ t("playlist.cancel") }}</Button>
          <Button :disabled="!formName.trim()" @click="saveEdit">
            {{ t("playlist.save") }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Add-songs picker (single dialog) -->
    <Dialog v-model:open="addOpen">
      <DialogContent class="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader class="flex-shrink-0">
          <DialogTitle>{{ t("playlist.addToPlaylist") }}</DialogTitle>
        </DialogHeader>

        <div class="relative flex-shrink-0">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
          />
          <Input v-model="addSearch" :placeholder="t('churchService.searchSongs')" class="pl-10" />
        </div>

        <div class="h-[450px] overflow-auto pr-4">
          <div class="space-y-2">
            <div
              v-for="song in addCandidates"
              :key="song.id"
              class="p-3 border rounded-lg cursor-pointer hover:bg-accent"
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
            <div v-if="addCandidates.length === 0" class="text-center py-8">
              <p class="text-sm text-muted-foreground">{{ t("churchService.noSongsFound") }}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" @click="addOpen = false">{{ t("playlist.back") }}</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Delete confirmation -->
    <Dialog v-model:open="deleteOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t("playlist.confirmDelete") }}</DialogTitle>
          <DialogDescription>
            {{ t("playlist.confirmDeleteDescription", { name: playlist?.name }) }}
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="deleteOpen = false">
            {{ t("playlist.cancel") }}
          </Button>
          <Button variant="destructive" @click="performDelete">
            {{ t("playlist.delete") }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";
import { usePlaylistStore } from "@/stores/playlists";
import { ArrowLeft, ListMusic, Pencil, Plus, Search, Trash2, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import { getLiedNumber } from "@/gql/extra-types";
import type { Gesangbuchlied } from "@/gql/graphql";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import AppHeader from "@/components/AppHeader.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const store = usePlaylistStore();
const songStore = useGesangbuchliedStore();
const { lieder, isUsingCachedData } = storeToRefs(songStore);
const { fetchLieder, setFilter } = songStore;

// `loaded` flips true once the initial load finishes so we can distinguish
// "still loading" from "playlist doesn't exist" — only the latter should
// render the not-found card.
const loaded = ref(false);
const playlistId = computed(() => route.params.id as string);

const playlist = computed(() => store.getPlaylist(playlistId.value) ?? null);

const songsById = computed(() => {
  const map = new Map<string, Gesangbuchlied>();
  for (const s of lieder.value) map.set(s.id, s);
  return map;
});

const songs = computed<Gesangbuchlied[]>(() => {
  if (!playlist.value) return [];
  const out: Gesangbuchlied[] = [];
  for (const id of playlist.value.songIds) {
    const s = songsById.value.get(id);
    if (s) out.push(s);
  }
  return out;
});

// Edit dialog
const editOpen = ref(false);
const formName = ref("");
const formDescription = ref("");

const openEdit = () => {
  if (!playlist.value) return;
  formName.value = playlist.value.name;
  formDescription.value = playlist.value.description ?? "";
  editOpen.value = true;
};

const saveEdit = async () => {
  if (!playlist.value) return;
  const name = formName.value.trim();
  if (!name) return;
  await store.updatePlaylist(playlist.value.id, {
    name,
    description: formDescription.value.trim() || undefined,
  });
  editOpen.value = false;
};

// Delete dialog
const deleteOpen = ref(false);

const performDelete = async () => {
  if (!playlist.value) return;
  await store.deletePlaylist(playlist.value.id);
  deleteOpen.value = false;
  router.push({ name: "playlists" });
};

// Add-songs dialog
const addOpen = ref(false);
const addSearch = ref("");
let addSearchDebounce: ReturnType<typeof setTimeout> | undefined;

const openAddSongs = async () => {
  addSearch.value = "";
  addOpen.value = true;
  if (lieder.value.length === 0) await fetchLieder();
};

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
  return [...base].sort(
    (a, b) => (getLiedNumber(a) ?? Infinity) - (getLiedNumber(b) ?? Infinity),
  );
});

const addSong = async (songId: string) => {
  if (!playlist.value) return;
  await store.addSongToPlaylist(playlist.value.id, songId);
};

const removeSong = async (songId: string) => {
  if (!playlist.value) return;
  await store.removeSongFromPlaylist(playlist.value.id, songId);
};

onMounted(async () => {
  await store.loadPlaylists();
  if (lieder.value.length === 0) await fetchLieder();
  loaded.value = true;
});
</script>

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
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h5 class="font-medium">{{ selectedSong.titel }}</h5>
          <p class="text-sm text-muted-foreground mt-1">
            {{ getAuthors(selectedSong) }}
          </p>
          <div class="flex items-center space-x-2 mt-2">
            <Badge v-if="hasAudioFiles(selectedSong)" variant="secondary" class="text-xs">
              🎵 Audio
            </Badge>
            <Badge v-if="getCategories(selectedSong).length > 0" variant="outline" class="text-xs">
              {{ getCategories(selectedSong).slice(0, 2).join(", ") }}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" @click="clearSelection">
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Song Selection Dialog -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader class="flex-shrink-0">
          <DialogTitle>{{ t("churchService.selectSong") }}</DialogTitle>
          <DialogDescription>
            {{ t("churchService.searchAndSelectSong") }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 flex-1 overflow-hidden">
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

          <!-- Song List -->
          <ScrollArea class="h-[450px]">
            <div class="space-y-2 pr-4">
              <div
                v-for="song in filteredSongs"
                :key="song.id"
                :class="[
                  'p-3 border rounded-lg cursor-pointer transition-colors',
                  'hover:bg-accent hover:border-accent-foreground/20',
                ]"
                @click="selectSong(song)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <h6 class="font-medium truncate">{{ song.titel }}</h6>
                    <p class="text-sm text-muted-foreground">
                      {{ getAuthors(song) }}
                    </p>
                    <div class="flex items-center space-x-2 mt-1">
                      <Badge v-if="hasAudioFiles(song)" variant="secondary" class="text-xs">
                        🎵
                      </Badge>
                      <Badge
                        v-for="category in getCategories(song).slice(0, 2)"
                        :key="category"
                        variant="outline"
                        class="text-xs"
                      >
                        {{ category }}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    v-if="hasAudioFiles(song)"
                    variant="ghost"
                    size="sm"
                    @click.stop="previewSong(song)"
                  >
                    <Play class="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <!-- Loading State -->
              <div v-if="isLoading" class="text-center py-8">
                <div
                  class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"
                ></div>
                <p class="text-sm text-muted-foreground">{{ t("churchService.loadingSongs") }}</p>
              </div>

              <!-- No Results -->
              <div v-else-if="filteredSongs.length === 0 && searchQuery" class="text-center py-8">
                <p class="text-sm text-muted-foreground">{{ t("churchService.noSongsFound") }}</p>
              </div>
            </div>
          </ScrollArea>
        </div>

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
import { Play, Search, X } from "lucide-vue-next";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

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

import { useGesangbuchlied } from "@/composables/useGesangbuchlied";

interface Props {
  selectedSong: Gesangbuchlied | null;
  placeholder: string;
}

defineProps<Props>();

const emit = defineEmits<{
  songSelected: [song: Gesangbuchlied | null];
}>();

const { t } = useI18n();
const { queryGesangbuchlied } = useGesangbuchlied();

const dialogOpen = ref(false);
const searchQuery = ref("");
const gesangbuchlieder = ref<Gesangbuchlied[]>([]);
const isLoading = ref(false);

const filteredSongs = computed(() => {
  if (!searchQuery.value) return gesangbuchlieder.value;

  const query = searchQuery.value.toLowerCase();
  return gesangbuchlieder.value.filter(
    (song) =>
      song.titel?.toLowerCase().includes(query) ||
      getAuthors(song).toLowerCase().includes(query) ||
      getCategories(song).some((cat) => cat.toLowerCase().includes(query)),
  );
});

const fetchGesangbuchlieder = async () => {
  if (isLoading.value) return;

  try {
    isLoading.value = true;
    const result = await queryGesangbuchlied({
      limit: 1000, // Load a reasonable amount for selection
      filter: { status: { _eq: "published" } },
    });
    gesangbuchlieder.value = result || [];
  } catch (error) {
    console.error("Error fetching songs:", error);
    gesangbuchlieder.value = [];
  } finally {
    isLoading.value = false;
  }
};

const openSongDialog = () => {
  dialogOpen.value = true;
  if (gesangbuchlieder.value.length === 0) {
    fetchGesangbuchlieder();
  }
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
const hasAudioFiles = (song: Gesangbuchlied): boolean => {
  return !!song.melodieId?.noten?.some((note) => note?.directus_files_id?.type?.includes("audio"));
};

const getAuthors = (song: Gesangbuchlied): string => {
  const textAuthors =
    song.textId?.autorId
      ?.map((author) =>
        `${author?.autor_id?.vorname || ""} ${author?.autor_id?.nachname || ""}`.trim(),
      )
      .filter(Boolean) || [];

  const melodieAuthors =
    song.melodieId?.autorId
      ?.map((author) =>
        `${author?.autor_id?.vorname || ""} ${author?.autor_id?.nachname || ""}`.trim(),
      )
      .filter(Boolean) || [];

  const allAuthors = [...new Set([...textAuthors, ...melodieAuthors])];
  return allAuthors.length > 0 ? allAuthors.join(", ") : t("utils.unknown");
};

const getCategories = (song: Gesangbuchlied): string[] => {
  return (
    (song.kategorieId?.map((kat) => kat?.kategorie_id?.name).filter(Boolean) as string[]) || []
  );
};

// Reset search when dialog closes
watch(dialogOpen, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = "";
  }
});

// Expose methods for parent components
defineExpose({
  openSongDialog,
});
</script>

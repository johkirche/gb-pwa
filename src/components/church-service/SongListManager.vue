<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ t("churchService.serviceSetup") }}</h3>
      <Button @click="openSongDialog" class="flex items-center space-x-2">
        <Plus class="w-4 h-4" />
        <span>{{ t("churchService.addSong") }}</span>
      </Button>
    </div>

    <!-- Empty State -->
    <div
      v-if="songs.length === 0"
      class="text-center py-8 border-2 border-dashed border-muted rounded-lg"
    >
      <Music class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h4 class="text-lg font-medium text-muted-foreground mb-2">
        {{ t("churchService.noSongsAdded") }}
      </h4>
      <p class="text-sm text-muted-foreground mb-4">
        {{ t("churchService.addSongsToService") }}
      </p>
      <Button @click="openSongDialog" variant="outline">
        <Plus class="w-4 h-4 mr-2" />
        {{ t("churchService.addFirstSong") }}
      </Button>
    </div>

    <!-- Songs List -->
    <div v-else class="space-y-4">
      <VueDraggable
        v-model="draggableSongs"
        class="space-y-4"
        :animation="200"
        :ghost-class="'opacity-50'"
        :chosen-class="'scale-105'"
        :drag-class="'rotate-1'"
        handle=".drag-handle"
        :item-key="(item: ChurchServiceSong, index: number) => item.song?.id || `temp-${index}`"
        @end="onDragEnd"
      >
        <template #item="{ element: serviceSong, index }">
          <div :key="`song-${index}`" class="border rounded-lg p-4 bg-card relative">
            <!-- Song Info Display -->
            <div v-if="serviceSong.song" class="space-y-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <div
                      class="drag-handle cursor-move text-gray-400 hover:text-gray-600"
                      v-if="songs.length > 1"
                    >
                      <GripVertical class="h-5 w-5" />
                    </div>
                    <Badge variant="outline" class="text-sm">
                      {{ index + 1 }}
                    </Badge>
                    <h5 class="font-medium">{{ serviceSong.song.titel }}</h5>
                  </div>
                  <p class="text-sm text-muted-foreground mb-2">
                    {{ getAuthors(serviceSong.song) }}
                  </p>
                  <div class="flex items-center space-x-2">
                    <Badge
                      v-if="hasAudioFiles(serviceSong.song)"
                      variant="secondary"
                      class="text-xs"
                    >
                      🎵 Audio
                    </Badge>
                    <Badge
                      v-if="getCategories(serviceSong.song).length > 0"
                      variant="outline"
                      class="text-xs"
                    >
                      {{ getCategories(serviceSong.song).slice(0, 2).join(", ") }}
                    </Badge>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <Button variant="outline" size="sm" @click="changeSong(index)">
                    {{ t("churchService.changeSong") }}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="removeSong(index)"
                    class="text-destructive hover:text-destructive"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <!-- Verse Selection -->
              <div class="bg-muted rounded-lg p-4">
                <VerseSelector
                  :model-value="serviceSong.verses"
                  :song="serviceSong.song"
                  @update:model-value="(verses) => updateVerses(index, verses)"
                />
              </div>
            </div>
          </div>
        </template>
      </VueDraggable>
    </div>

    <!-- Add Song Button (when songs exist) -->
    <div v-if="songs.length > 0" class="text-center">
      <Button @click="openSongDialog" variant="outline" class="flex items-center space-x-2">
        <Plus class="w-4 h-4" />
        <span>{{ t("churchService.addAnotherSong") }}</span>
      </Button>
    </div>

    <!-- Hidden Song Selector for Dialog -->
    <div class="hidden">
      <SongSelector
        :selected-song="null"
        :placeholder="t('churchService.selectSong')"
        @song-selected="handleSongSelected"
        ref="songSelector"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SongSelector from "./SongSelector.vue";
import VerseSelector from "./VerseSelector.vue";
import { GripVertical, Music, Plus, Trash2 } from "lucide-vue-next";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import VueDraggable from "vuedraggable";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { ChurchServiceSong } from "@/composables/useChurchService";

interface Props {
  songs: ChurchServiceSong[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  addSong: [song?: Gesangbuchlied];
  removeSong: [index: number];
  updateSong: [index: number, song: Gesangbuchlied];
  updateVerses: [index: number, verses: number[]];
  reorderSongs: [oldIndex: number, newIndex: number];
}>();

const { t } = useI18n();

// Reference to the song selector for opening the dialog
const songSelector = ref<InstanceType<typeof SongSelector> | null>(null);
const changingSongIndex = ref<number | null>(null);

// Computed draggable songs for VueDraggable
const draggableSongs = computed({
  get() {
    return props.songs;
  },
  set(newOrder: ChurchServiceSong[]) {
    // Find which song was moved
    for (let i = 0; i < newOrder.length; i++) {
      const originalIndex = props.songs.findIndex((song) => song === newOrder[i]);
      if (originalIndex !== i) {
        emit("reorderSongs", originalIndex, i);
        break;
      }
    }
  },
});

// Handle drag end event
const onDragEnd = () => {
  // The draggableSongs computed setter will automatically handle the reordering
};

const removeSong = (index: number) => {
  emit("removeSong", index);
};

const updateVerses = (index: number, verses: number[]) => {
  emit("updateVerses", index, verses);
};

// Open song selection dialog
const openSongDialog = () => {
  changingSongIndex.value = null; // Reset changing song index
  if (songSelector.value) {
    songSelector.value.openSongDialog();
  }
};

// Open song selection dialog for changing an existing song
const changeSong = (index: number) => {
  changingSongIndex.value = index;
  if (songSelector.value) {
    songSelector.value.openSongDialog();
  }
};

// Handle song selection from dialog
const handleSongSelected = (song: Gesangbuchlied | null) => {
  if (song) {
    if (changingSongIndex.value !== null) {
      // Update existing song
      emit("updateSong", changingSongIndex.value, song);
      changingSongIndex.value = null;
    } else {
      // Add new song
      emit("addSong", song);
    }
  }
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
</script>

<style scoped>
.song-list-move,
.song-list-enter-active,
.song-list-leave-active {
  transition: all 0.3s ease;
}

.song-list-enter-from,
.song-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.song-list-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}
</style>

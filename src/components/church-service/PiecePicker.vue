<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-medium">
        {{ selectedPiece ? "" : placeholder }}
      </h4>
      <Button variant="outline" size="sm" @click="openPickerDialog">
        {{ selectedPiece ? t("churchService.changePiece") : t("churchService.selectPiece") }}
      </Button>
    </div>

    <!-- Selected piece preview — matches the song cards in the list above. -->
    <div v-if="selectedPiece" class="border bg-card rounded-lg p-4">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <h5 class="font-medium break-words">{{ selectedPiece.name }}</h5>
          <p v-if="selectedPiece.komponist" class="text-sm text-muted-foreground mt-1 break-words">
            {{ selectedPiece.komponist }}
          </p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <Badge
              variant="secondary"
              class="text-xs bg-green-100 text-green-800 hover:bg-green-100"
            >
              🎹 MIDI
            </Badge>
            <Badge v-if="selectedPiece.dauer_sek" variant="outline" class="text-xs tabular-nums">
              {{ formatDuration(selectedPiece.dauer_sek) }}
            </Badge>
            <Badge
              v-for="tag in selectedPiece.tags?.slice(0, 3) ?? []"
              :key="tag"
              variant="outline"
              class="text-xs"
            >
              {{ tag }}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" @click="clearSelection" class="flex-shrink-0">
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Preview / tempo / key for the selected piece -->
    <SongPlaybackControls
      v-if="selectedPiece"
      :midi-asset-id="selectedPiece.midi_file?.id"
      :speed="speed"
      :pitch-semitones="pitchSemitones"
      @update:speed="(v) => emit('update:speed', v)"
      @update:pitch="(v) => emit('update:pitch', v)"
    />

    <!-- Picker dialog -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader class="flex-shrink-0">
          <DialogTitle>{{ t("churchService.selectPiece") }}</DialogTitle>
          <DialogDescription>
            {{ t("churchService.searchAndSelectPiece") }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 flex-1 overflow-hidden">
          <!-- Search input -->
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
            />
            <Input
              v-model="searchInput"
              :placeholder="t('churchService.searchPieces')"
              class="pl-10"
            />
          </div>

          <!-- Pieces list (virtualized) -->
          <div v-if="filteredPieces.length > 0" ref="scrollElement" class="h-[450px] overflow-auto">
            <div
              :style="{
                height: `${pieceVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }"
            >
              <div
                v-for="virtualItem in pieceVirtualizer.getVirtualItems()"
                :key="filteredPieces[virtualItem.index]?.id ?? virtualItem.index"
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
                  @click="selectPiece(filteredPieces[virtualItem.index])"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <h6 class="font-medium truncate">
                        {{ filteredPieces[virtualItem.index].name }}
                      </h6>
                      <p
                        v-if="filteredPieces[virtualItem.index].komponist"
                        class="text-sm text-muted-foreground truncate"
                      >
                        {{ filteredPieces[virtualItem.index].komponist }}
                      </p>
                      <div class="flex flex-wrap items-center gap-2 mt-1">
                        <Badge
                          v-if="filteredPieces[virtualItem.index].dauer_sek"
                          variant="outline"
                          class="text-xs tabular-nums"
                        >
                          {{ formatDuration(filteredPieces[virtualItem.index].dauer_sek!) }}
                        </Badge>
                        <Badge
                          v-for="tag in filteredPieces[virtualItem.index].tags?.slice(0, 3) ?? []"
                          :key="tag"
                          variant="outline"
                          class="text-xs"
                        >
                          {{ tag }}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading -->
          <div
            v-else-if="store.isLoading"
            class="h-[450px] flex flex-col items-center justify-center"
          >
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"
            ></div>
            <p class="text-sm text-muted-foreground">
              {{ t("churchService.loadingPieces") }}
            </p>
          </div>

          <!-- Empty/no results -->
          <div v-else-if="searchInput" class="h-[450px] flex items-center justify-center">
            <p class="text-sm text-muted-foreground">
              {{ t("churchService.noPiecesFound") }}
            </p>
          </div>
          <div v-else class="h-[450px] flex items-center justify-center">
            <p class="text-sm text-muted-foreground">
              {{ t("churchService.noPiecesAvailable") }}
            </p>
          </div>
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
import SongPlaybackControls from "./SongPlaybackControls.vue";
import { useFreieMusikstueckeStore } from "@/stores/freieMusikstuecke";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { Search, X } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { FreiesMusikstueck } from "@/gql/extra-types";

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

interface Props {
  selectedPiece: FreiesMusikstueck | null;
  placeholder: string;
  // Tempo/pitch overrides for the selected piece (intro/outro slot). Default
  // neutral so the picker works standalone.
  speed?: number;
  pitchSemitones?: number;
}

withDefaults(defineProps<Props>(), {
  speed: 1,
  pitchSemitones: 0,
});

const emit = defineEmits<{
  pieceSelected: [piece: FreiesMusikstueck | null];
  "update:speed": [speed: number];
  "update:pitch": [semitones: number];
}>();

const { t } = useI18n();
const store = useFreieMusikstueckeStore();
const { filteredPieces } = storeToRefs(store);

const dialogOpen = ref(false);
// Local search input — synced into the store on dialog close so two open
// pickers don't share a stale query.
const searchInput = ref("");
const scrollElement = ref<HTMLElement | null>(null);

const pieceVirtualizer = useVirtualizer({
  get count() {
    return filteredPieces.value.length;
  },
  getScrollElement: () => scrollElement.value,
  estimateSize: () => 88,
  overscan: 8,
});

const measureRow = (el: Element | null) => {
  if (el instanceof HTMLElement) pieceVirtualizer.value.measureElement(el);
};

watch(searchInput, (q) => {
  store.setSearchQuery(q);
});

const openPickerDialog = async () => {
  dialogOpen.value = true;
  if (!store.isLoaded && !store.isLoading) {
    await store.fetchPieces();
  }
};

const selectPiece = (piece: FreiesMusikstueck) => {
  emit("pieceSelected", piece);
  dialogOpen.value = false;
  searchInput.value = "";
};

const clearSelection = () => {
  emit("pieceSelected", null);
};

watch(dialogOpen, (isOpen) => {
  if (!isOpen) {
    searchInput.value = "";
    store.setSearchQuery("");
  }
});

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>

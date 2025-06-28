<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3 flex-1">
        <h4 class="text-sm font-medium">{{ t("churchService.selectVerses") }}</h4>

        <!-- Collapsed View - Inline Badges -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="isCollapsed" class="flex flex-wrap gap-2">
            <Badge
              v-for="verse in sortedSelectedVerses"
              :key="verse"
              variant="outline"
              class="cursor-pointer hover:bg-secondary/80 transition-colors"
              @click="toggleVerse(verse)"
            >
              {{ t("churchService.verse") }} {{ verse }}
              <X class="w-3 h-3 ml-1" />
            </Badge>
            <span v-if="selectedVerses.length === 0" class="text-xs text-muted-foreground italic">
              {{ t("churchService.noVersesSelected") }}
            </span>
          </div>
        </Transition>
      </div>

      <div class="flex items-center space-x-2">
        <Button v-if="!isCollapsed" variant="outline" size="sm" @click="selectAllVerses">
          {{ t("churchService.selectAll") }}
        </Button>
        <Button v-if="!isCollapsed" variant="outline" size="sm" @click="clearAllVerses">
          {{ t("churchService.clearAll") }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="toggleCollapse"
          class="flex items-center space-x-1"
        >
          <ChevronDown
            :class="['w-4 h-4 transition-transform duration-200', isCollapsed ? 'rotate-180' : '']"
          />
          <span>{{ isCollapsed ? t("churchService.expand") : t("churchService.collapse") }}</span>
        </Button>
      </div>
    </div>

    <!-- Expanded View - Full Verse Selection -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="!isCollapsed" class="border border-border rounded-lg p-4 bg-background">
        <div class="flex flex-wrap gap-6">
          <div
            v-for="verseNumber in availableVerses"
            :key="verseNumber"
            :class="[
              'relative flex items-center justify-center w-10 h-10 rounded-lg border-2 cursor-pointer transition-all',
              isVerseSelected(verseNumber)
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/80'
                : 'border-border hover:border-primary/50 hover:bg-accent',
            ]"
            @click="toggleVerse(verseNumber)"
          >
            <span class="text-sm font-medium">{{ verseNumber }}</span>
            <CheckCircle
              v-if="isVerseSelected(verseNumber)"
              class="absolute -top-[5.5px] -right-[5.5px] w-4 h-4 text-green-500 bg-muted rounded-full shadow"
            />
          </div>
        </div>

        <!-- Verse Preview -->
        <div v-if="selectedVerses.length > 0" class="mt-4 pt-4 border-t border-border">
          <h5 class="text-sm font-medium mb-2">{{ t("churchService.selectedVerses") }}:</h5>
          <div class="flex flex-wrap gap-1">
            <Badge v-for="verse in sortedSelectedVerses" :key="verse" variant="secondary">
              {{ t("churchService.verse") }} {{ verse }}
            </Badge>
          </div>
        </div>

        <!-- Verse Text Preview -->
        <div
          v-if="previewText && selectedVerses.length > 0"
          class="mt-4 pt-4 border-t border-border"
        >
          <h5 class="text-sm font-medium mb-2">{{ t("churchService.preview") }}:</h5>
          <ScrollArea class="max-h-32">
            <div class="text-sm text-muted-foreground space-y-2">
              <div v-for="verse in sortedSelectedVerses" :key="verse">
                <span class="font-medium">{{ verse }}.</span>
                {{ getVerseText(verse) }}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, ChevronDown, X } from "lucide-vue-next";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  song: Gesangbuchlied;
  modelValue: number[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [verses: number[]];
}>();

const { t } = useI18n();

// Collapse state
const isCollapsed = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const selectedVerses = computed({
  get: () => props.modelValue,
  set: (value: number[]) => emit("update:modelValue", value),
});

const sortedSelectedVerses = computed(() => {
  return [...selectedVerses.value].sort((a, b) => a - b);
});

const availableVerses = computed(() => {
  const verses: number[] = [];

  if (props.song.textId?.strophenEinzeln && Array.isArray(props.song.textId.strophenEinzeln)) {
    // Count actual verses from strophenEinzeln
    verses.push(...props.song.textId.strophenEinzeln.map((_, index) => index + 1));
  } else {
    // Default to 6 verses if we can't determine
    verses.push(1, 2, 3, 4, 5, 6);
  }

  return verses;
});

const previewText = computed(() => {
  return props.song.textId?.strophenEinzeln && Array.isArray(props.song.textId.strophenEinzeln);
});

const isVerseSelected = (verseNumber: number): boolean => {
  return selectedVerses.value.includes(verseNumber);
};

const toggleVerse = (verseNumber: number) => {
  const currentSelection = [...selectedVerses.value];
  const index = currentSelection.indexOf(verseNumber);

  if (index > -1) {
    currentSelection.splice(index, 1);
  } else {
    currentSelection.push(verseNumber);
  }

  selectedVerses.value = currentSelection;
};

const selectAllVerses = () => {
  selectedVerses.value = [...availableVerses.value];
};

const clearAllVerses = () => {
  selectedVerses.value = [];
};

const getVerseText = (verseNumber: number): string => {
  if (!props.song.textId?.strophenEinzeln || !Array.isArray(props.song.textId.strophenEinzeln)) {
    return "";
  }

  const verse = props.song.textId.strophenEinzeln[verseNumber - 1];
  if (verse && typeof verse === "object" && "strophe" in verse) {
    const stropheText = (verse as { strophe?: string }).strophe;
    return stropheText ? stropheText.slice(0, 100) + (stropheText.length > 100 ? "..." : "") : "";
  }

  return "";
};
</script>

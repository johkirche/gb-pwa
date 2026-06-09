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

      <Button
        variant="ghost"
        size="icon"
        @click="toggleCollapse"
        :title="isCollapsed ? t('churchService.expand') : t('churchService.collapse')"
        :aria-label="isCollapsed ? t('churchService.expand') : t('churchService.collapse')"
      >
        <ChevronDown
          :class="['w-4 h-4 transition-transform duration-200', isCollapsed ? 'rotate-180' : '']"
        />
      </Button>
    </div>

    <!-- Expanded View - Verse cards (toggle + preview combined) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="!isCollapsed" class="grid gap-2 sm:grid-cols-2">
        <button
          v-for="verseNumber in availableVerses"
          :key="verseNumber"
          type="button"
          :class="[
            'group relative text-left rounded-lg border-2 p-3 pl-10 transition-all',
            isVerseSelected(verseNumber)
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background hover:border-primary/50 hover:bg-accent',
          ]"
          @click="toggleVerse(verseNumber)"
        >
          <!-- Selection indicator (top left) -->
          <CheckCircle
            v-if="isVerseSelected(verseNumber)"
            class="absolute top-2.5 left-2.5 w-5 h-5 text-primary"
          />
          <span
            v-else
            class="absolute top-2.5 left-2.5 w-5 h-5 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary/50 transition-colors"
          />

          <span class="block text-sm font-semibold">
            {{ t("churchService.verse") }} {{ verseNumber }}
          </span>
          <p
            v-if="getVerseText(verseNumber)"
            class="mt-1 text-xs text-muted-foreground line-clamp-3"
          >
            {{ getVerseText(verseNumber) }}
          </p>
        </button>
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

const getVerseText = (verseNumber: number): string => {
  if (!props.song.textId?.strophenEinzeln || !Array.isArray(props.song.textId.strophenEinzeln)) {
    return "";
  }

  const verse = props.song.textId.strophenEinzeln[verseNumber - 1];
  if (verse && typeof verse === "object" && "strophe" in verse) {
    const stropheText = (verse as { strophe?: string }).strophe;
    // Drop the ¬ hyphenation markers; the card clamps overflow via CSS.
    return stropheText?.replace(/¬/g, "") ?? "";
  }

  return "";
};
</script>

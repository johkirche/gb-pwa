<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :size="size"
        class="aspect-square px-0 text-lg leading-none"
        :aria-label="ariaLabel"
      >
        <span v-if="modelValue">{{ modelValue }}</span>
        <Smile v-else class="w-4 h-4 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-fit p-0" align="start">
      <EmojiPicker.Root
        class="isolate flex h-[342px] w-fit flex-col overflow-hidden rounded-md bg-popover text-popover-foreground"
        :locale="mergedLocale"
        :emojibase-url="EMOJIBASE_URL"
        @emoji-select="onEmojiSelect"
      >
        <div class="flex h-9 items-center gap-2 border-b px-3 bg-popover">
          <Search class="size-4 shrink-0 opacity-50" />
          <EmojiPicker.Search
            class="flex h-10 w-full bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground"
            :placeholder="searchPlaceholder"
          />
        </div>
        <EmojiPicker.Viewport
          class="relative flex-1 outline-hidden bg-popover [color-scheme:light] dark:[color-scheme:dark]"
        >
          <EmojiPicker.Loading
            class="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"
          >
            {{ loadingText }}
          </EmojiPicker.Loading>
          <EmojiPicker.Empty
            class="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"
          >
            {{ emptyText }}
          </EmojiPicker.Empty>
          <EmojiPicker.List class="select-none pb-1" row-class="scroll-my-1 px-1">
            <template #category-header="{ category }">
              <div
                class="bg-popover px-3 pt-3.5 pb-2 text-muted-foreground text-xs leading-none font-medium"
              >
                {{ category.label }}
              </div>
            </template>
            <template #emoji="{ emoji }">
              <button
                type="button"
                :class="[
                  'flex size-9 items-center justify-center rounded-sm text-xl leading-none',
                  emoji.isActive && 'bg-accent',
                ]"
              >
                {{ emoji.emoji }}
              </button>
            </template>
          </EmojiPicker.List>
        </EmojiPicker.Viewport>
        <div
          v-if="modelValue"
          class="flex items-center justify-between gap-2 border-t px-3 py-2 bg-popover"
        >
          <span class="text-xs text-muted-foreground truncate">{{ currentLabel }}</span>
          <Button type="button" variant="ghost" size="sm" class="h-7" @click="clear">
            {{ clearLabel }}
          </Button>
        </div>
      </EmojiPicker.Root>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { Search, Smile } from "lucide-vue-next";
import EmojiPicker, { type Emoji, type Locale } from "vue-frimousse";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  modelValue: string | undefined;
  size?: "sm" | "default";
  ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  size: "default",
  ariaLabel: "Emoji",
});

const emit = defineEmits<{
  "update:modelValue": [value: string | undefined];
}>();

const { locale: i18nLocale, t } = useI18n();

// Self-hosted emojibase URL — points at /public/emojibase/{locale}-merged/.
// Each "-merged" locale carries that locale's own labels but tags merged with
// the other supported locale, so search works for both German and English
// keywords regardless of which UI locale is active.
// Generate the files with: pnpm run build:emoji-data
const EMOJIBASE_URL = "/emojibase";
const SUPPORTED_MERGED = new Set(["de", "en"]);

const mergedLocale = computed<Locale>(() => {
  const base = i18nLocale.value;
  const matched = SUPPORTED_MERGED.has(base) ? base : "en";
  // Cast: `${locale}-merged` isn't in frimousse's `Locale` union but it's
  // just used as a path segment in the emojibase URL, so the runtime is happy.
  return `${matched}-merged` as Locale;
});

const open = ref(false);

const currentLabel = t("playlist.currentEmoji");
const clearLabel = t("playlist.clearEmoji");
const searchPlaceholder = t("playlist.searchEmoji");
const loadingText = t("playlist.loadingEmoji");
const emptyText = t("playlist.noEmojiFound");

const onEmojiSelect = (emoji: Emoji) => {
  emit("update:modelValue", emoji.emoji);
  open.value = false;
};

const clear = () => {
  emit("update:modelValue", undefined);
  open.value = false;
};
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- Results Summary -->
    <div class="mb-4 flex-shrink-0">
      <p class="text-sm text-muted-foreground">
        {{ t("songs.showingResults", { count: lieder.length, total: totalCount }) }}
      </p>
    </div>

    <!-- Virtualized Grid -->
    <div ref="scrollElement" class="flex-1 min-h-0 overflow-auto">
      <div
        :style="{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }"
      >
        <div
          v-for="virtualItem in virtualizer.getVirtualItems()"
          :key="virtualItem.index"
          :data-index="virtualItem.index"
          :ref="(el) => measureRow(el as Element | null)"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualItem.start}px)`,
            paddingBottom: '24px',
          }"
        >
          <div class="grid gap-6" :class="gridColsClass">
            <SongsCard
              v-for="lied in rowsOfLieder[virtualItem.index]"
              :key="lied.id"
              :lied="lied"
              @click="$emit('cardClick', $event)"
            />
          </div>
        </div>
      </div>

      <!-- Infinite Scroll Trigger Element -->
      <div v-if="hasMore" ref="scrollTrigger" class="h-4"></div>

      <!-- Load More Button (fallback) -->
      <div v-if="hasMore" class="mt-8 text-center">
        <Button :disabled="isLoadingMore" variant="outline" @click="handleLoadMore">
          <Plus class="w-4 h-4 mr-2" />
          {{ isLoadingMore ? t("utils.loading") : t("songs.loadMore") }}
        </Button>
      </div>

      <!-- Loading indicator for infinite scroll -->
      <div v-if="isLoadingMore" class="mt-4 text-center">
        <p class="text-sm text-muted-foreground">
          {{ t("songs.loadingMoreSongs") }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVirtualizer } from "@tanstack/vue-virtual";
import { useMediaQuery } from "@vueuse/core";
import { Plus } from "lucide-vue-next";

import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Button } from "@/components/ui/button";

import SongsCard from "@/components/songs/SongCard.vue";

const { t } = useI18n();

interface Props {
  lieder: Gesangbuchlied[];
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  cardClick: [id: string];
  loadMore: [];
}>();

const scrollElement = ref<HTMLElement | null>(null);
const scrollTrigger = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// Tailwind grid breakpoints: md=768px (2 cols), lg=1024px (3 cols)
const isLg = useMediaQuery("(min-width: 1024px)");
const isMd = useMediaQuery("(min-width: 768px)");

const columnsPerRow = computed(() => (isLg.value ? 3 : isMd.value ? 2 : 1));

const gridColsClass = computed(() =>
  columnsPerRow.value === 3
    ? "grid-cols-3"
    : columnsPerRow.value === 2
      ? "grid-cols-2"
      : "grid-cols-1",
);

const rowsOfLieder = computed(() => {
  const cols = columnsPerRow.value;
  const rows: Gesangbuchlied[][] = [];
  for (let i = 0; i < props.lieder.length; i += cols) {
    rows.push(props.lieder.slice(i, i + cols));
  }
  return rows;
});

const virtualizer = useVirtualizer({
  get count() {
    return rowsOfLieder.value.length;
  },
  getScrollElement: () => scrollElement.value,
  estimateSize: () => 320,
  overscan: 4,
});

const measureRow = (el: Element | null) => {
  if (el instanceof HTMLElement) virtualizer.value.measureElement(el);
};

// When column count changes, the chunking changes, so reset cached measurements.
watch(columnsPerRow, () => {
  virtualizer.value.measure();
});

const handleLoadMore = () => {
  emit("loadMore");
};

onMounted(() => {
  if (scrollTrigger.value) {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !props.isLoadingMore && props.hasMore) {
          handleLoadMore();
        }
      },
      {
        root: scrollElement.value,
        rootMargin: "200px",
        threshold: 0.1,
      },
    );

    observer.observe(scrollTrigger.value);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

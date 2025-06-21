<template>
  <div>
    <!-- Results Summary -->
    <div class="mb-6">
      <p class="text-sm text-muted-foreground">
        Showing {{ lieder.length }} of {{ totalCount }} songs
      </p>
    </div>

    <!-- Songs Grid -->
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <SongsCard
        v-for="lied in lieder"
        :key="lied.id"
        :lied="lied"
        @click="$emit('cardClick', $event)"
      />
    </div>

    <!-- Infinite Scroll Trigger Element -->
    <div v-if="hasMore" ref="scrollTrigger" class="h-4"></div>

    <!-- Load More Button (fallback) -->
    <div v-if="hasMore" class="mt-8 text-center">
      <Button
        :disabled="isLoadingMore"
        variant="outline"
        @click="handleLoadMore"
      >
        <Plus class="w-4 h-4 mr-2" />
        {{ isLoadingMore ? "Loading..." : "Load More" }}
      </Button>
    </div>

    <!-- Loading indicator for infinite scroll -->
    <div v-if="isLoadingMore" class="mt-4 text-center">
      <p class="text-sm text-muted-foreground">Loading more songs...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from "lucide-vue-next";

import { onMounted, onUnmounted, ref } from "vue";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Button } from "@/components/ui/button";

import SongsCard from "@/components/songs/SongCard.vue";

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

const scrollTrigger = ref<HTMLElement>();
let observer: IntersectionObserver | null = null;

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
        root: null,
        rootMargin: "100px", // Start loading 100px before the element comes into view
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

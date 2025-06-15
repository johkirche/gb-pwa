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

    <!-- Load More Button -->
    <div v-if="hasMore" class="mt-8 text-center">
      <Button
        @click="$emit('loadMore')"
        :disabled="isLoadingMore"
        variant="outline"
      >
        <Plus class="w-4 h-4 mr-2" />
        {{ isLoadingMore ? "Loading..." : "Load More" }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import SongsCard from "./Card.vue";
import { Plus } from "lucide-vue-next";
import type { Gesangbuchlied } from "@/gql/graphql";

interface Props {
  lieder: Gesangbuchlied[];
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

defineProps<Props>();

defineEmits<{
  cardClick: [id: string];
  loadMore: [];
}>();
</script>

<template>
  <AppLayout>
    <main class="container mx-auto py-8 max-w-6xl space-y-6">
      <PageHeader :items="breadcrumbs" />

      <section>
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ListMusic class="w-6 h-6 text-primary" />
              {{ t("playlist.myPlaylists") }}
            </h1>
            <p class="text-sm text-muted-foreground mt-1">
              {{ t("playlist.description") }}
            </p>
          </div>
          <Button @click="router.push({ name: 'playlist-new' })">
            <Plus class="w-4 h-4 mr-1" />
            {{ t("playlist.create") }}
          </Button>
        </div>

        <div>
          <div v-if="store.isLoading && store.playlists.length === 0" class="text-center py-8">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"
            ></div>
          </div>

          <div v-else-if="store.playlists.length === 0" class="text-center py-10">
            <ListMusic class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 class="font-medium text-muted-foreground mb-1">{{ t("playlist.empty") }}</h3>
            <p class="text-sm text-muted-foreground">{{ t("playlist.emptyDescription") }}</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="pl in store.playlists"
              :key="pl.id"
              class="border rounded-lg p-4 hover:bg-accent/40 transition-colors cursor-pointer"
              @click="openDetail(pl.id)"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-xl flex-shrink-0"
                >
                  <span v-if="pl.emoji">{{ pl.emoji }}</span>
                  <ListMusic v-else class="w-5 h-5 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium truncate">{{ pl.name }}</h4>
                  <p v-if="pl.description" class="text-sm text-muted-foreground truncate mt-0.5">
                    {{ pl.description }}
                  </p>
                  <div class="mt-2">
                    <Badge variant="secondary" class="text-xs">
                      {{ t("playlist.songsCount", { count: pl.songIds.length }) }}
                    </Badge>
                  </div>
                </div>
                <ChevronRight class="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </AppLayout>
</template>

<script setup lang="ts">
import { usePlaylistStore } from "@/stores/playlists";
import { ChevronRight, ListMusic, Plus } from "lucide-vue-next";

import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import AppLayout from "@/components/layout/AppLayout.vue";
import PageHeader, { type BreadcrumbItem } from "@/components/layout/PageHeader.vue";

const { t } = useI18n();
const router = useRouter();

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: t("nav.home"), to: { name: "home" } },
  { label: t("playlist.myPlaylists") },
]);

const store = usePlaylistStore();

const openDetail = (id: string) => {
  router.push({ name: "playlist-detail", params: { id } });
};

onMounted(async () => {
  await store.loadPlaylists();
});
</script>

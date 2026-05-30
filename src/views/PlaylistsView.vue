<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :page-title="t('playlist.title')"
      :show-back-button="true"
      :show-home-button="true"
    />

    <main class="container mx-auto py-8 max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <div class="flex items-start justify-between gap-4">
            <div>
              <CardTitle class="flex items-center space-x-2">
                <ListMusic class="w-5 h-5 text-muted-foreground" />
                <span>{{ t("playlist.myPlaylists") }}</span>
              </CardTitle>
              <CardDescription class="mt-1">
                {{ t("playlist.description") }}
              </CardDescription>
            </div>
            <Button size="sm" @click="openCreateDialog">
              <Plus class="w-4 h-4 mr-1" />
              {{ t("playlist.create") }}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
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
        </CardContent>
      </Card>
    </main>

    <!-- Create Dialog (single, top-level — no nesting) -->
    <Dialog v-model:open="createOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t("playlist.create.title") }}</DialogTitle>
          <DialogDescription>
            {{ t("playlist.create.description") }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3 py-2">
          <div class="space-y-1">
            <Label>{{ t("playlist.emojiLabel") }}</Label>
            <div>
              <EmojiPickerPopover v-model="formEmoji" />
            </div>
          </div>
          <div class="space-y-1">
            <Label for="new-playlist-name">{{ t("playlist.name") }}</Label>
            <Input
              id="new-playlist-name"
              v-model="formName"
              :placeholder="t('playlist.namePlaceholder')"
              @keydown.enter="saveCreate"
            />
          </div>
          <div class="space-y-1">
            <Label for="new-playlist-desc">{{ t("playlist.descriptionLabel") }}</Label>
            <Input
              id="new-playlist-desc"
              v-model="formDescription"
              :placeholder="t('playlist.descriptionPlaceholder')"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="createOpen = false">{{ t("playlist.cancel") }}</Button>
          <Button :disabled="!formName.trim()" @click="saveCreate">
            {{ t("playlist.save") }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { usePlaylistStore } from "@/stores/playlists";
import { ChevronRight, ListMusic, Plus } from "lucide-vue-next";

import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import AppHeader from "@/components/AppHeader.vue";
import EmojiPickerPopover from "@/components/EmojiPickerPopover.vue";

const { t } = useI18n();
const router = useRouter();

const store = usePlaylistStore();

const createOpen = ref(false);
const formName = ref("");
const formDescription = ref("");
const formEmoji = ref<string | undefined>(undefined);

const openCreateDialog = () => {
  formName.value = "";
  formDescription.value = "";
  formEmoji.value = undefined;
  createOpen.value = true;
};

const saveCreate = async () => {
  const name = formName.value.trim();
  if (!name) return;
  const created = await store.createPlaylist(
    name,
    formDescription.value || undefined,
    formEmoji.value,
  );
  createOpen.value = false;
  // Jump straight into the new playlist so the user can add songs.
  router.push({ name: "playlist-detail", params: { id: created.id } });
};

const openDetail = (id: string) => {
  router.push({ name: "playlist-detail", params: { id } });
};

onMounted(async () => {
  await store.loadPlaylists();
});
</script>

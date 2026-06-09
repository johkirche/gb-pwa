<template>
  <AppLayout>
    <main class="container mx-auto py-8 max-w-6xl space-y-6">
      <PageHeader :items="breadcrumbs" />

      <section>
        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListMusic class="w-6 h-6 text-primary" />
            {{ t("playlist.createTitle") }}
          </h1>
          <p class="text-sm text-muted-foreground mt-1">
            {{ t("playlist.createDescription") }}
          </p>
        </div>

        <div class="max-w-xl space-y-4">
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
              autofocus
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

          <div class="flex justify-end gap-2 pt-2">
            <Button variant="outline" @click="cancel">{{ t("playlist.cancel") }}</Button>
            <Button :disabled="!formName.trim()" @click="saveCreate">
              {{ t("playlist.save") }}
            </Button>
          </div>
        </div>
      </section>
    </main>
  </AppLayout>
</template>

<script setup lang="ts">
import { usePlaylistStore } from "@/stores/playlists";
import { ListMusic } from "lucide-vue-next";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import AppLayout from "@/components/layout/AppLayout.vue";
import PageHeader, { type BreadcrumbItem } from "@/components/layout/PageHeader.vue";
import EmojiPickerPopover from "@/components/EmojiPickerPopover.vue";

const { t } = useI18n();
const router = useRouter();
const store = usePlaylistStore();

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: t("nav.home"), to: { name: "home" } },
  { label: t("playlist.myPlaylists"), to: { name: "playlists" } },
  { label: t("playlist.createTitle") },
]);

const formName = ref("");
const formDescription = ref("");
const formEmoji = ref<string | undefined>(undefined);

const cancel = () => router.push({ name: "playlists" });

const saveCreate = async () => {
  const name = formName.value.trim();
  if (!name) return;
  const created = await store.createPlaylist(
    name,
    formDescription.value || undefined,
    formEmoji.value,
  );
  // Jump straight into the new playlist so the user can add songs. Replace so
  // the back button returns to the list rather than this create screen.
  router.replace({ name: "playlist-detail", params: { id: created.id } });
};
</script>

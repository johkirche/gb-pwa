<template>
  <Card v-if="audioFiles.length > 0">
    <CardHeader>
      <CardTitle class="flex items-center">
        <Music class="w-5 h-5 mr-2 text-muted-foreground" />
        Audio Files
      </CardTitle>
      <CardDescription>
        Select an audio file to play with speed control
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Tabs v-model="selectedTab" class="w-full">
        <TabsList
          class="grid w-full"
          :style="{
            gridTemplateColumns: `repeat(${audioFiles.length}, minmax(0, 1fr))`,
          }"
        >
          <TabsTrigger
            v-for="file in audioFiles"
            :key="file.id"
            :value="file.id"
            class="flex items-center space-x-2"
          >
            <Music class="w-4 h-4" />
            <span class="truncate">{{ getFileName(file) }}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          v-for="file in audioFiles"
          :key="file.id"
          :value="file.id"
          class="mt-4"
        >
          <!-- Simple Audio Player -->
          <SimpleAudioPlayer
            :key="file.id"
            :audio-url="getAudioUrl(file)"
            :title="file.title || getFileName(file)"
            :file-size="file.filesize"
          />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Music } from "lucide-vue-next";

import { computed, ref, watchEffect } from "vue";

import type { Directus_Files } from "@/gql/graphql";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SimpleAudioPlayer from "@/components/song/SimpleAudioPlayer.vue";

import { getOfflineAssetBlob } from "@/composables/useOfflineDownload";

interface Props {
  files: Directus_Files[];
  directusUrl: string;
}

const props = defineProps<Props>();

// Filter only audio files
const audioFiles = computed(() => {
  return props.files.filter((file) => file.type?.includes("audio"));
});

// Selected tab (defaults to first audio file)
const selectedTab = ref(
  audioFiles.value.length > 0 ? audioFiles.value[0].id : "",
);

const getFileName = (file: Directus_Files): string => {
  return file.title || file.filename_download || "Unknown";
};

// Resolve every audio file's URL: blob from IDB when cached for offline use,
// otherwise the direct Directus asset URL. Object URLs are revoked when the
// effect re-runs (audio file list changed) or the component unmounts.
const audioUrls = ref<Map<string, string>>(new Map());

watchEffect(async (onCleanup) => {
  const next = new Map<string, string>();
  const cleanups: (() => void)[] = [];
  onCleanup(() => cleanups.forEach((c) => c()));

  for (const file of audioFiles.value) {
    const blob = await getOfflineAssetBlob(file.id);
    if (blob) {
      const objUrl = URL.createObjectURL(blob);
      next.set(file.id, objUrl);
      cleanups.push(() => URL.revokeObjectURL(objUrl));
    } else {
      next.set(file.id, `${props.directusUrl}/assets/${file.id}`);
    }
  }
  audioUrls.value = next;
});

const getAudioUrl = (file: Directus_Files): string => audioUrls.value.get(file.id) ?? "";
</script>

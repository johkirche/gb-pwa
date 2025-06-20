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
            :audio-url="getAudioUrl(file)"
            :title="file.title || getFileName(file)"
            :file-size="file.filesize"
            :key="file.id"
          />
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music } from "lucide-vue-next";
import SimpleAudioPlayer from "./SimpleAudioPlayer.vue";

interface AudioFile {
  id: string;
  title?: string;
  filename_download?: string;
  type: string;
  filesize?: string | number;
  duration?: number;
}

interface Props {
  files: AudioFile[];
  directusUrl: string;
}

const props = defineProps<Props>();

// Filter only audio files
const audioFiles = computed(() => {
  return props.files.filter((file) => file.type.includes("audio"));
});

// Selected tab (defaults to first audio file)
const selectedTab = ref(
  audioFiles.value.length > 0 ? audioFiles.value[0].id : ""
);

const getFileName = (file: AudioFile): string => {
  return file.title || file.filename_download || "Unknown";
};

const getAudioUrl = (file: AudioFile): string => {
  return `${props.directusUrl}/assets/${file.id}`;
};
</script>

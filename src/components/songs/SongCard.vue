<template>
  <Card
    class="hover:shadow-lg transition-all duration-200 cursor-pointer group"
    @click="$emit('click', lied.id)"
  >
    <CardHeader class="pb-3">
      <CardTitle class="text-lg group-hover:text-primary transition-colors">
        {{ lied.titel || "Untitled" }}
      </CardTitle>
      <CardDescription v-if="firstCategory" class="flex items-center">
        <Tag class="w-3 h-3 mr-1" />
        {{ firstCategory }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3 flex-1">
      <!-- Authors Section -->
      <div v-if="authors.length > 0" class="space-y-1">
        <p
          class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Authors
        </p>
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="author in authors"
            :key="author"
            variant="secondary"
            class="text-xs"
          >
            {{ author }}
          </Badge>
        </div>
      </div>

      <!-- Text Preview -->
      <div v-if="firstStrophe" class="space-y-1">
        <p
          class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Preview
        </p>
        <p class="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {{ firstStrophe }}
        </p>
      </div>

      <!-- File Attachments -->
      <div v-if="fileInfo.length > 0" class="space-y-1">
        <p
          class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Files
        </p>
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="fileType in fileInfo"
            :key="fileType"
            variant="outline"
            class="text-xs"
          >
            {{ fileType }}
          </Badge>
        </div>
      </div>
    </CardContent>

    <CardFooter class="pt-3 border-t">
      <div class="flex justify-between items-center w-full">
        <div class="flex items-center text-xs text-muted-foreground">
          <Calendar class="w-3 h-3 mr-1" />
          {{ formattedDate }}
        </div>
        <div
          class="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors"
        >
          View Details
          <ArrowRight class="w-3 h-3 ml-1" />
        </div>
      </div>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { ArrowRight, Calendar, Tag } from "lucide-vue-next";

import { computed } from "vue";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  lied: Gesangbuchlied;
}

const props = defineProps<Props>();

defineEmits<{
  click: [id: string];
}>();

// Computed properties for data extraction
const authors = computed(() => {
  const authorsList: string[] = [];

  // Text authors
  if (props.lied.textId?.autorId) {
    props.lied.textId.autorId.forEach((autorRel) => {
      if (autorRel?.autor_id) {
        const autor = autorRel.autor_id;
        const name = `${autor.vorname || ""} ${autor.nachname || ""}`.trim();
        if (name) authorsList.push(name);
      }
    });
  }

  // Melody authors
  if (props.lied.melodieId?.autorId) {
    props.lied.melodieId.autorId.forEach((autorRel) => {
      if (autorRel?.autor_id) {
        const autor = autorRel.autor_id;
        const name = `${autor.vorname || ""} ${autor.nachname || ""}`.trim();
        if (name && !authorsList.includes(name)) authorsList.push(name);
      }
    });
  }

  return authorsList;
});

const firstCategory = computed(() => {
  if (props.lied.kategorieId && props.lied.kategorieId.length > 0) {
    return props.lied.kategorieId[0]?.kategorie_id?.name || null;
  }
  return null;
});

const firstStrophe = computed(() => {
  if (
    props.lied.textId?.strophenEinzeln &&
    props.lied.textId.strophenEinzeln.length > 0
  ) {
    return props.lied.textId.strophenEinzeln[0]?.strophe || null;
  }
  return null;
});

const fileInfo = computed(() => {
  const fileTypes = new Set<string>();

  // Check melody files
  if (props.lied.melodieId?.noten) {
    props.lied.melodieId.noten.forEach((note) => {
      if (note?.directus_files_id?.type) {
        const type = note.directus_files_id.type;
        if (type.includes("pdf")) fileTypes.add("PDF");
        else if (type.includes("audio")) fileTypes.add("Audio");
        else if (type.includes("image")) fileTypes.add("Image");
        else fileTypes.add("File");
      }
    });
  }

  return Array.from(fileTypes);
});

const formattedDate = computed(() => {
  if (!props.lied.date_updated) return "Unknown";

  try {
    const date = new Date(props.lied.date_updated);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
});
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

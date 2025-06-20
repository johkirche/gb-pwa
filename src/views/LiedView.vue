<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Header -->
    <AppHeader
      :page-title="t('song.pageTitle')"
      :show-back-button="true"
      :show-home-button="true"
      :back-button-text="t('song.backButton')"
      back-to="/lieder"
    />

    <!-- Main Content -->
    <main class="container mx-auto py-8">
      <!-- Loading State -->
      <SongLoadingState v-if="isLoading" />

      <!-- Error State -->
      <SongErrorState
        v-else-if="queryError"
        :error="queryError"
        @retry="fetchLied"
      />

      <!-- Song Not Found -->
      <SongNotFoundState v-else-if="!lied" />

      <!-- Song Details -->
      <div v-else class="space-y-8">
        <!-- Cached Data Indicator -->
        <div
          v-if="isUsingCachedData"
          class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4"
        >
          <div class="flex items-center space-x-2">
            <svg
              class="w-4 h-4 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <p class="text-sm text-blue-800">
              {{ t("song.offlineVersionMessage") }}
            </p>
          </div>
        </div>

        <!-- Song Header -->
        <SongHeaderInfo :lied="lied" />

        <!-- Song Metadata -->
        <SongMetadata
          :lied="lied"
          :text-authors="getTextAuthors(lied)"
          :melody-authors="getMelodyAuthors(lied)"
          :has-files="hasFiles(lied)"
        />

        <SongTextDisplay :strophes="lied.textId?.strophenEinzeln" />

        <SongFilesCard
          v-if="hasFiles(lied)"
          :files="getAllFiles(lied)"
          :directus-url="directusUrl"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

import type { Directus_Files, Gesangbuchlied } from "@/gql/graphql";

import AppHeader from "@/components/AppHeader.vue";
import SongErrorState from "@/components/song/ErrorState.vue";
import SongFilesCard from "@/components/song/FilesCard.vue";
import SongHeaderInfo from "@/components/song/HeaderInfo.vue";
import SongLoadingState from "@/components/song/LoadingState.vue";
import SongNotFoundState from "@/components/song/NotFoundState.vue";
import SongMetadata from "@/components/song/SongMetadata.vue";
import SongTextDisplay from "@/components/song/TextDisplay.vue";

import { useGesangbuchlied } from "@/composables/useGesangbuchlied";
import { useOfflineDownload } from "@/composables/useOfflineDownload";

const { t } = useI18n();

// Get the song ID from the route
const route = useRoute();
const liedId = route.params.id as string;

// Reactive data
const lied = ref<Gesangbuchlied | null>(null);
const isLoading = ref(false);
const queryError = ref<string | null>(null);
const isUsingCachedData = ref(false);

const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;

// Methods
const fetchLied = async () => {
  try {
    isLoading.value = true;
    queryError.value = null;
    console.log("fetchLied", liedId);

    const { getOfflineSongById } = useOfflineDownload();

    // First, try to get the song from IndexedDB
    const offlineSong = await getOfflineSongById(liedId);

    if (offlineSong) {
      console.log("Found song in IndexedDB:", offlineSong.titel);
      lied.value = offlineSong;
      isUsingCachedData.value = true;

      // If we're online, still try to fetch fresh data in the background
      if (typeof window !== "undefined" && navigator.onLine) {
        try {
          const { queryGesangbuchliedById } = useGesangbuchlied();
          const freshResult = await queryGesangbuchliedById(liedId);

          if (freshResult) {
            console.log("Updated with fresh data from API");
            lied.value = freshResult;
            isUsingCachedData.value = false;
          }
        } catch (err) {
          console.warn(
            "Failed to fetch fresh data, using cached version:",
            err,
          );
          // Continue using the cached version - don't show error
        }
      }
    } else {
      // No cached version found, try API
      console.log("Song not found in IndexedDB, fetching from API");

      if (typeof window !== "undefined" && !navigator.onLine) {
        queryError.value = t("song.notAvailableOffline");
        return;
      }

      const { queryGesangbuchliedById } = useGesangbuchlied();
      const result = await queryGesangbuchliedById(liedId);

      if (result) {
        lied.value = result;
        isUsingCachedData.value = false;
      } else {
        queryError.value = t("song.songNotFound");
      }
    }
  } catch (err) {
    console.error("Error fetching gesangbuchlied:", err);

    // Handle offline errors gracefully
    if (typeof window !== "undefined" && !navigator.onLine) {
      queryError.value = t("song.notAvailableOffline");
    } else {
      queryError.value =
        err instanceof Error ? err.message : t("utils.unknownError");
    }
  } finally {
    isLoading.value = false;
  }
};

const getTextAuthors = (lied: Gesangbuchlied) => {
  if (!lied.textId?.autorId) return [];

  return lied.textId.autorId
    .map((autorRel) => autorRel?.autor_id)
    .filter((author): author is import("@/gql/graphql").Autor =>
      Boolean(author),
    );
};

const getMelodyAuthors = (lied: Gesangbuchlied) => {
  if (!lied.melodieId?.autorId) return [];

  return lied.melodieId.autorId
    .map((autorRel) => autorRel?.autor_id)
    .filter((author): author is import("@/gql/graphql").Autor =>
      Boolean(author),
    );
};

const hasFiles = (lied: Gesangbuchlied): boolean => {
  return getAllFiles(lied).length > 0;
};

const getAllFiles = (lied: Gesangbuchlied) => {
  const files: Directus_Files[] = [];

  // Get melody files
  if (lied.melodieId?.noten) {
    lied.melodieId.noten.forEach((note) => {
      if (note?.directus_files_id) {
        files.push(note.directus_files_id);
      }
    });
  }

  return files;
};

// Initialize data on mount
onMounted(() => {
  if (liedId) {
    fetchLied();
  }
});
</script>

<style scoped>
pre {
  font-family: "Georgia", "Times New Roman", serif;
}
</style>

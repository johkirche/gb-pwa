<template>
    <div class="min-h-screen bg-background">
        <!-- Navigation Header -->
        <AppHeader page-title="Lied Details" :show-back-button="true" :show-home-button="true" back-button-text="Zurück"
            back-to="/lieder" />

        <!-- Main Content -->
        <main class="container mx-auto py-8">
            <!-- Loading State -->
            <SongLoadingState v-if="isLoading" />

            <!-- Error State -->
            <SongErrorState v-else-if="queryError" :error="queryError" @retry="fetchLied" />

            <!-- Song Not Found -->
            <SongNotFoundState v-else-if="!lied" />

            <!-- Song Details -->
            <div v-else class="space-y-8">
                <!-- Song Header -->
                <SongHeaderInfo :lied="lied" />

                <!-- Song Metadata -->
                <SongMetadata :lied="lied" :text-authors="getTextAuthors(lied)" :melody-authors="getMelodyAuthors(lied)"
                    :has-files="hasFiles(lied)" />

                <SongTextDisplay :strophes="lied.textId?.strophenEinzeln" />

                <SongFilesCard v-if="hasFiles(lied)" :files="getAllFiles(lied)"
                    :directusUrl="$config.public.directus.url" />
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import type { Gesangbuchlied } from "~/gql/graphql";

definePageMeta({
    middleware: "auth",
});

// Get the song ID from the route
const route = useRoute();
const config = useRuntimeConfig();
const liedId = route.params.id as string;

// Reactive data
const lied = ref<Gesangbuchlied | null>(null);
const isLoading = ref(false);
const queryError = ref<string | null>(null);

// Methods
const fetchLied = async () => {
    try {
        isLoading.value = true;
        queryError.value = null;

        const { queryGesangbuchliedById } = useGesangbuchlied();
        const result = await queryGesangbuchliedById(liedId);

        lied.value = result;
    } catch (err) {
        console.error("Error fetching gesangbuchlied:", err);
        queryError.value = err instanceof Error ? err.message : "Unknown error occurred";
    } finally {
        isLoading.value = false;
    }
};

const getTextAuthors = (lied: Gesangbuchlied) => {
    if (!lied.textId?.autorId) return [];

    return lied.textId.autorId
        .map(autorRel => autorRel?.autor_id)
        .filter(Boolean);
};

const getMelodyAuthors = (lied: Gesangbuchlied) => {
    if (!lied.melodieId?.autorId) return [];

    return lied.melodieId.autorId
        .map(autorRel => autorRel?.autor_id)
        .filter(Boolean);
};

const getAuthorName = (author: any): string => {
    return `${author.vorname || ""} ${author.nachname || ""}`.trim() || "Unknown";
};

const hasFiles = (lied: Gesangbuchlied): boolean => {
    return getAllFiles(lied).length > 0;
};

const getAllFiles = (lied: Gesangbuchlied) => {
    const files: any[] = [];

    // Get melody files
    if (lied.melodieId?.noten) {
        lied.melodieId.noten.forEach(note => {
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

// Set page title
useHead({
    title: computed(() => lied.value?.titel ? `${lied.value.titel} - Gesangbuch` : 'Song Details - Gesangbuch')
});
</script>

<style scoped>
pre {
    font-family: 'Georgia', 'Times New Roman', serif;
}
</style>

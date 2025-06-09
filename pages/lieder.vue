<template>
    <div class="min-h-screen bg-background">
        <!-- Navigation Header -->
        <AppHeader page-title="Lieder" :show-back-button="true" :show-home-button="true" back-button-text="Zurück"
            back-to="/home" />

        <!-- Main Content -->
        <main class="container mx-auto py-8">
            <!-- Search and Filter Section -->
            <SongsSearchFilters v-model:search-query="searchQuery" v-model:selected-category="selectedCategory"
                v-model:sort-by="sortBy" :sort-direction="sortDirection" :available-categories="availableCategories"
                @toggle-sort-direction="toggleSortDirection" @clear-filters="clearFilters" class="mb-4" />

            <!-- Loading State -->
            <SongsLoadingState v-if="isLoading" />

            <!-- Error State -->
            <SongsErrorState v-else-if="queryError" :message="queryError" @retry="fetchGesangbuchlieder" />

            <!-- Results Grid -->
            <SongsGrid v-else-if="filteredLieder.length > 0" :lieder="filteredLieder"
                :total-count="gesangbuchlieder.length" :has-more="hasMore" :is-loading-more="isLoadingMore"
                @card-click="navigateToLied" @load-more="loadMore" />

            <!-- No Results -->
            <SongsEmptyState v-else-if="!isLoading && gesangbuchlieder.length === 0"
                @load-songs="fetchGesangbuchlieder" />
        </main>
    </div>
</template>

<script setup lang="ts">
import {
    Search,
    ArrowLeft,
    ArrowUpDown,
    X,
    AlertCircle,
    RefreshCw,
    Music,
    Tag,
    Calendar,
    ArrowRight,
    Plus,
} from "lucide-vue-next";
import type { Gesangbuchlied } from "~/gql/graphql";

definePageMeta({
    middleware: "auth",
});

// Reactive data
const gesangbuchlieder = ref<Gesangbuchlied[]>([]);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const queryError = ref<string | null>(null);
const searchQuery = ref("");
const selectedCategory = ref("");
const sortBy = ref("title");
const sortDirection = ref<"asc" | "desc">("asc");
const currentLimit = ref(50);
const hasMore = ref(true);

// Computed properties
const availableCategories = computed(() => {
    const categories = new Set<string>();
    gesangbuchlieder.value.forEach(lied => {
        if (lied.kategorieId) {
            lied.kategorieId.forEach(kat => {
                if (kat?.kategorie_id?.name) {
                    categories.add(kat.kategorie_id.name);
                }
            });
        }
    });
    return Array.from(categories).sort();
});

const filteredLieder = computed(() => {
    let filtered = [...gesangbuchlieder.value];

    // Search filter
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(lied => {
            // Search in title
            if (lied.titel?.toLowerCase().includes(query)) return true;

            // Search in text content
            if (lied.textId?.strophenEinzeln) {
                const textContent = lied.textId.strophenEinzeln
                    .map(strophe => strophe?.strophe || '')
                    .join(' ')
                    .toLowerCase();
                if (textContent.includes(query)) return true;
            }

            // Search in authors
            const authors = getAuthors(lied);
            if (authors.some(author => author.toLowerCase().includes(query))) return true;

            return false;
        });
    }

    // Category filter
    if (selectedCategory.value) {
        filtered = filtered.filter(lied => {
            if (!lied.kategorieId) return false;
            return lied.kategorieId.some(kat =>
                kat?.kategorie_id?.name === selectedCategory.value
            );
        });
    }

    // Sort
    filtered.sort((a, b) => {
        let valueA: any;
        let valueB: any;

        switch (sortBy.value) {
            case "title":
                valueA = a.titel || "";
                valueB = b.titel || "";
                break;
            case "date_updated":
                valueA = new Date(a.date_updated || 0);
                valueB = new Date(b.date_updated || 0);
                break;
            case "liednummer2000":
                valueA = a.liednummer2000 || 0;
                valueB = b.liednummer2000 || 0;
                break;
            default:
                valueA = a.titel || "";
                valueB = b.titel || "";
        }

        if (valueA < valueB) return sortDirection.value === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection.value === "asc" ? 1 : -1;
        return 0;
    });

    return filtered;
});

// Methods
const fetchGesangbuchlieder = async () => {
    try {
        isLoading.value = true;
        queryError.value = null;

        const variables = {
            limit: currentLimit.value,
            offset: 0,
            filter: {
                status: { _eq: "published" },
            },
        };

        const { queryGesangbuchlied } = useGesangbuchlied();
        const result = await queryGesangbuchlied(variables);

        gesangbuchlieder.value = result;
        hasMore.value = result.length === currentLimit.value;
    } catch (err) {
        console.error("Error fetching gesangbuchlieder:", err);
        queryError.value = err instanceof Error ? err.message : "Unknown error occurred";
    } finally {
        isLoading.value = false;
    }
};

const loadMore = async () => {
    try {
        isLoadingMore.value = true;

        const variables = {
            limit: 50,
            offset: gesangbuchlieder.value.length,
            filter: {
                status: { _eq: "published" },
            },
        };

        const { queryGesangbuchlied } = useGesangbuchlied();
        const result = await queryGesangbuchlied(variables);

        gesangbuchlieder.value.push(...result);
        hasMore.value = result.length === 50;
    } catch (err) {
        console.error("Error loading more songs:", err);
    } finally {
        isLoadingMore.value = false;
    }
};

const navigateToLied = (id: string) => {
    navigateTo(`/lied/${id}`);
};

const getAuthors = (lied: Gesangbuchlied): string[] => {
    const authors: string[] = [];

    // Text authors
    if (lied.textId?.autorId) {
        lied.textId.autorId.forEach(autorRel => {
            if (autorRel?.autor_id) {
                const autor = autorRel.autor_id;
                const name = `${autor.vorname || ""} ${autor.nachname || ""}`.trim();
                if (name) authors.push(name);
            }
        });
    }

    // Melody authors
    if (lied.melodieId?.autorId) {
        lied.melodieId.autorId.forEach(autorRel => {
            if (autorRel?.autor_id) {
                const autor = autorRel.autor_id;
                const name = `${autor.vorname || ""} ${autor.nachname || ""}`.trim();
                if (name && !authors.includes(name)) authors.push(name);
            }
        });
    }

    return authors;
};

const getFirstCategory = (lied: Gesangbuchlied): string | null => {
    if (lied.kategorieId && lied.kategorieId.length > 0) {
        return lied.kategorieId[0]?.kategorie_id?.name || null;
    }
    return null;
};

const getFirstStrophe = (lied: Gesangbuchlied): string | null => {
    if (lied.textId?.strophenEinzeln && lied.textId.strophenEinzeln.length > 0) {
        return lied.textId.strophenEinzeln[0]?.strophe || null;
    }
    return null;
};

const getFileInfo = (lied: Gesangbuchlied): string[] => {
    const fileTypes = new Set<string>();

    // Check melody files
    if (lied.melodieId?.noten) {
        lied.melodieId.noten.forEach(note => {
            if (note?.directus_files_id?.type) {
                const type = note.directus_files_id.type;
                if (type.includes('pdf')) fileTypes.add('PDF');
                else if (type.includes('audio')) fileTypes.add('Audio');
                else if (type.includes('image')) fileTypes.add('Image');
                else fileTypes.add('File');
            }
        });
    }

    return Array.from(fileTypes);
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return 'Invalid date';
    }
};

const toggleSortDirection = () => {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
};

const clearFilters = () => {
    searchQuery.value = "";
    selectedCategory.value = "";
    sortBy.value = "title";
    sortDirection.value = "asc";
};

// Initialize data on mount
onMounted(() => {
    fetchGesangbuchlieder();
});
</script>

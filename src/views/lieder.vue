<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Header -->
    <AppHeader
      page-title="Lieder"
      :show-back-button="true"
      :show-home-button="true"
      back-button-text="Zurück"
      back-to="/home"
    />

    <!-- Main Content -->
    <main class="container mx-auto py-8">
      <!-- Data Source Control -->
      <div
        v-if="gesangbuchlieder.length > 0"
        class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4"
      >
        <div class="flex items-center justify-between">
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
              <span v-if="isUsingCachedData">
                Showing offline songs ({{ gesangbuchlieder.length }} available).
              </span>
              <span v-else>
                Showing online songs ({{ gesangbuchlieder.length }} loaded).
              </span>
            </p>
          </div>

          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <Label for="data-source-switch" class="text-sm text-blue-800">
                {{ preferOfflineData ? "Offline" : "Online" }}
              </Label>
              <Switch
                id="data-source-switch"
                v-model:checked="preferOfflineData"
                @update:checked="handleDataSourceToggle"
                :disabled="isLoading"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <SongsSearchFilters
        v-model:search-query="searchQuery"
        v-model:selected-category="selectedCategory"
        v-model:sort-by="sortBy"
        :sort-direction="sortDirection"
        :available-categories="availableCategories"
        @toggle-sort-direction="toggleSortDirection"
        @clear-filters="clearFilters"
        class="mb-4"
      />

      <!-- Loading State -->
      <SongsLoadingState v-if="isLoading" />

      <!-- Error State -->
      <SongsErrorState
        v-else-if="queryError"
        :message="queryError"
        @retry="fetchGesangbuchlieder"
      />

      <!-- Results Grid -->
      <SongsGrid
        v-else-if="filteredLieder.length > 0"
        :lieder="filteredLieder"
        :total-count="gesangbuchlieder.length"
        :has-more="hasMore"
        :is-loading-more="isLoadingMore"
        @card-click="navigateToLied"
        @load-more="loadMore"
      />

      <!-- No Results -->
      <SongsEmptyState
        v-else-if="!isLoading && gesangbuchlieder.length === 0"
        @load-songs="fetchGesangbuchlieder"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useGesangbuchlied } from "@/composables/useGesangbuchlied";
import { useOfflineDownload } from "@/composables/useOfflineDownload";
import AppHeader from "@/components/AppHeader.vue";
import SongsSearchFilters from "@/components/songs/SearchFilters.vue";
import SongsLoadingState from "@/components/songs/LoadingState.vue";
import SongsErrorState from "@/components/songs/ErrorState.vue";
import SongsGrid from "@/components/songs/Grid.vue";
import SongsEmptyState from "@/components/songs/EmptyState.vue";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Gesangbuchlied } from "@/gql/graphql";

const router = useRouter();

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
const isUsingCachedData = ref(false);
const preferOfflineData = ref(true);

// Computed properties
const availableCategories = computed(() => {
  const categories = new Set<string>();
  gesangbuchlieder.value.forEach((lied) => {
    if (lied.kategorieId) {
      lied.kategorieId.forEach((kat) => {
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
    filtered = filtered.filter((lied) => {
      // Search in title
      if (lied.titel?.toLowerCase().includes(query)) return true;

      // Search in text content
      if (lied.textId?.strophenEinzeln) {
        const textContent = lied.textId.strophenEinzeln
          .map((strophe: any) => strophe?.strophe || "")
          .join(" ")
          .toLowerCase();
        if (textContent.includes(query)) return true;
      }

      // Search in authors
      const authors = getAuthors(lied);
      if (authors.some((author) => author.toLowerCase().includes(query)))
        return true;

      return false;
    });
  }

  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter((lied) => {
      if (!lied.kategorieId) return false;
      return lied.kategorieId.some(
        (kat) => kat?.kategorie_id?.name === selectedCategory.value
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
const fetchGesangbuchlieder = async (forceOnline = false) => {
  try {
    isLoading.value = true;
    queryError.value = null;

    const { getOfflineSongs } = useOfflineDownload();

    // If user prefers offline data (and not forcing online), try offline first
    if (preferOfflineData.value && !forceOnline) {
      const offlineSongs = await getOfflineSongs();
      console.log("offlineSongs", offlineSongs);

      if (offlineSongs.length > 0) {
        console.log(`Found ${offlineSongs.length} songs in IndexedDB`);
        gesangbuchlieder.value = offlineSongs;
        isUsingCachedData.value = true;
        hasMore.value = false; // IndexedDB contains all songs
        return;
      }
    }

    // If user prefers online data or no offline songs available, try API
    if (typeof window !== "undefined" && !navigator.onLine) {
      // Try offline as fallback if online isn't available
      const offlineSongs = await getOfflineSongs();
      if (offlineSongs.length > 0) {
        console.log(
          `Using offline songs as fallback (${offlineSongs.length} available)`
        );
        gesangbuchlieder.value = offlineSongs;
        isUsingCachedData.value = true;
        hasMore.value = false;
        return;
      }

      queryError.value =
        "No offline content available. Please go online to download songs for offline access.";
      return;
    }

    console.log("Fetching songs from API");
    const variables = {
      limit: currentLimit.value,
      offset: 0,
      filter: {
        status: { _eq: "published" },
      },
    };

    const { queryGesangbuchlied } = useGesangbuchlied();
    const result = await queryGesangbuchlied(variables);

    if (result) {
      gesangbuchlieder.value = result;
      isUsingCachedData.value = false;
      hasMore.value = result.length === currentLimit.value;
    } else {
      queryError.value = "No songs found.";
    }
  } catch (err) {
    console.error("Error fetching gesangbuchlieder:", err);

    // Try offline as fallback on API error
    const { getOfflineSongs } = useOfflineDownload();
    const offlineSongs = await getOfflineSongs();
    if (offlineSongs.length > 0) {
      console.log(
        `Using offline songs as fallback after API error (${offlineSongs.length} available)`
      );
      gesangbuchlieder.value = offlineSongs;
      isUsingCachedData.value = true;
      hasMore.value = false;
      return;
    }

    // Handle offline errors gracefully
    if (typeof window !== "undefined" && !navigator.onLine) {
      queryError.value =
        "No offline content available. Please connect to the internet or download songs for offline access.";
    } else {
      queryError.value =
        err instanceof Error ? err.message : "Unknown error occurred";
    }
  } finally {
    isLoading.value = false;
  }
};

const loadMore = async () => {
  try {
    isLoadingMore.value = true;

    // If we're using cached data, don't load more (IndexedDB contains all songs)
    if (isUsingCachedData.value) {
      hasMore.value = false;
      return;
    }

    // Only load more from API if we're using fresh data
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
  router.push(`/lied/${id}`);
};

const getAuthors = (lied: Gesangbuchlied): string[] => {
  const authors: string[] = [];

  // Text authors
  if (lied.textId?.autorId) {
    lied.textId.autorId.forEach((autorRel) => {
      if (autorRel?.autor_id) {
        const autor = autorRel.autor_id;
        const name = `${autor.vorname || ""} ${autor.nachname || ""}`.trim();
        if (name) authors.push(name);
      }
    });
  }

  // Melody authors
  if (lied.melodieId?.autorId) {
    lied.melodieId.autorId.forEach((autorRel) => {
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
    lied.melodieId.noten.forEach((note) => {
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
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
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

const handleDataSourceToggle = async (checked: boolean) => {
  preferOfflineData.value = checked;
  // Refetch data based on new preference
  await fetchGesangbuchlieder(!checked); // Force online if switching to online mode
};

// Initialize data on mount
onMounted(() => {
  fetchGesangbuchlieder();
});
</script>

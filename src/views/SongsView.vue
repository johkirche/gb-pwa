<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation Header -->
    <AppHeader
      :page-title="t('songs.pageTitle')"
      :show-back-button="true"
      :show-home-button="true"
      :back-button-text="t('songs.backButtonText')"
      back-to="/home"
    />

    <ScrollArea class="h-[calc(100vh-65px)]">
      <!-- Main Content -->
      <main class="container mx-auto py-8">
        <!-- Data Source Control -->
        <div
          v-if="shouldShowDataSourceControl"
          class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <InfoIcon class="w-4 h-4 text-blue-600" />
              <p class="text-sm text-blue-800">
                <span v-if="isUsingCachedData">
                  {{
                    t("songs.showingOfflineSongs", {
                      count: gesangbuchlieder.length,
                    })
                  }}
                </span>
                <span v-else>
                  {{
                    t("songs.showingOnlineSongs", {
                      count: gesangbuchlieder.length,
                    })
                  }}
                </span>
              </p>
            </div>

            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-2">
                <Label for="data-source-switch" class="text-sm text-blue-800">
                  {{
                    preferOfflineData ? t("songs.offline") : t("songs.online")
                  }}
                </Label>
                <Switch
                  id="data-source-switch"
                  v-model="preferOfflineData"
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
          v-model:selected-file-type="selectedFileType"
          v-model:show-favorites-only="showFavoritesOnly"
          v-model:sort-by="sortBy"
          :sort-direction="sortDirection"
          :available-categories="availableCategories"
          :available-file-types="availableFileTypes"
          class="mb-4"
          @toggle-sort-direction="toggleSortDirection"
          @clear-filters="clearFilters"
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
          :has-more="hasMore && !showFavoritesOnly"
          :is-loading-more="isLoadingMore"
          @card-click="navigateToLied"
          @load-more="loadMore"
        />

        <!-- No Favorites Yet -->
        <FavoritesEmptyState
          v-else-if="
            !isLoading && showFavoritesOnly && gesangbuchlieder.length > 0
          "
          @clear-favorites-filter="showFavoritesOnly = false"
        />

        <!-- No Results -->
        <SongsEmptyState
          v-else-if="!isLoading && gesangbuchlieder.length === 0"
          @load-songs="fetchGesangbuchlieder"
        />
      </main>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { InfoIcon } from "lucide-vue-next";

import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import type { Strophe } from "@/gql";
import type { Gesangbuchlied } from "@/gql/graphql";

import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

import AppHeader from "@/components/AppHeader.vue";
import SongsEmptyState from "@/components/songs/EmptyState.vue";
import SongsErrorState from "@/components/songs/ErrorState.vue";
import FavoritesEmptyState from "@/components/songs/FavoritesEmptyState.vue";
import SongsLoadingState from "@/components/songs/LoadingState.vue";
import SongsSearchFilters from "@/components/songs/SearchFilters.vue";
import SongsGrid from "@/components/songs/SongGrid.vue";

import { useFavorites } from "@/composables/useFavorites";
import { useGesangbuchlied } from "@/composables/useGesangbuchlied";
import { useOfflineDownload } from "@/composables/useOfflineDownload";
import { usePWA } from "@/composables/usePWA";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

// Composables
const { isInstalled: isPWAInstalled } = usePWA();
const { hasOfflineContent, checkOfflineContent } = useOfflineDownload();
const { favorites } = useFavorites();

// Reactive data
const gesangbuchlieder = ref<Gesangbuchlied[]>([]);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const queryError = ref<string | null>(null);
const searchQuery = ref("");
const selectedCategory = ref("");
const selectedFileType = ref("");
const sortBy = ref("title");
const sortDirection = ref<"asc" | "desc">("asc");
const currentLimit = ref(50);
const hasMore = ref(true);
const isUsingCachedData = ref(false);
const preferOfflineData = ref(true);
const showFavoritesOnly = ref(false);

// Computed properties
const shouldShowDataSourceControl = computed(() => {
  return (
    (hasOfflineContent.value || isPWAInstalled.value) &&
    gesangbuchlieder.value.length > 0
  );
});

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

const availableFileTypes = computed(() => {
  const fileTypes = new Set<string>();
  gesangbuchlieder.value.forEach((lied) => {
    // Check melody files
    if (lied.melodieId?.noten) {
      lied.melodieId.noten.forEach((note) => {
        if (note?.directus_files_id?.type) {
          const type = note.directus_files_id.type;
          if (type.includes("pdf")) fileTypes.add("PDF");
          else if (type.includes("audio")) fileTypes.add("Audio");
          else if (type.includes("image")) fileTypes.add("Image");
        }
      });
    }
  });
  return Array.from(fileTypes).sort();
});

const filteredLieder = computed(() => {
  let filtered = [...gesangbuchlieder.value];

  console.log("filteredLieder", filtered);

  // Favorites filter (apply first for better performance)
  if (showFavoritesOnly.value) {
    filtered = filtered.filter((lied) =>
      favorites.value.includes(lied.id || ""),
    );
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((lied) => {
      // Search in title
      if (lied.titel?.toLowerCase().includes(query)) return true;

      // Search in text content
      if (lied.textId?.strophenEinzeln) {
        const textContent = lied.textId.strophenEinzeln
          .map((strophe: Strophe) => strophe?.strophe || "")
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
        (kat) => kat?.kategorie_id?.name === selectedCategory.value,
      );
    });
  }

  // File type filter
  if (selectedFileType.value) {
    filtered = filtered.filter((lied) => {
      if (!lied.melodieId?.noten) return false;
      return lied.melodieId.noten.some((note) => {
        if (!note?.directus_files_id?.type) return false;
        const type = note.directus_files_id.type;

        switch (selectedFileType.value) {
          case "PDF":
            return type.includes("pdf");
          case "Audio":
            return type.includes("audio");
          case "Image":
            return type.includes("image");
          default:
            return false;
        }
      });
    });
  }

  // Sort
  filtered.sort((a, b) => {
    let valueA: string | number | Date | null;
    let valueB: string | number | Date | null;

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
const buildApiFilters = () => {
  const baseFilters = {
    status: { _eq: "published" },
    bewertungKleinerKreis: { rangfolge: { _eq: 5 } },
  };

  const dynamicFilters: Record<string, unknown>[] = [];

  // Add search filter if present (excluding JSON field search which isn't supported in GraphQL)
  if (searchQuery.value.trim()) {
    const searchTerm = searchQuery.value.trim();
    dynamicFilters.push({
      _or: [
        { titel: { _icontains: searchTerm } },
        {
          textId: {
            autorId: { autor_id: { vorname: { _icontains: searchTerm } } },
          },
        },
        {
          textId: {
            autorId: { autor_id: { nachname: { _icontains: searchTerm } } },
          },
        },
        {
          melodieId: {
            autorId: { autor_id: { vorname: { _icontains: searchTerm } } },
          },
        },
        {
          melodieId: {
            autorId: { autor_id: { nachname: { _icontains: searchTerm } } },
          },
        },
      ],
    });
  }

  // Add category filter if present
  if (selectedCategory.value) {
    dynamicFilters.push({
      kategorieId: { kategorie_id: { name: { _eq: selectedCategory.value } } },
    });
  }

  // Add file type filter if present
  if (selectedFileType.value) {
    let fileTypeFilter;
    switch (selectedFileType.value) {
      case "PDF":
        fileTypeFilter = {
          melodieId: {
            noten: { directus_files_id: { type: { _contains: "pdf" } } },
          },
        };
        break;
      case "Audio":
        fileTypeFilter = {
          melodieId: {
            noten: { directus_files_id: { type: { _contains: "audio" } } },
          },
        };
        break;
      case "Image":
        fileTypeFilter = {
          melodieId: {
            noten: { directus_files_id: { type: { _contains: "image" } } },
          },
        };
        break;
    }
    if (fileTypeFilter) {
      dynamicFilters.push(fileTypeFilter);
    }
  }

  // Combine base filters with dynamic filters
  if (dynamicFilters.length > 0) {
    return {
      _and: [baseFilters, ...dynamicFilters],
    };
  }

  return baseFilters;
};

const fetchGesangbuchlieder = async (forceOnline = false) => {
  try {
    console.log("fetchGesangbuchlieder called with forceOnline:", forceOnline);
    console.log("preferOfflineData.value:", preferOfflineData.value);
    isLoading.value = true;
    queryError.value = null;

    const { getOfflineSongs } = useOfflineDownload();

    // If user prefers offline data (and not forcing online), try offline first
    if (preferOfflineData.value && !forceOnline) {
      console.log("Trying offline data first...");
      const offlineSongs = await getOfflineSongs();
      console.log("offlineSongs", offlineSongs);

      if (offlineSongs.length > 0) {
        console.log(`Found ${offlineSongs.length} songs in IndexedDB`);
        gesangbuchlieder.value = offlineSongs;
        isUsingCachedData.value = true;
        hasMore.value = false; // IndexedDB contains all songs
        return;
      }
    } else {
      console.log("Skipping offline data, going straight to API...");
    }

    // If user prefers online data or no offline songs available, try API
    if (typeof window !== "undefined" && !navigator.onLine) {
      // Try offline as fallback if online isn't available
      const offlineSongs = await getOfflineSongs();
      if (offlineSongs.length > 0) {
        console.log(
          `Using offline songs as fallback (${offlineSongs.length} available)`,
        );
        gesangbuchlieder.value = offlineSongs;
        isUsingCachedData.value = true;
        hasMore.value = false;
        return;
      }

      queryError.value = t("songs.noOfflineContentAvailable");
      return;
    }

    console.log("Fetching songs from API");
    // Map sort fields to actual database column names
    const sortFieldMap: Record<string, string> = {
      title: "titel",
      date_updated: "date_updated",
      liednummer2000: "liednummer2000",
    };
    const dbSortField = sortFieldMap[sortBy.value] || sortBy.value;
    const sortField =
      sortDirection.value === "desc" ? `-${dbSortField}` : dbSortField;
    const variables = {
      limit: currentLimit.value,
      offset: 0,
      filter: buildApiFilters(),
      sort: [sortField],
    };

    const { queryGesangbuchlied } = useGesangbuchlied();
    const result = await queryGesangbuchlied(variables);

    if (result) {
      console.log(`Loaded ${result.length} songs from API`);
      gesangbuchlieder.value = result;
      isUsingCachedData.value = false;
      hasMore.value = result.length === currentLimit.value;
      console.log("isUsingCachedData set to:", isUsingCachedData.value);
    } else {
      queryError.value = t("songs.noSongsFound");
    }
  } catch (err) {
    console.error("Error fetching gesangbuchlieder:", err);

    // Try offline as fallback on API error
    const { getOfflineSongs } = useOfflineDownload();
    const offlineSongs = await getOfflineSongs();
    if (offlineSongs.length > 0) {
      console.log(
        `Using offline songs as fallback after API error (${offlineSongs.length} available)`,
      );
      gesangbuchlieder.value = offlineSongs;
      isUsingCachedData.value = true;
      hasMore.value = false;
      return;
    }

    // Handle offline errors gracefully
    if (typeof window !== "undefined" && !navigator.onLine) {
      queryError.value = t("songs.noOfflineContentAvailableConnect");
    } else {
      queryError.value =
        err instanceof Error ? err.message : t("utils.unknownError");
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
    // Map sort fields to actual database column names
    const sortFieldMap: Record<string, string> = {
      title: "titel",
      date_updated: "date_updated",
      liednummer2000: "liednummer2000",
    };
    const dbSortField = sortFieldMap[sortBy.value] || sortBy.value;
    const sortField =
      sortDirection.value === "desc" ? `-${dbSortField}` : dbSortField;
    const variables = {
      limit: 50,
      offset: gesangbuchlieder.value.length,
      filter: buildApiFilters(),
      sort: [sortField],
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

const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
};

const clearFilters = () => {
  searchQuery.value = "";
  selectedCategory.value = "";
  selectedFileType.value = "";
  sortBy.value = "title";
  sortDirection.value = "asc";
  showFavoritesOnly.value = false;
  updateUrlFromFilters();
};

const updateUrlFromFilters = () => {
  const query: Record<string, string> = {};

  if (searchQuery.value) query.search = searchQuery.value;
  if (selectedCategory.value) query.category = selectedCategory.value;
  if (selectedFileType.value) query.fileType = selectedFileType.value;
  if (sortBy.value !== "title") query.sortBy = sortBy.value;
  if (sortDirection.value !== "asc") query.sortDirection = sortDirection.value;
  if (showFavoritesOnly.value) query.favoritesOnly = "true";

  router.replace({ query });
};

const applyUrlFilters = () => {
  // Apply filters from URL parameters
  const query = route.query;

  if (query.search) searchQuery.value = query.search as string;
  if (query.category) selectedCategory.value = query.category as string;
  if (query.categoryName) selectedCategory.value = query.categoryName as string; // Backward compatibility
  if (query.fileType) selectedFileType.value = query.fileType as string;
  if (query.sortBy) sortBy.value = query.sortBy as string;
  if (query.sortDirection)
    sortDirection.value = query.sortDirection as "asc" | "desc";
  if (query.favoritesOnly)
    showFavoritesOnly.value = query.favoritesOnly === "true";
};

// Watch for filter changes and update URL
watch(
  [
    searchQuery,
    selectedCategory,
    selectedFileType,
    sortBy,
    sortDirection,
    showFavoritesOnly,
  ],
  () => {
    updateUrlFromFilters();
  },
  { deep: true },
);

// Watch for search and filter changes to refetch data
watch(
  [
    searchQuery,
    selectedCategory,
    selectedFileType,
    sortBy,
    sortDirection,
    showFavoritesOnly,
  ],
  async (newValues, oldValues) => {
    // Only refetch if we're not using cached data (IndexedDB)
    if (!isUsingCachedData.value) {
      // Skip refetching when switching to favorites-only mode online
      // Let the specific favorites watcher handle fetching missing favorites
      const [, , , , , newShowFavoritesOnly] = newValues;
      const [, , , , , oldShowFavoritesOnly] = oldValues || [];

      if (newShowFavoritesOnly && !oldShowFavoritesOnly && navigator.onLine) {
        console.log(
          "Skipping refetch - favorites watcher will handle missing favorites",
        );
        return;
      }

      await fetchGesangbuchlieder();
    }
  },
  { deep: true },
);

// Watch for changes to the data source preference
watch(preferOfflineData, async (newValue, oldValue) => {
  console.log("Data source preference changed:", oldValue, "->", newValue);
  console.log("Force online (forceOnline parameter):", !newValue);
  // Only refetch if the value actually changed (not on initial load)
  if (oldValue !== undefined && oldValue !== newValue) {
    await fetchGesangbuchlieder(!newValue); // Force online if switching to online mode
  }
});

// Watch for favorites filter changes to fetch missing favorites when online
watch(showFavoritesOnly, async (newValue, oldValue) => {
  // Only act when favorites filter is turned ON and we're online
  if (newValue && !oldValue && !isUsingCachedData.value && navigator.onLine) {
    await fetchMissingFavorites();
  }
});

// Function to fetch any favorited songs that aren't currently loaded
const fetchMissingFavorites = async () => {
  try {
    const currentlyLoadedIds = new Set(
      gesangbuchlieder.value.map((lied) => lied.id).filter(Boolean),
    );
    const missingFavoriteIds = favorites.value.filter(
      (id) => !currentlyLoadedIds.has(id),
    );

    if (missingFavoriteIds.length > 0) {
      console.log(
        `Fetching ${missingFavoriteIds.length} missing favorite songs:`,
        missingFavoriteIds,
      );

      const { queryGesangbuchliedByIds } = useGesangbuchlied();
      const missingFavorites =
        await queryGesangbuchliedByIds(missingFavoriteIds);

      if (missingFavorites.length > 0) {
        // Add the missing favorites to the main array
        gesangbuchlieder.value = [
          ...gesangbuchlieder.value,
          ...missingFavorites,
        ];
        console.log(
          `Added ${missingFavorites.length} missing favorite songs to the list`,
        );
      }
    }
  } catch (error) {
    console.error("Error fetching missing favorites:", error);
  }
};

// Watch for route changes to update filters
watch(
  () => route.query,
  () => {
    applyUrlFilters();
  },
  { immediate: false },
);

// Initialize data on mount
onMounted(async () => {
  await checkOfflineContent();
  applyUrlFilters(); // Apply URL filters before fetching data
  await fetchGesangbuchlieder();

  // Check if we need to fetch missing favorites after initial load
  if (showFavoritesOnly.value && !isUsingCachedData.value && navigator.onLine) {
    await fetchMissingFavorites();
  }
});
</script>

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
                      count: lieder.length,
                    })
                  }}
                </span>
                <span v-else>
                  {{
                    t("songs.showingOnlineSongs", {
                      count: lieder.length,
                    })
                  }}
                </span>
              </p>
            </div>

            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-2">
                <Label for="data-source-switch" class="text-sm text-blue-800">
                  {{ preferOfflineData ? t("songs.offline") : t("songs.online") }}
                </Label>
                <Switch id="data-source-switch" v-model="preferOfflineData" :disabled="isLoading" />
              </div>
            </div>
          </div>
        </div>

        <!-- Search and Filter Section -->
        <SongsSearchFilters
          v-model:search-query="filters.searchQuery"
          v-model:selected-category="filters.selectedCategory"
          v-model:selected-file-type="filters.selectedFileType"
          v-model:show-favorites-only="filters.showFavoritesOnly"
          v-model:sort-by="filters.sortBy"
          :sort-direction="filters.sortDirection"
          :available-categories="availableCategories"
          :available-file-types="availableFileTypes"
          class="mb-4"
          @toggle-sort-direction="toggleSortDirection"
          @clear-filters="clearFilters"
        />

        <!-- Loading State -->
        <SongsLoadingState v-if="isLoading" />

        <!-- Error State -->
        <SongsErrorState v-else-if="error" :message="error" @retry="fetchLieder" />

        <!-- Results Grid -->
        <SongsGrid
          v-else-if="filteredLieder.length > 0"
          :lieder="filteredLieder"
          :total-count="lieder.length"
          :has-more="hasMore && !filters.showFavoritesOnly"
          :is-loading-more="isLoadingMore"
          @card-click="navigateToLied"
          @load-more="loadMore"
        />

        <!-- No Favorites Yet -->
        <FavoritesEmptyState
          v-else-if="!isLoading && filters.showFavoritesOnly && lieder.length > 0"
          @clear-favorites-filter="() => setFilter('showFavoritesOnly', false)"
        />

        <!-- No Results -->
        <SongsEmptyState v-else-if="!isLoading && lieder.length === 0" @load-songs="fetchLieder" />
      </main>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";
import { InfoIcon } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import { computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

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

import { useOfflineDownload } from "@/composables/useOfflineDownload";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

// Store
const store = useGesangbuchliedStore();
const {
  lieder,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  isUsingCachedData,
  preferOfflineData,
  filters,
  shouldShowDataSourceControl,
  availableCategories,
  availableFileTypes,
  filteredLieder,
} = storeToRefs(store);

// Destructure store state and actions
const {
  fetchLieder,
  loadMore,
  fetchMissingFavorites,
  setFilter,
  clearFilters,
  toggleSortDirection,
  setPreferOfflineData,
} = store;

// Composables
const { checkOfflineContent } = useOfflineDownload();

// Computed
const preferOfflineDataModel = computed({
  get: () => preferOfflineData,
  set: (value: boolean) => {
    setPreferOfflineData(value);
  },
});

// Methods
const navigateToLied = (id: string) => {
  router.push(`/lied/${id}`);
};

const updateUrlFromFilters = () => {
  const query: Record<string, string> = {};

  if (filters.value.searchQuery) query.search = filters.value.searchQuery;
  if (filters.value.selectedCategory) query.category = filters.value.selectedCategory;
  if (filters.value.selectedFileType) query.fileType = filters.value.selectedFileType;
  if (filters.value.sortBy !== "title") query.sortBy = filters.value.sortBy;
  if (filters.value.sortDirection !== "asc") query.sortDirection = filters.value.sortDirection;
  if (filters.value.showFavoritesOnly) query.favoritesOnly = "true";

  router.replace({ query });
};

const applyUrlFilters = () => {
  // Apply filters from URL parameters
  const query = route.query;

  if (query.search) setFilter("searchQuery", query.search as string);
  if (query.category) setFilter("selectedCategory", query.category as string);
  if (query.categoryName) setFilter("selectedCategory", query.categoryName as string); // Backward compatibility
  if (query.fileType) setFilter("selectedFileType", query.fileType as string);
  if (query.sortBy) setFilter("sortBy", query.sortBy as string);
  if (query.sortDirection) setFilter("sortDirection", query.sortDirection as "asc" | "desc");
  if (query.favoritesOnly) setFilter("showFavoritesOnly", query.favoritesOnly === "true");
};

// Watch for filter changes and update URL
watch(
  [
    () => filters.value.searchQuery,
    () => filters.value.selectedCategory,
    () => filters.value.selectedFileType,
    () => filters.value.sortBy,
    () => filters.value.sortDirection,
    () => filters.value.showFavoritesOnly,
  ],
  () => {
    updateUrlFromFilters();
  },
  { deep: true },
);

// Watch for search and filter changes to refetch data
watch(
  [
    () => filters.value.searchQuery,
    () => filters.value.selectedCategory,
    () => filters.value.selectedFileType,
    () => filters.value.sortBy,
    () => filters.value.sortDirection,
    () => filters.value.showFavoritesOnly,
  ],
  async (newValues, oldValues) => {
    // Only refetch if we're not using cached data (IndexedDB)
    if (!isUsingCachedData) {
      // Skip refetching when switching to favorites-only mode online
      // Let the specific favorites watcher handle fetching missing favorites
      const [, , , , , newShowFavoritesOnly] = newValues;
      const [, , , , , oldShowFavoritesOnly] = oldValues || [];

      if (newShowFavoritesOnly && !oldShowFavoritesOnly && navigator.onLine) {
        console.log("Skipping refetch - favorites watcher will handle missing favorites");
        return;
      }

      await fetchLieder();
    }
  },
  { deep: true },
);

// Watch for changes to the data source preference
watch(preferOfflineDataModel, async (newValue, oldValue) => {
  console.log("Data source preference changed:", oldValue, "->", newValue);
  console.log("Force online (forceOnline parameter):", !newValue);
  // Only refetch if the value actually changed (not on initial load)
  if (oldValue !== undefined && oldValue !== newValue) {
    await fetchLieder(!newValue); // Force online if switching to online mode
  }
});

// Watch for favorites filter changes to fetch missing favorites when online
watch(
  () => filters.value.showFavoritesOnly,
  async (newValue, oldValue) => {
    // Only act when favorites filter is turned ON and we're online
    if (newValue && !oldValue && !isUsingCachedData && navigator.onLine) {
      await fetchMissingFavorites();
    }
  },
);

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
  await fetchLieder();

  // Check if we need to fetch missing favorites after initial load
  if (filters.value.showFavoritesOnly && !isUsingCachedData && navigator.onLine) {
    await fetchMissingFavorites();
  }
});
</script>

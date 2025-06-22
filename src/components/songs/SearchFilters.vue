<template>
  <Card>
    <CardHeader
      class="flex flex-col sm:flex-row sm:gap-6 items-start sm:items-center justify-between space-y-2 sm:space-y-0"
    >
      <CardTitle class="flex items-center text-nowrap">
        <Search class="w-5 h-5 mr-2 text-muted-foreground" />
        {{ t("songs.searchAndFilter") }}
      </CardTitle>
      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <!-- Favorites Filter Toggle -->
        <Button
          :variant="showFavoritesOnly ? 'default' : 'outline'"
          size="sm"
          class="flex items-center"
          @click="$emit('update:showFavoritesOnly', !showFavoritesOnly)"
        >
          <Heart
            :class="[
              'w-4 h-4',
              showFavoritesOnly ? 'fill-current' : '',
              'sm:mr-2',
            ]"
          />
          <span class="hidden sm:inline">{{ t("songs.favorites") }}</span>
          <Badge
            v-if="favoritesCount > 0"
            variant="secondary"
            class="ml-2 text-xs"
          >
            {{ favoritesCount }}
          </Badge>
        </Button>

        <!-- Sort By Button (cycling) -->
        <Button
          variant="outline"
          size="sm"
          class="flex items-center"
          @click="cycleSortBy"
        >
          <component :is="currentSortIcon" class="w-4 h-4 sm:mr-2" />
          <span class="hidden sm:inline">{{ currentSortLabel }}</span>
        </Button>

        <!-- Sort Direction -->
        <Button
          variant="outline"
          size="sm"
          class="flex items-center"
          @click="$emit('toggleSortDirection')"
        >
          <ArrowUpDown class="w-4 h-4 sm:mr-2" />
          <span class="hidden sm:inline">
            {{
              sortDirection === "asc"
                ? t("songs.ascending")
                : t("songs.descending")
            }}
          </span>
        </Button>

        <!-- spreader on mobile -->
        <div class="flex-1 md:hidden"></div>

        <!-- Advanced Filters Toggle -->
        <Button
          variant="outline"
          size="sm"
          class="flex items-center"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <Filter class="w-4 h-4 sm:mr-2" />
          <span class="hidden sm:inline">{{ t("songs.filters") }}</span>
        </Button>

        <!-- Clear Filters -->
        <Button
          v-if="filterIsActive"
          variant="outline"
          size="sm"
          class="flex items-center"
          @click="$emit('clearFilters')"
        >
          <X class="w-4 h-4 sm:mr-2" />
          <span class="hidden sm:inline">{{ t("songs.clear") }}</span>
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div class="space-y-2">
        <!-- Search Input -->
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
          />
          <Input
            :model-value="searchQuery"
            :placeholder="t('songs.searchPlaceholder')"
            class="pl-10"
            @update:model-value="$emit('update:searchQuery', $event as string)"
          />
        </div>

        <!-- Advanced Filters (Collapsible) -->
        <div
          v-if="showAdvancedFilters"
          class="flex flex-col sm:flex-row flex-wrap gap-4 pt-4 border-t border-border"
        >
          <!-- Category Filter -->
          <div
            class="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 min-w-0"
          >
            <Label
              for="category-filter"
              class="text-sm font-medium whitespace-nowrap hidden sm:block"
              >{{ t("songs.category") }}</Label
            >
            <select
              id="category-filter"
              :value="selectedCategory"
              class="w-full sm:w-auto min-w-0 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring truncate"
              @change="
                $emit(
                  'update:selectedCategory',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="">{{ t("songs.allCategories") }}</option>
              <option
                v-for="category in availableCategories"
                :key="category"
                :value="category"
                class="truncate"
              >
                {{ category }}
              </option>
            </select>
          </div>

          <!-- File Type Filter -->
          <div
            class="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 min-w-0 flex-1"
          >
            <Label
              for="file-type-filter"
              class="text-sm font-medium whitespace-nowrap hidden sm:block"
              >{{ t("songs.fileType") }}</Label
            >
            <select
              id="file-type-filter"
              :value="selectedFileType"
              class="w-full sm:w-auto min-w-0 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring truncate"
              @change="
                $emit(
                  'update:selectedFileType',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="">{{ t("songs.allFileTypes") }}</option>
              <option
                v-for="fileType in availableFileTypes"
                :key="fileType"
                :value="fileType"
                class="truncate"
              >
                {{ fileType }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import {
  ArrowUpDown,
  Calendar,
  Filter,
  Hash,
  Heart,
  Search,
  Type,
  X,
} from "lucide-vue-next";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useFavorites } from "@/composables/useFavorites";

const { t } = useI18n();
const { favoritesCount } = useFavorites();

// Local state for advanced filters visibility
const showAdvancedFilters = ref(false);

interface Props {
  searchQuery: string;
  selectedCategory: string;
  selectedFileType: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
  availableCategories: string[];
  availableFileTypes: string[];
  showFavoritesOnly: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:searchQuery": [value: string];
  "update:selectedCategory": [value: string];
  "update:selectedFileType": [value: string];
  "update:sortBy": [value: string];
  "update:showFavoritesOnly": [value: boolean];
  toggleSortDirection: [];
  clearFilters: [];
}>();

// Sort options configuration
const sortOptions = [
  { key: "title", icon: Type, labelKey: "songs.title" },
  { key: "date_updated", icon: Calendar, labelKey: "songs.dateUpdated" },
  { key: "liednummer2000", icon: Hash, labelKey: "songs.liedNumber" },
];

// Current sort option computed properties
const currentSortIndex = computed(() =>
  sortOptions.findIndex((option) => option.key === props.sortBy),
);

const currentSortOption = computed(
  () => sortOptions[currentSortIndex.value] || sortOptions[0],
);

const currentSortIcon = computed(() => currentSortOption.value.icon);
const currentSortLabel = computed(() => t(currentSortOption.value.labelKey));

// Cycle through sort options
const cycleSortBy = () => {
  const nextIndex = (currentSortIndex.value + 1) % sortOptions.length;
  const nextSortBy = sortOptions[nextIndex].key;
  emit("update:sortBy", nextSortBy);
};

const filterIsActive = computed(() => {
  return (
    props.searchQuery ||
    props.selectedCategory ||
    props.selectedFileType ||
    props.showFavoritesOnly
  );
});
</script>

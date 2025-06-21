<template>
  <Card>
    <CardHeader
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0"
    >
      <CardTitle class="flex items-center">
        <Search class="w-5 h-5 mr-2 text-muted-foreground" />
        Search & Filter
      </CardTitle>
      <div class="flex flex-wrap items-center gap-2">
        <!-- Sort Direction -->
        <Button
          variant="outline"
          size="sm"
          class="flex items-center"
          @click="$emit('toggleSortDirection')"
        >
          <ArrowUpDown class="w-4 h-4 mr-2" />
          {{ sortDirection === "asc" ? "Ascending" : "Descending" }}
        </Button>

        <!-- Clear Filters -->
        <Button
          variant="outline"
          size="sm"
          class="flex items-center"
          @click="$emit('clearFilters')"
        >
          <X class="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <!-- Search Input -->
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
          />
          <Input
            :model-value="searchQuery"
            placeholder="Search by title, author, or text..."
            class="pl-10"
            @update:model-value="$emit('update:searchQuery', $event as string)"
          />
        </div>

        <!-- Filters Row -->
        <div class="flex flex-wrap gap-4">
          <!-- Category Filter -->
          <div class="flex items-center space-x-2">
            <Label for="category-filter">Category:</Label>
            <select
              id="category-filter"
              :value="selectedCategory"
              class="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              @change="
                $emit(
                  'update:selectedCategory',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="">All Categories</option>
              <option
                v-for="category in availableCategories"
                :key="category"
                :value="category"
              >
                {{ category }}
              </option>
            </select>
          </div>

          <!-- Sort Options -->
          <div class="flex items-center space-x-2">
            <Label for="sort-by">Sort by:</Label>
            <select
              id="sort-by"
              :value="sortBy"
              class="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              @change="
                $emit(
                  'update:sortBy',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option value="title">Title</option>
              <option value="date_updated">Date Updated</option>
              <option value="liednummer2000">Lied Number</option>
            </select>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ArrowUpDown, Search, X } from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
  availableCategories: string[];
}

defineProps<Props>();

defineEmits<{
  "update:searchQuery": [value: string];
  "update:selectedCategory": [value: string];
  "update:sortBy": [value: string];
  toggleSortDirection: [];
  clearFilters: [];
}>();
</script>

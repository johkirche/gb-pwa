<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("home.categories.title") }}</CardTitle>
      <CardDescription>{{ t("home.categories.description") }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Button
          v-for="category in categories"
          :key="category.id"
          variant="outline"
          class="h-auto p-4 flex flex-col items-center space-y-2"
          @click="handleCategoryClick(category)"
        >
          <span class="text-2xl">{{ category.icon }}</span>
          <span class="text-sm">{{ category.name }}</span>
          <Badge variant="secondary" class="text-xs">{{
            category.count
          }}</Badge>
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const { t } = useI18n();

export interface Category {
  id: number;
  name: string;
  icon: string;
  count: number;
}

defineProps<{
  categories: Category[];
}>();

const emit = defineEmits<{
  categoryClick: [category: Category];
}>();

const handleCategoryClick = (category: Category) => {
  emit("categoryClick", category);
};
</script>

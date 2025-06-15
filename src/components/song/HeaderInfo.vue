<template>
  <Card>
    <CardHeader>
      <div class="flex justify-between items-start">
        <div class="space-y-2">
          <CardTitle class="text-3xl">{{ lied.titel }}</CardTitle>
          <div class="flex flex-wrap gap-2" v-if="categories.length">
            <Badge
              v-for="category in categories"
              :key="category"
              variant="secondary"
            >
              <Tag class="w-3 h-3 mr-1" />
              {{ category }}
            </Badge>
          </div>
        </div>
        <div class="text-right text-sm text-muted-foreground">
          <p v-if="lied.liednummer2000">Song #{{ lied.liednummer2000 }}</p>
          <p>Updated: {{ formatDate(lied.date_updated) }}</p>
        </div>
      </div>
    </CardHeader>
  </Card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag } from "lucide-vue-next";
import type { Gesangbuchlied } from "@/gql/graphql";

interface Props {
  lied: Gesangbuchlied;
}

const props = defineProps<Props>();

const categories = computed(() => getCategories(props.lied));

const getCategories = (lied: Gesangbuchlied): string[] => {
  if (!lied.kategorieId) return [];

  return lied.kategorieId
    .map((kat) => kat?.kategorie_id?.name)
    .filter(Boolean) as string[];
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
};
</script>

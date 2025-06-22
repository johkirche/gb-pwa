<template>
  <Card>
    <CardContent>
      <div class="flex flex-col">
        <h2 class="text-lg font-semibold mb-2">
          {{ t("home.search.title") }}
        </h2>
        <div class="flex space-x-2">
          <Input
            v-model="searchQuery"
            :placeholder="t('home.search.placeholder')"
            class="flex-1"
            @keydown.enter="handleSearch"
          />
          <Button @click="handleSearch">
            {{ t("home.search.button") }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const { t } = useI18n();
const router = useRouter();
const searchQuery = ref("");

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      name: "songs",
      query: { search: searchQuery.value.trim() },
    });
  } else {
    // If empty search, just go to songs page without filter
    router.push({ name: "songs" });
  }
};
</script>

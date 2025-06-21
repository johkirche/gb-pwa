<template>
  <Card>
    <CardContent>
      <div class="flex flex-col">
        <h2 class="text-lg font-semibold">{{ t("home.search.title") }}</h2>
        <div class="flex space-x-2">
          <Input
            v-model="searchQuery"
            :placeholder="t('home.search.placeholder')"
            class="flex-1"
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

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const { t } = useI18n();
const searchQuery = ref("");

const emit = defineEmits<{
  search: [query: string];
}>();

const handleSearch = () => {
  emit("search", searchQuery.value);
};
</script>

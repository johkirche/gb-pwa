<template>
  <Card class="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
    <CardContent class="py-6">
      <div class="flex items-center text-red-800 dark:text-red-300">
        <AlertCircle class="w-5 h-5 mr-2" />
        <span class="font-medium">{{
          title || t("songs.errorLoadingSongs")
        }}</span>
      </div>
      <p class="text-red-600 dark:text-red-400 text-sm mt-2">{{ message }}</p>
      <Button
        variant="destructive"
        size="sm"
        class="mt-4"
        @click="$emit('retry')"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        {{ retryButtonText || t("songs.retry") }}
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { AlertCircle, RefreshCw } from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();

interface Props {
  title?: string;
  message: string;
  retryButtonText?: string;
}

defineProps<Props>();

defineEmits<{
  retry: [];
}>();
</script>

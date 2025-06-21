<template>
  <Card class="border-red-200 bg-red-50">
    <CardContent class="py-6">
      <div class="flex items-center text-red-800">
        <AlertCircle class="w-5 h-5 mr-2" />
        <span class="font-medium">{{ t("song.errorLoadingSong") }}</span>
      </div>
      <p class="text-red-600 text-sm mt-2">{{ error }}</p>
      <Button
        variant="destructive"
        size="sm"
        class="mt-4"
        @click="$emit('retry')"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        {{ t("song.retry") }}
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
  error: string;
}

defineProps<Props>();
defineEmits<{
  retry: [];
}>();
</script>

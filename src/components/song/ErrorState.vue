<template>
  <Card class="border-red-200 bg-red-50">
    <CardContent class="py-6">
      <div class="flex items-center text-red-800">
        <AlertCircle class="w-5 h-5 mr-2" />
        <span class="font-medium">Error loading song</span>
      </div>
      <p class="text-red-600 text-sm mt-2">{{ error }}</p>
      <Button
        @click="$emit('retry')"
        variant="destructive"
        size="sm"
        class="mt-4"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        Retry
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-vue-next";

interface Props {
  error: string;
}

defineProps<Props>();
defineEmits<{
  retry: [];
}>();
</script>

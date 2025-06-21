<template>
  <Card class="text-center py-12">
    <CardContent>
      <Music class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-2">{{ title }}</h3>
      <p class="text-muted-foreground mb-4">{{ description }}</p>
      <Button v-if="showLoadButton" @click="$emit('loadSongs')">
        <RefreshCw class="w-4 h-4 mr-2" />
        {{ loadButtonText }}
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Music, RefreshCw } from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  title?: string;
  description?: string;
  showLoadButton?: boolean;
  loadButtonText?: string;
}

withDefaults(defineProps<Props>(), {
  title: "No songs found",
  description: "There are no songs available or they haven't been loaded yet.",
  showLoadButton: true,
  loadButtonText: "Load Songs",
});

defineEmits<{
  loadSongs: [];
}>();
</script>

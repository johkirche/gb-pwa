<template>
  <Card class="text-center py-12">
    <CardContent>
      <Music class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-2">
        {{ title || t("songs.noSongsFound") }}
      </h3>
      <p class="text-muted-foreground mb-4">
        {{ description || t("songs.noSongsDescription") }}
      </p>
      <Button v-if="showLoadButton" @click="$emit('loadSongs')">
        <RefreshCw class="w-4 h-4 mr-2" />
        {{ loadButtonText || t("songs.loadSongs") }}
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Music, RefreshCw } from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();

interface Props {
  title?: string;
  description?: string;
  showLoadButton?: boolean;
  loadButtonText?: string;
}

withDefaults(defineProps<Props>(), {
  showLoadButton: true,
});

defineEmits<{
  loadSongs: [];
}>();
</script>

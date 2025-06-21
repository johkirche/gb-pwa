<template>
  <div class="text-center py-12">
    <div
      class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
    ></div>
    <p class="text-muted-foreground">
      {{ message || t("songs.loadingSongs") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface Props {
  message?: string;
}

defineProps<Props>();
</script>

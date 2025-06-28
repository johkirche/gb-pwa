<template>
  <div class="flex items-center p-4 bg-muted rounded-lg">
    <component :is="icon" class="w-5 h-5 text-muted-foreground mr-3" />
    <div>
      <p class="text-sm font-medium text-muted-foreground">
        {{ label }}
      </p>
      <p class="text-sm" :class="{ 'font-mono': monospace }">{{ value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: Function,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  monospace: {
    type: Boolean,
    default: false,
  },
});
</script>

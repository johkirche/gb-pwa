<script setup lang="ts">
import { X } from "lucide-vue-next";
import {
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from "reka-ui";

import { useI18n } from "vue-i18n";

import { useToast } from "@/composables/useToast";
import { cn } from "@/lib/utils";

// Long enough to be read on a tablet propped on an organ console mid-service.
const TOAST_DURATION_MS = 6000;

const { t } = useI18n();
const { toasts, dismiss } = useToast();

function onOpenChange(open: boolean, id: number) {
  if (!open) dismiss(id);
}
</script>

<template>
  <ToastProvider :duration="TOAST_DURATION_MS" swipe-direction="right">
    <ToastRoot
      v-for="item in toasts"
      :key="item.id"
      data-slot="toast"
      :class="
        cn(
          'pointer-events-auto grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 rounded-lg border p-4 shadow-lg',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
          item.variant === 'destructive'
            ? 'border-destructive/50 bg-card text-destructive'
            : 'bg-card text-card-foreground',
        )
      "
      @update:open="(open: boolean) => onOpenChange(open, item.id)"
    >
      <ToastTitle class="text-sm font-semibold">
        {{ t(item.titleKey, item.params) }}
      </ToastTitle>
      <ToastClose
        class="row-span-2 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
        :aria-label="t('utils.close')"
      >
        <X class="h-4 w-4" />
      </ToastClose>
      <ToastDescription class="text-sm text-muted-foreground">
        {{ t(item.descriptionKey, item.params) }}
      </ToastDescription>
    </ToastRoot>

    <ToastViewport
      class="fixed bottom-0 right-0 z-100 flex max-h-screen w-full max-w-sm flex-col gap-2 p-4 outline-none"
    />
  </ToastProvider>
</template>

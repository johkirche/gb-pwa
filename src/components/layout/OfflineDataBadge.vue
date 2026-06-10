<template>
  <!-- Shown wherever the app reads the catalogue from the local download instead
       of the server, so it's always clear the list/search only covers downloaded
       songs. Hidden when working against the live server. -->
  <TooltipProvider v-if="isUsingCachedData" :delay-duration="150">
    <Tooltip>
      <TooltipTrigger as-child>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/90 text-muted-foreground px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm cursor-help"
        >
          <DownloadCloud class="w-3.5 h-3.5 shrink-0" />
          <span class="truncate">{{ t("utils.offlineDataBadge") }}</span>
          <span class="sr-only">{{ t("utils.offlineDataHint") }}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" class="max-w-[16rem] text-center">
        {{ t("utils.offlineDataHint") }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";
import { DownloadCloud } from "lucide-vue-next";
import { storeToRefs } from "pinia";

import { useI18n } from "vue-i18n";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const { t } = useI18n();
const { isUsingCachedData } = storeToRefs(useGesangbuchliedStore());
</script>

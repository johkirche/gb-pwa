<template>
  <!-- Update banner: fixed under the phone's status bar, above every route. -->
  <div
    v-if="needRefresh"
    role="status"
    aria-live="polite"
    class="fixed inset-x-0 top-0 z-50 bg-primary text-primary-foreground shadow-lg"
    :style="{ paddingTop: 'env(safe-area-inset-top, 0px)' }"
  >
    <div class="container mx-auto flex items-center justify-between gap-3 p-3">
      <div class="flex min-w-0 items-center gap-2">
        <RefreshCw class="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <span class="text-sm font-medium">{{ t("utils.pwaUpdate.available") }}</span>
      </div>
      <div class="flex flex-shrink-0 items-center gap-1">
        <Button variant="secondary" size="sm" @click="applyUpdate">
          {{ t("utils.pwaUpdate.reload") }}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          :aria-label="t('utils.pwaUpdate.dismiss')"
          @click="dismissUpdate"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw, X } from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";

import { usePwaUpdate } from "@/composables/usePwaUpdate";

const { t } = useI18n();
const { needRefresh, applyUpdate, dismissUpdate } = usePwaUpdate();
</script>

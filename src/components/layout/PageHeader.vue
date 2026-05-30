<template>
  <div class="flex items-center gap-2 sm:gap-3 min-w-0">
    <!-- Back button: navigates "up" to the nearest parent crumb. -->
    <Button
      v-if="backTarget"
      variant="ghost"
      size="icon"
      class="shrink-0 -ml-2 h-8 w-8 text-muted-foreground hover:text-foreground"
      :title="t('nav.back')"
      @click="goBack"
    >
      <ArrowLeft class="h-4 w-4" />
      <span class="sr-only">{{ t("nav.back") }}</span>
    </Button>

    <!-- Breadcrumb trail. Last item is the current page (not a link). -->
    <nav :aria-label="t('nav.breadcrumb')" class="min-w-0">
      <ol class="flex items-center gap-1.5 text-sm">
        <li
          v-for="(item, i) in items"
          :key="i"
          class="flex items-center gap-1.5 min-w-0"
        >
          <ChevronRight
            v-if="i > 0"
            class="h-4 w-4 shrink-0 text-muted-foreground/50"
          />
          <RouterLink
            v-if="item.to && i < items.length - 1"
            :to="item.to"
            class="text-muted-foreground hover:text-foreground transition-colors truncate"
          >
            {{ item.label }}
          </RouterLink>
          <span
            v-else
            class="truncate"
            :class="
              i === items.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
            "
            :aria-current="i === items.length - 1 ? 'page' : undefined"
          >
            {{ item.label }}
          </span>
        </li>
      </ol>
    </nav>
  </div>
</template>

<script lang="ts">
import type { RouteLocationRaw } from "vue-router";

export interface BreadcrumbItem {
  /** Visible label. */
  label: string;
  /** Link target. Omit for the current (last) crumb. */
  to?: RouteLocationRaw;
}
</script>

<script setup lang="ts">
import { ArrowLeft, ChevronRight } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";

const props = defineProps<{
  /** Crumb trail from root to current page. */
  items: BreadcrumbItem[];
  /** Explicit back target. Defaults to the nearest parent crumb with a `to`. */
  backTo?: RouteLocationRaw;
}>();

const { t } = useI18n();
const router = useRouter();

// Where the back button goes: an explicit override, otherwise the nearest
// ancestor crumb that has a link. Hidden entirely when there is no parent.
const backTarget = computed<RouteLocationRaw | null>(() => {
  if (props.backTo) return props.backTo;
  for (let i = props.items.length - 2; i >= 0; i--) {
    const to = props.items[i]?.to;
    if (to) return to;
  }
  return null;
});

const goBack = () => {
  if (backTarget.value) router.push(backTarget.value);
};
</script>

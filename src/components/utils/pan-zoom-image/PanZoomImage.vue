<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="imageAlt || t('utils.panZoom.title')"
      class="fixed inset-0 z-[99999] bg-black flex items-center justify-center select-none"
      @click="handleBackgroundClick"
      @keydown="handleKeydown"
    >
      <!-- Close button -->
      <div class="absolute top-4 right-4 flex gap-2 z-[100000]">
        <Button
          ref="closeButton"
          class="text-black bg-white/60 hover:bg-white/80 rounded-full transition-colors"
          :aria-label="t('utils.panZoom.close')"
          @click.stop="closeModal"
        >
          <X class="w-6 h-6" aria-hidden="true" />
        </Button>
      </div>

      <!-- Zoom controls -->
      <div class="absolute top-4 left-4 flex flex-col gap-2 z-[100000]">
        <Button
          size="icon"
          class="text-black bg-white/60 hover:bg-white/80 rounded-full transition-colors"
          :aria-label="t('utils.panZoom.zoomIn')"
          @click.stop="zoomIn"
        >
          <Plus class="w-6 h-6" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          class="text-black bg-white/60 hover:bg-white/80 rounded-full transition-colors"
          :aria-label="t('utils.panZoom.zoomOut')"
          @click.stop="zoomOut"
        >
          <Minus class="w-6 h-6" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          class="text-black bg-white/60 hover:bg-white/80 rounded-full transition-colors"
          :aria-label="t('utils.panZoom.resetZoom')"
          @click.stop="resetZoom"
        >
          <RotateCcw class="w-6 h-6" aria-hidden="true" />
        </Button>
      </div>

      <!-- Zoom level indicator -->
      <div
        class="absolute bottom-4 left-4 text-black bg-white/60 px-3 py-1 rounded-full text-sm z-[100000]"
      >
        {{ Math.round(zoomLevel * 100) }}%
      </div>

      <!-- Instructions -->
      <div
        class="absolute bottom-4 right-4 text-black bg-white/60 px-3 py-1 rounded-full text-sm z-[100000]"
      >
        {{ t("utils.panZoom.instructions") }}
      </div>

      <!-- Image container -->
      <div
        ref="imageContainer"
        class="w-full h-full flex items-center justify-center overflow-hidden select-none"
      >
        <img
          v-if="imageSrc"
          ref="panZoomImage"
          :src="imageSrc"
          :alt="imageAlt"
          :style="{ width: 'auto', height: 'auto' }"
          class="max-w-full max-h-full object-contain"
          @error="handleImageError"
          @load="handleImageLoad"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Panzoom, {
  type PanzoomEventDetail,
  type PanzoomObject,
} from "@panzoom/panzoom";
import { Minus, Plus, RotateCcw, X } from "lucide-vue-next";

import { nextTick, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";

const props = defineProps<{
  isOpen: boolean;
  imageSrc: string;
  imageAlt?: string;
}>();

const emit = defineEmits<{
  "update:isOpen": [value: boolean];
  close: [];
  imageError: [event: Event];
  imageLoad: [event: Event];
}>();

// I18n
const { t } = useI18n();

// Panzoom instance and refs
const imageContainer = ref<HTMLElement | null>(null);
const panZoomImage = ref<HTMLElement | null>(null);
const overlay = ref<HTMLElement | null>(null);
const closeButton = ref<InstanceType<typeof Button> | null>(null);
let panzoomInstance: PanzoomObject | null = null;
const zoomLevel = ref(1);
// Handle of the pending initializePanzoom retry — cleared on close/unmount so
// an <img> that finishes loading after the modal closed cannot start a retry
// loop that survives the component (two null reads every 50 ms, forever).
let initRetryTimer: ReturnType<typeof setTimeout> | null = null;
// Where focus was before the overlay opened, restored on close.
let previouslyFocused: HTMLElement | null = null;

const closeModal = () => {
  emit("update:isOpen", false);
  emit("close");
};

const handleBackgroundClick = (event: MouseEvent) => {
  // Only close if clicking on the background (not the image)
  if (event.target === event.currentTarget) {
    closeModal();
  }
};

const handleImageError = (event: Event) => {
  console.error(
    "Pan-zoom image failed to load:",
    (event.target as HTMLImageElement).src,
  );
  emit("imageError", event);
};

const handleImageLoad = (event: Event) => {
  emit("imageLoad", event);
  // Initialize panzoom when the image is loaded
  nextTick(() => {
    initializePanzoom();
  });
};

// Panzoom functions
const scheduleInitRetry = () => {
  if (initRetryTimer !== null) clearTimeout(initRetryTimer);
  initRetryTimer = setTimeout(() => {
    initRetryTimer = null;
    initializePanzoom();
  }, 50);
};

const cancelInitRetry = () => {
  if (initRetryTimer !== null) {
    clearTimeout(initRetryTimer);
    initRetryTimer = null;
  }
};

const initializePanzoom = () => {
  // Only while open — a late image load after close must not start retrying.
  if (!props.isOpen) return;
  // Refs may not be mounted yet on the first call; retry until they are.
  if (!panZoomImage.value || !imageContainer.value) {
    scheduleInitRetry();
    return;
  }

  // Check if panZoomImage.value is actually a DOM element
  const imageEl = panZoomImage.value as HTMLElement;
  if (!imageEl || imageEl.nodeType !== 1) {
    scheduleInitRetry();
    return;
  }

  if (!panzoomInstance) {
    // Get the actual DOM element
    const imageElement = panZoomImage.value as HTMLElement;

    panzoomInstance = Panzoom(imageElement, {
      maxScale: 4,
      minScale: 0.5,
      startScale: 1,
      startX: 0,
      startY: 0,
      animate: true,
      duration: 200,
      easing: "ease-in-out",
      cursor: "move",
    });

    // Listen to panzoom events to update zoom level display
    imageElement.addEventListener("panzoomchange", (event: Event) => {
      zoomLevel.value = (event as CustomEvent<PanzoomEventDetail>).detail.scale;
    });

    // Enable mouse wheel zooming
    imageContainer.value.addEventListener(
      "wheel",
      (event) => {
        if (panzoomInstance) {
          panzoomInstance.zoomWithWheel(event);
        }
      },
      { passive: false },
    );

    // Reset zoom level to match panzoom's initial state
    zoomLevel.value = 1;
  }
};

const destroyPanzoom = () => {
  if (panzoomInstance) {
    panzoomInstance.destroy();
    panzoomInstance = null;
    zoomLevel.value = 1;
  }
};

const resetZoom = () => {
  if (panzoomInstance) {
    panzoomInstance.reset();
  }
};

const zoomIn = () => {
  if (panzoomInstance) {
    panzoomInstance.zoomIn();
  }
};

const zoomOut = () => {
  if (panzoomInstance) {
    panzoomInstance.zoomOut();
  }
};

// Handle escape key
const handleEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.isOpen) {
    closeModal();
  }
};

// Keep Tab inside the overlay: it is rendered outside the reka Dialog tree,
// so nothing else traps focus and the page behind the opaque layer would
// otherwise keep its full tab order.
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Tab" || !overlay.value) return;
  const focusable = Array.from(
    overlay.value.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex]:not([tabindex='-1'])"),
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (event.shiftKey && (active === first || !overlay.value.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

const focusClose = () => {
  const el = closeButton.value?.$el as HTMLElement | undefined;
  el?.focus();
};

// Watch for modal open/close
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      // Hide scrollbar when modal is open
      document.body.classList.add("pan-zoom-no-scroll");
      document.addEventListener("keydown", handleEscape);
      previouslyFocused = document.activeElement as HTMLElement | null;
      nextTick(focusClose);
    } else {
      // Remove no-scroll class and destroy panzoom
      document.body.classList.remove("pan-zoom-no-scroll");
      document.removeEventListener("keydown", handleEscape);
      cancelInitRetry();
      destroyPanzoom();
      previouslyFocused?.focus?.();
      previouslyFocused = null;
    }
  },
);

onUnmounted(() => {
  document.removeEventListener("keydown", handleEscape);
  document.body.classList.remove("pan-zoom-no-scroll");
  cancelInitRetry();
  destroyPanzoom();
});
</script>

<style>
/* Hide scrollbar when pan-zoom modal is open */
body.pan-zoom-no-scroll {
  overflow: hidden;
}

/* Prevent text selection and improve touch handling */
.select-none {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
</style>

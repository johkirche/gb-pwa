<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[99999] bg-black flex items-center justify-center select-none"
      @click="handleBackgroundClick"
    >
      <!-- Close button -->
      <div class="absolute top-4 right-4 flex gap-2 z-[100000]">
        <Button
          class="text-white !bg-black !bg-opacity-50 hover:!bg-opacity-70 rounded-full transition-colors"
          @click.stop="closeModal"
          aria-label="Close"
        >
          <X class="w-6 h-6" />
        </Button>
      </div>

      <!-- Zoom controls -->
      <div class="absolute top-4 left-4 flex flex-col gap-2 z-[100000]">
        <Button
          size="icon"
          class="text-white !bg-black !bg-opacity-50 hover:!bg-opacity-70 rounded-full transition-colors"
          @click.stop="zoomIn"
          aria-label="Zoom in"
        >
          <Plus class="w-6 h-6" />
        </Button>
        <Button
          size="icon"
          class="text-white !bg-black !bg-opacity-50 hover:!bg-opacity-70 rounded-full transition-colors"
          @click.stop="zoomOut"
          aria-label="Zoom out"
        >
          <Minus class="w-6 h-6" />
        </Button>
        <Button
          size="icon"
          class="text-white !bg-black !bg-opacity-50 hover:!bg-opacity-70 rounded-full transition-colors"
          @click.stop="resetZoom"
          aria-label="Reset zoom"
        >
          <RotateCcw class="w-6 h-6" />
        </Button>
      </div>

      <!-- Zoom level indicator -->
      <div
        class="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm z-[100000]"
      >
        {{ Math.round(zoomLevel * 100) }}%
      </div>

      <!-- Instructions -->
      <div
        class="absolute bottom-4 right-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm z-[100000]"
      >
        Scroll to zoom • Drag to pan
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
import { ref, onUnmounted, nextTick, watch } from "vue";
import { X, Plus, Minus, RotateCcw } from "lucide-vue-next";
import Panzoom from "@panzoom/panzoom";
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

// Panzoom instance and refs
const imageContainer = ref<HTMLElement | null>(null);
const panZoomImage = ref<HTMLElement | null>(null);
let panzoomInstance: any = null;
const zoomLevel = ref(1);

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
    (event.target as HTMLImageElement).src
  );
  emit("imageError", event);
};

const handleImageLoad = (event: Event) => {
  console.log("Pan-zoom image loaded, initializing panzoom...");
  emit("imageLoad", event);
  // Initialize panzoom when the image is loaded
  nextTick(() => {
    initializePanzoom();
  });
};

// Panzoom functions
const initializePanzoom = () => {
  if (!panZoomImage.value || !imageContainer.value) {
    console.log("Refs not ready, retrying in 50ms...");
    setTimeout(() => {
      initializePanzoom();
    }, 50);
    return;
  }

  // Check if panZoomImage.value is actually a DOM element
  const imageEl = panZoomImage.value as HTMLElement;
  if (!imageEl || imageEl.nodeType !== 1) {
    console.log("Still not a valid DOM element, retrying...");
    setTimeout(() => {
      initializePanzoom();
    }, 50);
    return;
  }

  if (!panzoomInstance) {
    // Get the actual DOM element
    const imageElement = panZoomImage.value as HTMLElement;
    console.log("Initializing panzoom for:", imageElement);

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
    imageElement.addEventListener("panzoomchange", (event: any) => {
      zoomLevel.value = event.detail.scale;
    });

    // Enable mouse wheel zooming
    imageContainer.value.addEventListener(
      "wheel",
      (event) => {
        if (panzoomInstance) {
          panzoomInstance.zoomWithWheel(event);
        }
      },
      { passive: false }
    );

    // Reset zoom level to match panzoom's initial state
    zoomLevel.value = 1;

    console.log("Panzoom initialized successfully");
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

// Watch for modal open/close
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      // Hide scrollbar when modal is open
      document.body.classList.add("pan-zoom-no-scroll");
      document.addEventListener("keydown", handleEscape);
    } else {
      // Remove no-scroll class and destroy panzoom
      document.body.classList.remove("pan-zoom-no-scroll");
      document.removeEventListener("keydown", handleEscape);
      destroyPanzoom();
    }
  }
);

onUnmounted(() => {
  document.removeEventListener("keydown", handleEscape);
  document.body.classList.remove("pan-zoom-no-scroll");
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

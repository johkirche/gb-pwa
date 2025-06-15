<template>
  <Card v-if="files.length > 0">
    <CardHeader>
      <CardTitle class="flex items-center">
        <Files class="w-5 h-5 mr-2 text-muted-foreground" />
        Files & Media
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="file in files"
          :key="file.id"
          class="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <!-- Image Preview -->
          <div v-if="file.type.includes('image')" class="mb-3">
            <div
              class="relative aspect-video w-full overflow-hidden rounded-md bg-gray-100 cursor-pointer group"
              @click="openImagePreview(file)"
            >
              <img
                :src="`${directusUrl}/assets/${file.id}?width=300&height=200&fit=cover`"
                :alt="file.title || file.filename_download || 'Image'"
                class="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                @error="handleImageError"
                @load="handleImageLoad"
              />
              <!-- Fallback for failed images -->
              <div
                v-if="imageErrors.has(file.id)"
                class="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400"
              >
                <div class="text-center">
                  <Image class="w-8 h-8 mx-auto mb-2" />
                  <p class="text-xs">Image failed to load</p>
                </div>
              </div>
              <div
                class="absolute inset-0 hover:bg-black/20 bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center"
              >
                <Eye
                  class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <FileText
                v-if="file.type.includes('pdf')"
                class="w-8 h-8 text-red-500"
              />
              <Music
                v-else-if="file.type.includes('audio')"
                class="w-8 h-8 text-purple-500"
              />
              <Image
                v-else-if="file.type.includes('image')"
                class="w-8 h-8 text-green-500"
              />
              <File v-else class="w-8 h-8 text-gray-500" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">
                {{ file.title || file.filename_download }}
              </p>
              <p class="text-xs text-muted-foreground">{{ file.type }}</p>
              <p class="text-xs text-muted-foreground">
                {{ formatFileSize(file.filesize) }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <Button
                  v-if="file.type.includes('image')"
                  @click="openImagePreview(file)"
                  variant="link"
                >
                  Preview
                  <Eye class="w-3 h-3 ml-1" />
                </Button>
                <Button
                  variant="link"
                  @click="downloadFile(file)"
                  rel="noopener noreferrer"
                  class="text-xs text-primary hover:underline inline-flex items-center"
                >
                  Download
                  <Download class="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
  <!-- Image Preview Dialog -->
  <Dialog v-model:open="isImagePreviewOpen">
    <DialogContent
      class="max-w-4xl w-full h-[95vh] p-0 bg-black border-none flex flex-col text-white"
    >
      <DialogHeader
        class="flex-shrink-0 bg-black bg-opacity-80 backdrop-blur-sm p-4 border-b border-gray-700 rounded-t-lg"
      >
        <DialogTitle class="text-white">
          {{
            selectedImage?.title ||
            selectedImage?.filename_download ||
            "Image Preview"
          }}
        </DialogTitle>
        <DialogDescription class="text-gray-300">
          {{ selectedImage?.type }} •
          {{ formatFileSize(selectedImage?.filesize) }}
          <span class="text-gray-400 text-xs block mt-1"
            >Click image for fullscreen view</span
          >
        </DialogDescription>
      </DialogHeader>
      <div class="flex-1 flex items-center justify-center p-4 min-h-0">
        <img
          v-if="selectedImage"
          :src="`${directusUrl}/assets/${selectedImage.id}`"
          :alt="
            selectedImage.title || selectedImage.filename_download || 'Image'
          "
          class="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          @error="handleDialogImageError"
          @load="handleDialogImageLoad"
          @click="openFullscreenImage"
        />
        <div v-else class="text-white">No image selected</div>
      </div>
    </DialogContent>
  </Dialog>
  <!-- Pan-Zoom Image Modal -->
  <PanZoomImage
    v-model:is-open="isFullscreenOpen"
    :image-src="
      fullScreenImage ? `${directusUrl}/assets/${fullScreenImage.id}` : ''
    "
    :image-alt="
      fullScreenImage?.title || fullScreenImage?.filename_download || 'Image'
    "
    @close="handleFullscreenClose"
    @image-error="handleDialogImageError"
    @image-load="handleDialogImageLoad"
  />
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PanZoomImage from "@/components/utils/pan-zoom-image/PanZoomImage.vue";
import {
  Files,
  FileText,
  Music,
  Image,
  File,
  Download,
  Eye,
} from "lucide-vue-next";

const props = defineProps<{
  files: Array<{
    id: string;
    title?: string;
    filename_download?: string;
    type: string;
    filesize?: string | number;
  }>;
  directusUrl: string;
}>();

// Image preview modal state
const fullScreenImage = ref<any>(null);
const selectedImage = ref<any>(null);
const isImagePreviewOpen = computed({
  get: () => selectedImage.value !== null,
  set: (value: boolean) => {
    if (!value) {
      selectedImage.value = null;
    }
  },
});

// Fullscreen image state
const isFullscreenOpen = ref(false);

// Track image loading errors
const imageErrors = ref(new Set<string>());

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  const fileId = img.src.match(/assets\/([^?]+)/)?.[1];
  if (fileId) {
    imageErrors.value.add(fileId);
    console.error("Image failed to load:", img.src);
  }
};

const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement;
  const fileId = img.src.match(/assets\/([^?]+)/)?.[1];
  if (fileId) {
    imageErrors.value.delete(fileId);
    console.log("Image loaded successfully:", img.src);
  }
};

const openImagePreview = (file: any) => {
  console.log("Opening image preview for:", file);
  console.log("Image URL:", `${file.directusUrl || ""}/assets/${file.id}`);
  selectedImage.value = file;
};

const handleDialogImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  console.error("Dialog image failed to load:", img.src);
};

const handleDialogImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement;
  console.log("Dialog image loaded successfully:", img.src);
};

const openFullscreenImage = () => {
  // Close the dialog first, then open fullscreen
  fullScreenImage.value = selectedImage.value;
  isImagePreviewOpen.value = false;
  // Use nextTick to ensure dialog is closed before opening fullscreen
  nextTick(() => {
    isFullscreenOpen.value = true;
  });
};

const handleFullscreenClose = () => {
  isFullscreenOpen.value = false;
  // Reopen the dialog after closing fullscreen
  nextTick(() => {
    selectedImage.value = fullScreenImage.value;
  });
};

const downloadFile = (file: any) => {
  const url = `${props.directusUrl}/assets/${file.id}`;
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename_download || file.title || "download";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log("Downloading file:", url);
  console.log("File details:", {
    id: file.id,
    title: file.title,
    filename_download: file.filename_download,
    type: file.type,
    filesize: file.filesize,
  });
};

// Handle escape key for fullscreen
onMounted(() => {
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isFullscreenOpen.value) {
      handleFullscreenClose();
    }
  };
  document.addEventListener("keydown", handleEscape);

  onUnmounted(() => {
    document.removeEventListener("keydown", handleEscape);
  });
});

const formatFileSize = (bytes: string | number | null | undefined): string => {
  if (!bytes) return "Unknown size";

  const size = typeof bytes === "string" ? parseInt(bytes) : bytes;
  if (isNaN(size)) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let fileSize = size;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
};
</script>

<style>
/* Smooth transitions */
.transition-transform {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>

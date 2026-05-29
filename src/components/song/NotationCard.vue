<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center">
        <Music class="w-5 h-5 mr-2 text-muted-foreground" />
        {{ t("song.notation.title") }}
      </CardTitle>
      <CardDescription>
        {{ t("song.notation.description") }}
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div class="relative bg-white rounded-md p-2 overflow-x-auto">
        <div ref="notationRef" class="notation-host"></div>

        <div
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center bg-white/70"
        >
          <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
        </div>

        <div
          v-if="renderError"
          class="flex items-start gap-2 p-3 mt-2 rounded-md bg-destructive/10 text-destructive text-sm"
        >
          <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{{ renderError }}</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { AlertCircle, Loader2, Music } from "lucide-vue-next";

import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { OpenSheetMusicDisplay as OSMDType } from "opensheetmusicdisplay";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchAssetByUrl } from "@/composables/useOfflineDownload";

const { t } = useI18n();

interface Props {
  fileUrl: string;
}

const props = defineProps<Props>();

const notationRef = ref<HTMLElement | null>(null);
const isLoading = ref(false);
const renderError = ref<string | null>(null);

let osmd: OSMDType | null = null;

watch(
  () => props.fileUrl,
  () => {
    loadAndRender();
  },
);

onMounted(initialize);

onBeforeUnmount(() => {
  if (osmd) {
    try {
      osmd.clear();
    } catch {
      /* ignore */
    }
    osmd = null;
  }
});

async function initialize() {
  if (!notationRef.value) return;
  isLoading.value = true;
  renderError.value = null;
  try {
    const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
    osmd = new OpenSheetMusicDisplay(notationRef.value, {
      autoResize: true,
      backend: "svg",
      drawTitle: false,
      drawSubtitle: false,
      drawComposer: false,
      drawLyricist: false,
      drawPartNames: false,
      drawMeasureNumbers: false,
      drawLyrics: true,
      renderSingleHorizontalStaffline: false,
      defaultFontFamily: "Helvetica, Arial, sans-serif",
    });
    applyEngravingTweaks();
    await loadAndRender();
  } catch (err) {
    console.error("Failed to initialize OSMD:", err);
    renderError.value = t("song.notation.errors.initFailed");
  } finally {
    isLoading.value = false;
  }
}

function applyEngravingTweaks() {
  if (!osmd) return;
  const rules = (osmd as unknown as { EngravingRules?: Record<string, number> })
    .EngravingRules;
  if (!rules) return;
  rules.PageLeftMargin = 1;
  rules.PageRightMargin = 1;
  rules.PageTopMargin = 1;
  rules.PageBottomMargin = 1;
  rules.SystemLeftMargin = 0;
  rules.SystemRightMargin = 0;
}

async function loadAndRender() {
  if (!osmd) return;
  isLoading.value = true;
  renderError.value = null;
  try {
    const buffer = await fetchFile(props.fileUrl);
    const bytes = new Uint8Array(buffer);
    // MXL is a zip container starting with "PK" (0x50 0x4B).
    const isMxl = bytes[0] === 0x50 && bytes[1] === 0x4b;
    if (isMxl) {
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      await osmd.load(binary);
    } else {
      await osmd.load(new TextDecoder("utf-8").decode(bytes));
    }
    osmd.render();
  } catch (err) {
    console.error("Failed to render MusicXML:", err);
    renderError.value = t("song.notation.errors.renderFailed");
  } finally {
    isLoading.value = false;
  }
}

async function fetchFile(url: string): Promise<ArrayBuffer> {
  // `fetchAssetByUrl` reads from IndexedDB first when the asset is already
  // cached for offline use, and only hits the network as a fallback.
  return fetchAssetByUrl(url);
}
</script>

<style scoped>
.notation-host {
  width: 100%;
  min-height: 120px;
}

.notation-host :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>

<template>
  <div class="space-y-4 pt-2 border-t">
    <!-- Volume -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label :for="volumeId" class="text-sm font-medium">
          {{ t("settings.synth.volume") }}
        </label>
        <span class="text-xs text-muted-foreground tabular-nums">{{ volume }}%</span>
      </div>
      <Slider
        :id="volumeId"
        :model-value="[volume]"
        :min="0"
        :max="100"
        :step="1"
        @update:model-value="onVolumeChange"
      />
    </div>

    <!-- Instrument preset -->
    <div class="space-y-2">
      <label :for="presetId" class="text-sm font-medium">
        {{ t("settings.synth.preset") }}
      </label>
      <Select :model-value="String(program)" @update:model-value="onPresetChange">
        <SelectTrigger :id="presetId" class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="preset in presets"
            :key="preset.program"
            :value="String(preset.program)"
          >
            {{ t(`settings.synth.presets.${preset.key}`) }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- SoundFont offline cache. Surfaces the same asset the /offline page
         precaches as part of "alles herunterladen", but as a single-purpose
         action: useful when the user just wants playable sound offline
         without grabbing the full song library. -->
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="text-sm font-medium">{{ t("settings.synth.soundfont.label") }}</p>
          <p class="text-xs text-muted-foreground">
            <template v-if="soundfontStatus === 'unconfigured'">
              {{ t("settings.synth.soundfont.unconfigured") }}
            </template>
            <template v-else-if="soundfontStatus === 'cached'">
              {{ t("settings.synth.soundfont.cached") }}
            </template>
            <template v-else>
              {{ t("settings.synth.soundfont.notCached") }}
            </template>
          </p>
        </div>
        <Button
          v-if="soundfontStatus !== 'unconfigured'"
          variant="outline"
          size="sm"
          :disabled="isDownloadingSoundfont || soundfontStatus === 'checking'"
          @click="onDownloadSoundfont"
        >
          <Loader2
            v-if="isDownloadingSoundfont"
            class="w-3.5 h-3.5 mr-1.5 animate-spin"
          />
          <Download v-else class="w-3.5 h-3.5 mr-1.5" />
          {{
            isDownloadingSoundfont
              ? t("settings.synth.soundfont.downloading")
              : soundfontStatus === "cached"
                ? t("settings.synth.soundfont.redownload")
                : t("settings.synth.soundfont.download")
          }}
        </Button>
      </div>
      <p v-if="soundfontError" class="text-xs text-destructive">
        {{ t("settings.synth.soundfont.error") }}: {{ soundfontError }}
      </p>
    </div>

    <!-- Backend status — only surfaced when it's something the user can act on
         (still loading, or oscillator fallback active because no SoundFont). -->
    <div
      v-if="statusLabel"
      class="text-xs text-muted-foreground flex items-start gap-2"
    >
      <Info class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{{ statusLabel }}</span>
    </div>
    <p v-if="loadError" class="text-xs text-destructive">
      {{ t("settings.synth.loadError") }}: {{ loadError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { Download, Info, Loader2 } from "lucide-vue-next";

import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import { getSoundfontUrl, useSynthSettings } from "@/composables/useMidiPlayer";
import {
  cacheAssetById,
  extractDirectusAssetId,
  hasOfflineAsset,
} from "@/composables/useOfflineDownload";

const { t } = useI18n();
const {
  volume,
  program,
  backend,
  loadError,
  presets,
  setVolume,
  setProgram,
} = useSynthSettings();

// Unique-ish ids so multiple controls on the same page (which can happen if
// MidiDeviceSelector is mounted twice) don't share label-for targets.
const uniqueSuffix = Math.random().toString(36).slice(2, 8);
const volumeId = `synth-volume-${uniqueSuffix}`;
const presetId = `synth-preset-${uniqueSuffix}`;

// Suppress the status line when the SoundFont synth is active — nothing for
// the user to do, just noise. Keep it visible while loading or in fallback.
const statusLabel = computed(() => {
  switch (backend.value) {
    case "loading":
      return t("settings.synth.status.loading");
    case "oscillator":
      return t("settings.synth.status.oscillator");
    case "idle":
      return t("settings.synth.status.idle");
    default:
      return null;
  }
});

function onVolumeChange(values: number[] | undefined) {
  if (!values || values.length === 0) return;
  setVolume(values[0]);
}

function onPresetChange(value: unknown) {
  if (typeof value !== "string") return;
  setProgram(Number(value));
}

// "checking" while we resolve the URL + IDB lookup on mount; transitions to
// one of the terminal states once both finish.
type SoundfontStatus = "checking" | "unconfigured" | "cached" | "notCached";
const soundfontStatus = ref<SoundfontStatus>("checking");
const soundfontAssetId = ref<string | null>(null);
const isDownloadingSoundfont = ref(false);
const soundfontError = ref<string | null>(null);

async function refreshSoundfontStatus() {
  try {
    const url = await getSoundfontUrl();
    if (!url) {
      soundfontAssetId.value = null;
      soundfontStatus.value = "unconfigured";
      return;
    }
    const id = extractDirectusAssetId(url);
    if (!id) {
      // External URL — we can't store it in the Directus-keyed asset store.
      soundfontAssetId.value = null;
      soundfontStatus.value = "unconfigured";
      return;
    }
    soundfontAssetId.value = id;
    soundfontStatus.value = (await hasOfflineAsset(id)) ? "cached" : "notCached";
  } catch (err) {
    console.warn("Failed to check soundfont cache status:", err);
    soundfontStatus.value = "unconfigured";
  }
}

async function onDownloadSoundfont() {
  if (!soundfontAssetId.value || isDownloadingSoundfont.value) return;
  isDownloadingSoundfont.value = true;
  soundfontError.value = null;
  try {
    await cacheAssetById(soundfontAssetId.value);
    soundfontStatus.value = "cached";
  } catch (err) {
    soundfontError.value = (err as Error)?.message ?? "download failed";
  } finally {
    isDownloadingSoundfont.value = false;
  }
}

onMounted(() => {
  void refreshSoundfontStatus();
});
</script>

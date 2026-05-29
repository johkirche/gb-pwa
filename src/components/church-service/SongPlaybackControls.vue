<template>
  <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
    <!-- Tempo (BPM) -->
    <div class="flex items-center gap-2">
      <Gauge class="w-4 h-4 text-muted-foreground" />
      <span class="text-sm text-muted-foreground">
        {{ t("churchService.speed.label") }}
      </span>
      <div class="inline-flex items-center rounded-md border bg-background">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-r-none"
          :disabled="!canDecreaseSpeed"
          :aria-label="t('churchService.speed.decrease')"
          @click="adjustSpeed(-1)"
        >
          <Minus class="w-4 h-4" />
        </Button>
        <span
          class="px-2 min-w-[5rem] text-center text-sm font-medium tabular-nums select-none"
          :title="speedTooltip"
          @dblclick="resetSpeed"
        >
          {{ speedLabel }}
        </span>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-l-none"
          :disabled="!canIncreaseSpeed"
          :aria-label="t('churchService.speed.increase')"
          @click="adjustSpeed(1)"
        >
          <Plus class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Pitch (tonic letter or semitone offset) -->
    <div class="flex items-center gap-2">
      <Music2 class="w-4 h-4 text-muted-foreground" />
      <span class="text-sm text-muted-foreground">
        {{ t("churchService.pitch.label") }}
      </span>
      <div class="inline-flex items-center rounded-md border bg-background">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-r-none"
          :disabled="props.pitchSemitones <= PITCH_MIN"
          :aria-label="t('churchService.pitch.decrease')"
          @click="emit('update:pitch', props.pitchSemitones - 1)"
        >
          <Minus class="w-4 h-4" />
        </Button>
        <span
          class="px-2 min-w-[4rem] text-center text-sm font-medium tabular-nums select-none"
          :title="pitchTooltip"
          @dblclick="emit('update:pitch', 0)"
        >
          {{ pitchLabel }}
        </span>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-l-none"
          :disabled="props.pitchSemitones >= PITCH_MAX"
          :aria-label="t('churchService.pitch.increase')"
          @click="emit('update:pitch', props.pitchSemitones + 1)"
        >
          <Plus class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Gauge, Minus, Music2, Plus } from "lucide-vue-next";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { Gesangbuchlied } from "@/gql/graphql";
import { type GesangbuchliedWithMidi } from "@/gql/extra-types";

import { Button } from "@/components/ui/button";

import {
  type MidiKeySignature,
  parseMidiFile,
  tonicNameGerman,
} from "@/composables/useMidiPlayer";
import { fetchAssetByUrl } from "@/composables/useOfflineDownload";

import {
  PITCH_MAX,
  PITCH_MIN,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
} from "@/stores/churchService";

interface Props {
  song: Gesangbuchlied;
  speed: number;
  pitchSemitones: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:speed": [speed: number];
  "update:pitch": [semitones: number];
}>();

const { t } = useI18n();

const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;

// MIDI metadata derived from the main file. Both null until the file resolves
// (or stay null on fetch / parse failure — UI falls back to multiplier/semitone
// display).
const baseBpm = ref<number | null>(null);
const keySignature = ref<MidiKeySignature | null>(null);

watch(
  () => props.song?.id,
  () => loadMeta(),
  { immediate: true },
);

async function loadMeta() {
  baseBpm.value = null;
  keySignature.value = null;
  const main = (props.song as GesangbuchliedWithMidi)?.midi_main;
  if (!main?.id || !directusUrl) return;
  try {
    const buf = await fetchAssetByUrl(`${directusUrl}/assets/${main.id}`);
    const parsed = parseMidiFile(buf);
    baseBpm.value = parsed.bpm;
    keySignature.value = parsed.keySignature;
  } catch (err) {
    // Non-fatal: we still let the user adjust, just without the labelled units.
    console.warn("Failed to load MIDI metadata for playback controls:", err);
  }
}

// ── Speed (BPM) ─────────────────────────────────────────────────────────────

const currentBpm = computed<number | null>(() =>
  baseBpm.value !== null ? Math.round(baseBpm.value * props.speed) : null,
);

const speedLabel = computed(() => {
  if (currentBpm.value !== null) {
    return t("churchService.speed.bpm", { value: currentBpm.value });
  }
  return `${props.speed.toFixed(2)}×`;
});

const speedTooltip = computed(() => {
  if (baseBpm.value !== null) {
    return t("churchService.speed.tooltipBpm", {
      base: Math.round(baseBpm.value),
    });
  }
  return t("churchService.speed.tooltipMultiplier");
});

const canDecreaseSpeed = computed(() => props.speed > SPEED_MIN + 1e-9);
const canIncreaseSpeed = computed(() => props.speed < SPEED_MAX - 1e-9);

// `delta` is in BPM when we have a base, otherwise in multiplier steps. We
// route both through the parent in multiplier units so the store stays unit-
// agnostic.
function adjustSpeed(direction: -1 | 1) {
  if (baseBpm.value !== null && currentBpm.value !== null) {
    const nextBpm = currentBpm.value + direction;
    const nextSpeed = clamp(nextBpm / baseBpm.value, SPEED_MIN, SPEED_MAX);
    emit("update:speed", nextSpeed);
    return;
  }
  const next = clamp(props.speed + direction * SPEED_STEP, SPEED_MIN, SPEED_MAX);
  emit("update:speed", next);
}

function resetSpeed() {
  emit("update:speed", 1);
}

// ── Pitch ───────────────────────────────────────────────────────────────────

const pitchLabel = computed(() => {
  if (keySignature.value) {
    return tonicNameGerman(keySignature.value, props.pitchSemitones);
  }
  // No key signature in the file — show signed semitone offset so the user
  // still has a clear sense of how far they've transposed.
  return props.pitchSemitones > 0
    ? `+${props.pitchSemitones}`
    : `${props.pitchSemitones}`;
});

const pitchTooltip = computed(() => {
  if (keySignature.value) {
    return t("churchService.pitch.tooltipKey", {
      base: tonicNameGerman(keySignature.value, 0),
      offset: formatSignedSemitones(props.pitchSemitones),
    });
  }
  return t("churchService.pitch.tooltipSemitones");
});

function formatSignedSemitones(v: number): string {
  if (v === 0) return "±0";
  return v > 0 ? `+${v}` : `${v}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
</script>

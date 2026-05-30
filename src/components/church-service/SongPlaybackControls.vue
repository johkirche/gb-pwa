<template>
  <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
    <!-- Preview listen — play the loaded MIDI (song's main verse or the piece
         file) once, with the current tempo/pitch applied. -->
    <Button
      variant="outline"
      size="sm"
      class="gap-1.5"
      :disabled="!canPreview"
      :title="t('churchService.previewListen.hint')"
      @click="togglePreview"
    >
      <Loader2 v-if="isLoadingPreview" class="w-4 h-4 animate-spin" />
      <Square v-else-if="isPreviewing" class="w-4 h-4" />
      <Play v-else class="w-4 h-4" />
      <span>
        {{
          isPreviewing
            ? t("churchService.previewListen.stop")
            : t("churchService.previewListen.play")
        }}
      </span>
    </Button>

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
        <input
          ref="speedInput"
          type="text"
          inputmode="decimal"
          class="px-2 w-20 text-center text-sm font-medium tabular-nums bg-transparent border-0 outline-none focus:ring-1 focus:ring-ring rounded-sm"
          :value="isEditingSpeed ? speedText : speedLabel"
          :title="speedTooltip"
          :aria-label="t('churchService.speed.edit')"
          @focus="startEditSpeed"
          @input="speedText = ($event.target as HTMLInputElement).value"
          @blur="commitSpeed"
          @keydown.enter.prevent="speedInput?.blur()"
          @keydown.esc.prevent="cancelEditSpeed"
          @dblclick="resetSpeed"
        />
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

      <!-- Toggle: play a reference tone of the resulting tonic on key change. -->
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :class="toneEnabled ? 'text-primary' : 'text-muted-foreground'"
        :aria-pressed="toneEnabled"
        :aria-label="toneEnabled
          ? t('churchService.pitch.toneDisable')
          : t('churchService.pitch.toneEnable')"
        :title="toneEnabled
          ? t('churchService.pitch.toneDisable')
          : t('churchService.pitch.toneEnable')"
        @click="toggleTone"
      >
        <Bell v-if="toneEnabled" class="w-4 h-4" />
        <BellOff v-else class="w-4 h-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bell, BellOff, Gauge, Loader2, Minus, Music2, Play, Plus, Square } from "lucide-vue-next";

import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";

import {
  type MidiKeySignature,
  type ParsedMidiFile,
  parseMidiFile,
  tonicNameGerman,
  tonicPitchClass,
  useKeyChangeTone,
  useMidiPlayer,
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
  // Directus file id of the MIDI to read tempo/key metadata from and to play
  // when previewing. For main songs this is `midi_main`; for intro/outro pieces
  // it's the standalone `midi_file`. Null/undefined disables preview.
  midiAssetId: string | null | undefined;
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

// Dedicated player instance for the preview. Per-control so the playing state
// binds to this row's button; `onUnmounted` in the composable stops it.
const {
  isPlaying: isPreviewing,
  selectedOutput,
  playSingle,
  playTone,
  stop: stopPreview,
} = useMidiPlayer();

const { enabled: toneEnabled, setEnabled: setToneEnabled } = useKeyChangeTone();

// MIDI metadata + parsed file derived from `midiAssetId`. All null until the
// file resolves (or stay null on fetch / parse failure — UI falls back to
// multiplier/semitone display and preview is disabled).
const baseBpm = ref<number | null>(null);
const keySignature = ref<MidiKeySignature | null>(null);
const parsedFile = ref<ParsedMidiFile | null>(null);
const isLoadingPreview = ref(false);

watch(
  () => props.midiAssetId,
  () => {
    // Drop any in-flight preview when the underlying file changes.
    stopPreview();
    void loadMeta();
  },
  { immediate: true },
);

async function loadMeta() {
  baseBpm.value = null;
  keySignature.value = null;
  parsedFile.value = null;
  const id = props.midiAssetId;
  if (!id || !directusUrl) return;
  try {
    const buf = await fetchAssetByUrl(`${directusUrl}/assets/${id}`);
    const parsed = parseMidiFile(buf);
    parsedFile.value = parsed;
    baseBpm.value = parsed.bpm;
    keySignature.value = parsed.keySignature;
  } catch (err) {
    // Non-fatal: we still let the user adjust, just without the labelled units
    // and without preview.
    console.warn("Failed to load MIDI metadata for playback controls:", err);
  }
}

// ── Preview listen ───────────────────────────────────────────────────────────

const canPreview = computed(
  () => !!props.midiAssetId && !!selectedOutput.value && !isLoadingPreview.value,
);

async function togglePreview() {
  if (isPreviewing.value) {
    stopPreview();
    return;
  }
  let file = parsedFile.value;
  if (!file) {
    // Metadata never resolved (or is mid-load) — fetch on demand so the button
    // still works even if the eager load failed.
    isLoadingPreview.value = true;
    try {
      await loadMeta();
    } finally {
      isLoadingPreview.value = false;
    }
    file = parsedFile.value;
  }
  if (!file) return;
  await playSingle(file, {
    speed: props.speed,
    pitchSemitones: props.pitchSemitones,
  });
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
  // Keep the editable buffer in sync if the field is currently focused.
  if (isEditingSpeed.value) {
    speedText.value = String(baseBpm.value !== null ? Math.round(baseBpm.value) : 1);
    void nextTick(() => speedInput.value?.select());
  }
}

// ── Inline editing of the speed value ────────────────────────────────────────
// The field shows the formatted label (BPM or multiplier) while idle and the
// raw number while focused. The user types a BPM when we have a base tempo,
// otherwise a multiplier; both are converted back to multiplier units here.
const speedInput = ref<HTMLInputElement | null>(null);
const isEditingSpeed = ref(false);
const speedText = ref("");

function startEditSpeed() {
  isEditingSpeed.value = true;
  speedText.value = String(
    currentBpm.value !== null ? currentBpm.value : props.speed.toFixed(2),
  );
  void nextTick(() => speedInput.value?.select());
}

function commitSpeed() {
  if (!isEditingSpeed.value) return;
  isEditingSpeed.value = false;
  const parsed = Number.parseFloat(speedText.value.replace(",", "."));
  if (!Number.isFinite(parsed)) return;
  if (baseBpm.value !== null && baseBpm.value > 0) {
    emit("update:speed", clamp(parsed / baseBpm.value, SPEED_MIN, SPEED_MAX));
  } else {
    emit("update:speed", clamp(parsed, SPEED_MIN, SPEED_MAX));
  }
}

function cancelEditSpeed() {
  // Drop the buffer first so the blur handler skips committing it.
  isEditingSpeed.value = false;
  speedInput.value?.blur();
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

// MIDI note of the reference tone for the current key. When the file declares a
// key signature we sound its (transposed) tonic in a comfortable middle octave;
// otherwise we fall back to a fixed reference shifted by the same offset so the
// operator still hears the direction/size of the transposition.
const REFERENCE_BASE_NOTE = 60; // C4
const referenceToneNote = computed(() => {
  if (keySignature.value) {
    return REFERENCE_BASE_NOTE + tonicPitchClass(keySignature.value) + props.pitchSemitones;
  }
  return REFERENCE_BASE_NOTE + props.pitchSemitones;
});

// Sound the tonic whenever the key changes and the toggle is on. Without
// `immediate` this never fires on mount — only on real user transpositions.
watch(
  () => props.pitchSemitones,
  () => {
    if (toneEnabled.value && selectedOutput.value) {
      playTone(referenceToneNote.value);
    }
  },
);

function toggleTone() {
  const next = !toneEnabled.value;
  setToneEnabled(next);
  // Confirm the toggle audibly when enabling so the operator hears it works.
  if (next && selectedOutput.value) playTone(referenceToneNote.value);
}

function formatSignedSemitones(v: number): string {
  if (v === 0) return "±0";
  return v > 0 ? `+${v}` : `${v}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
</script>

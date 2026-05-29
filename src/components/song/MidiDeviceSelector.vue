<template>
  <div class="space-y-2">
    <!-- The picker is always shown: the in-browser synth fallback guarantees
         outputs is never empty, even when Web MIDI is unsupported or access
         hasn't been granted. -->
    <div class="flex flex-col gap-2">
      <label v-if="showLabel" class="text-sm font-medium" :for="selectId">
        {{ t("song.midiPlayer.device") }}
      </label>
      <Select :model-value="selectedOutputId" @update:model-value="onChange">
        <SelectTrigger :id="selectId" class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="dev in outputs" :key="dev.id" :value="dev.id">
            {{ deviceLabel(dev) }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Hint: hardware not yet visible because permission wasn't granted. The
         browser synth still works, so this is informational, not a blocker. -->
    <div
      v-if="isSupported && !midiAccess"
      class="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <span>{{ t("song.midiPlayer.accessHint") }}</span>
      <button class="underline hover:text-foreground" @click="requestAccess">
        {{ t("song.midiPlayer.requestAccess") }}
      </button>
    </div>

    <!-- Web MIDI not supported in this browser. Synth still works. -->
    <div
      v-else-if="!isSupported"
      class="flex items-start gap-2 text-xs text-muted-foreground"
    >
      <AlertCircle class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{{ t("song.midiPlayer.notSupportedHint") }}</span>
    </div>

    <p v-if="accessError" class="text-xs text-destructive">{{ accessError }}</p>

    <!-- Synth-specific controls (volume, preset) — only relevant when the
         in-browser synth is the active output. Real MIDI hardware has its
         own physical controls. -->
    <SynthSettingsControls v-if="isBrowserSynth" />
  </div>
</template>

<script setup lang="ts">
import { AlertCircle } from "lucide-vue-next";

import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import SynthSettingsControls from "@/components/song/SynthSettingsControls.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  BROWSER_SYNTH_ID,
  type MidiOutputDevice,
  useMidiDevices,
} from "@/composables/useMidiPlayer";

interface Props {
  showLabel?: boolean;
  // Auto-request MIDI access on mount so hardware appears without an extra click.
  autoRequest?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: true,
  autoRequest: true,
});

const { t } = useI18n();

const {
  isSupported,
  midiAccess,
  outputs,
  selectedOutputId,
  accessError,
  requestAccess,
  setSelectedOutput,
} = useMidiDevices();

// Unique-ish id so multiple selectors on the same page don't clash.
const selectId = computed(() => `midi-device-${Math.random().toString(36).slice(2, 8)}`);

const isBrowserSynth = computed(() => selectedOutputId.value === BROWSER_SYNTH_ID);

function deviceLabel(dev: MidiOutputDevice): string {
  if (dev.id === BROWSER_SYNTH_ID) return t("song.midiPlayer.builtInSynth");
  return dev.manufacturer ? `${dev.name} (${dev.manufacturer})` : dev.name;
}

function onChange(value: unknown) {
  if (typeof value !== "string") return;
  setSelectedOutput(value);
}

onMounted(() => {
  if (props.autoRequest && isSupported.value && !midiAccess.value) {
    requestAccess();
  }
});
</script>

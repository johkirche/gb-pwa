<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center">
        <Piano class="w-5 h-5 mr-2 text-muted-foreground" />
        {{ t("song.midiPlayer.title") }}
      </CardTitle>
      <CardDescription>
        {{ t("song.midiPlayer.description") }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <MidiDeviceSelector />

      <!-- File parse error -->
      <div
        v-if="parseError"
        class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm"
      >
        <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{{ parseError }}</span>
      </div>

      <!-- Loading state for files -->
      <div v-if="isLoadingFiles" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="w-4 h-4 animate-spin" />
        <span>{{ t("song.midiPlayer.loadingFiles") }}</span>
      </div>

      <!-- Controls -->
      <div v-if="filesReady" class="flex flex-wrap items-center gap-3 pt-2 border-t">
        <Button
          variant="default"
          size="sm"
          :disabled="!canPlay"
          @click="onPlay"
        >
          <Play class="w-4 h-4 mr-1" />
          {{ t("song.midiPlayer.play") }}
        </Button>

        <Button
          variant="outline"
          size="sm"
          :disabled="!isPlaying"
          @click="onStop"
        >
          <Square class="w-4 h-4 mr-1" />
          {{ t("song.midiPlayer.stop") }}
        </Button>

        <div class="flex items-center gap-2 ml-auto">
          <label class="text-sm text-muted-foreground" for="midi-verses">
            {{ t("song.midiPlayer.verses") }}
          </label>
          <Input
            id="midi-verses"
            v-model.number="versesCount"
            type="number"
            min="1"
            max="20"
            class="w-16 h-8 text-center"
            :disabled="isPlaying"
          />
        </div>
      </div>

      <!-- Progress -->
      <div
        v-if="isPlaying"
        class="text-sm text-center text-muted-foreground tabular-nums"
      >
        {{ progressLabel }}
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { AlertCircle, Loader2, Piano, Play, Square } from "lucide-vue-next";

import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import MidiDeviceSelector from "@/components/song/MidiDeviceSelector.vue";

import {
  type ParsedMidiFile,
  parseMidiFile,
  useMidiPlayer,
} from "@/composables/useMidiPlayer";
import { fetchAssetByUrl } from "@/composables/useOfflineDownload";

const { t } = useI18n();

interface Props {
  introUrl: string;
  mainUrl: string;
  outroUrl: string;
  // Default verse count (incl. final outro verse). User can override via UI.
  defaultVerses?: number;
}

const props = withDefaults(defineProps<Props>(), {
  defaultVerses: 4,
});

const {
  selectedOutput,
  isPlaying,
  progress,
  playSequence,
  stop,
} = useMidiPlayer();

const versesCount = ref(Math.max(1, props.defaultVerses));
const isLoadingFiles = ref(false);
const parseError = ref<string | null>(null);

const intro = ref<ParsedMidiFile | null>(null);
const main = ref<ParsedMidiFile | null>(null);
const outro = ref<ParsedMidiFile | null>(null);

const filesReady = computed(
  () => !!intro.value && !!main.value && !!outro.value && !parseError.value,
);

const canPlay = computed(
  () => filesReady.value && !!selectedOutput.value && !isPlaying.value,
);

const progressLabel = computed(() => {
  const p = progress.value;
  if (p.stage === "intro") return t("song.midiPlayer.statusIntro");
  if (p.stage === "outro")
    return t("song.midiPlayer.statusOutro", {
      current: p.verseNumber,
      total: p.totalVerses,
    });
  if (p.stage === "verse")
    return t("song.midiPlayer.statusVerse", {
      current: p.verseNumber,
      total: p.totalVerses,
    });
  if (p.stage === "pause") return t("song.midiPlayer.statusPause");
  return "";
});

watch(
  () => props.defaultVerses,
  (n) => {
    if (!isPlaying.value && n && n > 0) versesCount.value = n;
  },
);

watch(
  () => [props.introUrl, props.mainUrl, props.outroUrl] as const,
  () => loadAll(),
);

onMounted(() => {
  loadAll();
});

async function loadAll() {
  parseError.value = null;
  isLoadingFiles.value = true;
  try {
    const [a, b, c] = await Promise.all([
      fetchAndParse(props.introUrl),
      fetchAndParse(props.mainUrl),
      fetchAndParse(props.outroUrl),
    ]);
    intro.value = a;
    main.value = b;
    outro.value = c;
  } catch (err) {
    console.error("Failed to load MIDI files:", err);
    parseError.value = t("song.midiPlayer.errors.parseFailed");
    intro.value = main.value = outro.value = null;
  } finally {
    isLoadingFiles.value = false;
  }
}

async function fetchAndParse(url: string): Promise<ParsedMidiFile> {
  // `fetchAssetByUrl` reads from IndexedDB first when the asset is already
  // cached for offline use, and only hits the network as a fallback.
  return parseMidiFile(await fetchAssetByUrl(url));
}

async function onPlay() {
  if (!intro.value || !main.value || !outro.value) return;
  await playSequence(intro.value, main.value, outro.value, versesCount.value);
}

function onStop() {
  stop();
}
</script>

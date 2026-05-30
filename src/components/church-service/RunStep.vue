<template>
  <div class="space-y-6">
    <!-- Now-playing card: prominent, the eye should land here first. -->
    <Card>
      <CardContent class="space-y-6">
        <!-- Top line: Lied X von Y · title, with role chip for intro/outro -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="text-sm text-muted-foreground mb-1">
              {{
                t("churchService.run.position", {
                  current: store.currentPlayingIndex + 1,
                  total: store.playlist.length,
                })
              }}
              <Badge
                v-if="currentEntry?.role === 'intro'"
                variant="outline"
                class="ml-2 bg-purple-100 text-purple-800 border-purple-200"
              >
                {{ t("churchService.intro") }}
              </Badge>
              <Badge
                v-else-if="currentEntry?.role === 'outro'"
                variant="outline"
                class="ml-2 bg-amber-100 text-amber-800 border-amber-200"
              >
                {{ t("churchService.outro") }}
              </Badge>
            </div>
            <div class="flex items-baseline gap-3 flex-wrap">
              <span
                v-if="currentLiedNumber !== null"
                class="inline-flex items-center px-2 py-0.5 rounded bg-primary text-primary-foreground text-lg font-bold tabular-nums leading-tight flex-shrink-0"
              >
                {{ currentLiedNumber }}
              </span>
              <h2 class="text-2xl font-semibold leading-tight">
                {{ currentTitle }}
              </h2>
            </div>
            <p
              v-if="currentSubtitle"
              class="text-sm text-muted-foreground mt-1 break-words"
            >
              {{ currentSubtitle }}
            </p>
          </div>
        </div>

        <!-- Big stage label — what's happening RIGHT NOW. -->
        <div class="text-center">
          <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {{ t("churchService.run.currentlyPlaying") }}
          </p>
          <p class="text-3xl font-semibold tabular-nums">
            {{ bigStageLabel }}
          </p>
        </div>

        <!-- Song-only: stage timeline (intro · verses · outro) -->
        <div
          v-if="currentEntry?.kind === 'song' && stageChips.length > 0"
          class="flex flex-wrap items-center justify-center gap-2"
        >
          <template v-for="(chip, idx) in stageChips" :key="idx">
            <div
              :class="[
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
                chip.state === 'active'
                  ? 'bg-primary text-primary-foreground border-primary shadow'
                  : chip.state === 'done'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-muted text-muted-foreground border-transparent',
              ]"
            >
              <Play v-if="chip.state === 'active'" class="w-3.5 h-3.5" />
              <CheckCircle v-else-if="chip.state === 'done'" class="w-3.5 h-3.5" />
              <span>{{ chip.label }}</span>
            </div>
            <ChevronRight
              v-if="idx < stageChips.length - 1"
              class="w-4 h-4 text-muted-foreground flex-shrink-0"
            />
          </template>
        </div>

        <!-- Per-entry progress bar (smooth, wall-clock based) -->
        <div class="space-y-1">
          <div class="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{{ t("churchService.run.songProgress") }}</span>
            <span>{{ formatTime(elapsedMs) }} / {{ formatTime(totalMs) }}</span>
          </div>
          <div class="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              class="bg-primary h-2 rounded-full transition-[width] duration-100 ease-linear"
              :style="{ width: `${entryProgressPercent}%` }"
            />
          </div>
        </div>

        <!-- Load / parse error -->
        <div
          v-if="parseError"
          class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm"
        >
          <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{{ parseError }}</span>
        </div>

        <!-- Loading -->
        <div v-if="isLoadingFiles" class="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span>{{ t("churchService.midiPlayer.loadingFiles") }}</span>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-center gap-2 pt-2 flex-wrap">
          <Button
            v-if="store.currentPlayingIndex > 0"
            variant="outline"
            size="sm"
            @click="previousEntry"
          >
            <SkipBack class="w-4 h-4 mr-1" />
            {{ t("churchService.audioPlayer.previous") }}
          </Button>

          <Button
            v-if="!isPlaying"
            variant="default"
            size="lg"
            :disabled="!canStart"
            @click="startCurrentEntry"
          >
            <Play class="w-5 h-5 mr-1" />
            {{ t("churchService.midiPlayer.startSong") }}
          </Button>

          <Button
            v-if="store.currentPlayingIndex < store.playlist.length - 1"
            variant="outline"
            size="sm"
            @click="nextEntry"
          >
            <SkipForward class="w-4 h-4 mr-1" />
            {{ t("churchService.audioPlayer.next") }}
          </Button>

          <Button variant="destructive" size="sm" @click="stopService">
            <Square class="w-4 h-4 mr-1" />
            {{ t("churchService.audioPlayer.stop") }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Ablauf timeline (rest of the service) -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          {{ t("churchService.serviceOrder") }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-1">
          <div
            v-for="(entry, index) in store.playlist"
            :key="index"
            :class="[
              'flex items-center justify-between p-2 rounded text-sm',
              index === store.currentPlayingIndex
                ? 'bg-primary text-primary-foreground'
                : index < store.currentPlayingIndex
                  ? 'bg-green-50 text-green-900'
                  : 'bg-muted/50',
            ]"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-medium flex-shrink-0 tabular-nums w-5 text-right">
                {{ index + 1 }}.
              </span>
              <Badge
                v-if="entry.role === 'intro'"
                variant="outline"
                :class="[
                  'text-[10px] flex-shrink-0',
                  index === store.currentPlayingIndex
                    ? 'border-primary-foreground/40 text-primary-foreground'
                    : 'bg-purple-100 text-purple-800 border-purple-200',
                ]"
              >
                {{ t("churchService.intro") }}
              </Badge>
              <Badge
                v-else-if="entry.role === 'outro'"
                variant="outline"
                :class="[
                  'text-[10px] flex-shrink-0',
                  index === store.currentPlayingIndex
                    ? 'border-primary-foreground/40 text-primary-foreground'
                    : 'bg-amber-100 text-amber-800 border-amber-200',
                ]"
              >
                {{ t("churchService.outro") }}
              </Badge>
              <span
                v-if="entry.kind === 'song' && getLiedNumber(entry.song) !== null"
                :class="[
                  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold tabular-nums leading-tight flex-shrink-0',
                  index === store.currentPlayingIndex
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary/15 text-primary',
                ]"
              >
                {{ getLiedNumber(entry.song) }}
              </span>
              <span class="truncate">
                {{ entry.kind === "song" ? entry.song.titel : entry.piece.name }}
              </span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span v-if="entry.kind === 'song'" class="text-xs tabular-nums opacity-80">
                {{ entry.verses.join(", ") }}
              </span>
              <CheckCircle v-if="index < store.currentPlayingIndex" class="w-4 h-4" />
              <Play v-else-if="index === store.currentPlayingIndex && isPlaying" class="w-4 h-4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useChurchServiceStore } from "@/stores/churchService";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Loader2,
  Play,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-vue-next";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { type GesangbuchliedWithMidi, getLiedNumber } from "@/gql/extra-types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { type ParsedMidiFile, parseMidiFile, useMidiPlayer } from "@/composables/useMidiPlayer";
import { fetchAssetByUrl } from "@/composables/useOfflineDownload";

const { t } = useI18n();

const store = useChurchServiceStore();
const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;

const {
  selectedOutput,
  isPlaying,
  progress,
  elapsedMs,
  totalMs,
  playSequence,
  playSingle,
  stop,
} = useMidiPlayer();

const isLoadingFiles = ref(false);
const parseError = ref<string | null>(null);

const currentEntry = computed(() => store.playlist[store.currentPlayingIndex] ?? null);

// Title / subtitle / number — uniform presentation layer across kinds.
const currentTitle = computed(() => {
  const e = currentEntry.value;
  if (!e) return t("utils.unknown");
  return e.kind === "song" ? (e.song.titel ?? t("utils.unknown")) : e.piece.name;
});

const currentSubtitle = computed(() => {
  const e = currentEntry.value;
  if (!e || e.kind !== "piece") return null;
  return e.piece.komponist || null;
});

const currentLiedNumber = computed(() => {
  const e = currentEntry.value;
  if (!e || e.kind !== "song") return null;
  return getLiedNumber(e.song);
});

// Verses array — only meaningful for song entries.
const currentVerses = computed<number[]>(() =>
  currentEntry.value?.kind === "song" ? currentEntry.value.verses : [],
);

const hasFullTrio = computed(() => {
  const e = currentEntry.value;
  if (e?.kind !== "song") return false;
  const s = e.song as GesangbuchliedWithMidi;
  return !!(s?.midi_intro && s?.midi_main && s?.midi_outro);
});

const canStart = computed(() => {
  if (!selectedOutput.value || isPlaying.value || isLoadingFiles.value) return false;
  const e = currentEntry.value;
  if (!e) return false;
  if (e.kind === "song") return hasFullTrio.value;
  // piece: just needs a midi_file (guaranteed by schema) + output
  return !!e.piece.midi_file;
});

// The "what's happening RIGHT NOW" label.
const bigStageLabel = computed(() => {
  const p = progress.value;
  const verses = currentVerses.value;
  switch (p.stage) {
    case "intro":
      return t("churchService.run.stage.intro");
    case "verse": {
      const verseLabel = verses[p.verseNumber - 1] ?? p.verseNumber;
      return t("churchService.run.stage.verse", { verse: verseLabel });
    }
    case "outro": {
      const verseLabel = verses[verses.length - 1];
      return verseLabel !== undefined
        ? t("churchService.run.stage.outroWithVerse", { verse: verseLabel })
        : t("churchService.run.stage.outro");
    }
    case "pause":
      return t("churchService.run.stage.pause");
    case "single":
      return currentEntry.value?.kind === "piece"
        ? currentEntry.value.role === "intro"
          ? t("churchService.run.stage.intro")
          : t("churchService.run.stage.outro")
        : t("churchService.run.stage.ready");
    case "idle":
    default:
      return isPlaying.value ? "" : t("churchService.run.stage.ready");
  }
});

type ChipState = "done" | "active" | "upcoming";
interface StageChip {
  key: string;
  label: string;
  state: ChipState;
}

// Build the intro · verse · ... · outro chip row for the current song.
// Only relevant for song entries — pieces have no chips.
const stageChips = computed<StageChip[]>(() => {
  if (currentEntry.value?.kind !== "song") return [];
  const verses = currentVerses.value;
  if (verses.length === 0) return [];
  const p = progress.value;
  const chips: StageChip[] = [];

  const stateAt = (position: number): ChipState => {
    if (!isPlaying.value && p.stage === "idle") return "upcoming";
    const current = currentChipPosition();
    if (position < current) return "done";
    if (position === current) return "active";
    return "upcoming";
  };

  // Position 0 = intro; 1..mainCount = main verses; mainCount+1 = outro.
  const currentChipPosition = (): number => {
    if (p.stage === "intro") return 0;
    if (p.stage === "verse") return p.verseNumber;
    if (p.stage === "outro") return verses.length;
    if (p.stage === "pause") {
      return Math.max(0, Math.min(verses.length, p.verseNumber));
    }
    return -1;
  };

  chips.push({
    key: "intro",
    label: t("churchService.run.stage.introShort"),
    state: stateAt(0),
  });

  const mainCount = Math.max(0, verses.length - 1);
  for (let i = 0; i < mainCount; i++) {
    chips.push({
      key: `verse-${verses[i]}`,
      label: t("churchService.verse") + " " + verses[i],
      state: stateAt(i + 1),
    });
  }

  const lastVerse = verses[verses.length - 1];
  chips.push({
    key: "outro",
    label:
      lastVerse !== undefined
        ? `${t("churchService.run.stage.outroShort")} · ${t("churchService.verse")} ${lastVerse}`
        : t("churchService.run.stage.outroShort"),
    state: stateAt(verses.length),
  });

  return chips;
});

// Smooth time-based progress. The bar fills linearly from 0% to 100% over the
// full sequence (sections + pauses); once elapsed reaches total the bar pins
// at 100% while the elapsed counter keeps ticking — matches the natural
// "song ran a bit long" case without resetting visual state.
const entryProgressPercent = computed(() => {
  if (totalMs.value <= 0) return 0;
  return Math.min(100, (elapsedMs.value / totalMs.value) * 100);
});

function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// When the parent moves to another entry, stop anything in flight.
watch(
  () => store.currentPlayingIndex,
  () => {
    stop();
    parseError.value = null;
  },
);

async function startCurrentEntry() {
  const entry = currentEntry.value;
  if (!entry) return;
  parseError.value = null;

  if (entry.kind === "piece") {
    await startPiece(entry.piece, entry.speed, entry.pitchSemitones);
  } else {
    await startSong(entry.song, entry.speed, entry.pitchSemitones);
  }

  // playSequence/playSingle resolves when playback finishes (or stop() is called).
  // If we weren't aborted, advance to the next entry.
  if (!parseError.value) {
    store.onSongCompleted();
  }
}

async function startPiece(
  piece: { midi_file: { id: string } },
  speed: number,
  pitchSemitones: number,
) {
  isLoadingFiles.value = true;
  let file: ParsedMidiFile;
  try {
    file = await fetchAndParse(`${directusUrl}/assets/${piece.midi_file.id}`);
  } catch (err) {
    console.error("Failed to load piece MIDI:", err);
    parseError.value = t("song.midiPlayer.errors.parseFailed");
    isLoadingFiles.value = false;
    return;
  }
  isLoadingFiles.value = false;
  await playSingle(file, { speed, pitchSemitones });
}

async function startSong(
  song: { titel?: string | null } & GesangbuchliedWithMidi,
  speed: number,
  pitchSemitones: number,
) {
  if (!song.midi_intro || !song.midi_main || !song.midi_outro) {
    parseError.value = t("churchService.midiPlayer.errors.missingTrio");
    return;
  }
  isLoadingFiles.value = true;
  let intro: ParsedMidiFile, main: ParsedMidiFile, outro: ParsedMidiFile;
  try {
    [intro, main, outro] = await Promise.all([
      fetchAndParse(`${directusUrl}/assets/${song.midi_intro.id}`),
      fetchAndParse(`${directusUrl}/assets/${song.midi_main.id}`),
      fetchAndParse(`${directusUrl}/assets/${song.midi_outro.id}`),
    ]);
  } catch (err) {
    console.error("Failed to load MIDI trio:", err);
    parseError.value = t("song.midiPlayer.errors.parseFailed");
    isLoadingFiles.value = false;
    return;
  }
  isLoadingFiles.value = false;

  const versesCount = Math.max(1, currentVerses.value.length);
  await playSequence(intro, main, outro, versesCount, { speed, pitchSemitones });
}

async function fetchAndParse(url: string): Promise<ParsedMidiFile> {
  // `fetchAssetByUrl` reads from IndexedDB first when the asset is already
  // cached for offline use, and only hits the network as a fallback.
  return parseMidiFile(await fetchAssetByUrl(url));
}

function previousEntry() {
  if (store.currentPlayingIndex > 0) {
    stop();
    store.currentPlayingIndex--;
  }
}

function nextEntry() {
  if (store.currentPlayingIndex < store.playlist.length - 1) {
    stop();
    store.currentPlayingIndex++;
  }
}

function stopService() {
  stop();
  store.finishService();
}
</script>

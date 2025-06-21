<template>
  <div class="bg-card rounded-lg border p-4 space-y-4">
    <!-- File Info -->
    <div class="flex items-center justify-between">
      <div class="flex-1 min-w-0">
        <h4 class="font-medium truncate">
          {{ title || t("song.audioPlayer.defaultAudioTitle") }}
        </h4>
        <p class="text-sm text-muted-foreground">
          {{ formatFileSize(fileSize) }}
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <!-- Playback Speed Dropdown -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="text-xs">
              <span>{{ t("song.audioPlayer.playbackSpeed") }}</span>
              <span>{{ currentRate }}x</span>
              <ChevronDown class="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{{
              t("song.audioPlayer.playbackSpeed")
            }}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <!-- Preset Speeds -->
            <DropdownMenuGroup>
              <DropdownMenuItem
                v-for="rate in speedOptions"
                :key="rate"
                :class="currentRate === rate ? 'bg-accent' : ''"
                @click="setPlaybackRate(rate)"
              >
                {{ rate }}x
                <DropdownMenuShortcut v-if="rate === 1.0">{{
                  t("song.audioPlayer.normal")
                }}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <!-- Custom Speed -->
            <div class="px-2 py-1.5">
              <label class="text-xs font-medium text-muted-foreground">{{
                t("song.audioPlayer.customSpeed")
              }}</label>
              <div class="flex items-center space-x-2 mt-1">
                <Input
                  v-model="customSpeedInput"
                  type="number"
                  min="0.25"
                  max="4"
                  step="0.05"
                  placeholder="1.0"
                  class="h-6 text-xs"
                  @keyup.enter="applyCustomSpeed"
                />
                <Button
                  size="sm"
                  variant="outline"
                  class="h-6 px-2 text-xs"
                  @click="applyCustomSpeed"
                >
                  {{ t("song.audioPlayer.apply") }}
                </Button>
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                {{ t("song.audioPlayer.speedRange") }}
              </p>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem @click="resetSpeed">
              {{ t("song.audioPlayer.resetSpeed") }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Download Button -->
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          @click="downloadAudio"
        >
          <Download class="w-3 h-3 mr-1" />
          {{ t("song.download") }}
        </Button>
      </div>
    </div>

    <!-- Audio Controls -->
    <div class="space-y-3">
      <!-- Play/Pause and Progress -->
      <div class="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          :disabled="!canPlay"
          @click="togglePlayPause"
        >
          <Play v-if="!isPlaying" class="w-4 h-4" />
          <Pause v-else class="w-4 h-4" />
        </Button>

        <!-- Progress Bar -->
        <div class="flex-1 flex items-center space-x-2">
          <span class="text-xs text-muted-foreground w-12">{{
            formatTime(currentTime)
          }}</span>
          <Slider
            :model-value="[currentTime]"
            :max="duration || 100"
            :min="0"
            :step="0.1"
            class="flex-1"
            @update:model-value="onSeek"
          />
          <span class="text-xs text-muted-foreground w-12">{{
            formatTime(duration)
          }}</span>
        </div>
      </div>

      <!-- Volume Control -->
      <div class="flex items-center space-x-3">
        <VolumeX v-if="volume === 0" class="w-4 h-4 text-muted-foreground" />
        <Volume1
          v-else-if="volume < 0.5"
          class="w-4 h-4 text-muted-foreground"
        />
        <Volume2 v-else class="w-4 h-4 text-muted-foreground" />

        <Slider
          :model-value="[volume]"
          :max="1"
          :min="0"
          :step="0.01"
          class="flex-1"
          @update:model-value="onVolumeChange"
        />
        <span class="text-xs text-muted-foreground w-8"
          >{{ Math.round(volume * 100) }}%</span
        >
      </div>
    </div>

    <!-- Hidden Audio Element -->
    <audio
      ref="audioRef"
      preload="metadata"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @canplay="onCanPlay"
      @error="onError"
    >
      <source :src="audioUrl" />
      {{ t("song.audioPlayer.browserNotSupported") }}
    </audio>

    <!-- Status -->
    <div
      class="flex items-center justify-between text-xs text-muted-foreground"
    >
      <span>{{
        isPlaying ? t("song.audioPlayer.playing") : t("song.audioPlayer.paused")
      }}</span>
      <span v-if="error" class="text-destructive">{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronDown,
  Download,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-vue-next";

import { onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

interface Props {
  audioUrl: string;
  title?: string;
  fileSize?: string | number;
  autoplay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  fileSize: undefined,
  autoplay: false,
});

// I18n
const { t } = useI18n();

// Audio element ref
const audioRef = ref<HTMLAudioElement | null>(null);

// Playback state
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1.0);
const currentRate = ref(1.0);
const canPlay = ref(false);
const error = ref<string | null>(null);

// Custom speed input
const customSpeedInput = ref<string>("");

// Speed options - discrete buttons (much better UX than slider)
const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// Computed - removed progress as it's no longer needed with Slider

// Methods
const togglePlayPause = () => {
  if (!audioRef.value || !canPlay.value) return;

  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play();
  }
};

const onSeek = (value: number[] | undefined) => {
  if (!audioRef.value || duration.value === 0 || !value || value.length === 0)
    return;

  const newTime = value[0];
  audioRef.value.currentTime = Math.max(0, Math.min(newTime, duration.value));
};

const setPlaybackRate = (rate: number) => {
  if (!audioRef.value) return;

  audioRef.value.playbackRate = rate;
  currentRate.value = rate;
};

const onVolumeChange = (value: number[] | undefined) => {
  if (!audioRef.value || !value || value.length === 0) return;

  volume.value = value[0];
  audioRef.value.volume = volume.value;
};

const downloadAudio = () => {
  const link = document.createElement("a");
  link.href = props.audioUrl;
  link.download = props.title || t("song.audioPlayer.defaultAudioTitle");
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const applyCustomSpeed = () => {
  const speed = parseFloat(customSpeedInput.value);
  if (!isNaN(speed) && speed >= 0.25 && speed <= 4) {
    setPlaybackRate(speed);
    customSpeedInput.value = "";
  }
};

const resetSpeed = () => {
  setPlaybackRate(1.0);
  customSpeedInput.value = "";
};

// Event handlers
const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration;
    audioRef.value.volume = volume.value;
    audioRef.value.playbackRate = currentRate.value;
  }
};

const onTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
  }
};

const onEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
  if (audioRef.value) {
    audioRef.value.currentTime = 0;
  }
};

const onCanPlay = () => {
  canPlay.value = true;
  error.value = null;
};

const onError = (event: Event) => {
  const audioElement = event.target as HTMLAudioElement;
  const errorCode = audioElement.error?.code;
  const errorMessages: { [key: number]: string } = {
    1: t("song.audioPlayer.errors.loadingAborted"),
    2: t("song.audioPlayer.errors.networkError"),
    3: t("song.audioPlayer.errors.decodingFailed"),
    4: t("song.audioPlayer.errors.formatNotSupported"),
  };

  error.value =
    errorMessages[errorCode || 0] || t("song.audioPlayer.errors.unknownError");
  canPlay.value = false;
};

// Utility functions
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatFileSize = (bytes: string | number | null | undefined): string => {
  if (!bytes) return "";

  const numBytes = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes)) return "";

  const units = ["B", "KB", "MB", "GB"];
  let size = numBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Watch for audio URL changes
watch(
  () => props.audioUrl,
  () => {
    if (audioRef.value) {
      audioRef.value.src = props.audioUrl;
      audioRef.value.load();
      isPlaying.value = false;
      currentTime.value = 0;
      canPlay.value = false;
      error.value = null;
    }
  },
);

// Add event listeners for play/pause
onMounted(() => {
  if (audioRef.value) {
    audioRef.value.addEventListener("play", () => {
      isPlaying.value = true;
    });

    audioRef.value.addEventListener("pause", () => {
      isPlaying.value = false;
    });

    // Auto-play if requested
    if (props.autoplay) {
      setTimeout(() => {
        if (canPlay.value && audioRef.value) {
          audioRef.value.play();
        }
      }, 100);
    }
  }
});

// Cleanup
onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause();
    audioRef.value.src = "";
  }
});
</script>

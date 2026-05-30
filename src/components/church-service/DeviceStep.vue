<template>
  <div class="space-y-6">
    <!-- Device selection — grouped in a card so the synth controls read as one
         unit rather than loose elements on the page. -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base flex items-center gap-2">
          <Piano class="w-5 h-5 text-muted-foreground" />
          {{ t("churchService.device.title") }}
        </CardTitle>
        <CardDescription>
          {{ t("churchService.device.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <MidiDeviceSelector :show-label="false" />

        <!-- Slim inline status — the dropdown already names the device, so this
             is just a quiet ready/not-ready confirmation. -->
        <p
          v-if="selectedOutput"
          class="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-500"
        >
          <CheckCircle2 class="w-4 h-4 flex-shrink-0" />
          {{ t("churchService.device.connected") }}
        </p>
        <p
          v-else
          class="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-500"
        >
          <AlertTriangle class="w-4 h-4 flex-shrink-0" />
          {{ t("churchService.device.notConnected") }}
        </p>
      </CardContent>
    </Card>

    <!-- Service summary so the operator sees what's about to play -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          {{ t("churchService.device.summary") }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="store.playlist.length === 0" class="text-sm text-muted-foreground italic">
          {{ t("churchService.noSongsAdded") }}
        </div>
        <div v-else class="space-y-1 text-sm">
          <div
            v-for="(entry, index) in store.playlist"
            :key="index"
            class="flex items-center gap-2 py-1"
          >
            <span class="text-muted-foreground tabular-nums w-5 text-right">
              {{ index + 1 }}.
            </span>
            <Badge
              v-if="entry.role === 'intro'"
              variant="outline"
              class="text-[10px] bg-purple-100 text-purple-800 border-purple-200"
            >
              {{ t("churchService.intro") }}
            </Badge>
            <Badge
              v-else-if="entry.role === 'outro'"
              variant="outline"
              class="text-[10px] bg-amber-100 text-amber-800 border-amber-200"
            >
              {{ t("churchService.outro") }}
            </Badge>
            <span class="font-medium truncate">
              {{ entry.kind === "song" ? entry.song.titel : entry.piece.name }}
            </span>
            <span v-if="entry.kind === 'song'" class="text-xs text-muted-foreground tabular-nums">
              ({{ entry.verses.join(", ") }})
            </span>
            <span
              v-else-if="entry.piece.komponist"
              class="text-xs text-muted-foreground truncate"
            >
              {{ entry.piece.komponist }}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Step footer -->
    <div class="flex items-center justify-between gap-3 pt-2">
      <Button variant="outline" @click="store.goToSetup">
        <ChevronLeft class="w-4 h-4 mr-1" />
        {{ t("churchService.stepper.backToSetup") }}
      </Button>
      <Button
        size="lg"
        :disabled="!canStart"
        @click="store.startService"
      >
        <Play class="w-5 h-5 mr-1" />
        {{ t("churchService.stepper.startService") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChurchServiceStore } from "@/stores/churchService";
import { AlertTriangle, CheckCircle2, ChevronLeft, Piano, Play } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import MidiDeviceSelector from "@/components/song/MidiDeviceSelector.vue";

import { useMidiDevices } from "@/composables/useMidiPlayer";

const { t } = useI18n();
const store = useChurchServiceStore();
const { selectedOutput } = useMidiDevices();

const canStart = computed(() => store.canPlayService && !!selectedOutput.value);
</script>

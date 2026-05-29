<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Piano class="w-5 h-5 text-muted-foreground" />
          {{ t("churchService.device.title") }}
        </CardTitle>
        <CardDescription>
          {{ t("churchService.device.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <MidiDeviceSelector :show-label="false" />

        <div
          v-if="selectedOutput"
          class="flex items-start gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-900"
        >
          <CheckCircle2 class="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
          <div>
            <p class="font-medium">{{ t("churchService.device.connected") }}</p>
            <p class="text-xs text-green-800/80">{{ selectedOutput.name }}</p>
          </div>
        </div>

        <div
          v-else
          class="flex items-start gap-2 p-3 rounded-md bg-orange-50 border border-orange-200 text-sm text-orange-900"
        >
          <AlertTriangle class="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
          <p>{{ t("churchService.device.notConnected") }}</p>
        </div>
      </CardContent>
    </Card>

    <!-- Service summary so the operator sees what's about to play -->
    <Card>
      <CardHeader class="pb-3">
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

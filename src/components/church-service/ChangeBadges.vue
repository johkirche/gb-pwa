<template>
  <!-- Compact indicators shown in the history/prepared lists when an entry's
       tempo or key was adjusted away from the original. Render nothing when
       both are at their defaults. -->
  <Badge
    v-if="isSpeedChanged"
    variant="outline"
    class="text-[10px] tabular-nums inline-flex items-center gap-1"
    :title="t('churchService.speed.label')"
  >
    <Gauge class="w-3 h-3" />{{ speedText }}
  </Badge>
  <Badge
    v-if="isPitchChanged"
    variant="outline"
    class="text-[10px] tabular-nums inline-flex items-center gap-1"
    :title="t('churchService.pitch.label')"
  >
    <Music2 class="w-3 h-3" />{{ pitchText }}
  </Badge>
</template>

<script setup lang="ts">
import { Gauge, Music2 } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { Badge } from "@/components/ui/badge";

interface Props {
  speed: number;
  pitch: number;
}

const props = defineProps<Props>();

const { t } = useI18n();

const isSpeedChanged = computed(() => Math.abs(props.speed - 1) > 1e-6);
const isPitchChanged = computed(() => props.pitch !== 0);
// Tempo as a multiplier (we don't have the base BPM in the list view).
const speedText = computed(() => `${props.speed.toFixed(2)}×`);
const pitchText = computed(() => (props.pitch > 0 ? `+${props.pitch}` : `${props.pitch}`));
</script>

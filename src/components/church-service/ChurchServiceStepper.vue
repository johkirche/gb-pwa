<template>
  <div class="flex items-center justify-center gap-2 sm:gap-4">
    <template v-for="(step, idx) in steps" :key="step.key">
      <button
        type="button"
        :disabled="step.state === 'upcoming' || step.key === current"
        :class="[
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
          step.state === 'current'
            ? 'bg-primary text-primary-foreground font-medium'
            : step.state === 'done'
              ? 'bg-green-100 text-green-900 hover:bg-green-200 cursor-pointer'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
        ]"
        @click="step.state === 'done' && emit('jump', step.key)"
      >
        <span
          :class="[
            'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold tabular-nums flex-shrink-0',
            step.state === 'current'
              ? 'bg-primary-foreground text-primary'
              : step.state === 'done'
                ? 'bg-green-600 text-white'
                : 'bg-muted-foreground/30 text-muted-foreground',
          ]"
        >
          <Check v-if="step.state === 'done'" class="w-3.5 h-3.5" />
          <span v-else>{{ idx + 1 }}</span>
        </span>
        <span class="whitespace-nowrap">{{ step.label }}</span>
      </button>
      <ChevronRight
        v-if="idx < steps.length - 1"
        class="w-4 h-4 text-muted-foreground flex-shrink-0"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronRight } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { WizardStep } from "@/stores/churchService";

interface Props {
  current: WizardStep;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  jump: [step: WizardStep];
}>();

const { t } = useI18n();

const order: WizardStep[] = ["setup", "device", "run"];

type StepState = "done" | "current" | "upcoming";

const steps = computed(() => {
  const currentIndex = order.indexOf(props.current);
  return order.map((key, idx) => {
    let state: StepState;
    if (idx < currentIndex) state = "done";
    else if (idx === currentIndex) state = "current";
    else state = "upcoming";
    return {
      key,
      label: t(`churchService.stepper.${key}`),
      state,
    };
  });
});
</script>

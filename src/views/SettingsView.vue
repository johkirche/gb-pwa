<template>
  <AppLayout>
    <main class="container mx-auto py-8 max-w-6xl space-y-6">
      <PageHeader :items="breadcrumbs" />

      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ t("settings.pageTitle") }}</h1>
      </div>

      <!-- MIDI Device + Synth Settings. The selector renders the synth
           controls inline when the in-browser synth is the active output, so
           we don't repeat them in a second card here. -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <Piano class="w-5 h-5 mr-2 text-muted-foreground" />
            {{ t("settings.midi.title") }}
          </CardTitle>
          <CardDescription>
            {{ t("settings.midi.description") }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MidiDeviceSelector :show-label="false" />
          <p v-if="selectedOutput" class="text-xs text-muted-foreground mt-3">
            {{ t("settings.midi.currentlySelected") }}:
            <span class="font-medium">{{ selectedOutput.name }}</span>
          </p>
        </CardContent>
      </Card>
    </main>
  </AppLayout>
</template>

<script setup lang="ts">
import { Piano } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import AppLayout from "@/components/layout/AppLayout.vue";
import PageHeader, { type BreadcrumbItem } from "@/components/layout/PageHeader.vue";
import MidiDeviceSelector from "@/components/song/MidiDeviceSelector.vue";

import { useMidiDevices } from "@/composables/useMidiPlayer";

const { t } = useI18n();
const { selectedOutput } = useMidiDevices();

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: t("nav.home"), to: { name: "home" } },
  { label: t("settings.pageTitle") },
]);
</script>

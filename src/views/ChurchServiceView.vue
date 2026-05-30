<template>
  <AppLayout>
    <main class="container mx-auto py-8 max-w-6xl space-y-10">
      <PageHeader :items="breadcrumbs" />

      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ t("churchService.title") }}</h1>
      </div>

        <!-- Entry screen (idle): start CTA + history list -->
        <template v-if="store.wizardStep === 'idle'">
          <!-- Entry hero (de-carded) -->
          <div class="flex flex-col items-center text-center gap-4 py-6">
            <div
              class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"
            >
              <Church class="w-8 h-8" />
            </div>
            <div class="space-y-1.5">
              <h2 class="text-xl font-semibold tracking-tight">
                {{ t("churchService.entry.title") }}
              </h2>
              <p class="text-sm text-muted-foreground max-w-md mx-auto">
                {{ t("churchService.entry.description") }}
              </p>
            </div>
            <Button size="lg" @click="store.startSetup">
              <Plus class="w-5 h-5 mr-1" />
              {{ t("churchService.entry.startNew") }}
            </Button>
          </div>

          <!-- Prepared ("future") services — only shown once at least one exists. -->
          <ServiceHistory
            v-if="store.preparedServices.length > 0"
            :history="store.preparedServices"
            :title="t('churchService.prepared.title')"
            :description="t('churchService.prepared.description')"
            :empty-title="t('churchService.prepared.empty')"
            :empty-description="t('churchService.prepared.emptyDescription')"
            icon="🗓️"
            @load-service="store.loadService"
            @delete-service="store.deletePreparedService"
          />

          <ServiceHistory
            :history="store.serviceHistory"
            @load-service="store.loadService"
            @delete-service="store.deleteService"
          />
        </template>

        <!-- Wizard (setup / device / run) -->
        <template v-else>
          <ChurchServiceStepper :current="store.wizardStep" @jump="onStepperJump" />

          <SetupStep v-if="store.wizardStep === 'setup'" @back="store.discardService" />
          <DeviceStep v-else-if="store.wizardStep === 'device'" />
          <RunStep v-else-if="store.wizardStep === 'run'" />
        </template>
    </main>

    <!-- Post-service save prompt — rendered at root so it overlays regardless of step. -->
    <SaveServiceDialog />
    <!-- "Save for later" prompt from the setup step. -->
    <SavePreparedDialog />
  </AppLayout>
</template>

<script setup lang="ts">
import { useChurchServiceStore } from "@/stores/churchService";
import type { WizardStep } from "@/stores/churchService";
import { Church, Plus } from "lucide-vue-next";

import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";

import AppLayout from "@/components/layout/AppLayout.vue";
import PageHeader, { type BreadcrumbItem } from "@/components/layout/PageHeader.vue";
import ChurchServiceStepper from "@/components/church-service/ChurchServiceStepper.vue";
import DeviceStep from "@/components/church-service/DeviceStep.vue";
import RunStep from "@/components/church-service/RunStep.vue";
import SavePreparedDialog from "@/components/church-service/SavePreparedDialog.vue";
import SaveServiceDialog from "@/components/church-service/SaveServiceDialog.vue";
import ServiceHistory from "@/components/church-service/ServiceHistory.vue";
import SetupStep from "@/components/church-service/SetupStep.vue";

const { t } = useI18n();
const store = useChurchServiceStore();

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: t("nav.home"), to: { name: "home" } },
  { label: t("churchService.title") },
]);

// Stepper jump: only "done" steps emit. From run → device is not safe (a stop
// would lose state); we ignore those by only mapping to known back-steps.
function onStepperJump(step: WizardStep) {
  if (step === "setup") store.goToSetup();
  else if (step === "device") store.goToDevice();
}

onMounted(async () => {
  await Promise.all([store.loadHistory(), store.loadPreparedServices()]);
});
</script>

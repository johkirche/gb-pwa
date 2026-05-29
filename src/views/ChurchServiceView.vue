<template>
  <div class="min-h-screen bg-background">
    <AppHeader :page-title="t('churchService.title')" :show-back-button="true" />
    <ScrollArea class="h-[calc(100vh-65px)]">
      <main class="container mx-auto py-8 max-w-6xl space-y-6">
        <!-- Entry screen (idle): start CTA + history list -->
        <template v-if="store.wizardStep === 'idle'">
          <Card>
            <CardContent class="pt-6 flex flex-col items-center text-center gap-4">
              <div
                class="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center"
              >
                <Church class="w-7 h-7" />
              </div>
              <div class="space-y-1">
                <h2 class="text-xl font-semibold">{{ t("churchService.entry.title") }}</h2>
                <p class="text-sm text-muted-foreground">
                  {{ t("churchService.entry.description") }}
                </p>
              </div>
              <Button size="lg" @click="store.startSetup">
                <Plus class="w-5 h-5 mr-1" />
                {{ t("churchService.entry.startNew") }}
              </Button>
            </CardContent>
          </Card>

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
    </ScrollArea>

    <!-- Post-service save prompt — rendered at root so it overlays regardless of step. -->
    <SaveServiceDialog />
  </div>
</template>

<script setup lang="ts">
import { useChurchServiceStore } from "@/stores/churchService";
import type { WizardStep } from "@/stores/churchService";
import { Church, Plus } from "lucide-vue-next";

import { onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import AppHeader from "@/components/AppHeader.vue";
import ChurchServiceStepper from "@/components/church-service/ChurchServiceStepper.vue";
import DeviceStep from "@/components/church-service/DeviceStep.vue";
import RunStep from "@/components/church-service/RunStep.vue";
import SaveServiceDialog from "@/components/church-service/SaveServiceDialog.vue";
import ServiceHistory from "@/components/church-service/ServiceHistory.vue";
import SetupStep from "@/components/church-service/SetupStep.vue";

const { t } = useI18n();
const store = useChurchServiceStore();

// Stepper jump: only "done" steps emit. From run → device is not safe (a stop
// would lose state); we ignore those by only mapping to known back-steps.
function onStepperJump(step: WizardStep) {
  if (step === "setup") store.goToSetup();
  else if (step === "device") store.goToDevice();
}

onMounted(async () => {
  await store.loadHistory();
});
</script>

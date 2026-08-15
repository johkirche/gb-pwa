<template>
  <div
    class="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="absolute top-4 right-4 z-20">
      <LanguageSwitch variant="flag-button" flag-size="sm" />
    </div>

    <Card class="w-full max-w-lg shadow-xl shadow-black/5">
      <CardHeader class="text-center">
        <div
          class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
        >
          <AlertTriangle class="h-7 w-7 text-destructive" />
        </div>
        <CardTitle class="text-2xl font-bold">{{ t("configError.title") }}</CardTitle>
        <CardDescription>{{ t("configError.description") }}</CardDescription>
      </CardHeader>

      <CardContent class="space-y-6">
        <div class="space-y-1.5">
          <p class="text-sm text-muted-foreground">{{ t("configError.missingVarLabel") }}</p>
          <code
            class="block rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground break-all"
            >{{ MISSING_VAR }}</code
          >
        </div>

        <div class="space-y-2">
          <h2 class="text-sm font-semibold text-foreground">{{ t("configError.fixTitle") }}</h2>
          <ol class="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>{{ t("configError.step1") }}</li>
            <li>{{ t("configError.step2", { var: MISSING_VAR }) }}</li>
            <li>{{ t("configError.step3") }}</li>
          </ol>
        </div>

        <Button type="button" class="w-full" size="lg" @click="retry">
          <RefreshCw class="mr-2 h-5 w-5" />
          {{ t("configError.retry") }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, RefreshCw } from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import LanguageSwitch from "@/components/ui/LanguageSwitch.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Kept in sync with the variable checked by isDirectusConfigured().
const MISSING_VAR = "VITE_PUBLIC_DIRECTUS_URL";

const { t } = useI18n();

// A full reload re-reads import.meta.env, so once the user fixes .env and
// restarts the dev server this re-runs the router guard and lets them through.
const retry = (): void => {
  window.location.reload();
};
</script>

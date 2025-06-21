<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("home.audioFormats.title") }}</CardTitle>
      <CardDescription>{{
        t("home.audioFormats.description")
      }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="text-center p-4 rounded-lg border">
          <div class="text-2xl mb-2">🎵</div>
          <h3 class="font-semibold">MP3</h3>
          <p class="text-sm text-muted-foreground">
            {{ t("home.audioFormats.mp3") }}
          </p>
        </div>
        <div class="text-center p-4 rounded-lg border">
          <div class="text-2xl mb-2">🎶</div>
          <h3 class="font-semibold">OGG</h3>
          <p class="text-sm text-muted-foreground">
            {{ t("home.audioFormats.ogg") }}
          </p>
        </div>
        <div class="text-center p-4 rounded-lg border">
          <div class="text-2xl mb-2">🎼</div>
          <h3 class="font-semibold">WAV</h3>
          <p class="text-sm text-muted-foreground">
            {{ t("home.audioFormats.wav") }}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const { t } = useI18n();
</script>

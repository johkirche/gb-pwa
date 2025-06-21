<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center">
        <Info class="w-5 h-5 mr-2 text-muted-foreground" />
        {{ t("song.information") }}
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="lied.einreicherName" class="space-y-1">
        <p class="text-sm font-medium text-muted-foreground">
          {{ t("song.submittedBy") }}
        </p>
        <p class="text-sm">{{ lied.einreicherName }}</p>
      </div>

      <div v-if="lied.externerLink" class="space-y-1">
        <p class="text-sm font-medium text-muted-foreground">
          {{ t("song.externalLink") }}
        </p>
        <a
          :href="lied.externerLink"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary hover:underline flex items-center"
        >
          {{ lied.externerLink }}
          <ExternalLink class="w-3 h-3 ml-1" />
        </a>
      </div>

      <div v-if="lied.linkCloud" class="space-y-1">
        <p class="text-sm font-medium text-muted-foreground">
          {{ t("song.cloudLink") }}
        </p>
        <a
          :href="lied.linkCloud"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary hover:underline flex items-center"
        >
          {{ t("song.viewInCloud") }}
          <Cloud class="w-3 h-3 ml-1" />
        </a>
      </div>

      <!-- Status Indicators -->
      <div class="space-y-2">
        <div
          v-if="lied.liedHatAenderung"
          class="flex items-center text-orange-600"
        >
          <AlertTriangle class="w-4 h-4 mr-2" />
          <span class="text-sm">{{ t("song.songHasChanges") }}</span>
        </div>
        <div v-if="lied.textGeaendert" class="flex items-center text-blue-600">
          <FileText class="w-4 h-4 mr-2" />
          <span class="text-sm">{{ t("song.textModified") }}</span>
        </div>
        <div
          v-if="lied.melodieGeaendert"
          class="flex items-center text-purple-600"
        >
          <Music class="w-4 h-4 mr-2" />
          <span class="text-sm">{{ t("song.melodyModified") }}</span>
        </div>
      </div>

      <div v-if="lied.rueckfrageAutor" class="space-y-1">
        <p class="text-sm font-medium text-muted-foreground">
          {{ t("song.authorQuery") }}
        </p>
        <p class="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
          {{ lied.rueckfrageAutor }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  Cloud,
  ExternalLink,
  FileText,
  Info,
  Music,
} from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const { t } = useI18n();

interface Props {
  lied: Gesangbuchlied;
}

defineProps<Props>();
</script>

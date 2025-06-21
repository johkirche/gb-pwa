<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center">
        <Users class="w-5 h-5 mr-2 text-muted-foreground" />
        {{ t("song.authors") }}
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Text Authors -->
      <div v-if="textAuthors.length > 0">
        <h4 class="font-medium text-sm text-muted-foreground mb-2">
          {{ t("song.textAuthors") }}
        </h4>
        <div class="space-y-2">
          <div
            v-for="author in textAuthors"
            :key="author.id"
            class="flex items-center p-2 bg-muted rounded-lg"
          >
            <User class="w-4 h-4 mr-2 text-muted-foreground" />
            <div>
              <p class="font-medium">{{ getAuthorName(author) }}</p>
              <p
                v-if="author.geburtsjahr || author.sterbejahr"
                class="text-xs text-muted-foreground"
              >
                {{ author.geburtsjahr || "?" }} -
                {{ author.sterbejahr || t("song.present") }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Melody Authors -->
      <div v-if="melodyAuthors.length > 0">
        <h4 class="font-medium text-sm text-muted-foreground mb-2">
          {{ t("song.melodyAuthors") }}
        </h4>
        <div class="space-y-2">
          <div
            v-for="author in melodyAuthors"
            :key="author.id"
            class="flex items-center p-2 bg-muted rounded-lg"
          >
            <Music class="w-4 h-4 mr-2 text-muted-foreground" />
            <div>
              <p class="font-medium">{{ getAuthorName(author) }}</p>
              <p
                v-if="author.geburtsjahr || author.sterbejahr"
                class="text-xs text-muted-foreground"
              >
                {{ author.geburtsjahr || "?" }} -
                {{ author.sterbejahr || t("song.present") }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="textAuthors.length === 0 && melodyAuthors.length === 0">
        <p class="text-muted-foreground text-sm">
          {{ t("song.noAuthorInfo") }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Music, User, Users } from "lucide-vue-next";

import { useI18n } from "vue-i18n";

import type { Autor } from "@/gql/graphql";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const { t } = useI18n();

interface Props {
  textAuthors: Autor[];
  melodyAuthors: Autor[];
}

defineProps<Props>();

const getAuthorName = (author: Autor): string => {
  return (
    `${author.vorname || ""} ${author.nachname || ""}`.trim() ||
    t("utils.unknown")
  );
};
</script>

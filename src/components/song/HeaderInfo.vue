<template>
  <Card>
    <CardHeader>
      <div class="flex justify-between items-start gap-3">
        <div class="space-y-2 flex-1 min-w-0">
          <div class="flex items-baseline gap-3 flex-wrap">
            <span
              v-if="liedNumber !== null"
              class="inline-flex items-center px-3 py-1 rounded-md bg-primary text-primary-foreground text-2xl font-bold tabular-nums leading-none flex-shrink-0"
              :title="numberTooltip"
            >
              {{ liedNumber }}
            </span>
            <CardTitle class="text-3xl">{{ lied.titel }}</CardTitle>
          </div>
          <div v-if="categories.length" class="flex flex-wrap gap-2">
            <Badge
              v-for="category in categories"
              :key="category"
              variant="secondary"
            >
              <Tag class="w-3 h-3 mr-1" />
              {{ category }}
            </Badge>
          </div>
        </div>
        <div class="text-right text-sm text-muted-foreground flex-shrink-0">
          <p v-if="lied.liednummer2000 && liedExt.liednummer2026">
            {{ t("song.songNumber2000") }} {{ lied.liednummer2000 }}
          </p>
          <p>{{ t("song.updated") }}: {{ formatDate(lied.date_updated) }}</p>
        </div>
      </div>
    </CardHeader>
  </Card>
</template>

<script setup lang="ts">
import { Tag } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { Gesangbuchlied } from "@/gql/graphql";
import { type GesangbuchliedWithMidi, getLiedNumber } from "@/gql/extra-types";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const { t } = useI18n();

interface Props {
  lied: Gesangbuchlied;
}

const props = defineProps<Props>();

const categories = computed(() => getCategories(props.lied));
const liedExt = computed(() => props.lied as GesangbuchliedWithMidi);
const liedNumber = computed(() => getLiedNumber(props.lied));
const numberTooltip = computed(() => {
  // Show which edition the prominent number comes from, plus the legacy number
  // if both exist — keeps the prominent slot uncluttered without losing info.
  const parts: string[] = [];
  if (liedExt.value.liednummer2026)
    parts.push(`${t("song.songNumber2026")} ${liedExt.value.liednummer2026}`);
  if (props.lied.liednummer2000)
    parts.push(`${t("song.songNumber2000")} ${props.lied.liednummer2000}`);
  return parts.join(" · ");
});

const getCategories = (lied: Gesangbuchlied): string[] => {
  if (!lied.kategorieId) return [];

  return lied.kategorieId
    .map((kat) => kat?.kategorie_id?.name)
    .filter(Boolean) as string[];
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return t("utils.unknown");

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return t("utils.unknown");
  }
};
</script>

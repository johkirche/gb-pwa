<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <AuthorsCard :text-authors="textAuthors" :melody-authors="melodyAuthors" />
    <InfoCard :lied="lied" />
  </div>
</template>

<script setup lang="ts">
import type { Gesangbuchlied } from "@/gql/graphql";
import AuthorsCard from "./AuthorsCard.vue";
import InfoCard from "./InfoCard.vue";

interface Author {
  id: string;
  vorname?: string;
  nachname?: string;
  geburtsjahr?: number;
  sterbejahr?: number;
}

interface Props {
  lied: Gesangbuchlied;
  textAuthors: Author[];
  melodyAuthors: Author[];
}

defineProps<Props>();
</script>

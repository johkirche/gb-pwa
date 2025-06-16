<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <AuthorsCard :text-authors="textAuthors" :melody-authors="melodyAuthors" />
    <InfoCard :lied="lied" />
  </div>
</template>

<script setup lang="ts">
import type { Gesangbuchlied, Autor } from "@/gql/graphql";
import AuthorsCard from "./AuthorsCard.vue";
import InfoCard from "./InfoCard.vue";

interface Props {
  lied: Gesangbuchlied;
  textAuthors: Autor[];
  melodyAuthors: Autor[];
}

defineProps<Props>();
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <AuthorsCard :text-authors="textAuthors" :melody-authors="melodyAuthors" />
    <InfoCard :lied="lied" />
  </div>
</template>

<script setup lang="ts">
import type { Autor, Gesangbuchlied } from "@/gql/graphql";

import AuthorsCard from "@/components/song/AuthorsCard.vue";
import InfoCard from "@/components/song/InfoCard.vue";

interface Props {
  lied: Gesangbuchlied;
  textAuthors: Autor[];
  melodyAuthors: Autor[];
}

defineProps<Props>();
</script>

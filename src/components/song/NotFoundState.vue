<template>
  <Card class="text-center py-12">
    <CardContent>
      <Music class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-2">{{ t("song.songNotFound") }}</h3>
      <p class="text-muted-foreground mb-4">
        {{ t("song.songNotFoundDescription") }}
      </p>
      <Button variant="outline" @click="router.push('/lieder')">
        <ArrowLeft class="w-4 h-4 mr-2" />
        {{ t("song.backToSongList") }}
      </Button>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ArrowLeft, Music } from "lucide-vue-next";

import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const { t } = useI18n();

const router = useRouter();
</script>

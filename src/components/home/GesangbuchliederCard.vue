<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center">
        <Music class="w-5 h-5 mr-2 text-muted-foreground" />
        {{ t("home.gesangbuchlieder") }}
      </CardTitle>
      <CardDescription>
        {{ t("home.browseDescription") }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col space-y-4">
        <!-- Browse Songs Button -->
        <Button class="w-fit" @click="router.push('/lieder')">
          <Music class="w-4 h-4 mr-2" />
          {{ t("home.browseAllSongs") }}
        </Button>

        <!-- Quick Fetch for Testing -->
        <div class="border-t pt-4">
          <p class="text-sm text-muted-foreground mb-2">
            {{ t("home.quickTestFetch") }}
          </p>
          <Button
            class="w-fit"
            variant="outline"
            size="sm"
            :disabled="isLoading"
            @click="$emit('fetchSongs')"
          >
            <Music class="w-4 h-4 mr-2" />
            {{ isLoading ? t("utils.loading") : t("home.testFetchAPI") }}
          </Button>

          <div v-if="queryError" class="text-red-600 text-sm mt-2">
            {{ t("home.errorLoadingData") }}: {{ queryError }}
          </div>

          <div v-if="songs.length > 0" class="mt-4">
            <p class="text-sm text-muted-foreground mb-2">
              {{ t("home.foundSongs", { count: songs.length }) }}
            </p>
            <div class="max-h-60 overflow-y-auto border rounded-lg p-4 bg-muted/50">
              <pre class="text-xs">{{ JSON.stringify(songs.slice(0, 2), null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Music } from "lucide-vue-next";

import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const { t } = useI18n();

defineProps({
  songs: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  queryError: {
    type: String,
    default: null,
  },
});

defineEmits(["fetchSongs"]);

const router = useRouter();
</script>

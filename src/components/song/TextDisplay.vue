<template>
  <Card v-if="strophes?.length">
    <CardHeader>
      <CardTitle class="flex items-center">
        <FileText class="w-5 h-5 mr-2 text-muted-foreground" />
        Song Text
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-6">
        <div v-for="(strophe, index) in strophes" :key="index" class="relative">
          <div class="flex items-start space-x-4">
            <div
              class="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center"
            >
              <span class="text-sm font-medium text-primary">{{
                index + 1
              }}</span>
            </div>
            <div class="flex-1 space-y-2">
              <div class="bg-muted/50 p-4 rounded-lg">
                <pre
                  class="whitespace-pre-wrap font-serif text-base leading-relaxed"
                  >{{ strophe?.strophe }}</pre
                >
              </div>

              <!-- Change suggestions -->
              <div
                v-if="strophe?.aenderungsvorschlag"
                class="bg-yellow-50 border border-yellow-200 p-3 rounded-lg"
              >
                <p class="text-sm font-medium text-yellow-800 mb-1">
                  Change Suggestion:
                </p>
                <pre class="whitespace-pre-wrap text-sm text-yellow-700">{{
                  strophe.aenderungsvorschlag
                }}</pre>
              </div>

              <!-- Notes -->
              <div
                v-if="strophe?.anmerkung"
                class="bg-blue-50 border border-blue-200 p-3 rounded-lg"
              >
                <p class="text-sm font-medium text-blue-800 mb-1">Note:</p>
                <p class="text-sm text-blue-700">{{ strophe.anmerkung }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-vue-next";

interface Strophe {
  strophe?: string;
  aenderungsvorschlag?: string;
  anmerkung?: string;
}

interface Props {
  strophes?: Strophe[];
}

defineProps<Props>();
</script>

<style scoped>
pre {
  font-family: "Georgia", "Times New Roman", serif;
}
</style>

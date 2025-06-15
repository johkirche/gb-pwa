<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center">
        <Music class="w-5 h-5 mr-2 text-muted-foreground" />
        Gesangbuchlieder
      </CardTitle>
      <CardDescription>
        Browse and search through all the songs in the Gesangbuch.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col space-y-4">
        <!-- Browse Songs Button -->
        <Button class="w-fit" @click="router.push('/lieder')">
          <Music class="w-4 h-4 mr-2" />
          Browse All Songs
        </Button>

        <!-- Quick Fetch for Testing -->
        <div class="border-t pt-4">
          <p class="text-sm text-muted-foreground mb-2">
            Quick test fetch (for development):
          </p>
          <Button
            class="w-fit"
            variant="outline"
            size="sm"
            :disabled="isLoading"
            @click="$emit('fetchSongs')"
          >
            <Music class="w-4 h-4 mr-2" />
            {{ isLoading ? "Loading..." : "Test Fetch API" }}
          </Button>

          <div v-if="queryError" class="text-red-600 text-sm mt-2">
            Error loading data: {{ queryError }}
          </div>

          <div v-if="songs.length > 0" class="mt-4">
            <p class="text-sm text-muted-foreground mb-2">
              Found {{ songs.length }} songs:
            </p>
            <div
              class="max-h-60 overflow-y-auto border rounded-lg p-4 bg-muted/50"
            >
              <pre class="text-xs">{{
                JSON.stringify(songs.slice(0, 2), null, 2)
              }}</pre>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Music } from "lucide-vue-next";

const props = defineProps({
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

const emit = defineEmits(["fetchSongs"]);

const router = useRouter();
</script>

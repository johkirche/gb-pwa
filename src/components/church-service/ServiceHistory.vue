<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <span>📚</span>
        <span>{{ t("churchService.history.title") }}</span>
      </CardTitle>
      <CardDescription>
        {{ t("churchService.history.description") }}
      </CardDescription>
    </CardHeader>

    <CardContent>
      <!-- Empty State -->
      <div v-if="history.length === 0" class="text-center py-8">
        <History class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 class="text-lg font-medium text-muted-foreground mb-2">
          {{ t("churchService.history.empty") }}
        </h3>
        <p class="text-sm text-muted-foreground">
          {{ t("churchService.history.emptyDescription") }}
        </p>
      </div>

      <!-- History List -->
      <div v-else class="h-[500px] overflow-auto" ref="scrollElement">
        <div :style="{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }">
          <div
            v-for="virtualItem in virtualizer.getVirtualItems()"
            :key="virtualItem.index"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
              paddingBottom: '16px', // Add spacing between items
            }"
          >
            <div class="border rounded-lg p-4 transition-colors h-full relative">
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-2 mb-2">
                    <h4 class="font-medium truncate">{{ history[virtualItem.index].name }}</h4>
                    <Badge variant="outline" class="text-xs">
                      {{ formatDate(history[virtualItem.index].createdAt) }}
                    </Badge>
                    <Badge variant="secondary" class="text-xs">
                      {{
                        t("churchService.songsCount", {
                          count: history[virtualItem.index].songs.length,
                        })
                      }}
                    </Badge>
                  </div>

                  <div class="space-y-2">
                    <!-- Songs List -->
                    <div
                      v-for="(serviceSong, index) in history[virtualItem.index].songs"
                      :key="index"
                      class="flex items-center space-x-2 text-sm"
                    >
                      <span class="text-muted-foreground">{{ index + 1 }}.</span>
                      <span class="font-medium">{{
                        serviceSong.song?.titel || t("utils.unknown")
                      }}</span>
                      <span class="text-muted-foreground">
                        ({{ t("churchService.verses") }}: {{ serviceSong.verses.join(", ") }})
                      </span>
                      <Badge
                        v-if="hasAudioFiles(serviceSong.song)"
                        variant="secondary"
                        class="text-xs"
                      >
                        🎵
                      </Badge>
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="loadService(history[virtualItem.index])"
                  >
                    <Download class="w-4 h-4 mr-1" />
                    {{ t("churchService.history.load") }}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="sm">
                        <MoreVertical class="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="loadService(history[virtualItem.index])">
                        <Download class="w-4 h-4 mr-2" />
                        {{ t("churchService.history.load") }}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        class="text-destructive"
                        @click="confirmDelete(history[virtualItem.index])"
                      >
                        <Trash2 class="w-4 h-4 mr-2" />
                        {{ t("churchService.history.delete") }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="deleteDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t("churchService.history.confirmDelete") }}</DialogTitle>
          <DialogDescription>
            {{
              t("churchService.history.confirmDeleteDescription", { name: serviceToDelete?.name })
            }}
          </DialogDescription>
        </DialogHeader>

        <div class="flex justify-end space-x-2 mt-4">
          <Button variant="outline" @click="deleteDialogOpen = false">
            {{ t("utils.cancel") }}
          </Button>
          <Button variant="destructive" @click="confirmDeleteService">
            {{ t("utils.delete") }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </Card>
</template>

<script setup lang="ts">
import { useVirtualizer } from "@tanstack/vue-virtual";
import { Download, History, MoreVertical, Trash2 } from "lucide-vue-next";

import { ref, toRefs } from "vue";
import { useI18n } from "vue-i18n";

import type { Gesangbuchlied } from "@/gql/graphql";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ServiceHistoryItem } from "@/composables/useChurchService";

interface Props {
  history: ServiceHistoryItem[];
}

const props = defineProps<Props>();
const { history } = toRefs(props);

const emit = defineEmits<{
  loadService: [service: ServiceHistoryItem];
  deleteService: [id: string];
}>();

const { t } = useI18n();

const deleteDialogOpen = ref(false);
const serviceToDelete = ref<ServiceHistoryItem | null>(null);
const scrollElement = ref<HTMLElement>();

// Virtualizer setup
const virtualizer = useVirtualizer({
  get count() {
    return history.value.length;
  },
  getScrollElement: () => scrollElement.value || null,
  estimateSize: (index) => {
    // Dynamic height estimation based on song count
    const service = history.value[index];
    if (!service) return 120; // fallback

    // Base height for service header and container
    const baseHeight = 70;
    // Each song adds approximately 28px
    const songHeight = service.songs.length * 22.2;
    // Add padding between items
    const spacing = 8;

    return baseHeight + songHeight + spacing;
  },
  overscan: 3,
  // Remove measureElement for now to test basic functionality
});

const loadService = (service: ServiceHistoryItem) => {
  emit("loadService", service);
};

const confirmDelete = (service: ServiceHistoryItem) => {
  serviceToDelete.value = service;
  deleteDialogOpen.value = true;
};

const confirmDeleteService = () => {
  if (serviceToDelete.value) {
    emit("deleteService", serviceToDelete.value.id);
    deleteDialogOpen.value = false;
    serviceToDelete.value = null;
  }
};

const hasAudioFiles = (song: Gesangbuchlied | null): boolean => {
  if (!song) return false;
  return !!song.melodieId?.noten?.some((note) => note?.directus_files_id?.type?.includes("audio"));
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return t("utils.unknown");
  }
};
</script>

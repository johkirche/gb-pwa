<template>
  <Dialog :open="store.saveDialogOpen" @update:open="onOpenChange">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t("churchService.save.title") }}</DialogTitle>
        <DialogDescription>
          {{
            t("churchService.save.description", {
              count: songCount,
            })
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2 mt-2">
        <label for="service-name" class="text-sm font-medium">
          {{ t("churchService.save.nameLabel") }}
        </label>
        <Input
          id="service-name"
          v-model="name"
          :placeholder="defaultName"
          autofocus
        />
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" @click="store.discardService">
          {{ t("churchService.save.discard") }}
        </Button>
        <Button @click="onSave">
          {{ t("churchService.save.save") }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { useChurchServiceStore } from "@/stores/churchService";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const { t } = useI18n();
const store = useChurchServiceStore();

const name = ref("");

const songCount = computed(() => store.playlist.length);

const defaultName = computed(() =>
  t("churchService.save.defaultName", {
    date: new Date().toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }),
);

// Pre-fill the input when the dialog opens, clear it when it closes.
watch(
  () => store.saveDialogOpen,
  (open) => {
    if (open) name.value = defaultName.value;
    else name.value = "";
  },
);

function onSave() {
  void store.confirmSave(name.value || defaultName.value);
}

// Treat clicking outside / pressing Esc as "discard" — the service is gone
// either way, and silently dropping it is more honest than reopening the dialog.
function onOpenChange(open: boolean) {
  if (!open) store.discardService();
}
</script>

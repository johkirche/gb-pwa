<template>
  <Dialog :open="store.preparedDialogOpen" @update:open="onOpenChange">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t("churchService.prepared.saveDialog.title") }}</DialogTitle>
        <DialogDescription>
          {{ t("churchService.prepared.saveDialog.description") }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2 mt-2">
        <label for="prepared-name" class="text-sm font-medium">
          {{ t("churchService.save.nameLabel") }}
        </label>
        <Input
          id="prepared-name"
          v-model="name"
          :placeholder="defaultName"
          autofocus
          @keydown.enter.prevent="onSave"
        />
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <Button variant="outline" @click="store.closePreparedDialog">
          {{ t("utils.cancel") }}
        </Button>
        <Button @click="onSave">
          {{ t("churchService.prepared.saveDialog.save") }}
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

const defaultName = computed(() =>
  t("churchService.prepared.defaultName", {
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
  () => store.preparedDialogOpen,
  (open) => {
    if (open) name.value = defaultName.value;
    else name.value = "";
  },
);

function onSave() {
  void store.saveAsPrepared(name.value || defaultName.value);
}

function onOpenChange(open: boolean) {
  if (!open) store.closePreparedDialog();
}
</script>

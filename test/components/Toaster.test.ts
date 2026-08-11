import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

import Toaster from "@/components/ui/toast/Toaster.vue";
import { useToast } from "@/composables/useToast";
import { useChurchServiceStore } from "@/stores/churchService";

// The point of issue #27's second half: the store's messages used to go to
// console.log and never reach the screen. These mount the real host and assert
// the text is actually rendered — and translated, since the store queues keys.
//
// Messages are inlined rather than pulled from the real plugin so the assertions
// stay stable if a translation string is reworded.
const i18n = createI18n({
  legacy: false,
  locale: "de",
  messages: {
    de: {
      utils: { close: "Schließen" },
      churchService: {
        toast: {
          saveFailed: {
            title: "Speichern fehlgeschlagen",
            description: "Der Gottesdienst konnte nicht gespeichert werden.",
          },
          saved: {
            title: "Gottesdienst gespeichert",
            description: "„{name}“ wurde im Verlauf gespeichert.",
          },
        },
      },
    },
  },
});

function mountToaster() {
  return mount(Toaster, { global: { plugins: [i18n] } });
}

/** Make every IndexedDB call fail before the store ever opened the database. */
function breakIndexedDB() {
  vi.stubGlobal("indexedDB", {
    open: () => {
      throw new Error("IndexedDB is unavailable");
    },
  });
}

beforeEach(() => {
  useToast().clear();
  setActivePinia(createPinia());
});

describe("Toaster", () => {
  it("renders nothing while the queue is empty", () => {
    expect(mountToaster().text()).toBe("");
  });

  it("resolves the queued i18n keys instead of printing them", async () => {
    const wrapper = mountToaster();

    useToast().toast({
      titleKey: "churchService.toast.saved.title",
      descriptionKey: "churchService.toast.saved.description",
      params: { name: "Ostern 2026" },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Gottesdienst gespeichert");
    expect(wrapper.text()).toContain("„Ostern 2026“ wurde im Verlauf gespeichert.");
  });

  it("puts a failed save on screen rather than in the console", async () => {
    const wrapper = mountToaster();
    const store = useChurchServiceStore();
    store.startSetup();
    store.addSong({
      id: "s-1",
      titel: "Lobe den Herren",
      midi_intro: { id: "file-intro" },
      midi_main: { id: "file-main" },
      midi_outro: { id: "file-outro" },
    } as never);
    breakIndexedDB();

    await store.confirmSave("Geht nicht");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Speichern fehlgeschlagen");
  });

  it("marks a destructive message so it is not styled as a success", async () => {
    const wrapper = mountToaster();

    useToast().toast({
      titleKey: "churchService.toast.saveFailed.title",
      descriptionKey: "churchService.toast.saveFailed.description",
      variant: "destructive",
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.get("[data-slot=toast]").classes()).toContain("text-destructive");
  });

  it("drops a message from the screen once it is dismissed", async () => {
    const wrapper = mountToaster();
    const id = useToast().toast({
      titleKey: "churchService.toast.saved.title",
      descriptionKey: "churchService.toast.saved.description",
      params: { name: "Ostern 2026" },
    });
    await wrapper.vm.$nextTick();

    useToast().dismiss(id);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toBe("");
  });
});

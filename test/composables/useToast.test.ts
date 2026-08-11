import { beforeEach, describe, expect, it } from "vitest";

import { useToast } from "@/composables/useToast";

// The queue is module-level on purpose — stores enqueue, one <Toaster> renders —
// so each test starts by draining whatever a previous one left behind.
beforeEach(() => {
  useToast().clear();
});

describe("useToast", () => {
  it("queues a message with its i18n keys left unresolved", () => {
    // Stores have no component instance and cannot translate; the keys travel
    // and <Toaster> resolves them at render time.
    const { toasts, toast } = useToast();

    toast({
      titleKey: "churchService.toast.saved.title",
      descriptionKey: "churchService.toast.saved.description",
      params: { name: "Ostern 2026" },
    });

    expect(toasts.value).toHaveLength(1);
    expect(toasts.value[0]).toMatchObject({
      titleKey: "churchService.toast.saved.title",
      descriptionKey: "churchService.toast.saved.description",
      params: { name: "Ostern 2026" },
    });
  });

  it("defaults to the neutral variant and empty params", () => {
    const { toasts, toast } = useToast();

    toast({ titleKey: "a.title", descriptionKey: "a.description" });

    expect(toasts.value[0].variant).toBe("default");
    expect(toasts.value[0].params).toEqual({});
  });

  it("keeps the destructive variant a caller asked for", () => {
    const { toasts, toast } = useToast();

    toast({ titleKey: "a.title", descriptionKey: "a.description", variant: "destructive" });

    expect(toasts.value[0].variant).toBe("destructive");
  });

  it("shares one queue across separate useToast() calls", () => {
    // The store calls useToast() in its own setup; the Toaster calls it in
    // another. Two independent queues would render nothing at all.
    useToast().toast({ titleKey: "a.title", descriptionKey: "a.description" });

    expect(useToast().toasts.value).toHaveLength(1);
  });

  it("gives every message a distinct id, so v-for keys never collide", () => {
    const { toasts, toast } = useToast();

    const first = toast({ titleKey: "a.title", descriptionKey: "a.description" });
    const second = toast({ titleKey: "a.title", descriptionKey: "a.description" });

    expect(first).not.toBe(second);
    expect(new Set(toasts.value.map((item) => item.id)).size).toBe(2);
  });

  it("dismisses exactly the message it was handed", () => {
    const { toasts, toast, dismiss } = useToast();
    const doomed = toast({ titleKey: "weg.title", descriptionKey: "weg.description" });
    toast({ titleKey: "bleibt.title", descriptionKey: "bleibt.description" });

    dismiss(doomed);

    expect(toasts.value.map((item) => item.titleKey)).toEqual(["bleibt.title"]);
  });

  it("ignores a dismiss for a message that is already gone", () => {
    const { toasts, toast, dismiss } = useToast();
    const id = toast({ titleKey: "a.title", descriptionKey: "a.description" });
    dismiss(id);

    expect(() => dismiss(id)).not.toThrow();
    expect(toasts.value).toEqual([]);
  });

  it("caps the queue at four, dropping the oldest first", () => {
    // A long service queues one per save/load/delete; nothing that has scrolled
    // out of the viewport is ever read again.
    const { toasts, toast } = useToast();

    for (const n of [1, 2, 3, 4, 5, 6]) {
      toast({ titleKey: `t.${n}`, descriptionKey: `d.${n}` });
    }

    expect(toasts.value.map((item) => item.titleKey)).toEqual(["t.3", "t.4", "t.5", "t.6"]);
  });

  it("clear empties the queue", () => {
    const { toasts, toast, clear } = useToast();
    toast({ titleKey: "a.title", descriptionKey: "a.description" });

    clear();

    expect(toasts.value).toEqual([]);
  });
});

import { readonly, ref } from "vue";

// Transient user feedback ("Gottesdienst gespeichert", "Speichern fehlgeschlagen").
//
// Messages are queued as i18n *keys*, not as finished strings: the queue is fed
// from Pinia stores, which have no component instance and therefore no `useI18n`.
// The <Toaster> component resolves the keys at render time, so a message queued
// before a language switch still renders in the language the user is looking at.
export type ToastVariant = "default" | "destructive";

export interface ToastOptions {
  /** i18n key for the headline. */
  titleKey: string;
  /** i18n key for the body line. */
  descriptionKey: string;
  /** Interpolation params, passed to both keys. */
  params?: Record<string, unknown>;
  variant?: ToastVariant;
}

export interface ToastMessage extends Required<Omit<ToastOptions, "params">> {
  id: number;
  params: Record<string, unknown>;
}

// How many toasts the viewport keeps. Saving, loading and deleting each queue
// one; without a cap a long session would grow the list forever, and nothing
// that has scrolled out of the viewport is ever read again.
const MAX_TOASTS = 4;

// Module-level: the queue is shared between whoever enqueues (stores, views)
// and the single <Toaster> that renders it.
const toasts = ref<ToastMessage[]>([]);
let nextId = 0;

export function useToast() {
  /** Queue a message and return its id, so a caller can dismiss it early. */
  const toast = (options: ToastOptions): number => {
    const id = ++nextId;

    toasts.value.push({
      id,
      titleKey: options.titleKey,
      descriptionKey: options.descriptionKey,
      params: options.params ?? {},
      variant: options.variant ?? "default",
    });

    if (toasts.value.length > MAX_TOASTS) {
      toasts.value.splice(0, toasts.value.length - MAX_TOASTS);
    }

    return id;
  };

  /** Remove one message — the timer and the close button both land here. */
  const dismiss = (id: number) => {
    const index = toasts.value.findIndex((item) => item.id === id);
    if (index !== -1) toasts.value.splice(index, 1);
  };

  /** Drop everything currently queued. Ids keep counting, so keys stay unique. */
  const clear = () => {
    toasts.value = [];
  };

  return { toasts: readonly(toasts), toast, dismiss, clear };
}

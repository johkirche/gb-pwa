import { registerSW } from "virtual:pwa-register";

import { readonly, ref } from "vue";

// Service-worker update state, shared between `main.ts` (which registers the
// worker once) and the banner that offers the reload. `registerType` is
// "prompt", so a new worker waits until `applyUpdate()` is called.
const needRefresh = ref(false);
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

/** Register the service worker. Called exactly once, from `main.ts`. */
export function registerPwaUpdates() {
  updateSW = registerSW({
    onNeedRefresh() {
      needRefresh.value = true;
    },
    // onOfflineReady / onRegistered are intentionally not handled: they only
    // narrated the service-worker lifecycle to the console. A failed
    // registration is a real fault — it means no offline mode — so that one
    // stays, as an error.
    onRegisterError(error: Error) {
      console.error("SW registration error", error);
    },
  });
}

/** Activate the waiting worker and reload. */
async function applyUpdate() {
  needRefresh.value = false;
  if (updateSW) await updateSW(true);
  else window.location.reload();
}

function dismissUpdate() {
  needRefresh.value = false;
}

export function usePwaUpdate() {
  return {
    needRefresh: readonly(needRefresh),
    applyUpdate,
    dismissUpdate,
  };
}

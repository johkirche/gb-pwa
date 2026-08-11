import App from "./App.vue";
import i18n from "./plugins/i18n.ts";
import "./style.css";
import router from "@/router";
import { useAuthStore } from "@/stores/auth";
import { createPinia } from "pinia";
import { registerSW } from "virtual:pwa-register";

import { createApp } from "vue";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(i18n);

// Hydrate auth store from localStorage before mounting
const authStore = useAuthStore();
authStore.hydrateFromStorage();
authStore.markAsHydrated();

// Register service worker for PWA functionality
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update prompt to user
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
  // onOfflineReady / onRegistered are intentionally not handled: they only
  // narrated the service-worker lifecycle to the console. A failed registration
  // is a real fault — it means no offline mode — so that one stays, as an error.
  onRegisterError(error: Error) {
    console.error("SW registration error", error);
  },
});

app.use(router).mount("#app");

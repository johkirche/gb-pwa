import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

import { createPinia } from "pinia";
import router from "@/router";
import { useAuthStore } from "@/stores/auth";
import { registerSW } from "virtual:pwa-register";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);

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
  onOfflineReady() {
    console.log("App ready to work offline");
    // You could show a toast notification here
  },
  onRegistered(r: any) {
    console.log("SW registered: ", r);
  },
  onRegisterError(error: any) {
    console.log("SW registration error", error);
  },
});

app.use(router).mount("#app");

import App from "./App.vue";
import i18n from "./plugins/i18n.ts";
import "./style.css";
import router from "@/router";
import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { createPinia } from "pinia";

import { createApp, watch } from "vue";

// Side-effect import: subscribes to `beforeinstallprompt` before it fires.
import "@/composables/usePWA";
import { registerPwaUpdates } from "@/composables/usePwaUpdate";

// No request may hang forever. Associated-but-dead wifi (navigator.onLine is
// still true) is the church's usual failure mode, and without a bound every
// spinner in the app waited on it indefinitely. Asset downloads use fetch and
// are unaffected.
axios.defaults.timeout = 30_000;

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(i18n);

// Keep <html lang> in step with the active locale: index.html declares German,
// and a screen reader picks its voice from this attribute.
watch(
  i18n.global.locale,
  (lang) => {
    document.documentElement.lang = lang;
  },
  { immediate: true },
);

// Hydrate auth store from localStorage before mounting
const authStore = useAuthStore();
authStore.hydrateFromStorage();
authStore.markAsHydrated();

// Register the service worker; <PwaUpdateNotification> in App.vue offers the
// reload when a new version is waiting.
registerPwaUpdates();

app.use(router).mount("#app");

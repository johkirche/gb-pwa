import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    "@pinia/nuxt",
    "@vite-pwa/nuxt",
    "shadcn-nuxt",
    "@nuxthub/core",
  ],
  vite: {
    plugins: [tailwindcss() as any],
  },
  runtimeConfig: {
    public: {
      directus: {
        url: import.meta.env.NUXT_PUBLIC_DIRECTUS_URL,
      },
    },
  },
  css: ["~/assets/css/main.css"],

  // SSR configuration
  ssr: true,

  pwa: {
    mode: "development",
    registerType: "autoUpdate",
    /* your pwa options */
    manifest: {
      name: "Gesangbuch-PWA",
      short_name: "GB-PWA",
      description: "GB-PWA description",
      lang: "en",
      theme_color: "#ffffff",
      icons: [
        {
          src: "icons/icon-48x48.webp",
          sizes: "48x48",
          type: "image/webp",
        },
        {
          src: "icons/icon-72x72.webp",
          sizes: "72x72",
          type: "image/webp",
        },
        {
          src: "icons/icon-96x96.webp",
          sizes: "96x96",
          type: "image/webp",
        },
        {
          src: "icons/icon-128x128.webp",
          sizes: "128x128",
          type: "image/webp",
        },
        {
          src: "icons/icon-144x144.webp",
          sizes: "144x144",
          type: "image/webp",
        },
        {
          src: "icons/icon-152x152.webp",
          sizes: "152x152",
          type: "image/webp",
        },
        {
          src: "icons/icon-192x192.webp",
          sizes: "192x192",
          type: "image/webp",
        },
        {
          src: "icons/icon-256x256.webp",
          sizes: "256x256",
          type: "image/webp",
        },
        {
          src: "icons/icon-384x384.webp",
          sizes: "384x384",
          type: "image/webp",
        },
        {
          src: "icons/icon-512x512.webp",
          sizes: "512x512",
          type: "image/webp",
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
      // or remove `globIgnores` option => disable `experimental: { payloadExtraction : false }`
      globPatterns: ["**/*"], // <== json files included: when offline you will see missing json files request
    },
  },

  // Improve error handling and offline support
  shadcn: {
    prefix: "",
    componentDir: "./components/ui",
  },
});

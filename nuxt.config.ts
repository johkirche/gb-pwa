import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16x16.png",
        },
        { rel: "manifest", href: "/manifest.webmanifest" },
      ],
    },
  },
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

  // Improve error handling and offline support
  shadcn: {
    prefix: "",
    componentDir: "./components/ui",
  },
});

import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    "nuxt-directus",
    "@pinia/nuxt",
    "@vite-pwa/nuxt",
    "shadcn-nuxt",
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

  // Add SSR configuration to prevent hydration issues
  ssr: true,

  // Configure Directus module
  directus: {
    autoFetch: true, // Enable automatic fetching to restore session on refresh
  },

  // Improve error handling
  nitro: {
    storage: {
      devStorage: {
        driver: "fs",
        base: "./.nuxt/storage",
      },
    },
  },

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: "./components/ui",
  },
});

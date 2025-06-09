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

    // Configure PWA module
    pwa: {
        registerType: "autoUpdate",
        workbox: {
            // Don't precache in development
            globPatterns:
                process.env.NODE_ENV === "production"
                    ? ["**/*.{js,css,html,png,svg,ico}"]
                    : [],
            // Exclude development assets from caching
            globIgnores: [
                "**/node_modules/**/*",
                "**/.nuxt/**/*",
                "**/builds/meta/**/*",
                "**/@vite/**/*",
                "**/@id/**/*",
            ],
            navigateFallback: null,
            runtimeCaching: [],
        },
        client: {
            installPrompt: true,
        },
        devOptions: {
            enabled: false, // Disable PWA in development
            type: "module",
        },
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

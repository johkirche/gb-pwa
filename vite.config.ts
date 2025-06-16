import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "mask-icon.svg",
        "icons/*.webp",
      ],
      manifest: {
        name: "Gesangbuch PWA",
        short_name: "Gesangbuch",
        description: "Offline-fähiges Gesangbuch mit allen Liedern",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
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
          {
            src: "icons/icon-512x512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot}"],
        runtimeCaching: [
          // Cache API responses
          {
            urlPattern: ({ url }) => url.pathname.includes("/graphql"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({
                    request,
                  }: {
                    request: Request;
                  }) => {
                    // Create cache key from request body for GraphQL
                    const body = await request.clone().text();
                    const url = request.url;
                    return `${url}-${btoa(body)}`;
                  },
                },
              ],
            },
          },
          // Cache image files (like song files, PDFs)
          {
            urlPattern: ({ url }) =>
              url.pathname.includes("/assets/") ||
              url.pathname.includes("/files/"),
            handler: "CacheFirst",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Cache static assets
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "documents-cache",
            },
          },
          // Cache other requests
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
            },
          },
          // Fallback for navigation requests when offline
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 3,
            },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

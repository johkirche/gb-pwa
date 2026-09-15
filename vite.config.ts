import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import vueDevTools from "vite-plugin-vue-devtools";

// SpessaSynth ships its AudioWorklet processor as a separate JS file that the
// browser has to load via `audioWorklet.addModule(url)`. We mirror it into
// public/ so both `vite dev` and the PWA build pick it up through the existing
// public-dir + workbox-glob pipeline. The file is gitignored — it lives in
// node_modules and is copied on every Vite startup.
function copySpessaSynthWorklet(): Plugin {
  const src = path.resolve(__dirname, "node_modules/spessasynth_lib/dist/spessasynth_processor.min.js");
  const dest = path.resolve(__dirname, "public/spessasynth_processor.min.js");
  return {
    name: "copy-spessasynth-worklet",
    configResolved() {
      if (!fs.existsSync(src)) {
        throw new Error(`spessasynth_lib worklet processor not found at ${src} — did you forget to install?`);
      }
      fs.copyFileSync(src, dest);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    copySpessaSynthWorklet(),
    vueDevTools({
      launchEditor: "code",
    }),
    VitePWA({
      // "prompt": a new service worker waits until the user accepts the update
      // banner. Under "autoUpdate" the page reloaded itself the moment a deploy
      // landed — including mid-service, where the running Gottesdienst lives
      // in memory only.
      registerType: "prompt",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg", "icons/*.webp"],
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
            src: "icons/maskable-512x512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot}"],
        runtimeCaching: [
          // Self-hosted emoji datasets (/emojibase/{locale}/*.json). These are
          // large and not in the precache globs, so cache them on first use and
          // serve from cache afterwards — including offline.
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/emojibase/"),
            handler: "CacheFirst",
            options: {
              cacheName: "emoji-data",
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // `/graphql` is deliberately NOT cached by the service worker: every
          // request is a POST (Workbox runtime caching only matches GET), and
          // offline reads are served from the IndexedDB stores written by
          // useOfflineDownload. Caching here would also persist authenticated
          // responses and mutations in a shared cache.
          // Directus `/assets/*` and `/files/*` are owned by the IndexedDB
          // `assets` store now — see useOfflineDownload.precacheAssets. The
          // SW does not cache them so there is only one source of truth and
          // no chance of stale Workbox entries being served once the app
          // moves to a different storage layout.
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
              request.destination === "script" || request.destination === "style",
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
        // No `skipWaiting` here: with registerType "prompt" the plugin sends
        // SKIP_WAITING only when the user accepts the update.
        clientsClaim: true,
      },
    }),
  ],
  server: {
    port: 4823,
    open: "http://gb-pwa.localhost:4823",
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // vuedraggable ships a UMD build whose `require("vue")` resolved to the
      // full CommonJS build, so ~80 KB of template compiler that can never run
      // landed in the Home route's chunk. Exact match only: `vue/...` subpaths
      // must keep resolving normally.
      { find: /^vue$/, replacement: "vue/dist/vue.runtime.esm-bundler.js" },
    ],
  },
});

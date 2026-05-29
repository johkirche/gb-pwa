import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { defineStore } from "pinia";

import { computed, ref } from "vue";

import type { FreiesMusikstueck } from "@/gql/extra-types";

import { useOfflineDownload } from "@/composables/useOfflineDownload";

// Lightweight Pinia store for the `freie_musikstuecke` Directus collection.
// Mirrors the offline-first strategy of useGesangbuchliedStore: when the user
// has downloaded content for offline use, IndexedDB wins; otherwise we hit the
// API and let the service worker take care of opportunistic caching.
export const useFreieMusikstueckeStore = defineStore("freieMusikstuecke", () => {
  const authStore = useAuthStore();
  const { getOfflinePieces } = useOfflineDownload();

  const pieces = ref<FreiesMusikstueck[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isLoaded = ref(false);
  // Tracks whether the current `pieces` came from IndexedDB or the API.
  // Mirrors the songs store's flag — useful for the UI to show an offline hint.
  const isUsingCachedData = ref(false);
  const preferOfflineData = ref(true);

  // Single shared search string — the picker dialog binds to this directly.
  const searchQuery = ref("");

  const filteredPieces = computed<FreiesMusikstueck[]>(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return pieces.value;
    return pieces.value.filter((p) => {
      if (p.name?.toLowerCase().includes(q)) return true;
      if (p.komponist?.toLowerCase().includes(q)) return true;
      if (p.tags?.some((tag) => tag.toLowerCase().includes(q))) return true;
      return false;
    });
  });

  async function fetchFromApi(): Promise<FreiesMusikstueck[]> {
    const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
    if (!directusUrl) {
      throw new Error("VITE_PUBLIC_DIRECTUS_URL is not configured");
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    const gql = `
      query {
        freie_musikstuecke(sort: ["name"]) {
          id
          name
          komponist
          dauer_sek
          tags
          midi_file {
            id
            title
            type
            filename_download
            filesize
          }
        }
      }
    `;

    const res = await axios.post<{
      data?: { freie_musikstuecke?: FreiesMusikstueck[] };
      errors?: { message: string }[];
    }>(`${directusUrl}/graphql`, { query: gql }, { headers });

    if (res.data.errors?.length) {
      throw new Error(res.data.errors.map((e) => e.message).join(", "));
    }
    return res.data.data?.freie_musikstuecke ?? [];
  }

  async function fetchPieces(forceOnline = false): Promise<void> {
    if (isLoading.value) return;
    isLoading.value = true;
    error.value = null;

    try {
      // 1. Offline-first when preferred (and not explicitly forced online).
      if (preferOfflineData.value && !forceOnline) {
        const offline = await getOfflinePieces();
        if (offline.length > 0) {
          pieces.value = offline;
          isUsingCachedData.value = true;
          isLoaded.value = true;
          return;
        }
      }

      // 2. Browser claims offline → try IndexedDB before giving up.
      if (typeof window !== "undefined" && !navigator.onLine) {
        const offline = await getOfflinePieces();
        if (offline.length > 0) {
          pieces.value = offline;
          isUsingCachedData.value = true;
          isLoaded.value = true;
          return;
        }
        error.value = "No offline pieces available";
        return;
      }

      // 3. Hit the API.
      pieces.value = await fetchFromApi();
      isUsingCachedData.value = false;
      isLoaded.value = true;
    } catch (err) {
      console.error("Failed to fetch freie_musikstuecke:", err);
      // 4. API error fallback — IndexedDB if anything's there.
      const offline = await getOfflinePieces();
      if (offline.length > 0) {
        pieces.value = offline;
        isUsingCachedData.value = true;
        isLoaded.value = true;
        return;
      }
      error.value = err instanceof Error ? err.message : "Unknown error";
    } finally {
      isLoading.value = false;
    }
  }

  function setSearchQuery(q: string) {
    searchQuery.value = q;
  }

  function setPreferOfflineData(value: boolean) {
    preferOfflineData.value = value;
  }

  return {
    pieces,
    filteredPieces,
    isLoading,
    isLoaded,
    isUsingCachedData,
    preferOfflineData,
    error,
    searchQuery,
    fetchPieces,
    setSearchQuery,
    setPreferOfflineData,
  };
});

import { computed, readonly, ref } from "vue";

const FAVORITES_KEY = "gesangbuch-favorites";

// Reactive favorites list
const favoriteIds = ref<string[]>([]);

// Load favorites from localStorage on initialization
const loadFavorites = () => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that we have an array of strings
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string")
      ) {
        favoriteIds.value = parsed;
      } else {
        console.warn("Invalid favorites data found, clearing...");
        favoriteIds.value = [];
        localStorage.removeItem(FAVORITES_KEY);
      }
    }
  } catch (error) {
    console.error("Error loading favorites from localStorage:", error);
    favoriteIds.value = [];
    localStorage.removeItem(FAVORITES_KEY);
  }
};

// Save favorites to localStorage
const saveFavorites = () => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds.value));
  } catch (error) {
    console.error("Error saving favorites to localStorage:", error);
  }
};

// Initialize favorites on first import
loadFavorites();

// Another surface changed the list — a second tab, or the installed PWA open
// alongside a browser tab, which is normal on a shared church tablet. Without
// this, that tab keeps its stale array and the next local save writes it back
// whole, silently discarding the other surface's stars. useAuth.ts already
// gives the session keys the same guarantee.
window.addEventListener("storage", (event) => {
  if (event.key === FAVORITES_KEY) loadFavorites();
});

export const useFavorites = () => {
  // Check if a song is favorited
  const isFavorite = (songId: string): boolean => {
    if (!songId || typeof songId !== "string") return false;
    return favoriteIds.value.includes(songId);
  };

  // Add a song to favorites
  const addToFavorites = (songId: string) => {
    if (!songId || typeof songId !== "string") {
      console.warn("Invalid songId provided to addToFavorites:", songId);
      return;
    }
    if (!favoriteIds.value.includes(songId)) {
      favoriteIds.value.push(songId);
      saveFavorites();
    }
  };

  // Remove a song from favorites
  const removeFromFavorites = (songId: string) => {
    if (!songId || typeof songId !== "string") {
      console.warn("Invalid songId provided to removeFromFavorites:", songId);
      return;
    }
    if (!favoriteIds.value.includes(songId)) return;
    // Filter rather than splice a single index: now that this tab hydrates
    // arrays it did not write, the list can contain the same id twice — and
    // splicing one occurrence would leave the song starred with no way to
    // clear it from the UI.
    favoriteIds.value = favoriteIds.value.filter((id) => id !== songId);
    saveFavorites();
  };

  // Toggle favorite status
  const toggleFavorite = (songId: string) => {
    if (!songId || typeof songId !== "string") {
      console.warn("Invalid songId provided to toggleFavorite:", songId);
      return;
    }
    if (isFavorite(songId)) {
      removeFromFavorites(songId);
    } else {
      addToFavorites(songId);
    }
  };

  // Get all favorite IDs. `readonly` because `computed` only protects `.value`
  // from reassignment, not the array behind it: `favorites.value.push(id)`
  // would mutate module state reactively while never reaching saveFavorites(),
  // rendering correctly and vanishing on reload. This turns that into a
  // dev-mode warning instead of silent data loss.
  const favorites = computed(() => readonly(favoriteIds.value));

  // Get count of favorites
  const favoritesCount = computed(() => favoriteIds.value.length);

  // Clear all favorites
  const clearAllFavorites = () => {
    favoriteIds.value = [];
    saveFavorites();
  };

  return {
    favorites,
    favoritesCount,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    clearAllFavorites,
  };
};

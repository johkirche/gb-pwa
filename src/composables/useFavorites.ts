import { computed, ref } from "vue";

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
    const index = favoriteIds.value.indexOf(songId);
    if (index > -1) {
      favoriteIds.value.splice(index, 1);
      saveFavorites();
    }
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

  // Get all favorite IDs
  const favorites = computed(() => favoriteIds.value);

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

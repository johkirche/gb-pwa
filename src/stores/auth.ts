import { defineStore } from "pinia";

import { computed, ref } from "vue";

// localStorage utility functions
const setLocalStorage = (key: string, value: string | null) => {
  if (typeof window === "undefined") return; // Skip on server-side

  if (value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, value);
  }
};

const getLocalStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null; // Skip on server-side

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to get ${key} from localStorage:`, error);
    return null;
  }
};

// User type based on Directus API
export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role?: string;
  status?: "active" | "invited" | "draft" | "suspended" | "deleted";
  avatar?: string;
  language?: string;
  last_access?: string;
  last_page?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  const isLoggedIn = ref<boolean>(false);

  // Getters
  const userName = computed(() => {
    if (!user.value) return "User";
    return user.value.first_name || user.value.email || "User";
  });

  const isAuthenticated = computed(() => {
    return !!(user.value && accessToken.value);
  });
  // Actions
  const setUser = (newUser: User | null) => {
    user.value = newUser;
    isLoggedIn.value = !!newUser;

    // Persist user to localStorage
    if (newUser) {
      setLocalStorage("auth-user", JSON.stringify(newUser));
    } else {
      setLocalStorage("auth-user", null);
    }
  };

  const setTokens = (
    newAccessToken: string | null,
    newRefreshToken: string | null,
  ) => {
    accessToken.value = newAccessToken;
    refreshToken.value = newRefreshToken;

    // Store tokens in localStorage
    setLocalStorage("auth-access-token", newAccessToken);
    setLocalStorage("auth-refresh-token", newRefreshToken);
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const clearAuth = () => {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    isLoggedIn.value = false;

    // Clear localStorage
    setLocalStorage("auth-access-token", null);
    setLocalStorage("auth-refresh-token", null);
    setLocalStorage("auth-user", null);
  };

  // Hydrate state from localStorage
  const hydrateFromStorage = () => {
    try {
      accessToken.value = getLocalStorage("auth-access-token");
      refreshToken.value = getLocalStorage("auth-refresh-token");

      const userString = getLocalStorage("auth-user");
      if (userString) {
        try {
          user.value = JSON.parse(userString);
          isLoggedIn.value = !!user.value;
        } catch (error) {
          console.error("Failed to parse user from localStorage:", error);
          // Clear invalid user data
          setLocalStorage("auth-user", null);
        }
      }
    } catch (error) {
      console.error("Failed to hydrate auth state from localStorage:", error);
      // Clear all auth state on hydration error
      clearAuth();
    }
  };

  // Check if current state is hydrated properly
  const isHydrated = ref(false);
  const markAsHydrated = () => {
    isHydrated.value = true;
  };

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isLoading,
    isLoggedIn,
    isHydrated,
    // Getters
    userName,
    isAuthenticated,
    // Actions
    setUser,
    setTokens,
    setLoading,
    clearAuth,
    hydrateFromStorage,
    markAsHydrated,
  };
});

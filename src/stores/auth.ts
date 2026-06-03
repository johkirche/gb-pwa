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

// localStorage keys — exported so other modules (e.g. cross-tab sync, the
// refresh-rotation retry) can read the freshest persisted values directly
// without going through the (possibly stale in this tab) in-memory refs.
export const ACCESS_TOKEN_KEY = "auth-access-token";
export const REFRESH_TOKEN_KEY = "auth-refresh-token";
export const USER_KEY = "auth-user";
export const LOGGED_OUT_KEY = "auth-logged-out";

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  const isLoggedIn = ref<boolean>(false);
  // True only after an *explicit* user logout. Lets the router guard force a
  // login even when offline content is downloaded (so "Log out" actually
  // sticks); cleared on the next successful login.
  const isLoggedOut = ref<boolean>(false);

  // Getters
  const userName = computed(() => {
    // No user (e.g. offline mode) → empty string so callers can hide
    // user-specific UI instead of showing a meaningless "User" placeholder.
    if (!user.value) return "";
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
      setLocalStorage(USER_KEY, JSON.stringify(newUser));
    } else {
      setLocalStorage(USER_KEY, null);
    }
  };

  const setTokens = (
    newAccessToken: string | null,
    newRefreshToken: string | null,
  ) => {
    accessToken.value = newAccessToken;
    refreshToken.value = newRefreshToken;

    // Store tokens in localStorage
    setLocalStorage(ACCESS_TOKEN_KEY, newAccessToken);
    setLocalStorage(REFRESH_TOKEN_KEY, newRefreshToken);
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  // Mark whether the user has explicitly logged out. Persisted so the choice
  // survives reloads (otherwise a downloaded-offline app would silently let a
  // logged-out user back in via the offline-first guard).
  const setLoggedOut = (value: boolean) => {
    isLoggedOut.value = value;
    setLocalStorage(LOGGED_OUT_KEY, value ? "1" : null);
  };

  // Clear the session. `explicit` is true for a deliberate user logout (sets
  // the logged-out flag); leave it false for token-expiry / error cleanups so
  // we don't trap an offline user behind the login screen unnecessarily.
  const clearAuth = (explicit = false) => {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    isLoggedIn.value = false;

    // Clear localStorage
    setLocalStorage(ACCESS_TOKEN_KEY, null);
    setLocalStorage(REFRESH_TOKEN_KEY, null);
    setLocalStorage(USER_KEY, null);

    if (explicit) setLoggedOut(true);
  };

  // Hydrate state from localStorage
  const hydrateFromStorage = () => {
    try {
      accessToken.value = getLocalStorage(ACCESS_TOKEN_KEY);
      refreshToken.value = getLocalStorage(REFRESH_TOKEN_KEY);
      isLoggedOut.value = getLocalStorage(LOGGED_OUT_KEY) === "1";

      const userString = getLocalStorage(USER_KEY);
      if (userString) {
        try {
          user.value = JSON.parse(userString);
          isLoggedIn.value = !!user.value;
        } catch (error) {
          console.error("Failed to parse user from localStorage:", error);
          // Clear invalid user data
          setLocalStorage(USER_KEY, null);
        }
      } else {
        // Another tab may have logged out / cleared the session.
        user.value = null;
        isLoggedIn.value = false;
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
    isLoggedOut,
    isHydrated,
    // Getters
    userName,
    isAuthenticated,
    // Actions
    setUser,
    setTokens,
    setLoading,
    setLoggedOut,
    clearAuth,
    hydrateFromStorage,
    markAsHydrated,
  };
});

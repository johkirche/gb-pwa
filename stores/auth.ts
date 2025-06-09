import { defineStore } from "pinia";
import { ref, computed } from "vue";

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

  // Cookie configuration helpers
  const getAccessTokenCookie = () =>
    useCookie("auth-access-token", {
      default: () => null as string | null,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      httpOnly: false, // Needed for client-side access and JWT decoding
      maxAge: 60 * 15, // 15 minutes
    });

  const getRefreshTokenCookie = () =>
    useCookie("auth-refresh-token", {
      default: () => null as string | null,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      httpOnly: false, // Made consistent for SSR hydration
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

  const getUserCookie = () =>
    useCookie("auth-user", {
      default: () => null as string | null,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

  // Actions
  const setUser = (newUser: User | null) => {
    user.value = newUser;
    isLoggedIn.value = !!newUser;
  };

  const setTokens = (
    newAccessToken: string | null,
    newRefreshToken: string | null
  ) => {
    accessToken.value = newAccessToken;
    refreshToken.value = newRefreshToken;

    // Store tokens in cookies for SSR (both server and client)
    const accessTokenCookie = getAccessTokenCookie();
    const refreshTokenCookie = getRefreshTokenCookie();

    accessTokenCookie.value = newAccessToken;
    refreshTokenCookie.value = newRefreshToken;
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const clearAuth = () => {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    isLoggedIn.value = false;

    // Clear cookies
    const accessTokenCookie = getAccessTokenCookie();
    const refreshTokenCookie = getRefreshTokenCookie();
    const userCookie = getUserCookie();

    accessTokenCookie.value = null;
    refreshTokenCookie.value = null;
    userCookie.value = null;
  };

  // Hydrate state from cookies (for SSR)
  const hydrateFromCookies = () => {
    try {
      const accessTokenCookie = getAccessTokenCookie();
      const refreshTokenCookie = getRefreshTokenCookie();
      const userCookie = getUserCookie();

      accessToken.value = accessTokenCookie.value || null;
      refreshToken.value = refreshTokenCookie.value || null;

      if (userCookie.value) {
        try {
          user.value =
            typeof userCookie.value === "string"
              ? JSON.parse(userCookie.value)
              : userCookie.value;
          isLoggedIn.value = !!user.value;
        } catch (error) {
          console.error("Failed to parse user cookie:", error);
          // Clear invalid user cookie
          userCookie.value = null;
        }
      }
    } catch (error) {
      console.error("Failed to hydrate auth state from cookies:", error);
      // Clear all auth state on hydration error
      clearAuth();
    }
  };

  // Store user in cookie for SSR
  const persistUser = () => {
    if (user.value) {
      const userCookie = getUserCookie();
      userCookie.value = JSON.stringify(user.value);
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
    hydrateFromCookies,
    persistUser,
    markAsHydrated,
  };
});

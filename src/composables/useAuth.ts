import { useAuthStore } from "@/stores/auth";
import axios from "axios";

import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useDirectusApi } from "@/composables/useDirectusApi";
// Native auth composable using Pinia store and direct Directus API calls
import { getTimeUntilExpiry, isTokenExpired } from "@/composables/useJwtUtils";

// Token refresh timing constants
const TOKEN_REFRESH_THRESHOLD = 2 * 60 * 1000; // Refresh 2 minutes before expiry
let refreshTimer: number | null = null;

export const useAuth = () => {
  const authStore = useAuthStore();
  const directusApi = useDirectusApi();

  // Schedule automatic token refresh
  const scheduleTokenRefresh = (accessToken: string) => {
    // Clear existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    const timeUntilExpiry = getTimeUntilExpiry(accessToken);
    const timeUntilRefresh = timeUntilExpiry - TOKEN_REFRESH_THRESHOLD;

    if (timeUntilRefresh > 0) {
      refreshTimer = setTimeout(async () => {
        console.log("Auto-refreshing token before expiry");
        await refreshAuth();
      }, timeUntilRefresh);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      authStore.setLoading(true);

      // Login via Directus API
      const loginResponse = await directusApi.login({
        email,
        password,
        mode: "json",
      });

      // Store tokens
      authStore.setTokens(
        loginResponse.access_token,
        loginResponse.refresh_token,
      );

      // Schedule automatic refresh
      scheduleTokenRefresh(loginResponse.access_token);

      // Fetch and store user data
      const userData = await directusApi.getCurrentUser(
        loginResponse.access_token,
      );
      authStore.setUser(userData);

      return { success: true };
    } catch (error: unknown) {
      console.error("Login error:", error);
      authStore.clearAuth();

      let errorMessage = "Login failed";

      if (axios.isAxiosError(error)) {
        // Handle specific error cases
        if (error.response?.status === 401) {
          errorMessage = "Invalid email or password";
        } else if (error.response?.status === 429) {
          errorMessage = "Too many login attempts. Please try again later.";
        } else if (error.response?.data?.errors?.[0]?.message) {
          errorMessage = error.response.data.errors[0].message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      authStore.setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }

      // Logout via API if we have a refresh token
      if (authStore.refreshToken) {
        await directusApi.logout({
          refresh_token: authStore.refreshToken,
          mode: "json",
        });
      }
    } catch (error: unknown) {
      console.error("Logout API error:", error);
      // Continue with local logout even if API call fails
    } finally {
      // Always clear local auth state
      authStore.clearAuth();

      // Only redirect if we're in a component context
      try {
        const router = useRouter();
        await router.push("/login");
      } catch {
        // If useRouter fails (not in component context), redirect manually
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    try {
      // If we already have a user and access token, check if it's still valid
      if (authStore.user && authStore.accessToken) {
        // If token expires within the threshold, try to refresh
        if (isTokenExpired(authStore.accessToken, TOKEN_REFRESH_THRESHOLD)) {
          if (authStore.refreshToken) {
            const refreshed = await refreshAuth();
            if (refreshed) return true;
          }
        } else {
          // Token is still valid, schedule refresh and return true
          scheduleTokenRefresh(authStore.accessToken);

          // Validate token by fetching user data
          try {
            const userData = await directusApi.getCurrentUser(
              authStore.accessToken,
            );
            authStore.setUser(userData);
            return true;
          } catch {
            // Token might be invalid, try to refresh
            if (authStore.refreshToken) {
              return await refreshAuth();
            }
          }
        }
      }

      // Try to refresh if we have a refresh token
      if (authStore.refreshToken) {
        return await refreshAuth();
      }

      // No valid authentication found
      authStore.clearAuth();
      return false;
    } catch (error: unknown) {
      console.error("Auth check error:", error);
      authStore.clearAuth();
      return false;
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    try {
      if (!authStore.refreshToken) {
        return false;
      }

      console.log("Refreshing auth tokens...");
      const refreshResponse = await directusApi.refresh({
        refresh_token: authStore.refreshToken,
        mode: "json",
      });

      // Update tokens
      authStore.setTokens(
        refreshResponse.access_token,
        refreshResponse.refresh_token,
      );

      // Schedule next refresh
      scheduleTokenRefresh(refreshResponse.access_token);

      // Fetch updated user data
      const userData = await directusApi.getCurrentUser(
        refreshResponse.access_token,
      );
      authStore.setUser(userData);

      console.log("Auth tokens refreshed successfully");
      return true;
    } catch (error: unknown) {
      console.error("Token refresh error:", error);

      // Clear refresh timer on error
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }

      authStore.clearAuth();
      return false;
    }
  };

  /**
   * Get redirect URL after successful authentication
   */
  const getRedirectUrl = (defaultPath = "/home"): string => {
    try {
      const route = useRoute();
      return (route.query?.redirect as string) || defaultPath;
    } catch {
      // If useRoute fails (not in component context), return default path
      return defaultPath;
    }
  };

  // Setup automatic token refresh on client side
  if (authStore.accessToken) {
    scheduleTokenRefresh(authStore.accessToken);
  }

  return {
    // Core methods
    login,
    logout,
    checkAuth,
    refreshAuth,
    getRedirectUrl,
    scheduleTokenRefresh,

    // State from Pinia store
    user: computed(() => authStore.user),
    isLoggedIn: computed(() => authStore.isAuthenticated),
    isLoading: computed(() => authStore.isLoading),

    // Computed helpers
    userName: computed(() => authStore.userName),

    // Store actions
    clearAuth: authStore.clearAuth,
  };
};

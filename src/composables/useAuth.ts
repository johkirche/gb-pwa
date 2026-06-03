import { REFRESH_TOKEN_KEY, useAuthStore } from "@/stores/auth";
import axios from "axios";

import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useDirectusApi } from "@/composables/useDirectusApi";
import { hasOfflineContentAvailable } from "@/composables/useOfflineDownload";
// Native auth composable using Pinia store and direct Directus API calls
import { getTimeUntilExpiry, isTokenExpired } from "@/composables/useJwtUtils";

// Token refresh timing constants
const TOKEN_REFRESH_THRESHOLD = 2 * 60 * 1000; // Refresh 2 minutes before expiry
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

// Single-flight guard: collapse concurrent refreshes (e.g. the background timer
// firing while a navigation also triggers one, or two tabs racing) into one
// in-flight request so we don't burn the single-use refresh token twice.
let refreshInFlight: Promise<boolean> | null = null;

// Cross-tab + reconnect listeners are process-wide; attach them once.
let globalListenersAttached = false;

const readStoredRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const isOffline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

// Distinguish "couldn't reach / transient server problem" (offline, timeout,
// 5xx) from an explicit credential rejection (401/403). Only the latter means
// the session is genuinely dead — the former must NOT log the user out.
const isTransientNetworkError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    if (!error.response) return true; // no response → network/offline/timeout
    return error.response.status >= 500; // server error → transient
  }
  return true; // unknown shape → be conservative, treat as transient
};

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

      // A successful login clears any prior explicit-logout flag.
      authStore.setLoggedOut(false);

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
      // Always clear local auth state. `true` = explicit logout, so the
      // offline-first router guard will still require a fresh login afterwards
      // even though downloaded content is present.
      authStore.clearAuth(true);

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

  // Returns whether the user should be treated as authenticated *right now*.
  //
  // Offline-first contract: this NEVER clears the session on a network error —
  // being offline or hitting a flaky server must not log the user out. It only
  // performs network work when online and the access token actually needs
  // refreshing; otherwise it trusts the locally hydrated session.
  const checkAuth = async (): Promise<boolean> => {
    const hasLocalSession = !!(authStore.user && authStore.accessToken);

    // Offline: we can't validate or refresh — trust whatever we hydrated.
    if (isOffline()) {
      return hasLocalSession || !!authStore.refreshToken;
    }

    try {
      // Access token still comfortably valid → trust it, no network call.
      if (
        authStore.accessToken &&
        !isTokenExpired(authStore.accessToken, TOKEN_REFRESH_THRESHOLD)
      ) {
        scheduleTokenRefresh(authStore.accessToken);
        return true;
      }

      // Token missing or near/at expiry → refresh if we can.
      if (authStore.refreshToken || readStoredRefreshToken()) {
        const refreshed = await refreshAuth();
        if (refreshed) return true;
      }

      // Refresh unavailable or failed — fall back to whatever local session we
      // still hold (refreshAuth only clears tokens on a real rejection).
      return !!(authStore.user && authStore.accessToken);
    } catch (error: unknown) {
      console.error("Auth check error:", error);
      // Preserve the session; let the data layer fall back to cached content.
      return hasLocalSession;
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    // Collapse concurrent callers onto a single in-flight refresh.
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = doRefreshAuth();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  };

  const applyRefreshedSession = async (
    accessToken: string,
    newRefreshToken: string,
  ) => {
    authStore.setTokens(accessToken, newRefreshToken);
    scheduleTokenRefresh(accessToken);
    // Best-effort profile refresh — don't fail the whole refresh if it errors
    // (keep the cached user instead).
    try {
      const userData = await directusApi.getCurrentUser(accessToken);
      authStore.setUser(userData);
    } catch (err) {
      console.warn("Could not refresh user profile, keeping cached user:", err);
    }
  };

  const doRefreshAuth = async (): Promise<boolean> => {
    // Prefer the freshest persisted token: another tab may have rotated it in
    // localStorage since this tab hydrated its in-memory copy.
    const startToken = readStoredRefreshToken() || authStore.refreshToken;
    if (!startToken) return false;

    try {
      console.log("Refreshing auth tokens...");
      const res = await directusApi.refresh({
        refresh_token: startToken,
        mode: "json",
      });
      await applyRefreshedSession(res.access_token, res.refresh_token);
      console.log("Auth tokens refreshed successfully");
      return true;
    } catch (error: unknown) {
      // Transient/offline: keep the session entirely intact and retry later.
      if (isTransientNetworkError(error)) {
        console.warn(
          "Token refresh skipped (offline/transient); keeping session.",
        );
        return false;
      }

      // Explicit rejection (401/403). Before giving up, handle the refresh-token
      // rotation race: another tab may have already rotated the token, leaving
      // ours stale. If localStorage now holds a different token, retry once.
      const current = readStoredRefreshToken();
      if (current && current !== startToken) {
        try {
          const res = await directusApi.refresh({
            refresh_token: current,
            mode: "json",
          });
          await applyRefreshedSession(res.access_token, res.refresh_token);
          return true;
        } catch (retryError) {
          if (isTransientNetworkError(retryError)) return false;
          // fall through — genuinely rejected
        }
      }

      console.warn("Refresh token rejected by server; session is stale.");
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }

      // Don't strand the user behind /login when offline content exists — keep
      // the cached identity (just drop the dead tokens so we stop retrying).
      // Only fully clear when there's nothing to fall back to.
      if (await hasOfflineContentAvailable()) {
        authStore.setTokens(null, null);
      } else {
        authStore.clearAuth();
      }
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

  // Process-wide listeners (attached once) that keep auth robust across tabs
  // and reconnects — the two main sources of the "randomly logged out" bug.
  if (typeof window !== "undefined" && !globalListenersAttached) {
    globalListenersAttached = true;

    // Another tab changed the session (login, logout, or token rotation):
    // re-hydrate so this tab's in-memory store matches localStorage.
    window.addEventListener("storage", (event) => {
      if (event.key && event.key.startsWith("auth-")) {
        authStore.hydrateFromStorage();
        if (authStore.accessToken) scheduleTokenRefresh(authStore.accessToken);
      }
    });

    // Back online: proactively refresh if the access token has lapsed so online
    // features (fresh data, asset downloads) resume without a forced re-login.
    window.addEventListener("online", () => {
      const token = authStore.accessToken;
      const needsRefresh =
        !token || isTokenExpired(token, TOKEN_REFRESH_THRESHOLD);
      if (needsRefresh && (authStore.refreshToken || readStoredRefreshToken())) {
        refreshAuth().catch(() => {
          /* keep session; data layer falls back to cache */
        });
      }
    });
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

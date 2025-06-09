export default defineNuxtPlugin(async () => {
  // This plugin runs on both client and server to initialize auth state
  const authStore = useAuthStore();

  if (import.meta.server) {
    // Server-side: Hydrate auth state from cookies
    authStore.hydrateFromCookies();
  } else {
    // Client-side: Hydrate from cookies first, then check/restore auth state
    authStore.hydrateFromCookies();

    const { checkAuth, scheduleTokenRefresh } = useAuth();

    try {
      // Check and restore authentication state
      const isAuthenticated = await checkAuth();

      // If authenticated and we have an access token, schedule refresh
      if (isAuthenticated && authStore.accessToken) {
        scheduleTokenRefresh(authStore.accessToken);
      }
    } catch (error) {
      console.error("Failed to initialize auth state:", error);
      // Don't throw error to prevent app from breaking
    } finally {
      // Mark store as hydrated to prevent hydration mismatches
      authStore.markAsHydrated();
    }
  }
});

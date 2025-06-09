export default defineNuxtRouteMiddleware(async (to) => {
  const { user, checkAuth } = useAuth();
  const authStore = useAuthStore();
  const { isTokenExpired } = useJwtUtils();

  // On server side, check if user is authenticated from cookies
  if (import.meta.server) {
    // The auth store should have been hydrated from cookies
    if (!user.value || !authStore.accessToken) {
      return navigateTo("/auth/login");
    }

    // Basic token validation on server side
    try {
      // If token is expired and we don't have a refresh token, redirect
      if (isTokenExpired(authStore.accessToken) && !authStore.refreshToken) {
        return navigateTo("/auth/login");
      }
    } catch (error) {
      console.error("Invalid token format:", error);
      return navigateTo("/auth/login");
    }

    return;
  }

  // Client-side authentication check
  // Wait for hydration to complete to prevent mismatches
  if (!authStore.isHydrated) {
    await nextTick();
  }

  // First check if user is already available and tokens are valid
  if (user.value && authStore.accessToken) {
    try {
      // Quick token expiry check using the proper JWT utility
      if (!isTokenExpired(authStore.accessToken)) {
        return;
      }
    } catch (error) {
      console.error("Token validation error:", error);
    }
  }

  // If no user or token is expired, try to restore authentication state
  try {
    const authenticated = await checkAuth();
    if (!authenticated) {
      return navigateTo("/auth/login");
    }
  } catch (error) {
    console.error("Global auth check failed:", error);
    return navigateTo("/auth/login");
  }

  // Log navigation for debugging (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log(`Navigating to: ${to.path}, Authenticated: ${!!user.value}`);
  }
});

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, checkAuth } = useAuth();

  // On server side, check if user is authenticated via nuxt-directus
  if (import.meta.server) {
    // The nuxt-directus module should have populated user from cookies
    if (!user.value) {
      return navigateTo("/login");
    }
    return;
  }

  // Client-side authentication check
  // First check if user is already available (from SSR or previous auth)
  if (user.value) {
    return;
  }

  // If no user, try to restore authentication state
  try {
    const authenticated = await checkAuth();
    if (!authenticated) {
      return navigateTo("/login");
    }
  } catch (error) {
    console.error("Global auth check failed:", error);
    return navigateTo("/login");
  }

  // Log navigation for debugging (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log(`Navigating to: ${to.path}, Authenticated: ${!!user.value}`);
  }
});

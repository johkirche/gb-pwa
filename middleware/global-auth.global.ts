export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server during initial render to prevent hydration issues
  if (import.meta.server) return;

  // Initialize authentication state on app load
  const { user, checkAuth } = useAuth();

  // Define public routes that don't require authentication
  const publicRoutes = ["/login", "/"];
  const isPublicRoute = publicRoutes.includes(to.path);

  // Always try to restore authentication state on client-side navigation
  // This ensures the user state is available before page-specific middleware runs
  try {
    if (!user.value) {
      await checkAuth();
    }
  } catch (error) {
    console.error("Global auth check failed:", error);
    // If we're trying to access a protected route and auth fails, redirect to login
    if (!isPublicRoute) {
      return navigateTo("/login");
    }
  }

  // Log navigation for debugging (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log(`Navigating to: ${to.path}, Authenticated: ${!!user.value}`);
  }
});

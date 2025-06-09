/**
 * Client-side plugin to handle global authentication errors
 * This runs only on the client to handle token expiration and auth errors
 */

export default defineNuxtPlugin(() => {
  // Only run on client side
  if (import.meta.server) return;

  const authStore = useAuthStore();
  const router = useRouter();

  // Global error handler for authentication
  const handleAuthError = (error: any) => {
    if (error?.statusCode === 401 || error?.status === 401) {
      console.warn("Authentication error detected, clearing auth state");
      authStore.clearAuth();

      // Redirect to login if not already there
      const currentRoute = router.currentRoute.value;
      if (currentRoute.path !== "/auth/login") {
        return navigateTo("/auth/login");
      }
    }
  };

  // Listen for global fetch errors
  if (typeof window !== "undefined") {
    window.addEventListener("unhandledrejection", (event) => {
      const error = event.reason;
      handleAuthError(error);
    });
  }

  // Provide error handler for composables
  return {
    provide: {
      handleAuthError,
    },
  };
});

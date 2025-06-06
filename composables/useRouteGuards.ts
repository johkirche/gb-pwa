export const useRouteGuards = () => {
  const { user, isLoggedIn, checkAuth } = useAuth();

  /**
   * Check if current user has specific permissions
   * Modify this based on your role/permission system
   */
  const hasPermission = (permission: string): boolean => {
    if (!user.value) return false;

    // Example permission checks - adjust based on your user structure
    switch (permission) {
      case "admin":
        return user.value.email?.includes("admin") || false;
      case "user":
        return !!user.value;
      default:
        return false;
    }
  };

  /**
   * Check if current route requires authentication
   */
  const requiresAuth = (path: string): boolean => {
    const publicRoutes = ["/login", "/", "/register", "/forgot-password"];
    return !publicRoutes.includes(path);
  };

  /**
   * Get redirect URL after successful authentication
   */
  const getRedirectUrl = (defaultPath = "/home"): string => {
    const route = useRoute();
    return (route.query?.redirect as string) || defaultPath;
  };

  /**
   * Programmatically navigate with auth check
   */
  const navigateWithAuth = async (
    to: string,
    requiresAuthentication = true
  ) => {
    if (requiresAuthentication && !isLoggedIn.value) {
      try {
        const authenticated = await checkAuth();
        if (!authenticated) {
          return navigateTo({
            path: "/login",
            query: { redirect: to },
          });
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        return navigateTo({
          path: "/login",
          query: { redirect: to },
        });
      }
    }

    return navigateTo(to);
  };

  /**
   * Check if user can access a specific route
   */
  const canAccess = async (
    path: string,
    permission?: string
  ): Promise<boolean> => {
    // Check authentication if route requires it
    if (requiresAuth(path)) {
      if (!isLoggedIn.value) {
        try {
          const authenticated = await checkAuth();
          if (!authenticated) return false;
        } catch {
          return false;
        }
      }
    }

    // Check specific permission if provided
    if (permission) {
      return hasPermission(permission);
    }

    return true;
  };

  return {
    hasPermission,
    requiresAuth,
    getRedirectUrl,
    navigateWithAuth,
    canAccess,
    // Re-export auth state for convenience
    user: readonly(user),
    isLoggedIn: readonly(isLoggedIn),
  };
};

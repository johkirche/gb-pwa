// Simplified auth composable - just a thin wrapper around nuxt-directus
export const useAuth = () => {
  const { login: directusLogin, logout: directusLogout } = useDirectusAuth();
  const user = useDirectusUser();

  const isLoading = ref(false);

  const login = async (email: string, password: string) => {
    try {
      isLoading.value = true;
      await directusLogin({ email, password });
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.message || "Login failed",
      };
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    try {
      await directusLogout();
      await navigateTo("/login");
    } catch (error) {
      console.error("Logout error:", error);
      await navigateTo("/login");
    }
  };

  const checkAuth = async () => {
    try {
      // Try to fetch the user to refresh authentication state
      // This will validate the stored session and update user state
      const { fetchUser } = useDirectusAuth();
      await fetchUser();

      // Check if user state is available after fetch
      return !!user.value;
    } catch (error) {
      console.error("Auth check error:", error);
      // On error, assume not authenticated
      return false;
    }
  };

  /**
   * Get redirect URL after successful authentication
   */
  const getRedirectUrl = (defaultPath = "/home"): string => {
    const route = useRoute();
    return (route.query?.redirect as string) || defaultPath;
  };

  return {
    // Core methods
    login,
    logout,
    checkAuth,
    getRedirectUrl,

    // State from nuxt-directus
    user,
    isLoggedIn: computed(() => !!user.value),
    isLoading: readonly(isLoading),

    // Computed helpers
    userName: computed(
      () => user.value?.first_name || user.value?.email || "User"
    ),
  };
};

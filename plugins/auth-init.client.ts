export default defineNuxtPlugin(async () => {
  // This plugin runs only on the client side to initialize auth state
  const { user, checkAuth } = useAuth();

  // Try to restore authentication state from stored session
  try {
    if (!user.value) {
      await checkAuth();
    }
  } catch (error) {
    console.error("Failed to initialize auth state:", error);
    // Don't throw error to prevent app from breaking
  }
});

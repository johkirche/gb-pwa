export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server during initial render
  if (import.meta.server) return;

  const { isLoggedIn, user } = useAuth();

  // The global middleware should have already checked auth state
  // But double-check here to be safe
  if (!isLoggedIn.value && !user.value) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});

import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "index",
      component: () => import("@/views/IndexView.vue"),
    },
    {
      path: "/home",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/songs",
      name: "songs",
      component: () => import("@/views/SongsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/lied/:id?",
      name: "lied",
      component: () => import("@/views/LiedView.vue"),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
    },
    {
      path: "/offline",
      name: "offline",
      component: () => import("@/views/OfflineView.vue"),
    },
    {
      path: "/church-service",
      name: "church-service",
      component: () => import("@/views/ChurchServiceView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/midi-test",
      name: "midi-test",
      component: () => import("@/views/MidiTestView.vue"),
    },
    {
      // Catch all route - redirect to index
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

// Navigation guard for authentication
router.beforeEach(async (to, _from, next) => {
  // Import auth composable here to avoid circular dependency
  const { useAuth } = await import("@/composables/useAuth");
  const { checkAuth, isLoggedIn } = useAuth();

  // Import auth store to check hydration status
  const { useAuthStore } = await import("@/stores/auth");
  const authStore = useAuthStore();

  // Wait for hydration to complete if not already done
  if (!authStore.isHydrated) {
    authStore.hydrateFromStorage();
    authStore.markAsHydrated();
  }

  // If going to the index page, handle authentication routing
  if (to.name === "index") {
    try {
      if (isLoggedIn.value) {
        // User is already authenticated, redirect to home
        next("/home");
        return;
      }

      // Check authentication status
      const authenticated = await checkAuth();

      if (authenticated) {
        next("/home");
      } else {
        next("/login");
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      next("/login");
    }
    return;
  }

  // If route requires authentication
  if (to.meta.requiresAuth) {
    try {
      if (isLoggedIn.value) {
        // User is already authenticated
        next();
        return;
      }

      // Check authentication status
      const authenticated = await checkAuth();

      if (authenticated) {
        next();
      } else {
        // Redirect to login with return URL
        next({
          name: "login",
          query: { redirect: to.fullPath },
        });
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      next({
        name: "login",
        query: { redirect: to.fullPath },
      });
    }
    return;
  }

  // If going to login page and already authenticated, redirect to home
  if (to.name === "login") {
    try {
      if (isLoggedIn.value) {
        next("/home");
        return;
      }

      const authenticated = await checkAuth();

      if (authenticated) {
        next("/home");
      } else {
        next();
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      next();
    }
    return;
  }

  // No authentication required, proceed
  next();
});

export default router;

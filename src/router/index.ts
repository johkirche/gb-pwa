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
      path: "/playlists",
      name: "playlists",
      component: () => import("@/views/PlaylistsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/playlists/:id",
      name: "playlist-detail",
      component: () => import("@/views/PlaylistDetailView.vue"),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/SettingsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      // Catch all route - redirect to index
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

// Navigation guard — offline-first.
//
// Core principle: once the user has downloaded content, the app is fully usable
// offline and navigation must NEVER bounce to /login. A live Directus session
// is only needed to *sync* fresh data; its absence/expiry falls back to the
// cached content in IndexedDB. We therefore only force /login when there is
// genuinely nothing to show (no session AND no offline content), or after an
// explicit logout.
router.beforeEach(async (to, _from, next) => {
  // Import lazily to avoid circular dependencies at module-eval time.
  const { useAuth } = await import("@/composables/useAuth");
  const { useAuthStore } = await import("@/stores/auth");
  const { hasOfflineContentAvailable } = await import(
    "@/composables/useOfflineDownload"
  );

  const authStore = useAuthStore();

  // Ensure the session is hydrated from localStorage before deciding anything.
  if (!authStore.isHydrated) {
    authStore.hydrateFromStorage();
    authStore.markAsHydrated();
  }

  // Instantiating useAuth bootstraps the background refresh timer + the
  // cross-tab / reconnect listeners for this tab.
  const { checkAuth } = useAuth();

  const hasSession = authStore.isAuthenticated; // user + access token present
  const canRefresh = !!authStore.refreshToken; // could become online again
  const offlineReady =
    !authStore.isLoggedOut && (await hasOfflineContentAvailable());
  const online = typeof navigator === "undefined" || navigator.onLine;

  // Usable without blocking on the network: we have a session, a refreshable
  // token, or downloaded offline content (and the user hasn't logged out).
  const usableNow = (hasSession || canRefresh || offlineReady) && !authStore.isLoggedOut;

  // Keep the session fresh in the background when possible, but never block
  // navigation on it (no awaited network call when we're already usable).
  // checkAuth() itself only hits the network when the access token actually
  // needs refreshing.
  const refreshInBackground = () => {
    if (online && (hasSession || canRefresh)) {
      checkAuth().catch(() => {
        /* offline-first: ignore, cached content remains available */
      });
    }
  };

  // Landing route → send to home if usable, else to login.
  if (to.name === "index") {
    if (usableNow) {
      refreshInBackground();
      next("/home");
      return;
    }
    if (online) {
      try {
        next((await checkAuth()) ? "/home" : "/login");
      } catch (error) {
        console.error("Authentication check failed:", error);
        next("/login");
      }
      return;
    }
    next("/login");
    return;
  }

  // Protected route.
  if (to.meta.requiresAuth) {
    if (usableNow) {
      refreshInBackground();
      next();
      return;
    }
    // Nothing usable locally. If online, try to establish a session; otherwise
    // there's nothing to show, so route to login.
    if (online) {
      try {
        if (await checkAuth()) {
          next();
          return;
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
      }
    }
    next({ name: "login", query: { redirect: to.fullPath } });
    return;
  }

  // Login route: if a live session already exists, skip straight to home.
  // (When the session is gone but offline content exists we still allow the
  // login form so the user can re-authenticate and sync.)
  if (to.name === "login") {
    if (hasSession) {
      next("/home");
      return;
    }
    next();
    return;
  }

  // No authentication required, proceed.
  next();
});

export default router;

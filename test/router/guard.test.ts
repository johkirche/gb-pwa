import type { Router } from "vue-router";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCESS_TOKEN_KEY,
  LOGGED_OUT_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  type User,
} from "@/stores/auth";

import { restoreOnline, setOnline } from "../helpers/env";
import { makeTokenExpiringIn } from "../helpers/jwt";

const h = vi.hoisted(() => ({
  checkAuth: vi.fn(),
  hasOfflineContentAvailable: vi.fn(),
  // Must live inside vi.hoisted: the vi.mock calls below are hoisted above any
  // ordinary top-level const, so referencing one would hit the TDZ.
  stubView: () => ({ default: { name: "StubView", render: () => null } }),
}));

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ checkAuth: h.checkAuth }),
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  hasOfflineContentAvailable: h.hasOfflineContentAvailable,
}));

// The routes lazy-import real views, which would drag in OpenSheetMusicDisplay,
// spessasynth, i18n and the whole component tree. The guard is what is under
// test, so every view is replaced with an inert stub. `render: () => null`
// rather than a template string, because the runtime-only Vue build in tests
// cannot compile templates.
vi.mock("@/views/IndexView.vue", h.stubView);
vi.mock("@/views/HomeView.vue", h.stubView);
vi.mock("@/views/SongsView.vue", h.stubView);
vi.mock("@/views/LiedView.vue", h.stubView);
vi.mock("@/views/LoginView.vue", h.stubView);
vi.mock("@/views/OfflineView.vue", h.stubView);
vi.mock("@/views/ChurchServiceView.vue", h.stubView);
vi.mock("@/views/PlaylistsView.vue", h.stubView);
vi.mock("@/views/PlaylistCreateView.vue", h.stubView);
vi.mock("@/views/PlaylistDetailView.vue", h.stubView);
vi.mock("@/views/PlaylistAddSongsView.vue", h.stubView);
vi.mock("@/views/SettingsView.vue", h.stubView);

const alice: User = { id: "u-1", email: "alice@example.com", first_name: "Alice" };

/**
 * Seed the session the way a real page load sees it: in localStorage. The guard
 * calls hydrateFromStorage() on its first run, so anything written straight to
 * the store would be overwritten.
 */
function seedStorage(seed: {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  loggedOut?: boolean;
}) {
  if (seed.user) localStorage.setItem(USER_KEY, JSON.stringify(seed.user));
  if (seed.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, seed.accessToken);
  if (seed.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, seed.refreshToken);
  if (seed.loggedOut) localStorage.setItem(LOGGED_OUT_KEY, "1");
}

/** A complete, live session. */
function seedLiveSession() {
  seedStorage({
    user: alice,
    accessToken: makeTokenExpiringIn(3600),
    refreshToken: "refresh-1",
  });
}

async function loadRouter(): Promise<Router> {
  vi.resetModules();
  const pinia = await import("pinia");
  pinia.setActivePinia(pinia.createPinia());
  const mod = await import("@/router");
  return mod.default;
}

/** Navigate and report where we actually landed. */
async function go(router: Router, path: string) {
  await router.push(path).catch(() => {});
  await router.isReady();
  return router.currentRoute.value;
}

beforeEach(() => {
  h.checkAuth.mockReset().mockResolvedValue(false);
  h.hasOfflineContentAvailable.mockReset().mockResolvedValue(false);
  setOnline(true);
});

afterEach(() => {
  restoreOnline();
});

// ---------------------------------------------------------------------------
describe("protected routes", () => {
  it("admits a user with a live session", async () => {
    seedLiveSession();
    const router = await loadRouter();

    const route = await go(router, "/songs");

    expect(route.path).toBe("/songs");
  });

  it("admits a user who only has a refresh token", async () => {
    seedStorage({ refreshToken: "refresh-1" });
    const router = await loadRouter();

    const route = await go(router, "/songs");

    expect(route.path).toBe("/songs");
  });

  it("admits a logged-out-of-network user who has downloaded content", async () => {
    // No tokens at all, but the songs are on the device. This is the whole
    // point of the app: usable in a church basement with no signal.
    h.hasOfflineContentAvailable.mockResolvedValue(true);
    setOnline(false);
    const router = await loadRouter();

    const route = await go(router, "/church-service");

    expect(route.path).toBe("/church-service");
  });

  it("does not block navigation on the network when already usable", async () => {
    seedLiveSession();
    // A background refresh that never settles. If the guard awaited it, this
    // navigation could never resolve and the test would time out — which is
    // exactly the "app hangs on a flaky connection" failure we care about.
    h.checkAuth.mockReturnValue(new Promise(() => {}));
    const router = await loadRouter();

    const route = await go(router, "/songs");

    expect(route.path).toBe("/songs");
    expect(h.checkAuth).toHaveBeenCalled();
  });

  it("sends an explicitly logged-out user to /login even with offline content", async () => {
    // "Log out" has to actually stick, otherwise a shared device leaks the
    // previous user's session.
    h.hasOfflineContentAvailable.mockResolvedValue(true);
    seedStorage({ loggedOut: true });
    const router = await loadRouter();

    const route = await go(router, "/songs");

    expect(route.path).toBe("/login");
    expect(route.query.redirect).toBe("/songs");
  });

  it("establishes a session over the network when nothing is cached", async () => {
    h.checkAuth.mockResolvedValue(true);
    const router = await loadRouter();

    const route = await go(router, "/songs");

    expect(route.path).toBe("/songs");
    expect(h.checkAuth).toHaveBeenCalled();
  });

  it("redirects to /login with the intended destination when there is nothing", async () => {
    h.checkAuth.mockResolvedValue(false);
    const router = await loadRouter();

    const route = await go(router, "/playlists/7");

    expect(route.path).toBe("/login");
    expect(route.query.redirect).toBe("/playlists/7");
  });

  it("does not attempt a network check while offline", async () => {
    setOnline(false);
    const router = await loadRouter();

    const route = await go(router, "/songs");

    expect(route.path).toBe("/login");
    expect(h.checkAuth).not.toHaveBeenCalled();
  });

  it("still redirects to /login when checkAuth throws", async () => {
    h.checkAuth.mockRejectedValue(new Error("directus exploded"));
    const router = await loadRouter();

    const route = await go(router, "/songs");

    expect(route.path).toBe("/login");
  });
});

// ---------------------------------------------------------------------------
describe("index route", () => {
  it("forwards a usable session to /home", async () => {
    seedLiveSession();
    const router = await loadRouter();

    const route = await go(router, "/");

    expect(route.path).toBe("/home");
  });

  it("forwards to /home when only offline content is available", async () => {
    h.hasOfflineContentAvailable.mockResolvedValue(true);
    const router = await loadRouter();

    const route = await go(router, "/");

    expect(route.path).toBe("/home");
  });

  it("goes to /home when an online check succeeds", async () => {
    h.checkAuth.mockResolvedValue(true);
    const router = await loadRouter();

    const route = await go(router, "/");

    expect(route.path).toBe("/home");
  });

  it("goes to /login when an online check fails", async () => {
    h.checkAuth.mockResolvedValue(false);
    const router = await loadRouter();

    const route = await go(router, "/");

    expect(route.path).toBe("/login");
  });

  it("goes to /login when offline with nothing cached", async () => {
    setOnline(false);
    const router = await loadRouter();

    const route = await go(router, "/");

    expect(route.path).toBe("/login");
  });
});

// ---------------------------------------------------------------------------
describe("login route", () => {
  it("skips straight to /home when a live session already exists", async () => {
    seedLiveSession();
    const router = await loadRouter();

    const route = await go(router, "/login");

    expect(route.path).toBe("/home");
  });

  it("still shows the form when offline content exists but the session is gone", async () => {
    // The user needs a way back in to sync, so the login form must remain
    // reachable even though offline content would satisfy the guard elsewhere.
    h.hasOfflineContentAvailable.mockResolvedValue(true);
    seedStorage({ user: alice }); // cached identity, but no access token
    const router = await loadRouter();

    const route = await go(router, "/login");

    expect(route.path).toBe("/login");
  });
});

// ---------------------------------------------------------------------------
describe("public routes", () => {
  it("allows /offline without any session", async () => {
    const router = await loadRouter();

    const route = await go(router, "/offline");

    expect(route.path).toBe("/offline");
    expect(h.checkAuth).not.toHaveBeenCalled();
  });

  it("redirects an unknown path to the index route", async () => {
    h.checkAuth.mockResolvedValue(false);
    const router = await loadRouter();

    const route = await go(router, "/this-does-not-exist");

    // "/" then resolves through the index guard, which lands on /login here.
    expect(route.path).toBe("/login");
  });
});

// ---------------------------------------------------------------------------
describe("route table", () => {
  it("ranks /playlists/new above /playlists/:id so 'new' is never an id", async () => {
    seedLiveSession();
    const router = await loadRouter();

    const route = await go(router, "/playlists/new");

    expect(route.name).toBe("playlist-new");
    expect(route.params.id).toBeUndefined();
  });

  it("still matches a real playlist id", async () => {
    seedLiveSession();
    const router = await loadRouter();

    const route = await go(router, "/playlists/42");

    expect(route.name).toBe("playlist-detail");
    expect(route.params.id).toBe("42");
  });
});

import { AxiosError, type AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCESS_TOKEN_KEY,
  LOGGED_OUT_KEY,
  REFRESH_TOKEN_KEY,
  type User,
} from "@/stores/auth";

import { restoreOnline, setOnline } from "../helpers/env";
import { makeTokenExpiringIn } from "../helpers/jwt";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  directus: {
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getCurrentUser: vi.fn(),
  },
  hasOfflineContentAvailable: vi.fn(),
  routerPush: vi.fn(),
  route: { query: {} as Record<string, unknown> },
}));

vi.mock("@/composables/useDirectusApi", () => ({
  useDirectusApi: () => h.directus,
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  hasOfflineContentAvailable: h.hasOfflineContentAvailable,
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: h.routerPush }),
  useRoute: () => h.route,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const alice: User = { id: "u-1", email: "alice@example.com", first_name: "Alice" };

/** An axios error carrying an HTTP response — i.e. the server answered. */
function httpError(status: number, data: unknown = {}): AxiosError {
  const response = {
    status,
    data,
    statusText: "",
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return new AxiosError("request failed", "ERR_BAD_RESPONSE", undefined, {}, response);
}

/** An axios error with no response — offline, DNS failure, timeout. */
function networkError(): AxiosError {
  return new AxiosError("Network Error", "ERR_NETWORK", undefined, {});
}

function refreshOk(overrides: Record<string, unknown> = {}) {
  return {
    access_token: makeTokenExpiringIn(3600),
    refresh_token: "refresh-new",
    expires: 900_000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Harness
//
// useAuth.ts keeps module-level state (refreshTimer, refreshInFlight,
// globalListenersAttached), so every test gets a freshly-imported copy of the
// module graph plus a fresh pinia. pinia itself is imported *after* the reset so
// that the store module and `setActivePinia` can never end up on different
// copies of pinia.
// ---------------------------------------------------------------------------
type SeedOptions = {
  user?: User | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  loggedOut?: boolean;
};

async function setupAuth(seed: SeedOptions = {}) {
  vi.resetModules();

  const pinia = await import("pinia");
  pinia.setActivePinia(pinia.createPinia());

  const { useAuthStore } = await import("@/stores/auth");
  const store = useAuthStore();

  if (seed.accessToken !== undefined || seed.refreshToken !== undefined) {
    store.setTokens(seed.accessToken ?? null, seed.refreshToken ?? null);
  }
  if (seed.user !== undefined) store.setUser(seed.user);
  if (seed.loggedOut) store.setLoggedOut(true);

  const { useAuth } = await import("@/composables/useAuth");
  const auth = useAuth();

  return { auth, store };
}

// useAuth registers process-wide `storage` / `online` listeners on first use.
// Because each test re-imports the module, those would pile up on the shared
// happy-dom window and fire against dead stores. Capture and unregister them.
const registered: Array<[string, EventListenerOrEventListenerObject]> = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));

  h.directus.login.mockReset();
  h.directus.logout.mockReset().mockResolvedValue(undefined);
  h.directus.refresh.mockReset();
  h.directus.getCurrentUser.mockReset().mockResolvedValue(alice);
  h.hasOfflineContentAvailable.mockReset().mockResolvedValue(false);
  h.routerPush.mockReset();
  h.route.query = {};

  setOnline(true);

  const original = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject, opts?: unknown) => {
      registered.push([type, listener]);
      original(type, listener, opts as never);
    },
  );
});

afterEach(() => {
  for (const [type, listener] of registered.splice(0)) {
    window.removeEventListener(type, listener);
  }
  restoreOnline();
});

// ---------------------------------------------------------------------------
describe("login", () => {
  it("stores tokens, fetches the profile and reports success", async () => {
    const access = makeTokenExpiringIn(3600);
    h.directus.login.mockResolvedValue({
      access_token: access,
      refresh_token: "refresh-1",
      expires: 900_000,
    });
    const { auth, store } = await setupAuth();

    const result = await auth.login("alice@example.com", "hunter2");

    expect(result).toEqual({ success: true });
    expect(h.directus.login).toHaveBeenCalledWith({
      email: "alice@example.com",
      password: "hunter2",
      mode: "json",
    });
    expect(store.accessToken).toBe(access);
    expect(store.refreshToken).toBe("refresh-1");
    expect(store.user).toEqual(alice);
    expect(store.isLoading).toBe(false);
  });

  it("clears a previous explicit logout so the guard stops forcing /login", async () => {
    h.directus.login.mockResolvedValue({
      access_token: makeTokenExpiringIn(3600),
      refresh_token: "refresh-1",
      expires: 900_000,
    });
    const { auth, store } = await setupAuth({ loggedOut: true });
    expect(store.isLoggedOut).toBe(true);

    await auth.login("alice@example.com", "hunter2");

    expect(store.isLoggedOut).toBe(false);
    expect(localStorage.getItem(LOGGED_OUT_KEY)).toBeNull();
  });

  it("maps a 401 to an invalid-credentials message and clears state", async () => {
    h.directus.login.mockRejectedValue(httpError(401));
    const { auth, store } = await setupAuth();

    const result = await auth.login("alice@example.com", "wrong");

    expect(result).toEqual({ success: false, error: "Invalid email or password" });
    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it("maps a 429 to a rate-limit message", async () => {
    h.directus.login.mockRejectedValue(httpError(429));
    const { auth } = await setupAuth();

    const result = await auth.login("alice@example.com", "hunter2");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Too many login attempts/);
  });

  it("surfaces the server's own error message when there is one", async () => {
    h.directus.login.mockRejectedValue(
      httpError(400, { errors: [{ message: "User suspended" }] }),
    );
    const { auth } = await setupAuth();

    const result = await auth.login("alice@example.com", "hunter2");

    expect(result).toEqual({ success: false, error: "User suspended" });
  });

  it("reports a generic failure for a non-axios error", async () => {
    h.directus.login.mockRejectedValue(new Error("boom"));
    const { auth } = await setupAuth();

    const result = await auth.login("alice@example.com", "hunter2");

    expect(result).toEqual({ success: false, error: "Login failed" });
  });
});

// ---------------------------------------------------------------------------
describe("logout", () => {
  it("revokes the refresh token server-side and marks an explicit logout", async () => {
    const { auth, store } = await setupAuth({
      user: alice,
      accessToken: makeTokenExpiringIn(3600),
      refreshToken: "refresh-1",
    });

    await auth.logout();

    expect(h.directus.logout).toHaveBeenCalledWith({
      refresh_token: "refresh-1",
      mode: "json",
    });
    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    // The explicit flag is what makes "Log out" stick even with offline content.
    expect(store.isLoggedOut).toBe(true);
    expect(localStorage.getItem(LOGGED_OUT_KEY)).toBe("1");
    expect(h.routerPush).toHaveBeenCalledWith("/login");
  });

  it("still clears local state when the server call fails", async () => {
    h.directus.logout.mockRejectedValue(networkError());
    const { auth, store } = await setupAuth({
      user: alice,
      accessToken: makeTokenExpiringIn(3600),
      refreshToken: "refresh-1",
    });

    await auth.logout();

    expect(store.user).toBeNull();
    expect(store.isLoggedOut).toBe(true);
    expect(h.routerPush).toHaveBeenCalledWith("/login");
  });

  it("skips the server call when there is no refresh token", async () => {
    const { auth, store } = await setupAuth({ user: alice, accessToken: "a" });

    await auth.logout();

    expect(h.directus.logout).not.toHaveBeenCalled();
    expect(store.isLoggedOut).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("checkAuth while offline", () => {
  it("trusts the hydrated session and performs no network call", async () => {
    setOnline(false);
    const { auth } = await setupAuth({
      user: alice,
      accessToken: makeTokenExpiringIn(-3600), // expired, but we cannot refresh
      refreshToken: "refresh-1",
    });

    await expect(auth.checkAuth()).resolves.toBe(true);
    expect(h.directus.refresh).not.toHaveBeenCalled();
  });

  it("stays authenticated on a refresh token alone", async () => {
    setOnline(false);
    const { auth } = await setupAuth({ refreshToken: "refresh-1" });

    await expect(auth.checkAuth()).resolves.toBe(true);
  });

  it("is false only when there is genuinely nothing to fall back on", async () => {
    setOnline(false);
    const { auth } = await setupAuth();

    await expect(auth.checkAuth()).resolves.toBe(false);
  });
});

describe("checkAuth while online", () => {
  it("trusts a comfortably valid access token without hitting the network", async () => {
    const { auth } = await setupAuth({
      user: alice,
      accessToken: makeTokenExpiringIn(3600),
      refreshToken: "refresh-1",
    });

    await expect(auth.checkAuth()).resolves.toBe(true);
    expect(h.directus.refresh).not.toHaveBeenCalled();
  });

  it("refreshes a token that is inside the 2-minute threshold", async () => {
    h.directus.refresh.mockResolvedValue(refreshOk());
    const { auth } = await setupAuth({
      user: alice,
      accessToken: makeTokenExpiringIn(60), // < 2 min of life left
      refreshToken: "refresh-1",
    });

    await expect(auth.checkAuth()).resolves.toBe(true);
    expect(h.directus.refresh).toHaveBeenCalledOnce();
  });

  it("refreshes when there is no access token at all", async () => {
    h.directus.refresh.mockResolvedValue(refreshOk());
    const { auth } = await setupAuth({ refreshToken: "refresh-1" });

    await expect(auth.checkAuth()).resolves.toBe(true);
    expect(h.directus.refresh).toHaveBeenCalledOnce();
  });

  it("falls back to the local session when the refresh cannot go through", async () => {
    h.directus.refresh.mockRejectedValue(networkError());
    const { auth, store } = await setupAuth({
      user: alice,
      accessToken: makeTokenExpiringIn(30),
      refreshToken: "refresh-1",
    });

    await expect(auth.checkAuth()).resolves.toBe(true);
    expect(store.user).toEqual(alice);
  });

  it("is false when there is no session and nothing to refresh with", async () => {
    const { auth } = await setupAuth();

    await expect(auth.checkAuth()).resolves.toBe(false);
    expect(h.directus.refresh).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("refreshAuth", () => {
  it("collapses concurrent callers into a single request", async () => {
    // Two tabs / the background timer and a navigation can race here. Burning
    // the single-use refresh token twice would log the user out.
    let release!: (value: unknown) => void;
    h.directus.refresh.mockImplementation(
      () => new Promise((resolve) => { release = resolve; }),
    );
    const { auth } = await setupAuth({ refreshToken: "refresh-1" });

    const first = auth.refreshAuth();
    const second = auth.refreshAuth();
    release(refreshOk());
    const results = await Promise.all([first, second]);

    expect(results).toEqual([true, true]);
    expect(h.directus.refresh).toHaveBeenCalledOnce();
  });

  it("returns false when no refresh token exists anywhere", async () => {
    const { auth } = await setupAuth();

    await expect(auth.refreshAuth()).resolves.toBe(false);
    expect(h.directus.refresh).not.toHaveBeenCalled();
  });

  it("prefers the localStorage token over a stale in-memory copy", async () => {
    h.directus.refresh.mockResolvedValue(refreshOk());
    const { auth } = await setupAuth({ refreshToken: "stale-in-memory" });
    // Another tab rotated the token after this tab hydrated.
    localStorage.setItem(REFRESH_TOKEN_KEY, "fresh-from-other-tab");

    await auth.refreshAuth();

    expect(h.directus.refresh).toHaveBeenCalledWith({
      refresh_token: "fresh-from-other-tab",
      mode: "json",
    });
  });

  it("keeps the cached user when the profile fetch fails after a good refresh", async () => {
    h.directus.refresh.mockResolvedValue(refreshOk());
    h.directus.getCurrentUser.mockRejectedValue(networkError());
    const { auth, store } = await setupAuth({
      user: alice,
      refreshToken: "refresh-1",
    });

    await expect(auth.refreshAuth()).resolves.toBe(true);

    expect(store.user).toEqual(alice);
    expect(store.accessToken).toBeTruthy();
  });
});

describe("refreshAuth must never log the user out on a transient failure", () => {
  it("keeps the session fully intact on a network error", async () => {
    h.directus.refresh.mockRejectedValue(networkError());
    const { auth, store } = await setupAuth({
      user: alice,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });

    await expect(auth.refreshAuth()).resolves.toBe(false);

    expect(store.user).toEqual(alice);
    expect(store.accessToken).toBe("access-1");
    expect(store.refreshToken).toBe("refresh-1");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-1");
  });

  it("keeps the session fully intact on a 500", async () => {
    h.directus.refresh.mockRejectedValue(httpError(500));
    const { auth, store } = await setupAuth({
      user: alice,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });

    await expect(auth.refreshAuth()).resolves.toBe(false);

    expect(store.user).toEqual(alice);
    expect(store.refreshToken).toBe("refresh-1");
  });

  it("keeps the session fully intact on an error of unknown shape", async () => {
    h.directus.refresh.mockRejectedValue(new Error("something odd"));
    const { auth, store } = await setupAuth({
      user: alice,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });

    await expect(auth.refreshAuth()).resolves.toBe(false);

    expect(store.user).toEqual(alice);
    expect(store.refreshToken).toBe("refresh-1");
  });
});

describe("refreshAuth when the server genuinely rejects the token", () => {
  it("keeps the cached identity but drops dead tokens if content is downloaded", async () => {
    // The user is mid-service in a church with no signal. Bouncing them to
    // /login here would make the downloaded songs unreachable.
    h.directus.refresh.mockRejectedValue(httpError(401));
    h.hasOfflineContentAvailable.mockResolvedValue(true);
    const { auth, store } = await setupAuth({
      user: alice,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });

    await expect(auth.refreshAuth()).resolves.toBe(false);

    expect(store.user).toEqual(alice);
    expect(store.isLoggedIn).toBe(true);
    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
    expect(store.isLoggedOut).toBe(false);
  });

  it("clears everything when there is no offline content to fall back on", async () => {
    h.directus.refresh.mockRejectedValue(httpError(403));
    h.hasOfflineContentAvailable.mockResolvedValue(false);
    const { auth, store } = await setupAuth({
      user: alice,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });

    await expect(auth.refreshAuth()).resolves.toBe(false);

    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    // Still not an *explicit* logout — the user never asked to sign out.
    expect(store.isLoggedOut).toBe(false);
  });

  it("retries once when another tab rotated the token mid-flight", async () => {
    h.directus.refresh
      .mockImplementationOnce(async () => {
        // Simulate the other tab winning the race while our request was in
        // flight: it persisted a newer refresh token before ours was rejected.
        localStorage.setItem(REFRESH_TOKEN_KEY, "rotated-by-other-tab");
        throw httpError(401);
      })
      .mockResolvedValueOnce(refreshOk());
    const { auth, store } = await setupAuth({
      user: alice,
      refreshToken: "stale-token",
    });

    await expect(auth.refreshAuth()).resolves.toBe(true);

    expect(h.directus.refresh).toHaveBeenCalledTimes(2);
    expect(h.directus.refresh).toHaveBeenLastCalledWith({
      refresh_token: "rotated-by-other-tab",
      mode: "json",
    });
    expect(store.user).toEqual(alice);
  });

  it("gives up when the rotation retry is also rejected", async () => {
    h.directus.refresh
      .mockImplementationOnce(async () => {
        localStorage.setItem(REFRESH_TOKEN_KEY, "rotated-but-also-dead");
        throw httpError(401);
      })
      .mockRejectedValueOnce(httpError(401));
    h.hasOfflineContentAvailable.mockResolvedValue(false);
    const { auth, store } = await setupAuth({
      user: alice,
      refreshToken: "stale-token",
    });

    await expect(auth.refreshAuth()).resolves.toBe(false);

    expect(h.directus.refresh).toHaveBeenCalledTimes(2);
    expect(store.user).toBeNull();
  });

  it("does not retry when the retry would use the same token", async () => {
    h.directus.refresh.mockRejectedValue(httpError(401));
    const { auth } = await setupAuth({ user: alice, refreshToken: "refresh-1" });

    await auth.refreshAuth();

    expect(h.directus.refresh).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
describe("scheduleTokenRefresh", () => {
  it("refreshes automatically 2 minutes before the token expires", async () => {
    h.directus.refresh.mockResolvedValue(refreshOk());
    const { auth } = await setupAuth({ refreshToken: "refresh-1" });

    auth.scheduleTokenRefresh(makeTokenExpiringIn(600)); // 10 minutes
    expect(h.directus.refresh).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);

    expect(h.directus.refresh).toHaveBeenCalledOnce();
  });

  it("does not schedule anything for an already-expired token", async () => {
    h.directus.refresh.mockResolvedValue(refreshOk());
    const { auth } = await setupAuth({ refreshToken: "refresh-1" });

    auth.scheduleTokenRefresh(makeTokenExpiringIn(-60));
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(h.directus.refresh).not.toHaveBeenCalled();
  });

  it("replaces a previously scheduled refresh instead of stacking them", async () => {
    h.directus.refresh.mockResolvedValue(refreshOk());
    const { auth } = await setupAuth({ refreshToken: "refresh-1" });

    auth.scheduleTokenRefresh(makeTokenExpiringIn(600)); // would fire at t+8min
    auth.scheduleTokenRefresh(makeTokenExpiringIn(900)); // moves it to t+13min

    // Past the first deadline: the superseded timer must not have fired.
    await vi.advanceTimersByTimeAsync(9 * 60 * 1000);
    expect(h.directus.refresh).not.toHaveBeenCalled();

    // Past the second deadline: exactly one refresh.
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(h.directus.refresh).toHaveBeenCalledOnce();
  });

  it("chains the next refresh after a successful one", async () => {
    // A successful refresh schedules the *next* refresh from the new token, so
    // a long-lived session keeps itself alive without any navigation.
    h.directus.refresh.mockResolvedValue(refreshOk());
    const { auth } = await setupAuth({ refreshToken: "refresh-1" });

    auth.scheduleTokenRefresh(makeTokenExpiringIn(600));
    await vi.advanceTimersByTimeAsync(9 * 60 * 1000);
    expect(h.directus.refresh).toHaveBeenCalledOnce();

    // refreshOk() hands back a token good for an hour → next refresh at +58min.
    await vi.advanceTimersByTimeAsync(59 * 60 * 1000);
    expect(h.directus.refresh).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
describe("cross-tab and reconnect listeners", () => {
  it("re-hydrates when another tab changes an auth- key", async () => {
    const { store } = await setupAuth();
    expect(store.user).toBeNull();

    // Another tab logged in.
    localStorage.setItem(ACCESS_TOKEN_KEY, "access-from-other-tab");
    localStorage.setItem("auth-user", JSON.stringify(alice));
    window.dispatchEvent(
      new StorageEvent("storage", { key: ACCESS_TOKEN_KEY, newValue: "x" }),
    );

    expect(store.user).toEqual(alice);
    expect(store.accessToken).toBe("access-from-other-tab");
  });

  it("ignores storage events for unrelated keys", async () => {
    const { store } = await setupAuth();

    localStorage.setItem("auth-user", JSON.stringify(alice));
    window.dispatchEvent(
      new StorageEvent("storage", { key: "theme", newValue: "dark" }),
    );

    expect(store.user).toBeNull();
  });

  it("refreshes on reconnect when the access token has lapsed", async () => {
    h.directus.refresh.mockResolvedValue(refreshOk());
    await setupAuth({
      accessToken: makeTokenExpiringIn(-60),
      refreshToken: "refresh-1",
    });

    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);

    expect(h.directus.refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh on reconnect while the token is still good", async () => {
    await setupAuth({
      accessToken: makeTokenExpiringIn(3600),
      refreshToken: "refresh-1",
    });

    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);

    expect(h.directus.refresh).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("getRedirectUrl", () => {
  it("returns the redirect query parameter when present", async () => {
    h.route.query = { redirect: "/playlists/7" };
    const { auth } = await setupAuth();

    expect(auth.getRedirectUrl()).toBe("/playlists/7");
  });

  it("falls back to /home", async () => {
    const { auth } = await setupAuth();

    expect(auth.getRedirectUrl()).toBe("/home");
  });

  it("honours a caller-supplied default", async () => {
    const { auth } = await setupAuth();

    expect(auth.getRedirectUrl("/songs")).toBe("/songs");
  });
});

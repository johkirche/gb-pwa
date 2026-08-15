import { AxiosError, type AxiosResponse } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DirectusApiClient, useDirectusApi } from "@/composables/useDirectusApi";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  type User,
  useAuthStore,
} from "@/stores/auth";

import { makeTokenExpiringIn } from "../helpers/jwt";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// The client uses axios three different ways — `axios.post`, `axios.get` and
// `axios(config)` — so the mocked default export has to be a callable function
// that also carries the verb helpers. `isAxiosError` is deliberately the real
// implementation: the 401 branch hinges on it, and stubbing it would let a
// broken error-shape check pass.
//
// The last two entries exist only for the concurrent-refresh section at the
// bottom, which instantiates useAuth to observe its refresh timer; they keep
// that module graph hermetic and are inert everywhere else.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => {
  const request = vi.fn();
  const post = vi.fn();
  const get = vi.fn();
  return {
    request,
    post,
    get,
    client: Object.assign(request, { post, get }),
    hasOfflineContentAvailable: vi.fn(),
    routerPush: vi.fn(),
  };
});

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: Object.assign(h.client, { isAxiosError: actual.isAxiosError }),
  };
});

vi.mock("@/composables/useOfflineDownload", () => ({
  hasOfflineContentAvailable: h.hasOfflineContentAvailable,
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: h.routerPush }),
  useRoute: () => ({ query: {} }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
/** Matches the value `vitest.config.ts` pins VITE_PUBLIC_DIRECTUS_URL to. */
const BASE = "https://directus.test";

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

/** An axios *response* whose body is a Directus `{ data: ... }` envelope. */
function enveloped<T>(payload: T) {
  return { data: { data: payload } };
}

function tokens(overrides: Record<string, unknown> = {}) {
  return {
    access_token: "access-2",
    refresh_token: "refresh-2",
    expires: 900_000,
    ...overrides,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
  h.request.mockReset();
  h.post.mockReset();
  h.get.mockReset();
});

// ---------------------------------------------------------------------------
describe("constructor", () => {
  it("strips a trailing slash so built URLs never contain a double slash", async () => {
    h.post.mockResolvedValue(enveloped(tokens()));
    const client = new DirectusApiClient(`${BASE}/`);

    await client.login({ email: "alice@example.com", password: "hunter2" });

    expect(h.post.mock.calls[0][0]).toBe(`${BASE}/auth/login`);
  });

  it("leaves a base URL without a trailing slash untouched", async () => {
    h.post.mockResolvedValue(enveloped(tokens()));
    const client = new DirectusApiClient(`${BASE}/api`);

    await client.login({ email: "alice@example.com", password: "hunter2" });

    expect(h.post.mock.calls[0][0]).toBe(`${BASE}/api/auth/login`);
  });
});

// ---------------------------------------------------------------------------
describe("login", () => {
  it("posts the credentials to /auth/login and unwraps the data envelope", async () => {
    const session = tokens({ access_token: "access-1", refresh_token: "refresh-1" });
    h.post.mockResolvedValue(enveloped(session));
    const client = new DirectusApiClient(BASE);

    const result = await client.login({
      email: "alice@example.com",
      password: "hunter2",
    });

    // The caller gets the inner object, not `{ data: { ... } }`.
    expect(result).toEqual(session);
    expect(h.post).toHaveBeenCalledWith(`${BASE}/auth/login`, {
      email: "alice@example.com",
      password: "hunter2",
      mode: "json",
      otp: undefined,
    });
  });

  it("defaults the mode to json so Directus answers with tokens, not a cookie", async () => {
    // `mode: "cookie"` would return an httpOnly cookie the PWA cannot read,
    // which breaks the offline token persistence entirely.
    h.post.mockResolvedValue(enveloped(tokens()));
    const client = new DirectusApiClient(BASE);

    await client.login({ email: "alice@example.com", password: "hunter2" });

    expect(h.post.mock.calls[0][1]).toMatchObject({ mode: "json" });
  });

  it("forwards an explicit mode and a one-time password", async () => {
    h.post.mockResolvedValue(enveloped(tokens()));
    const client = new DirectusApiClient(BASE);

    await client.login({
      email: "alice@example.com",
      password: "hunter2",
      mode: "session",
      otp: "123456",
    });

    expect(h.post.mock.calls[0][1]).toEqual({
      email: "alice@example.com",
      password: "hunter2",
      mode: "session",
      otp: "123456",
    });
  });
});

// ---------------------------------------------------------------------------
describe("refresh", () => {
  it("posts the refresh token to /auth/refresh and unwraps the envelope", async () => {
    const rotated = tokens();
    h.post.mockResolvedValue(enveloped(rotated));
    const client = new DirectusApiClient(BASE);

    const result = await client.refresh({ refresh_token: "refresh-1" });

    expect(result).toEqual(rotated);
    expect(h.post).toHaveBeenCalledWith(`${BASE}/auth/refresh`, {
      refresh_token: "refresh-1",
      mode: "json",
    });
  });

  it("forwards an explicit mode", async () => {
    h.post.mockResolvedValue(enveloped(tokens()));
    const client = new DirectusApiClient(BASE);

    await client.refresh({ refresh_token: "refresh-1", mode: "session" });

    expect(h.post.mock.calls[0][1]).toEqual({
      refresh_token: "refresh-1",
      mode: "session",
    });
  });
});

// ---------------------------------------------------------------------------
describe("logout", () => {
  it("posts the revocation request to /auth/logout", async () => {
    h.post.mockResolvedValue({ data: null });
    const client = new DirectusApiClient(BASE);

    await client.logout({ refresh_token: "refresh-1", mode: "json" });

    expect(h.post).toHaveBeenCalledWith(`${BASE}/auth/logout`, {
      refresh_token: "refresh-1",
      mode: "json",
    });
  });

  it("posts an empty body when called with no arguments", async () => {
    h.post.mockResolvedValue({ data: null });
    const client = new DirectusApiClient(BASE);

    await client.logout();

    expect(h.post).toHaveBeenCalledWith(`${BASE}/auth/logout`, {});
  });
});

// ---------------------------------------------------------------------------
describe("getCurrentUser", () => {
  it("gets /users/me with a Bearer header and unwraps the envelope", async () => {
    h.get.mockResolvedValue({ data: { data: alice } });
    const client = new DirectusApiClient(BASE);

    const result = await client.getCurrentUser("access-1");

    expect(result).toEqual(alice);
    expect(h.get).toHaveBeenCalledWith(`${BASE}/users/me`, {
      headers: { Authorization: "Bearer access-1" },
    });
  });

  it("uses the token it was handed rather than anything in the store", async () => {
    // The refresh flow calls this with a token that has not been committed to
    // the store yet, so reading the store here would send a stale token.
    const store = useAuthStore();
    store.setTokens("stale-in-store", "refresh-1");
    h.get.mockResolvedValue({ data: { data: alice } });
    const client = new DirectusApiClient(BASE);

    await client.getCurrentUser("brand-new-token");

    expect(h.get.mock.calls[0][1]).toEqual({
      headers: { Authorization: "Bearer brand-new-token" },
    });
  });
});

// ---------------------------------------------------------------------------
describe("createAuthenticatedFetch — happy path", () => {
  it("sends the bearer token and returns the response body", async () => {
    h.request.mockResolvedValue({ data: { songs: ["Lobe den Herren"] } });
    const client = new DirectusApiClient(BASE);

    const result = await client.createAuthenticatedFetch("access-1")(
      `${BASE}/items/songs`,
    );

    expect(result).toEqual({ songs: ["Lobe den Herren"] });
    expect(h.request).toHaveBeenCalledTimes(1);
    expect(h.request.mock.calls[0][0]).toEqual({
      url: `${BASE}/items/songs`,
      headers: { Authorization: "Bearer access-1" },
    });
  });

  it("merges caller headers but always wins on Authorization", async () => {
    // A caller passing its own (stale) Authorization must not be able to
    // downgrade the request below the token the client was built with.
    h.request.mockResolvedValue({ data: {} });
    const client = new DirectusApiClient(BASE);

    await client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`, {
      headers: { "X-Trace": "abc", Authorization: "Bearer stale" },
    });

    expect(h.request.mock.calls[0][0].headers).toEqual({
      "X-Trace": "abc",
      Authorization: "Bearer access-1",
    });
  });

  it("passes the caller's method and body through to axios", async () => {
    h.request.mockResolvedValue({ data: { id: 7 } });
    const client = new DirectusApiClient(BASE);

    await client.createAuthenticatedFetch("access-1")(`${BASE}/items/playlists`, {
      method: "post",
      data: { name: "Sonntag" },
    });

    expect(h.request.mock.calls[0][0]).toEqual({
      url: `${BASE}/items/playlists`,
      method: "post",
      data: { name: "Sonntag" },
      headers: { Authorization: "Bearer access-1" },
    });
  });
});

// ---------------------------------------------------------------------------
describe("createAuthenticatedFetch — 401 refresh and retry", () => {
  it("refreshes once and retries the original request with the new token", async () => {
    h.request
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ data: { songs: ["Nun danket alle Gott"] } });
    h.post.mockResolvedValue(enveloped(tokens()));
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    const result = await client.createAuthenticatedFetch("access-1")(
      `${BASE}/items/songs`,
    );

    // The caller sees the retried response, not the 401.
    expect(result).toEqual({ songs: ["Nun danket alle Gott"] });
    expect(h.post).toHaveBeenCalledWith(`${BASE}/auth/refresh`, {
      refresh_token: "refresh-1",
      mode: "json",
    });
    expect(h.request).toHaveBeenCalledTimes(2);
    expect(h.request.mock.calls[1][0].headers).toEqual({
      Authorization: "Bearer access-2",
    });
  });

  it("replays the original method, body and headers on the retry", async () => {
    // A dropped body would silently turn a playlist save into a no-op.
    h.request
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ data: { id: 7 } });
    h.post.mockResolvedValue(enveloped(tokens()));
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await client.createAuthenticatedFetch("access-1")(`${BASE}/items/playlists`, {
      method: "patch",
      data: { name: "Sonntag" },
      headers: { "X-Trace": "abc" },
    });

    expect(h.request.mock.calls[1][0]).toEqual({
      url: `${BASE}/items/playlists`,
      method: "patch",
      data: { name: "Sonntag" },
      headers: { "X-Trace": "abc", Authorization: "Bearer access-2" },
    });
  });

  it("persists the rotated token pair so later requests do not 401 again", async () => {
    h.request
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ data: {} });
    h.post.mockResolvedValue(enveloped(tokens()));
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`);

    expect(store.accessToken).toBe("access-2");
    expect(store.refreshToken).toBe("refresh-2");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("access-2");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-2");
  });

  it("prefers the persisted refresh token over the in-memory copy", async () => {
    // Refresh tokens are single-use. If another tab rotated ours after this tab
    // hydrated, sending the in-memory copy burns an already-dead token.
    h.request
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ data: {} });
    h.post.mockResolvedValue(enveloped(tokens()));
    const store = useAuthStore();
    store.setTokens("access-1", "stale-in-memory");
    localStorage.setItem(REFRESH_TOKEN_KEY, "fresh-from-other-tab");
    const client = new DirectusApiClient(BASE);

    await client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`);

    expect(h.post.mock.calls[0][1]).toEqual({
      refresh_token: "fresh-from-other-tab",
      mode: "json",
    });
  });

  it("falls back to the in-memory refresh token when localStorage has none", async () => {
    h.request
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ data: {} });
    h.post.mockResolvedValue(enveloped(tokens()));
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    const client = new DirectusApiClient(BASE);

    await client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`);

    expect(h.post.mock.calls[0][1]).toMatchObject({
      refresh_token: "refresh-1",
    });
  });

  it("refreshes at most once — a 401 on the retry is surfaced, not looped", async () => {
    // Without a hard stop this is an infinite refresh/retry loop that hammers
    // the server and burns a rotated token on every pass.
    const retryFailure = httpError(401);
    h.request
      .mockRejectedValueOnce(httpError(401))
      .mockRejectedValueOnce(retryFailure);
    h.post.mockResolvedValue(enveloped(tokens()));
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toBe(retryFailure);

    expect(h.post).toHaveBeenCalledTimes(1);
    expect(h.request).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
describe("createAuthenticatedFetch — offline-first failure handling", () => {
  it("does not clear the session or navigate away when the refresh fails", async () => {
    // The user is mid-service with no signal. Tearing the session down here
    // would make the already-downloaded songs unreachable; the caller is
    // supposed to catch this and fall back to IndexedDB instead.
    const refreshFailure = networkError();
    h.request.mockRejectedValue(httpError(401));
    h.post.mockRejectedValue(refreshFailure);
    const store = useAuthStore();
    store.setUser(alice);
    store.setTokens("access-1", "refresh-1");
    const hrefBefore = window.location.href;
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toBe(refreshFailure);

    expect(store.user).toEqual(alice);
    expect(store.accessToken).toBe("access-1");
    expect(store.refreshToken).toBe("refresh-1");
    expect(store.isLoggedOut).toBe(false);
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-1");
    expect(window.location.href).toBe(hrefBefore);
  });

  it("keeps the session even when the server explicitly rejects the refresh", async () => {
    // A 401 from /auth/refresh is the strongest possible "you are logged out"
    // signal, and this layer still must not act on it — session teardown is
    // owned by useAuth, which knows whether offline content exists.
    const refreshFailure = httpError(401);
    h.request.mockRejectedValue(httpError(401));
    h.post.mockRejectedValue(refreshFailure);
    const store = useAuthStore();
    store.setUser(alice);
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toBe(refreshFailure);

    expect(store.isLoggedIn).toBe(true);
    expect(store.refreshToken).toBe("refresh-1");
    expect(store.isLoggedOut).toBe(false);
  });

  it("logs a warning so a silent cache fallback is still traceable", async () => {
    h.request.mockRejectedValue(httpError(401));
    h.post.mockRejectedValue(networkError());
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toThrow();

    expect(console.warn).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("createAuthenticatedFetch — errors that must not trigger a refresh", () => {
  it("passes a non-401 HTTP error straight through", async () => {
    const failure = httpError(500);
    h.request.mockRejectedValue(failure);
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toBe(failure);

    expect(h.post).not.toHaveBeenCalled();
    expect(h.request).toHaveBeenCalledTimes(1);
  });

  it("passes a 403 through without spending the refresh token", async () => {
    const failure = httpError(403);
    h.request.mockRejectedValue(failure);
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toBe(failure);

    expect(h.post).not.toHaveBeenCalled();
  });

  it("passes a network error (no response) through without a refresh", async () => {
    // Offline: the refresh would fail too, and a single-use token would be
    // spent on a request that never reached the server.
    const failure = networkError();
    h.request.mockRejectedValue(failure);
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toBe(failure);

    expect(h.post).not.toHaveBeenCalled();
  });

  it("passes a non-axios error through untouched", async () => {
    const failure = new TypeError("boom");
    h.request.mockRejectedValue(failure);
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toBe(failure);

    expect(h.post).not.toHaveBeenCalled();
  });

  it("rethrows the original 401 when no refresh token exists anywhere", async () => {
    // The caller must see the 401 itself, so it can distinguish "not allowed"
    // from "refresh machinery failed".
    const failure = httpError(401);
    h.request.mockRejectedValue(failure);
    const client = new DirectusApiClient(BASE);

    await expect(
      client.createAuthenticatedFetch("access-1")(`${BASE}/items/songs`),
    ).rejects.toBe(failure);

    expect(h.post).not.toHaveBeenCalled();
    expect(h.request).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe("authenticatedRequest", () => {
  it("throws before touching the network when there is no token", async () => {
    const client = new DirectusApiClient(BASE);

    await expect(client.authenticatedRequest("/items/songs")).rejects.toThrow(
      "No access token available",
    );
    expect(h.request).not.toHaveBeenCalled();
  });

  it("prefixes a relative URL with the base URL", async () => {
    h.request.mockResolvedValue({ data: { data: [] } });
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await client.authenticatedRequest("/items/songs");

    expect(h.request.mock.calls[0][0].url).toBe(`${BASE}/items/songs`);
  });

  it("leaves an absolute http(s) URL alone", async () => {
    // Directus asset/download URLs are already absolute and may point at a
    // different host; re-prefixing them would produce an unroutable URL.
    h.request.mockResolvedValue({ data: {} });
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await client.authenticatedRequest("https://cdn.example.com/assets/abc.png");

    expect(h.request.mock.calls[0][0].url).toBe(
      "https://cdn.example.com/assets/abc.png",
    );
  });

  it("uses the store's access token when none is supplied", async () => {
    h.request.mockResolvedValue({ data: {} });
    const store = useAuthStore();
    store.setTokens("access-from-store", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await client.authenticatedRequest("/items/songs");

    expect(h.request.mock.calls[0][0].headers).toEqual({
      Authorization: "Bearer access-from-store",
    });
  });

  it("prefers an explicitly supplied access token over the store's", async () => {
    h.request.mockResolvedValue({ data: {} });
    const store = useAuthStore();
    store.setTokens("access-from-store", "refresh-1");
    const client = new DirectusApiClient(BASE);

    await client.authenticatedRequest("/items/songs", {}, "explicit-token");

    expect(h.request.mock.calls[0][0].headers).toEqual({
      Authorization: "Bearer explicit-token",
    });
  });

  it("returns the response body and forwards request options", async () => {
    h.request.mockResolvedValue({ data: { data: [{ id: 1 }] } });
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    const result = await client.authenticatedRequest<{ data: { id: number }[] }>(
      "/items/songs",
      { method: "get", params: { limit: 5 } },
    );

    expect(result).toEqual({ data: [{ id: 1 }] });
    expect(h.request.mock.calls[0][0]).toMatchObject({
      method: "get",
      params: { limit: 5 },
    });
  });

  it("inherits the 401 refresh-and-retry behaviour", async () => {
    h.request
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ data: { data: [{ id: 1 }] } });
    h.post.mockResolvedValue(enveloped(tokens()));
    const store = useAuthStore();
    store.setTokens("access-1", "refresh-1");
    const client = new DirectusApiClient(BASE);

    const result = await client.authenticatedRequest("/items/songs");

    expect(result).toEqual({ data: [{ id: 1 }] });
    expect(h.request.mock.calls[1][0].headers).toEqual({
      Authorization: "Bearer access-2",
    });
  });
});

// ---------------------------------------------------------------------------
describe("useDirectusApi", () => {
  it("returns the same client instance on every call", () => {
    // useAuth, the router guard and every data composable call this
    // independently; a fresh client per call would be wasteful and would make
    // any future per-client state (in-flight refresh dedupe) useless.
    expect(useDirectusApi()).toBe(useDirectusApi());
  });

  it("builds the client from VITE_PUBLIC_DIRECTUS_URL", async () => {
    h.post.mockResolvedValue(enveloped(tokens()));

    await useDirectusApi().login({ email: "alice@example.com", password: "x" });

    expect(h.post.mock.calls[0][0]).toBe(
      `${import.meta.env.VITE_PUBLIC_DIRECTUS_URL}/auth/login`,
    );
  });

  it("throws when the Directus URL is not configured", async () => {
    // A missing build-time env var must fail loudly rather than silently
    // issuing requests against a relative "undefined/auth/login".
    vi.resetModules();
    vi.stubEnv("VITE_PUBLIC_DIRECTUS_URL", "");
    const mod = await import("@/composables/useDirectusApi");

    expect(() => mod.useDirectusApi()).toThrow("Directus URL not configured");
  });
});

// ---------------------------------------------------------------------------
describe("isDirectusConfigured", () => {
  /** Re-import so the helper reads the freshly stubbed env. */
  async function withUrl(value: string | undefined) {
    vi.resetModules();
    vi.stubEnv("VITE_PUBLIC_DIRECTUS_URL", value as string);
    const mod = await import("@/composables/useDirectusApi");
    return mod.isDirectusConfigured();
  }

  it("accepts an http(s) URL", async () => {
    expect(await withUrl("https://directus.example.com")).toBe(true);
    expect(await withUrl("http://localhost:8055")).toBe(true);
  });

  it("tolerates surrounding whitespace", async () => {
    // A stray newline in .env is a copy-paste artefact, not a misconfiguration.
    expect(await withUrl("  https://directus.example.com  ")).toBe(true);
  });

  it("rejects an unset or empty value", async () => {
    expect(await withUrl("")).toBe(false);
    expect(await withUrl(undefined)).toBe(false);
  });

  it("rejects the .env.example placeholder", async () => {
    // The reason a truthiness check is not enough: this is a non-empty string
    // that would sail through and produce "YOUR_DIRECTUS_BACKEND/auth/login".
    expect(await withUrl("YOUR_DIRECTUS_BACKEND")).toBe(false);
  });

  it("rejects a non-http scheme", async () => {
    expect(await withUrl("ftp://directus.example.com")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Regression guard for issue #7 — concurrent 401s must share one refresh.
// https://github.com/johkirche/gb-pwa/issues/7
//
// The single-flight guard used to be a module-local of useAuth.ts while
// createAuthenticatedFetch called `this.refresh()` on the client directly, so it
// never passed through the guard: N simultaneous 401s produced N POSTs to
// /auth/refresh all carrying the same single-use refresh token. The first racer
// rotated it, the rest presented a token the server had already consumed, and
// their data requests failed even though the user was online with a live session
// (the home screen showed "0 Lieder" until a reload).
//
// Secondary defect on the same path: this branch never scheduled the next
// background refresh, so the timer stayed pinned to the old token's expiry.
//
// This section needs its own harness — fake timers plus a freshly imported
// module graph, because useAuth.ts and the useDirectusApi singleton both keep
// module-level state — so it does not share the fixtures above.
// ---------------------------------------------------------------------------
const SONGS_URL = `${BASE}/items/songs`;

/** The expired access token every racer starts with; refreshed to `fresh`. */
let stale: string;
let fresh: string;

/**
 * A Directus that behaves like the real one: refresh tokens are single-use, so
 * presenting an already-rotated token is answered with a 401. That is the whole
 * point — three POSTs carrying the same token cannot all succeed.
 */
function installSingleUseRefreshServer() {
  const consumed = new Set<string>();
  let rotation = 0;

  h.post.mockImplementation(async (url: string, body: { refresh_token: string }) => {
    if (!url.endsWith("/auth/refresh")) throw new Error(`unexpected POST ${url}`);
    if (consumed.has(body.refresh_token)) throw httpError(401);
    consumed.add(body.refresh_token);
    rotation += 1;
    return {
      data: {
        data: {
          access_token: fresh,
          refresh_token: `refresh-rotated-${rotation}`,
          expires: 900_000,
        },
      },
    };
  });

  return {
    refreshCalls: () =>
      h.post.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh")),
  };
}

/** Every request with a stale bearer token 401s; the rotated one succeeds. */
function installTokenCheckingApi() {
  h.request.mockImplementation(async (config: { headers?: Record<string, string> }) => {
    if (config.headers?.Authorization !== `Bearer ${fresh}`) throw httpError(401);
    return { data: { songs: ["Lobe den Herren"] } };
  });
}

/**
 * pinia is imported *after* the reset so the store module and `setActivePinia`
 * cannot end up on different copies of it.
 */
async function freshClient({ withAuth = false } = {}) {
  vi.resetModules();

  const pinia = await import("pinia");
  pinia.setActivePinia(pinia.createPinia());

  const { useAuthStore: useStore } = await import("@/stores/auth");
  const store = useStore();
  store.setTokens(stale, "refresh-1");

  const { useDirectusApi: useApi } = await import("@/composables/useDirectusApi");
  const client = useApi();

  // Instantiating useAuth is what makes a scheduled refresh observable: it owns
  // the timer. The access token it hydrates with is already expired, so its
  // constructor-time scheduleTokenRefresh is a no-op and any timer seen later
  // was scheduled by the refresh under test.
  if (withAuth) {
    const { useAuth } = await import("@/composables/useAuth");
    useAuth();
  }

  return { client, store };
}

describe("createAuthenticatedFetch — concurrent 401s share one refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));

    stale = makeTokenExpiringIn(-60);
    fresh = makeTokenExpiringIn(900);

    h.get.mockResolvedValue({ data: { data: { id: "u-1" } } });
    h.hasOfflineContentAvailable.mockReset().mockResolvedValue(true);
    h.routerPush.mockReset();
  });

  it("collapses three concurrent 401s into a single POST to /auth/refresh", async () => {
    const server = installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client } = await freshClient();
    const fetchFn = client.createAuthenticatedFetch(stale);

    await Promise.allSettled([
      fetchFn(SONGS_URL),
      fetchFn(SONGS_URL),
      fetchFn(SONGS_URL),
    ]);

    expect(server.refreshCalls()).toHaveLength(1);
  });

  it("gives every concurrent caller its data instead of failing all but one", async () => {
    // This is the user-visible half: HomeView and CategoriesSection both fire on
    // mount, and the loser of the race used to render an empty screen.
    installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client } = await freshClient();
    const fetchFn = client.createAuthenticatedFetch(stale);

    const results = await Promise.allSettled([
      fetchFn(SONGS_URL),
      fetchFn(SONGS_URL),
      fetchFn(SONGS_URL),
    ]);

    expect(results.map((r) => r.status)).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled",
    ]);
  });

  it("presents the single-use refresh token to the server exactly once", async () => {
    // Even if the server were lenient about replays, spending a single-use token
    // three times is what makes this path unpredictable.
    const server = installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client } = await freshClient();
    const fetchFn = client.createAuthenticatedFetch(stale);

    await Promise.allSettled([
      fetchFn(SONGS_URL),
      fetchFn(SONGS_URL),
      fetchFn(SONGS_URL),
    ]);

    expect(
      server
        .refreshCalls()
        .map(([, body]) => (body as { refresh_token: string }).refresh_token),
    ).toEqual(["refresh-1"]);
  });

  it("schedules the next background refresh after refreshing", async () => {
    // useAuth.applyRefreshedSession calls scheduleTokenRefresh; this path did
    // not — so after a refresh here the timer was still aimed at the *old*
    // token's expiry and the session lapsed again unnoticed.
    installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client } = await freshClient({ withAuth: true });
    expect(vi.getTimerCount()).toBe(0);

    await client.createAuthenticatedFetch(stale)(SONGS_URL);

    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it("still refreshes and retries a lone 401", async () => {
    // Guards against over-correction: collapsing concurrent refreshes must not
    // swallow the one that has to happen.
    const server = installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client, store } = await freshClient();

    const result = await client.createAuthenticatedFetch(stale)(SONGS_URL);

    expect(result).toEqual({ songs: ["Lobe den Herren"] });
    expect(server.refreshCalls()).toHaveLength(1);
    expect(store.accessToken).toBe(fresh);
  });

  it("still never refreshes when the requests succeed", async () => {
    const server = installSingleUseRefreshServer();
    h.request.mockResolvedValue({ data: { songs: [] } });
    const { client } = await freshClient();
    const fetchFn = client.createAuthenticatedFetch(fresh);

    await Promise.all([fetchFn(SONGS_URL), fetchFn(SONGS_URL), fetchFn(SONGS_URL)]);

    expect(server.refreshCalls()).toHaveLength(0);
  });

  it("still surfaces the 401 when there is no refresh token at all", async () => {
    // A shared in-flight promise must not turn "cannot refresh" into a hang or a
    // silently swallowed error.
    const server = installSingleUseRefreshServer();
    const failure = httpError(401);
    h.request.mockRejectedValue(failure);
    const { client, store } = await freshClient();
    store.setTokens(stale, null); // also clears the persisted copy

    await expect(client.createAuthenticatedFetch(stale)(SONGS_URL)).rejects.toBe(
      failure,
    );

    expect(server.refreshCalls()).toHaveLength(0);
  });
});

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

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// The client uses axios three different ways — `axios.post`, `axios.get` and
// `axios(config)` — so the mocked default export has to be a callable function
// that also carries the verb helpers. `isAxiosError` is deliberately the real
// implementation: the 401 branch hinges on it, and stubbing it would let a
// broken error-shape check pass.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => {
  const request = vi.fn();
  const post = vi.fn();
  const get = vi.fn();
  return { request, post, get, client: Object.assign(request, { post, get }) };
});

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: Object.assign(h.client, { isAxiosError: actual.isAxiosError }),
  };
});

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

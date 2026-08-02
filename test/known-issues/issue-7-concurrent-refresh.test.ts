/**
 * Issue #7 — Concurrent 401s each fire their own /auth/refresh with the same
 * single-use token
 * https://github.com/johkirche/gb-pwa/issues/7
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * The single-flight guard (`refreshInFlight`) is a module-local of useAuth.ts,
 * but `createAuthenticatedFetch` calls `this.refresh()` on the client directly,
 * so it never passes through the guard. N simultaneous 401s therefore produce N
 * POSTs to /auth/refresh all carrying the same single-use refresh token: the
 * first racer rotates it, the others present a token the server has already
 * consumed, and their data requests fail even though the user is online with a
 * live session (the home screen shows "0 Lieder" until a reload).
 *
 * Secondary defect, same path: after refreshing, this branch never schedules the
 * next background refresh, so the timer stays pinned to the old token's expiry.
 */
import { AxiosError, type AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeTokenExpiringIn } from "../helpers/jwt";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// The client uses axios two ways here — `axios.post` for /auth/refresh and
// `axios(config)` for the actual request — so the mocked default export has to
// be a callable that also carries the verb helpers. `isAxiosError` stays the
// real implementation: the 401 branch hinges on it.
//
// useDirectusApi is the subject and is therefore NOT mocked. useAuth's two
// non-auth dependencies are, so the module graph stays hermetic.
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
/** Matches the value the known-issues config pins VITE_PUBLIC_DIRECTUS_URL to. */
const BASE = "https://directus.test";
const SONGS_URL = `${BASE}/items/songs`;

/** The expired access token every racer starts with; refreshed to `fresh`. */
let stale: string;
let fresh: string;

function httpError(status: number): AxiosError {
  const response = {
    status,
    data: {},
    statusText: "",
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return new AxiosError("request failed", "ERR_BAD_RESPONSE", undefined, {}, response);
}

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
  h.request.mockImplementation(
    async (config: { headers?: Record<string, string> }) => {
      if (config.headers?.Authorization !== `Bearer ${fresh}`) throw httpError(401);
      return { data: { songs: ["Lobe den Herren"] } };
    },
  );
}

// ---------------------------------------------------------------------------
// Harness
//
// useAuth.ts and the useDirectusApi singleton both keep module-level state, so
// every test gets a freshly-imported copy of the module graph plus a fresh
// pinia. pinia is imported *after* the reset so the store module and
// `setActivePinia` cannot end up on different copies of it.
// ---------------------------------------------------------------------------
async function setup({ withAuth = false } = {}) {
  vi.resetModules();

  const pinia = await import("pinia");
  pinia.setActivePinia(pinia.createPinia());

  const { useAuthStore } = await import("@/stores/auth");
  const store = useAuthStore();
  store.setTokens(stale, "refresh-1");

  const { useDirectusApi } = await import("@/composables/useDirectusApi");
  const client = useDirectusApi();

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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));

  stale = makeTokenExpiringIn(-60);
  fresh = makeTokenExpiringIn(900);

  h.request.mockReset();
  h.post.mockReset();
  h.get.mockReset().mockResolvedValue({ data: { data: { id: "u-1" } } });
  h.hasOfflineContentAvailable.mockReset().mockResolvedValue(true);
  h.routerPush.mockReset();
});

// ---------------------------------------------------------------------------
describe("issue #7: concurrent 401s must share one refresh", () => {
  it("collapses three concurrent 401s into a single POST to /auth/refresh", async () => {
    const server = installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client } = await setup();
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
    // mount, and today the loser of the race renders an empty screen.
    installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client } = await setup();
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
    const { client } = await setup();
    const fetchFn = client.createAuthenticatedFetch(stale);

    await Promise.allSettled([
      fetchFn(SONGS_URL),
      fetchFn(SONGS_URL),
      fetchFn(SONGS_URL),
    ]);

    expect(
      server.refreshCalls().map(([, body]) => (body as { refresh_token: string }).refresh_token),
    ).toEqual(["refresh-1"]);
  });

  it("schedules the next background refresh after refreshing", async () => {
    // Secondary defect: useAuth.applyRefreshedSession calls scheduleTokenRefresh,
    // this path does not — so after a refresh here the timer is still aimed at
    // the *old* token's expiry and the session lapses again unnoticed.
    installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client } = await setup({ withAuth: true });
    expect(vi.getTimerCount()).toBe(0);

    await client.createAuthenticatedFetch(stale)(SONGS_URL);

    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
describe("issue #7: behaviour a single-flight fix must preserve", () => {
  it("still refreshes and retries a lone 401", async () => {
    // Guards the fix against over-correction: collapsing concurrent refreshes
    // must not swallow the one that has to happen.
    const server = installSingleUseRefreshServer();
    installTokenCheckingApi();
    const { client, store } = await setup();

    const result = await client.createAuthenticatedFetch(stale)(SONGS_URL);

    expect(result).toEqual({ songs: ["Lobe den Herren"] });
    expect(server.refreshCalls()).toHaveLength(1);
    expect(store.accessToken).toBe(fresh);
  });

  it("still never refreshes when the requests succeed", async () => {
    const server = installSingleUseRefreshServer();
    h.request.mockResolvedValue({ data: { songs: [] } });
    const { client } = await setup();
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
    const { client, store } = await setup();
    store.setTokens(stale, null); // also clears the persisted copy

    await expect(client.createAuthenticatedFetch(stale)(SONGS_URL)).rejects.toBe(failure);

    expect(server.refreshCalls()).toHaveLength(0);
  });
});

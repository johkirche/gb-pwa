import axios, { AxiosError, type AxiosResponse } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FreiesMusikstueck } from "@/gql/extra-types";

import { useAuthStore } from "@/stores/auth";
import { useFreieMusikstueckeStore } from "@/stores/freieMusikstuecke";
import { useStatsStore } from "@/stores/stats";

import { restoreOnline, setOnline } from "../helpers/env";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// The network itself is stubbed with a plain `vi.spyOn(axios, "post")` rather
// than a module mock: both stores talk to Directus exclusively through
// `axios.post`, so spying on that one method guarantees no request can escape
// while leaving `axios.isAxiosError` (which stats.ts branches on) real.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  getOfflineSongCount: vi.fn(),
  getAllOfflineSongs: vi.fn(),
  getOfflinePieces: vi.fn(),
  authenticatedRequest: vi.fn(),
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  getOfflineSongCount: h.getOfflineSongCount,
  getAllOfflineSongs: h.getAllOfflineSongs,
  useOfflineDownload: () => ({ getOfflinePieces: h.getOfflinePieces }),
}));

vi.mock("@/composables/useDirectusApi", () => ({
  useDirectusApi: () => ({ authenticatedRequest: h.authenticatedRequest }),
}));

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------
const GRAPHQL_URL = "https://directus.test/graphql";

type GqlBody = { query: string; variables?: Record<string, unknown> };

/** Wrap a payload in the minimal axios response shape these stores read. */
function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  } as unknown as AxiosResponse<T>;
}

/** An axios error carrying an HTTP response — i.e. the server answered. */
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

function spyOnPost() {
  return vi.spyOn(axios, "post");
}
let post: ReturnType<typeof spyOnPost>;

/**
 * A response the test releases by hand, so the in-flight window of a store
 * action can be observed. Created eagerly (not inside the mock body) because
 * some requests only go out after an `await`.
 */
function deferredResponse() {
  let release!: (value: AxiosResponse) => void;
  const promise = new Promise<AxiosResponse>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

/** The `[url, body, config]` of the nth axios.post call. */
function postCall(n: number) {
  const [url, body, config] = post.mock.calls[n] as unknown as [
    string,
    GqlBody,
    { headers: Record<string, string> },
  ];
  return { url, body, config };
}

/** The Directus envelope for `gesangbuchlied_aggregated`. */
function countPayload(count: number) {
  return { data: { gesangbuchlied_aggregated: [{ count: { id: count } }] } };
}

function kategoriePayload(kategorie: unknown[]) {
  return { data: { kategorie } };
}

function categoryCountPayload(entries: Array<[string, number]>) {
  return {
    data: {
      gesangbuchlied_kategorie_aggregated: entries.map(([id, n]) => ({
        group: { kategorie_id: id },
        count: { id: n },
      })),
    },
  };
}

type OfflineKat = { id?: string | number; name?: string; typ?: string } | null;

/** A downloaded song, reduced to the category junctions the store reads. */
function offlineSong(kats: OfflineKat[] | null) {
  return { kategorieId: kats === null ? null : kats.map((k) => ({ kategorie_id: k })) };
}

function piece(over: Partial<FreiesMusikstueck> = {}): FreiesMusikstueck {
  return {
    id: "p-1",
    name: "Ave Verum",
    komponist: "Mozart",
    dauer_sek: 180,
    tags: ["Kommunion"],
    midi_file: { id: "f-1" } as unknown as FreiesMusikstueck["midi_file"],
    ...over,
  };
}

/** Give the active pinia an authenticated session. */
function signIn(accessToken = "access-1") {
  useAuthStore().setTokens(accessToken, "refresh-1");
}

// ---------------------------------------------------------------------------
beforeEach(() => {
  setActivePinia(createPinia());

  post = spyOnPost();
  // Any request a test did not deliberately stub is a bug in the test, not a
  // reason to reach the real network.
  post.mockRejectedValue(new Error("axios.post was not stubbed in this test"));

  h.getOfflineSongCount.mockReset().mockResolvedValue(0);
  h.getAllOfflineSongs.mockReset().mockResolvedValue([]);
  h.getOfflinePieces.mockReset().mockResolvedValue([]);
  h.authenticatedRequest
    .mockReset()
    .mockRejectedValue(new Error("authenticatedRequest was not stubbed in this test"));

  setOnline(true);
});

afterEach(() => {
  restoreOnline();
});

// ===========================================================================
// stats store
// ===========================================================================
describe("stats store — loadStats", () => {
  it("posts the filtered aggregate query to the configured Directus endpoint", async () => {
    signIn("access-1");
    post.mockResolvedValue(ok(countPayload(42)));

    await useStatsStore().loadStats();

    const { url, body, config } = postCall(0);
    expect(url).toBe(GRAPHQL_URL);
    expect(body.query).toContain("gesangbuchlied_aggregated");
    expect(body.variables).toEqual({
      filter: { bewertungKleinerKreis: { rangfolge: { _eq: 5 } } },
    });
    expect(config.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer access-1",
    });
  });

  it("maps the aggregate count into totalSongs and keeps the IndexedDB count", async () => {
    signIn();
    h.getOfflineSongCount.mockResolvedValue(7);
    post.mockResolvedValue(ok(countPayload(42)));
    const store = useStatsStore();

    await store.loadStats();

    expect(store.stats).toEqual({
      totalSongs: 42,
      offlineSongs: 7,
      favorites: 0,
      recentlyPlayed: 0,
    });
    expect(store.hasStats).toBe(true);
    expect(store.statsError).toBeNull();
    // The happy path must resolve in a single round-trip — no fallback storm.
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("accepts a count of zero as an answer instead of retrying", async () => {
    // The first two attempts accept any number, while the later fallbacks
    // require `> 0`. An empty result from the *filtered* query is a legitimate
    // answer, so it must not trigger eight further requests.
    signIn();
    post.mockResolvedValue(ok(countPayload(0)));
    const store = useStatsStore();

    await store.loadStats();

    expect(store.stats.totalSongs).toBe(0);
    expect(store.hasStats).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("falls back to the unfiltered aggregate when the filtered one returns nothing", async () => {
    signIn();
    post
      .mockResolvedValueOnce(ok({ data: { gesangbuchlied_aggregated: [] } }))
      .mockResolvedValueOnce(ok(countPayload(11)));
    const store = useStatsStore();

    await store.loadStats();

    expect(store.stats.totalSongs).toBe(11);
    expect(post).toHaveBeenCalledTimes(2);
    expect(postCall(1).body.variables).toEqual({});
    expect(postCall(1).body.query).not.toContain("filter");
  });

  // -------------------------------------------------------------------------
  // Regression guard for issue #24 — https://github.com/johkirche/gb-pwa/issues/24
  //
  // fetchTotalSongsCount used to follow the two aggregate attempts with two
  // loops over ["id", "*", "all"], interpolating the subfield into the
  // selection set for `count` and again for `countDistinct`. Six further
  // requests: `{ * }` and `{ all }` are not valid GraphQL and can never be
  // answered, and `{ id }` merely repeats the query that just failed. Nine
  // sequential round-trips on every home-screen load — on a weak connection
  // that times out rather than refuses, nine timeouts before the tile gives up.
  // -------------------------------------------------------------------------

  it("gives up after at most three requests when the server is unreachable", async () => {
    signIn();
    post.mockRejectedValue(new Error("Network Error"));

    await useStatsStore().loadStats();

    expect(post.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("gives up after at most three requests when the server rejects every query", async () => {
    // A 400 from Directus (which is what the invalid documents actually earned)
    // is not a reason to keep trying variants of the same broken shape.
    signIn();
    post.mockRejectedValue(httpError(400));

    await useStatsStore().loadStats();

    expect(post.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("never sends `count { * }`, which no GraphQL server can answer", async () => {
    signIn();
    post.mockRejectedValue(new Error("Network Error"));

    await useStatsStore().loadStats();

    const invalid = post.mock.calls
      .map((call) => (call[1] as GqlBody).query)
      .filter((query) => /\{\s*\*\s*\}/.test(query));
    expect(invalid).toHaveLength(0);
  });

  it("does not re-send a query that has already failed", async () => {
    // Attempt 2 (`count { id }`, unfiltered) and the first iteration of the
    // subfield loop were the same document, so one of the nine round-trips was
    // a verbatim retry of a request that had just failed.
    signIn();
    post.mockRejectedValue(new Error("Network Error"));

    await useStatsStore().loadStats();

    // Collapse formatting so two differently-indented copies compare equal.
    const sent = post.mock.calls.map((call) =>
      (call[1] as GqlBody).query.replace(/\s+/g, " ").trim(),
    );
    expect(new Set(sent).size).toBe(sent.length);
  });

  it("falls back to counting returned ids when every aggregate query fails", async () => {
    signIn();
    post.mockImplementation(async (_url, body) => {
      if ((body as GqlBody).query.includes("_aggregated")) throw httpError(500);
      return ok({ data: { gesangbuchlied: [{ id: "1" }, { id: "2" }, { id: "3" }] } });
    });
    const store = useStatsStore();

    await store.loadStats();

    expect(store.stats.totalSongs).toBe(3);
    expect(store.statsError).toBeNull();
  });

  it("keeps the downloaded song count when the network is unreachable", async () => {
    // Offline-first: a failed totalSongs fetch must not wipe out the number of
    // songs the user actually has on the device.
    signIn();
    h.getOfflineSongCount.mockResolvedValue(12);
    post.mockRejectedValue(new Error("Network Error"));
    const store = useStatsStore();

    await store.loadStats();

    expect(store.stats.offlineSongs).toBe(12);
    expect(store.stats.totalSongs).toBe(0);
    expect(store.statsError).toBe("Network Error");
    expect(store.isLoadingStats).toBe(false);
  });

  it("reports a generic message when the rejection is not an Error", async () => {
    // Interceptors and some axios paths can reject with a bare value; the store
    // must still put a readable string in front of the user.
    signIn();
    post.mockRejectedValue("boom");
    const store = useStatsStore();

    await store.loadStats();

    expect(store.statsError).toBe("Failed to load stats");
  });

  it("never touches the network when there is no access token", async () => {
    h.getOfflineSongCount.mockResolvedValue(9);
    const store = useStatsStore();

    await store.loadStats();

    expect(post).not.toHaveBeenCalled();
    expect(store.statsError).toBe("No access token available. Please log in.");
    expect(store.stats.offlineSongs).toBe(9);
  });

  it("retries through the refreshing client on a 401", async () => {
    // A 401 usually means the access token just lapsed; the second attempt goes
    // through the client that transparently refreshes it.
    signIn();
    post.mockRejectedValue(httpError(401));
    h.authenticatedRequest.mockResolvedValue(countPayload(5));
    const store = useStatsStore();

    await store.loadStats();

    expect(store.stats.totalSongs).toBe(5);
    expect(h.authenticatedRequest).toHaveBeenCalledWith(
      GRAPHQL_URL,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("flips isLoadingStats for the duration of the load", async () => {
    signIn();
    const gate = deferredResponse();
    post.mockReturnValue(gate.promise);
    const store = useStatsStore();

    const pending = store.loadStats();
    expect(store.isLoadingStats).toBe(true);

    gate.release(ok(countPayload(3)));
    await pending;

    expect(store.isLoadingStats).toBe(false);
    expect(store.stats.totalSongs).toBe(3);
  });

  it("ignores a second loadStats while one is in flight", async () => {
    signIn();
    const gate = deferredResponse();
    post.mockReturnValue(gate.promise);
    const store = useStatsStore();

    const first = store.loadStats();
    const second = store.loadStats();
    gate.release(ok(countPayload(3)));
    await Promise.all([first, second]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(h.getOfflineSongCount).toHaveBeenCalledTimes(1);
  });

  it("wedges isLoadingStats at true when the IndexedDB count throws", async () => {
    // getOfflineSongCount() is awaited OUTSIDE the try/finally, so a failing
    // IndexedDB read escapes loadStats with the flag still set — and every
    // later call then returns immediately at the in-flight guard. Asserted as
    // the behaviour that actually exists; reported as a bug.
    signIn();
    h.getOfflineSongCount.mockRejectedValue(new Error("IDB unavailable"));
    const store = useStatsStore();

    await expect(store.loadStats()).rejects.toThrow("IDB unavailable");
    expect(store.isLoadingStats).toBe(true);

    await store.loadStats();
    expect(post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("stats store — loadCategories", () => {
  it("posts the category list query, then the grouped count query", async () => {
    signIn("access-1");
    post
      .mockResolvedValueOnce(ok(kategoriePayload([])))
      .mockResolvedValueOnce(ok(categoryCountPayload([])));

    await useStatsStore().loadCategories();

    expect(postCall(0).url).toBe(GRAPHQL_URL);
    expect(postCall(0).body.query).toContain("kategorie");
    expect(postCall(0).config.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer access-1",
    });
    expect(postCall(1).body.query).toContain("gesangbuchlied_kategorie_aggregated");
    expect(postCall(1).body.variables).toEqual({
      groupBy: ["kategorie_id"],
      filter: { gesangbuchlied_id: { bewertungKleinerKreis: { rangfolge: { _eq: 5 } } } },
    });
  });

  it("joins each category with its aggregated count", async () => {
    signIn();
    post
      .mockResolvedValueOnce(
        ok(
          kategoriePayload([
            { id: "1", name: "Advent", typ: "jahreszeit" },
            { id: "2", name: "Ostern", typ: null },
          ]),
        ),
      )
      .mockResolvedValueOnce(ok(categoryCountPayload([["1", 3]])));
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: "jahreszeit", count: 3 },
      // No aggregate row came back for Ostern, so it must read 0 rather than
      // disappear from the list.
      { id: "2", name: "Ostern", typ: undefined, count: 0 },
    ]);
    expect(store.hasCategories).toBe(true);
    expect(store.categoriesError).toBeNull();
  });

  it("labels a nameless category 'Unbekannt'", async () => {
    signIn();
    post
      .mockResolvedValueOnce(ok(kategoriePayload([{ id: "3", name: null, typ: null }])))
      .mockResolvedValueOnce(ok(categoryCountPayload([["3", 2]])));
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "3", name: "Unbekannt", typ: undefined, count: 2 },
    ]);
  });

  it("retries the counts without the nested filter when the filtered one fails", async () => {
    signIn();
    post
      .mockResolvedValueOnce(ok(kategoriePayload([{ id: "1", name: "Advent", typ: null }])))
      .mockRejectedValueOnce(httpError(400))
      .mockResolvedValueOnce(ok(categoryCountPayload([["1", 4]])));
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: undefined, count: 4 },
    ]);
    expect(post).toHaveBeenCalledTimes(3);
    expect(postCall(2).body.variables).toEqual({ groupBy: ["kategorie_id"] });
  });

  it("still lists the categories with zero counts when both count queries fail", async () => {
    // Losing the counts is survivable; losing the category navigation is not.
    signIn();
    post
      .mockResolvedValueOnce(ok(kategoriePayload([{ id: "1", name: "Advent", typ: null }])))
      .mockRejectedValue(httpError(500));
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: undefined, count: 0 },
    ]);
    expect(store.categoriesError).toBeNull();
  });

  it("derives categories from downloaded songs while offline, without any request", async () => {
    setOnline(false);
    signIn();
    h.getAllOfflineSongs.mockResolvedValue([
      offlineSong([{ id: 1, name: "Advent", typ: "jahreszeit" }]),
      offlineSong([{ id: 1, name: "Advent", typ: "jahreszeit" }, { id: 2, name: "Ostern" }]),
    ]);
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: "jahreszeit", count: 2 },
      { id: "2", name: "Ostern", typ: undefined, count: 1 },
    ]);
    expect(post).not.toHaveBeenCalled();
  });

  it("derives categories from downloads when the session has no access token", async () => {
    // An expired session must not make the downloaded hymnal unbrowsable.
    h.getAllOfflineSongs.mockResolvedValue([offlineSong([{ id: 1, name: "Advent" }])]);
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: undefined, count: 1 },
    ]);
    expect(post).not.toHaveBeenCalled();
  });

  it("keys an id-less category by its name so older downloads still group", async () => {
    setOnline(false);
    signIn();
    h.getAllOfflineSongs.mockResolvedValue([
      offlineSong([{ name: "Advent" }]),
      offlineSong([{ name: "Advent" }]),
    ]);
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "Advent", name: "Advent", typ: undefined, count: 2 },
    ]);
  });

  it("skips malformed junction rows instead of throwing", async () => {
    // Downloads written by older app versions have a different shape; a single
    // bad row must not blow up the whole category list.
    setOnline(false);
    signIn();
    h.getAllOfflineSongs.mockResolvedValue([
      offlineSong(null),
      offlineSong([null, { id: 9 }, { id: 1, name: "Advent" }]),
    ]);
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: undefined, count: 1 },
    ]);
  });

  it("keeps the downloaded categories when the network request fails", async () => {
    // Offline-first: a network error must never leave the user with an empty
    // category list while the songs are sitting in IndexedDB.
    signIn();
    post.mockRejectedValue(new Error("Network Error"));
    h.getAllOfflineSongs.mockResolvedValue([offlineSong([{ id: 1, name: "Advent" }])]);
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: undefined, count: 1 },
    ]);
    expect(store.categoriesError).toBe("Network Error");
    expect(store.isLoadingCategories).toBe(false);
  });

  it("reports a generic message when the rejection is not an Error", async () => {
    signIn();
    post.mockRejectedValue("boom");
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categoriesError).toBe("Failed to load categories");
  });

  it("reports an empty list rather than fake data when nothing is downloaded", async () => {
    setOnline(false);
    signIn();
    h.getAllOfflineSongs.mockResolvedValue([]);
    post.mockRejectedValue(new Error("Network Error"));
    const store = useStatsStore();

    await store.loadCategories();

    expect(store.categories).toEqual([]);
    expect(store.hasCategories).toBe(false);
    expect(store.categoriesError).toBe("Network Error");
  });

  it("ignores a second loadCategories while one is in flight", async () => {
    signIn();
    // Hold the category list query open; the follow-up count query resolves
    // immediately, so the only thing a duplicate call could add is extra
    // requests.
    const gate = deferredResponse();
    post
      .mockReturnValueOnce(gate.promise)
      .mockResolvedValue(ok(categoryCountPayload([])));
    const store = useStatsStore();

    const first = store.loadCategories();
    expect(store.isLoadingCategories).toBe(true);
    const second = store.loadCategories();
    gate.release(ok(kategoriePayload([{ id: "1", name: "Advent", typ: null }])));
    await Promise.all([first, second]);

    expect(store.isLoadingCategories).toBe(false);
    expect(post).toHaveBeenCalledTimes(2);
    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: undefined, count: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
describe("stats store — refreshStats and clearStats", () => {
  it("loads the totals and the categories together", async () => {
    signIn();
    h.getOfflineSongCount.mockResolvedValue(4);
    // Keyed on the query text rather than call order: refreshStats runs both
    // loads concurrently.
    post.mockImplementation(async (_url, body) => {
      const q = (body as GqlBody).query;
      if (q.includes("gesangbuchlied_kategorie_aggregated")) {
        return ok(categoryCountPayload([["1", 3]]));
      }
      if (q.includes("gesangbuchlied_aggregated")) return ok(countPayload(42));
      return ok(kategoriePayload([{ id: "1", name: "Advent", typ: null }]));
    });
    const store = useStatsStore();

    await store.refreshStats();

    expect(store.stats).toEqual({
      totalSongs: 42,
      offlineSongs: 4,
      favorites: 0,
      recentlyPlayed: 0,
    });
    expect(store.categories).toEqual([
      { id: "1", name: "Advent", typ: undefined, count: 3 },
    ]);
  });

  it("resets every counter, the categories and both error strings", async () => {
    signIn();
    post.mockRejectedValue(new Error("Network Error"));
    h.getOfflineSongCount.mockResolvedValue(5);
    h.getAllOfflineSongs.mockResolvedValue([offlineSong([{ id: 1, name: "Advent" }])]);
    const store = useStatsStore();
    await store.refreshStats();
    expect(store.statsError).not.toBeNull();
    expect(store.categories).toHaveLength(1);

    store.clearStats();

    expect(store.stats).toEqual({
      totalSongs: 0,
      offlineSongs: 0,
      favorites: 0,
      recentlyPlayed: 0,
    });
    expect(store.categories).toEqual([]);
    expect(store.statsError).toBeNull();
    expect(store.categoriesError).toBeNull();
  });
});

// ===========================================================================
// freieMusikstuecke store
// ===========================================================================
describe("freieMusikstuecke store — fetchPieces", () => {
  it("serves downloaded pieces from IndexedDB", async () => {
    // The offline-first half of the contract: what is in IndexedDB is in
    // `pieces` by the time fetchPieces() resolves, without waiting on a
    // round-trip. Whether a refresh is *also* sent is issue #26's business (see
    // test/known-issues/issue-26-pieces-never-revalidate.test.ts) and
    // deliberately not asserted here either way.
    h.getOfflinePieces.mockResolvedValue([piece(), piece({ id: "p-2", name: "Panis" })]);
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    expect(store.pieces).toHaveLength(2);
    expect(store.isUsingCachedData).toBe(true);
    expect(store.isLoaded).toBe(true);
    expect(store.error).toBeNull();
  });

  it("posts the freie_musikstuecke query when nothing is downloaded", async () => {
    signIn("access-1");
    post.mockResolvedValue(ok({ data: { freie_musikstuecke: [piece()] } }));
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    const { url, body, config } = postCall(0);
    expect(url).toBe(GRAPHQL_URL);
    expect(body.query).toContain("freie_musikstuecke");
    // Sorted server-side so the picker dialog does not have to re-sort.
    expect(body.query).toContain('sort: ["name"]');
    expect(body.query).toContain("midi_file");
    expect(config.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer access-1",
    });
    expect(store.pieces).toEqual([piece()]);
    expect(store.isUsingCachedData).toBe(false);
    expect(store.isLoaded).toBe(true);
  });

  it("omits the Authorization header when there is no session", async () => {
    post.mockResolvedValue(ok({ data: { freie_musikstuecke: [] } }));

    await useFreieMusikstueckeStore().fetchPieces();

    expect(postCall(0).config.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("treats a response without a data block as an empty list", async () => {
    signIn();
    post.mockResolvedValue(ok({}));
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    expect(store.pieces).toEqual([]);
    expect(store.isLoaded).toBe(true);
    expect(store.error).toBeNull();
  });

  it("goes to the API even with downloads present when forced online", async () => {
    signIn();
    h.getOfflinePieces.mockResolvedValue([piece({ id: "stale", name: "Stale" })]);
    post.mockResolvedValue(ok({ data: { freie_musikstuecke: [piece({ id: "fresh" })] } }));
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces(true);

    expect(store.pieces.map((p) => p.id)).toEqual(["fresh"]);
    expect(store.isUsingCachedData).toBe(false);
  });

  // "Once anything is downloaded the store never refreshes on its own" was
  // pinned here as if it were the design. It is issue #26 — there is no TTL and
  // no caller passes forceOnline, so a renamed or deleted Vor-/Nachspiel never
  // reaches the device again. The behaviour the store should have is asserted
  // in test/known-issues/issue-26-pieces-never-revalidate.test.ts, where it
  // fails visibly instead of masquerading as coverage.

  it("keeps the downloaded pieces when the API request fails", async () => {
    // Offline-first: a rejected request must fall back to IndexedDB and leave
    // no error banner, because the user still has everything they need.
    signIn();
    h.getOfflinePieces.mockResolvedValue([piece({ id: "cached" })]);
    post.mockRejectedValue(new Error("Network Error"));
    const store = useFreieMusikstueckeStore();
    store.setPreferOfflineData(false);

    await store.fetchPieces();

    expect(store.pieces.map((p) => p.id)).toEqual(["cached"]);
    expect(store.isUsingCachedData).toBe(true);
    expect(store.isLoaded).toBe(true);
    expect(store.error).toBeNull();
  });

  it("surfaces the request error when nothing is downloaded to fall back on", async () => {
    signIn();
    post.mockRejectedValue(new Error("Network Error"));
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    expect(store.pieces).toEqual([]);
    expect(store.error).toBe("Network Error");
    expect(store.isLoaded).toBe(false);
    expect(store.isLoading).toBe(false);
  });

  it("reports 'Unknown error' when the rejection is not an Error", async () => {
    signIn();
    post.mockRejectedValue("boom");
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    expect(store.error).toBe("Unknown error");
  });

  it("joins GraphQL errors returned with a 200 into one message", async () => {
    // Directus answers a malformed query with HTTP 200 and an `errors` array,
    // so the status code alone is not enough to detect failure.
    signIn();
    post.mockResolvedValue(
      ok({ errors: [{ message: "Unknown field" }, { message: "Not permitted" }] }),
    );
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    expect(store.error).toBe("Unknown field, Not permitted");
    expect(store.pieces).toEqual([]);
    expect(store.isLoaded).toBe(false);
  });

  it("reads IndexedDB rather than the network when the browser is offline", async () => {
    setOnline(false);
    signIn();
    h.getOfflinePieces.mockResolvedValue([piece({ id: "cached" })]);
    const store = useFreieMusikstueckeStore();
    store.setPreferOfflineData(false);

    await store.fetchPieces();

    expect(store.pieces.map((p) => p.id)).toEqual(["cached"]);
    expect(store.isUsingCachedData).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it("reports 'No offline pieces available' when offline with an empty cache", async () => {
    setOnline(false);
    signIn();
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    expect(store.error).toBe("No offline pieces available");
    expect(store.isLoaded).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it("clears a previous error at the start of the next fetch", async () => {
    setOnline(false);
    const store = useFreieMusikstueckeStore();
    await store.fetchPieces();
    expect(store.error).toBe("No offline pieces available");

    setOnline(true);
    signIn();
    post.mockResolvedValue(ok({ data: { freie_musikstuecke: [piece()] } }));
    await store.fetchPieces();

    expect(store.error).toBeNull();
    expect(store.pieces).toHaveLength(1);
  });

  it("flips isLoading for the duration of the fetch", async () => {
    signIn();
    const gate = deferredResponse();
    post.mockReturnValue(gate.promise);
    const store = useFreieMusikstueckeStore();

    const pending = store.fetchPieces();
    expect(store.isLoading).toBe(true);

    gate.release(ok({ data: { freie_musikstuecke: [piece()] } }));
    await pending;

    expect(store.isLoading).toBe(false);
    expect(store.pieces).toHaveLength(1);
  });

  it("ignores a second fetchPieces while one is in flight", async () => {
    signIn();
    const gate = deferredResponse();
    post.mockReturnValue(gate.promise);
    const store = useFreieMusikstueckeStore();

    const first = store.fetchPieces();
    const second = store.fetchPieces();
    gate.release(ok({ data: { freie_musikstuecke: [piece()] } }));
    await Promise.all([first, second]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(h.getOfflinePieces).toHaveBeenCalledTimes(1);
  });

  it("fails the missing-configuration check before building a request", async () => {
    vi.stubEnv("VITE_PUBLIC_DIRECTUS_URL", "");
    signIn();
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    expect(post).not.toHaveBeenCalled();
    expect(store.error).toBe("VITE_PUBLIC_DIRECTUS_URL is not configured");
  });
});

// ---------------------------------------------------------------------------
describe("freieMusikstuecke store — filteredPieces", () => {
  const catalogue = [
    piece({ id: "p-1", name: "Ave Verum", komponist: "Mozart", tags: ["Kommunion"] }),
    piece({ id: "p-2", name: "Jesu bleibet", komponist: "Bach", tags: ["Trauung", "Einzug"] }),
    piece({ id: "p-3", name: "Toccata", komponist: null, tags: null }),
  ];

  function loaded() {
    const store = useFreieMusikstueckeStore();
    store.pieces = catalogue;
    return store;
  }

  it("returns every piece while the search box is blank", () => {
    const store = loaded();

    store.setSearchQuery("   ");

    expect(store.filteredPieces).toHaveLength(3);
  });

  it("matches the name case-insensitively and ignores surrounding spaces", () => {
    const store = loaded();

    store.setSearchQuery("  AVE  ");

    expect(store.filteredPieces.map((p) => p.id)).toEqual(["p-1"]);
  });

  it("matches the composer", () => {
    const store = loaded();

    store.setSearchQuery("bach");

    expect(store.filteredPieces.map((p) => p.id)).toEqual(["p-2"]);
  });

  it("matches any single tag", () => {
    const store = loaded();

    store.setSearchQuery("trauung");

    expect(store.filteredPieces.map((p) => p.id)).toEqual(["p-2"]);
  });

  it("returns nothing for a term that matches no field", () => {
    // A piece with null komponist/tags must be skipped, not throw.
    const store = loaded();

    store.setSearchQuery("gloria");

    expect(store.filteredPieces).toEqual([]);
  });
});

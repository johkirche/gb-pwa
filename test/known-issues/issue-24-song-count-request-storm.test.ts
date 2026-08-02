/**
 * Issue #24 — Home screen fires nine sequential requests for the song count
 * https://github.com/johkirche/gb-pwa/issues/24
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * fetchTotalSongsCount() tries the aggregate twice, then loops
 * countSubfields = ["id", "*", "all"] over `count` and again over `countDistinct`,
 * interpolating the subfield straight into the selection set. Two of those six
 * are dead on arrival — `count { * }` is not valid GraphQL and can never
 * succeed — and `count { id }` is simply the query that already failed one line
 * earlier. Nine round-trips, six of which cannot help, on every home-screen
 * load: on a flaky mobile connection that is nine timeouts before the tile
 * gives up.
 */
import axios, { AxiosError, type AxiosResponse } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth";
import { useStatsStore } from "@/stores/stats";

// The IndexedDB reads are irrelevant here; mocking them keeps the test about
// the network fan-out. `vi.hoisted` because vi.mock factories are hoisted above
// the imports.
const h = vi.hoisted(() => ({
  getOfflineSongCount: vi.fn(),
  getAllOfflineSongs: vi.fn(),
  authenticatedRequest: vi.fn(),
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  getOfflineSongCount: h.getOfflineSongCount,
  getAllOfflineSongs: h.getAllOfflineSongs,
}));

vi.mock("@/composables/useDirectusApi", () => ({
  useDirectusApi: () => ({ authenticatedRequest: h.authenticatedRequest }),
}));

type GqlBody = { query: string; variables?: Record<string, unknown> };

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data, status: 200, statusText: "OK", headers: {}, config: {},
  } as unknown as AxiosResponse<T>;
}

function httpError(status: number): AxiosError {
  const response = {
    status, data: {}, statusText: "", headers: {}, config: {},
  } as unknown as AxiosResponse;
  return new AxiosError("request failed", "ERR_BAD_RESPONSE", undefined, {}, response);
}

function countPayload(count: number) {
  return { data: { gesangbuchlied_aggregated: [{ count: { id: count } }] } };
}

// Spying on axios.post rather than mocking the module keeps `axios.isAxiosError`
// (which the store branches on) real, and guarantees no request escapes.
function spyOnPost() {
  return vi.spyOn(axios, "post");
}
let post: ReturnType<typeof spyOnPost>;

/** Every GraphQL document that actually went out, in order. */
function sentQueries(): string[] {
  return post.mock.calls.map((call) => (call[1] as GqlBody).query);
}

/** Collapse formatting so two differently-indented copies compare equal. */
function normalize(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

beforeEach(() => {
  setActivePinia(createPinia());

  post = vi.spyOn(axios, "post");
  post.mockRejectedValue(new Error("axios.post was not stubbed in this test"));

  h.getOfflineSongCount.mockReset().mockResolvedValue(0);
  h.getAllOfflineSongs.mockReset().mockResolvedValue([]);
  h.authenticatedRequest
    .mockReset()
    .mockRejectedValue(new Error("authenticatedRequest was not stubbed in this test"));

  useAuthStore().setTokens("access-1", "refresh-1");
});

describe("issue #24: the song count must not fan out into nine requests", () => {
  it("gives up after at most three requests when the server is unreachable", async () => {
    post.mockRejectedValue(new Error("Network Error"));

    await useStatsStore().loadStats();

    expect(post.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("gives up after at most three requests when the server rejects every query", async () => {
    // A 400 from Directus (which is what the invalid documents actually earn)
    // is not a reason to keep trying variants of the same broken shape.
    post.mockRejectedValue(httpError(400));

    await useStatsStore().loadStats();

    expect(post.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("never sends `count { * }`, which no GraphQL server can answer", async () => {
    post.mockRejectedValue(new Error("Network Error"));

    await useStatsStore().loadStats();

    const invalid = sentQueries().filter((query) => /\{\s*\*\s*\}/.test(query));
    expect(invalid).toHaveLength(0);
  });

  it("does not re-send a query that has already failed", async () => {
    // Attempt 2 (`count { id }`, unfiltered) and the first iteration of the
    // subfield loop are the same document, so one of the nine round-trips is a
    // verbatim retry of a request that just failed.
    post.mockRejectedValue(new Error("Network Error"));

    await useStatsStore().loadStats();

    const sent = sentQueries().map(normalize);
    expect(new Set(sent).size).toBe(sent.length);
  });

  it("still answers the happy path in a single request", async () => {
    // Guards against over-correction: trimming the fallback chain must not cost
    // the one round-trip that already works.
    post.mockResolvedValue(ok(countPayload(42)));
    const store = useStatsStore();

    await store.loadStats();

    expect(store.stats.totalSongs).toBe(42);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("still counts the returned ids when the aggregate query fails", async () => {
    // The one fallback that is actually useful — the aggregate is unavailable,
    // so fetch the ids and count them — must survive the cleanup.
    post.mockImplementation(async (_url, body) => {
      if ((body as GqlBody).query.includes("_aggregated")) throw httpError(500);
      return ok({ data: { gesangbuchlied: [{ id: "1" }, { id: "2" }, { id: "3" }] } });
    });
    const store = useStatsStore();

    await store.loadStats();

    expect(store.stats.totalSongs).toBe(3);
    expect(store.statsError).toBeNull();
  });
});

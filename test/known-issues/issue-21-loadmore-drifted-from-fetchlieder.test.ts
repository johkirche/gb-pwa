/**
 * Issue #21 — loadMore has drifted away from fetchLieder
 * https://github.com/johkirche/gb-pwa/issues/21
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * fetchLieder pages with `limit: currentLimit.value` and derives
 * `hasMore = result.length === currentLimit.value`. loadMore hard-codes 50 in
 * both places, so any caller that changes currentLimit gets a second page of a
 * different size and a hasMore flag computed against the wrong number. loadMore
 * also has no re-entrancy guard: it fires a request even when hasMore is already
 * false, and a second call while one is in flight fetches the same offset twice
 * and appends the rows again.
 */
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Gesangbuchlied } from "@/gql/graphql";

import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";

import { restoreOnline, setOnline } from "../helpers/env";
import { makePage } from "../helpers/gesangbuchlieder-store";

const h = vi.hoisted(() => ({
  queryGesangbuchlied: vi.fn(),
  queryGesangbuchliedByIds: vi.fn(),
  getOfflineSongs: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/composables/useGesangbuchlied", () => ({
  useGesangbuchlied: () => ({
    queryGesangbuchlied: h.queryGesangbuchlied,
    queryGesangbuchliedByIds: h.queryGesangbuchliedByIds,
  }),
}));

vi.mock("@/composables/useOfflineDownload", async () => {
  const { ref } = await import("vue");
  const hasOfflineContent = ref(false);
  return {
    useOfflineDownload: () => ({
      hasOfflineContent,
      getOfflineSongs: h.getOfflineSongs,
    }),
  };
});

vi.mock("@/composables/useFavorites", async () => {
  const { ref } = await import("vue");
  const favorites = ref<string[]>([]);
  return { useFavorites: () => ({ favorites }) };
});

interface QueryVariables {
  limit: number;
  offset: number;
  filter: Record<string, unknown>;
  sort: string[];
}

/** The variables handed to the n-th `queryGesangbuchlied` call. */
function queryVars(index = 0): QueryVariables {
  return h.queryGesangbuchlied.mock.calls[index][0] as QueryVariables;
}

/**
 * Load a first page from the API with `limit` as the page size, then forget the
 * call so the assertions only see what loadMore asked for.
 */
async function seedFromApi(
  store: ReturnType<typeof useGesangbuchliedStore>,
  limit: number,
  returned = limit,
) {
  store.setPreferOfflineData(false);
  store.currentLimit = limit;
  h.queryGesangbuchlied.mockResolvedValueOnce(makePage(returned, "first"));
  await store.fetchLieder();
  h.queryGesangbuchlied.mockClear();
}

beforeEach(() => {
  setActivePinia(createPinia());

  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.queryGesangbuchliedByIds.mockReset().mockResolvedValue([]);
  h.getOfflineSongs.mockReset().mockResolvedValue([]);

  setOnline(true);

  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("unexpected network access in test"))),
  );
});

afterEach(() => {
  restoreOnline();
});

describe("issue #21: loadMore must page with currentLimit, like fetchLieder", () => {
  it("requests the configured page size instead of a hard-coded 50", async () => {
    const store = useGesangbuchliedStore();
    await seedFromApi(store, 25);
    h.queryGesangbuchlied.mockResolvedValue(makePage(25, "second"));

    await store.loadMore();

    expect(queryVars().limit).toBe(25);
  });

  it("keeps hasMore set when the page comes back full at the configured size", async () => {
    // With currentLimit at 25 a 25-row page is a *full* page, so there may well
    // be more to fetch. Comparing against 50 reads it as the end of the list and
    // the infinite scroll stops early.
    const store = useGesangbuchliedStore();
    await seedFromApi(store, 25);
    h.queryGesangbuchlied.mockResolvedValue(makePage(25, "second"));

    await store.loadMore();

    expect(store.hasMore).toBe(true);
  });

  it("clears hasMore when a short page comes back at the configured size", async () => {
    const store = useGesangbuchliedStore();
    await seedFromApi(store, 25);
    h.queryGesangbuchlied.mockResolvedValue(makePage(9, "second"));

    await store.loadMore();

    expect(store.hasMore).toBe(false);
  });
});

describe("issue #21: loadMore must guard its own re-entry", () => {
  it("does not request another page once hasMore is false", async () => {
    const store = useGesangbuchliedStore();
    // A short first page means the API has already told us the list is complete.
    await seedFromApi(store, 50, 10);
    expect(store.hasMore).toBe(false);

    await store.loadMore();

    expect(h.queryGesangbuchlied).not.toHaveBeenCalled();
  });

  it("ignores a second call while the first page request is still in flight", async () => {
    // The scroll listener fires repeatedly. Without an isLoadingMore guard both
    // calls read the same lieder.length, request the same offset and append the
    // same rows twice.
    const store = useGesangbuchliedStore();
    await seedFromApi(store, 50);

    let release!: (value: Gesangbuchlied[]) => void;
    h.queryGesangbuchlied.mockReturnValueOnce(
      new Promise<Gesangbuchlied[]>((resolve) => {
        release = resolve;
      }),
    );
    h.queryGesangbuchlied.mockResolvedValue(makePage(50, "third"));

    const first = store.loadMore();
    const second = store.loadMore();
    release(makePage(50, "second"));
    await Promise.all([first, second]);

    expect(h.queryGesangbuchlied).toHaveBeenCalledOnce();
    expect(store.lieder).toHaveLength(100);
  });

  it("still refuses to page while showing cached data", async () => {
    // Guard: IndexedDB already holds every song. Whatever guards get added must
    // not resurrect a request here.
    h.getOfflineSongs.mockResolvedValue(makePage(3, "cached"));
    const store = useGesangbuchliedStore();
    await store.fetchLieder();
    h.queryGesangbuchlied.mockClear();

    await store.loadMore();

    expect(h.queryGesangbuchlied).not.toHaveBeenCalled();
    expect(store.lieder).toHaveLength(3);
    expect(store.hasMore).toBe(false);
    expect(store.isLoadingMore).toBe(false);
  });

  it("still appends the next page from the end of the current list", async () => {
    // Guard: the ordinary path has to keep working — right offset, rows appended
    // rather than replacing, and isLoadingMore handed back.
    const store = useGesangbuchliedStore();
    await seedFromApi(store, 50);
    h.queryGesangbuchlied.mockResolvedValue(makePage(50, "second"));

    await store.loadMore();

    expect(queryVars().offset).toBe(50);
    expect(store.lieder).toHaveLength(100);
    expect(store.lieder[50].id).toBe("second-0");
    expect(store.isLoadingMore).toBe(false);
  });

  it("still carries the active filters and sort into the paged request", async () => {
    // Guard: loadMore must keep mapping the UI sort key onto the Directus column
    // and re-sending the filters, exactly as fetchLieder does.
    const store = useGesangbuchliedStore();
    store.setFilter("selectedCategory", "Advent");
    store.setFilter("sortBy", "title");
    store.setFilter("sortDirection", "desc");
    await seedFromApi(store, 50);
    h.queryGesangbuchlied.mockResolvedValue(makePage(50, "second"));

    await store.loadMore();

    const vars = queryVars();
    expect(vars.sort).toEqual(["-titel"]);
    expect((vars.filter as { _and: Record<string, unknown>[] })._and[1]).toEqual({
      kategorieId: { kategorie_id: { name: { _eq: "Advent" } } },
    });
  });
});

import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Ref } from "vue";

import type { Gesangbuchlied } from "@/gql/graphql";

import { useFavorites } from "@/composables/useFavorites";
import { useOfflineDownload } from "@/composables/useOfflineDownload";
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";

import { restoreOnline, setOnline } from "../helpers/env";
import { ids, makeLied, makePage, titles } from "../helpers/gesangbuchlieder-store";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// Every collaborator that can reach the network or IndexedDB is replaced: the
// store's own logic (filtering, sorting, paging, offline fallback) is the
// subject, and a real request would make these tests non-deterministic.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  queryGesangbuchlied: vi.fn(),
  queryGesangbuchliedByIds: vi.fn(),
  getOfflineSongs: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  // The store uses `t` only for user-facing error strings. Echoing the key back
  // keeps assertions readable and independent of the de/en catalogues.
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/composables/useGesangbuchlied", () => ({
  useGesangbuchlied: () => ({
    queryGesangbuchlied: h.queryGesangbuchlied,
    queryGesangbuchliedByIds: h.queryGesangbuchliedByIds,
  }),
}));

// The refs are created once at factory scope, not per call, so the store and
// the test observe the same reactive source.
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

// ---------------------------------------------------------------------------
// Handles onto the mocked reactive state. Both are `readonly`/`computed` in the
// real composables, hence the casts — the tests need to drive them.
// ---------------------------------------------------------------------------
function favoritesRef(): Ref<string[]> {
  return useFavorites().favorites as unknown as Ref<string[]>;
}

function hasOfflineContentRef(): Ref<boolean> {
  return useOfflineDownload().hasOfflineContent as unknown as Ref<boolean>;
}

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

const BASE_FILTER = { bewertungKleinerKreis: { rangfolge: { _eq: 5 } } };

// ---------------------------------------------------------------------------
beforeEach(() => {
  setActivePinia(createPinia());

  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.queryGesangbuchliedByIds.mockReset().mockResolvedValue([]);
  h.getOfflineSongs.mockReset().mockResolvedValue([]);

  favoritesRef().value = [];
  hasOfflineContentRef().value = false;

  setOnline(true);

  // Nothing in this store should ever reach the network. If something does, the
  // test should blow up rather than silently hit a real host.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("unexpected network access in test"))),
  );
});

afterEach(() => {
  restoreOnline();
});

// ---------------------------------------------------------------------------
describe("initial state", () => {
  it("starts offline-first: cached data is preferred before any fetch happens", () => {
    // This default is the whole point of the app — a phone in a church with no
    // signal must render the downloaded hymnal without asking the network first.
    const store = useGesangbuchliedStore();

    expect(store.preferOfflineData).toBe(true);
    expect(store.lieder).toEqual([]);
    expect(store.isLoading).toBe(false);
    expect(store.isUsingCachedData).toBe(false);
    expect(store.hasMore).toBe(true);
    expect(store.currentLimit).toBe(50);
    expect(store.error).toBeNull();
    expect(store.filters).toEqual({
      searchQuery: "",
      selectedCategory: "",
      selectedFileType: "",
      sortBy: "title",
      sortDirection: "asc",
      showFavoritesOnly: false,
    });
  });
});

// ---------------------------------------------------------------------------
describe("fetchLieder — choosing a source", () => {
  it("serves IndexedDB and never touches the API when offline data is preferred", async () => {
    const cached = [makeLied({ id: "c1", titel: "Lobe den Herren" })];
    h.getOfflineSongs.mockResolvedValue(cached);
    const store = useGesangbuchliedStore();

    await store.fetchLieder();

    expect(ids(store.lieder)).toEqual(["c1"]);
    expect(store.isUsingCachedData).toBe(true);
    // IndexedDB holds the complete hymnal, so there is nothing left to page in.
    expect(store.hasMore).toBe(false);
    expect(h.queryGesangbuchlied).not.toHaveBeenCalled();
  });

  it("falls through to the API when IndexedDB is empty", async () => {
    h.getOfflineSongs.mockResolvedValue([]);
    h.queryGesangbuchlied.mockResolvedValue([makeLied({ id: "a1", titel: "Amen" })]);
    const store = useGesangbuchliedStore();

    await store.fetchLieder();

    expect(ids(store.lieder)).toEqual(["a1"]);
    expect(store.isUsingCachedData).toBe(false);
    expect(h.queryGesangbuchlied).toHaveBeenCalledOnce();
  });

  it("skips the cache entirely when the caller forces an online refresh", async () => {
    h.getOfflineSongs.mockResolvedValue([makeLied({ id: "stale" })]);
    h.queryGesangbuchlied.mockResolvedValue([makeLied({ id: "fresh" })]);
    const store = useGesangbuchliedStore();

    await store.fetchLieder(true);

    expect(ids(store.lieder)).toEqual(["fresh"]);
    expect(store.isUsingCachedData).toBe(false);
    expect(h.getOfflineSongs).not.toHaveBeenCalled();
  });

  it("skips the cache once the user switches the data source to online", async () => {
    h.getOfflineSongs.mockResolvedValue([makeLied({ id: "stale" })]);
    h.queryGesangbuchlied.mockResolvedValue([makeLied({ id: "fresh" })]);
    const store = useGesangbuchliedStore();

    store.setPreferOfflineData(false);
    await store.fetchLieder();

    expect(ids(store.lieder)).toEqual(["fresh"]);
    expect(h.getOfflineSongs).not.toHaveBeenCalled();
  });

  it("returns to cached data after a forced online refresh", async () => {
    // isUsingCachedData drives the "offline" badge in the UI, so it has to track
    // the source of the data currently on screen, not the source of the first load.
    h.getOfflineSongs.mockResolvedValue([makeLied({ id: "cached" })]);
    h.queryGesangbuchlied.mockResolvedValue([makeLied({ id: "fresh" })]);
    const store = useGesangbuchliedStore();

    await store.fetchLieder(true);
    expect(store.isUsingCachedData).toBe(false);

    await store.fetchLieder();
    expect(store.isUsingCachedData).toBe(true);
    expect(ids(store.lieder)).toEqual(["cached"]);
  });

  it("flips isLoading for exactly the duration of the request", async () => {
    let release!: (value: Gesangbuchlied[]) => void;
    h.queryGesangbuchlied.mockReturnValue(
      new Promise<Gesangbuchlied[]>((resolve) => {
        release = resolve;
      }),
    );
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    const pending = store.fetchLieder();
    expect(store.isLoading).toBe(true);

    release([makeLied({ id: "a1" })]);
    await pending;

    expect(store.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("fetchLieder — request shape", () => {
  it("asks for one page of the current limit, filtered to top-rated songs", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(queryVars()).toEqual({
      limit: 50,
      offset: 0,
      filter: BASE_FILTER,
      sort: ["titel"],
    });
  });

  it("translates the UI sort key into the Directus column name", async () => {
    // The UI calls the field "title"; the collection column is "titel". Getting
    // this wrong means Directus silently ignores the sort.
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    store.setFilter("sortBy", "date_updated");

    await store.fetchLieder();

    expect(queryVars().sort).toEqual(["date_updated"]);
  });

  it("prefixes the sort field with '-' for descending order", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    store.toggleSortDirection();

    await store.fetchLieder();

    expect(queryVars().sort).toEqual(["-titel"]);
  });

  it("passes an unmapped sort key straight through", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    store.setFilter("sortBy", "liednummer2026");

    await store.fetchLieder();

    expect(queryVars().sort).toEqual(["liednummer2026"]);
  });

  it("ANDs the active filters onto the base rating filter", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    // Leading/trailing space is what a user actually types — the API filter has
    // to be built from the trimmed term or Directus matches nothing.
    store.setFilter("searchQuery", "  Abend  ");
    store.setFilter("selectedCategory", "Advent");
    store.setFilter("selectedFileType", "PDF");

    await store.fetchLieder();

    const filter = queryVars().filter as {
      _and: [
        typeof BASE_FILTER,
        { _or: Record<string, unknown>[] },
        Record<string, unknown>,
        Record<string, unknown>,
      ];
    };
    expect(filter._and).toHaveLength(4);
    expect(filter._and[0]).toEqual(BASE_FILTER);
    expect(filter._and[1]._or[0]).toEqual({ titel: { _icontains: "Abend" } });
    expect(filter._and[1]._or).toHaveLength(5);
    expect(filter._and[2]).toEqual({
      kategorieId: { kategorie_id: { name: { _eq: "Advent" } } },
    });
    expect(filter._and[3]).toEqual({
      melodieId: { noten: { directus_files_id: { type: { _contains: "pdf" } } } },
    });
  });

  it("leaves the filter untouched when only whitespace was typed", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    store.setFilter("searchQuery", "   ");

    await store.fetchLieder();

    expect(queryVars().filter).toEqual(BASE_FILTER);
  });

  it("maps the Audio and Image file types onto their MIME substrings", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    store.setFilter("selectedFileType", "Audio");
    await store.fetchLieder();
    store.setFilter("selectedFileType", "Image");
    await store.fetchLieder();

    const audio = queryVars(0).filter as { _and: Record<string, unknown>[] };
    const image = queryVars(1).filter as { _and: Record<string, unknown>[] };
    expect(audio._and[1]).toEqual({
      melodieId: { noten: { directus_files_id: { type: { _contains: "audio" } } } },
    });
    expect(image._and[1]).toEqual({
      melodieId: { noten: { directus_files_id: { type: { _contains: "image" } } } },
    });
  });

  it("drops an unrecognised file type instead of sending an empty clause", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    store.setFilter("selectedFileType", "Video");

    await store.fetchLieder();

    expect(queryVars().filter).toEqual(BASE_FILTER);
  });
});

// ---------------------------------------------------------------------------
describe("fetchLieder — pagination bookkeeping", () => {
  it("keeps hasMore set when the API fills the page", async () => {
    h.queryGesangbuchlied.mockResolvedValue(makePage(50));
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(store.lieder).toHaveLength(50);
    expect(store.hasMore).toBe(true);
  });

  it("clears hasMore when the API returns a short page", async () => {
    h.queryGesangbuchlied.mockResolvedValue(makePage(12));
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(store.hasMore).toBe(false);
  });

  it("treats an empty result as a finished list rather than an error", async () => {
    h.queryGesangbuchlied.mockResolvedValue([]);
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(store.lieder).toEqual([]);
    expect(store.hasMore).toBe(false);
    expect(store.error).toBeNull();
  });

  it("clears a previous error on a successful re-fetch", async () => {
    h.queryGesangbuchlied.mockRejectedValueOnce(new Error("boom"));
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();
    expect(store.error).toBe("boom");

    h.queryGesangbuchlied.mockResolvedValue([makeLied({ id: "a1" })]);
    await store.fetchLieder();

    expect(store.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("fetchLieder — offline and error fallbacks", () => {
  it("serves cached songs when the API request fails", async () => {
    // A failed request must never empty a hymnal the user already downloaded.
    h.queryGesangbuchlied.mockRejectedValue(new Error("502 Bad Gateway"));
    h.getOfflineSongs.mockResolvedValue([makeLied({ id: "c1", titel: "Nun danket" })]);
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(ids(store.lieder)).toEqual(["c1"]);
    expect(store.isUsingCachedData).toBe(true);
    expect(store.hasMore).toBe(false);
    expect(store.error).toBeNull();
  });

  it("surfaces the API error message when there is nothing cached", async () => {
    h.queryGesangbuchlied.mockRejectedValue(new Error("502 Bad Gateway"));
    h.getOfflineSongs.mockResolvedValue([]);
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(store.error).toBe("502 Bad Gateway");
    expect(store.isLoading).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("falls back to a localized message when the thrown value is not an Error", async () => {
    h.queryGesangbuchlied.mockRejectedValue("something odd");
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(store.error).toBe("utils.unknownError");
  });

  it("serves cached songs while offline even when the user asked for fresh data", async () => {
    setOnline(false);
    h.getOfflineSongs.mockResolvedValue([makeLied({ id: "c1" })]);
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(ids(store.lieder)).toEqual(["c1"]);
    expect(store.isUsingCachedData).toBe(true);
    expect(store.hasMore).toBe(false);
    expect(h.queryGesangbuchlied).not.toHaveBeenCalled();
  });

  it("explains that nothing was downloaded when offline with an empty cache", async () => {
    setOnline(false);
    h.getOfflineSongs.mockResolvedValue([]);
    const store = useGesangbuchliedStore();

    await store.fetchLieder();

    expect(store.error).toBe("songs.noOfflineContentAvailable");
    expect(h.queryGesangbuchlied).not.toHaveBeenCalled();
  });

  it("uses the connect-or-download message when the link drops mid-request", async () => {
    // The browser was online when the request started and offline by the time it
    // failed — the user needs "reconnect or download", not a raw HTTP message.
    h.queryGesangbuchlied.mockImplementation(async () => {
      setOnline(false);
      throw new Error("Network Error");
    });
    h.getOfflineSongs.mockResolvedValue([]);
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await store.fetchLieder();

    expect(store.error).toBe("songs.noOfflineContentAvailableConnect");
  });

  it("rejects when the offline fallback itself throws, but still clears isLoading", async () => {
    // Documents current behaviour: the fallback read inside the catch block is
    // not itself guarded, so fetchLieder can reject at its callers.
    h.queryGesangbuchlied.mockRejectedValue(new Error("502"));
    h.getOfflineSongs.mockRejectedValue(new Error("IndexedDB unavailable"));
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);

    await expect(store.fetchLieder()).rejects.toThrow("IndexedDB unavailable");
    expect(store.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("loadMore", () => {
  async function seedFromApi(store: ReturnType<typeof useGesangbuchliedStore>, page: number) {
    h.queryGesangbuchlied.mockResolvedValueOnce(makePage(page, "first"));
    store.setPreferOfflineData(false);
    await store.fetchLieder();
    h.queryGesangbuchlied.mockClear();
  }

  it("appends the next page and pages from the end of the current list", async () => {
    const store = useGesangbuchliedStore();
    await seedFromApi(store, 50);
    h.queryGesangbuchlied.mockResolvedValue(makePage(50, "second"));

    await store.loadMore();

    expect(store.lieder).toHaveLength(100);
    expect(store.lieder[50].id).toBe("second-0");
    expect(queryVars().offset).toBe(50);
    expect(store.hasMore).toBe(true);
  });

  it("clears hasMore once a short page comes back", async () => {
    const store = useGesangbuchliedStore();
    await seedFromApi(store, 50);
    h.queryGesangbuchlied.mockResolvedValue(makePage(7, "second"));

    await store.loadMore();

    expect(store.lieder).toHaveLength(57);
    expect(store.hasMore).toBe(false);
  });

  it("refuses to page while showing cached data", async () => {
    // IndexedDB already holds every song, so a second request would just
    // re-download the first page and duplicate it into the list.
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

  it("keeps the songs already on screen when the next page fails", async () => {
    const store = useGesangbuchliedStore();
    await seedFromApi(store, 50);
    h.queryGesangbuchlied.mockRejectedValue(new Error("502"));

    await store.loadMore();

    expect(store.lieder).toHaveLength(50);
    expect(store.isLoadingMore).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("carries the active filters and sort into the paged request", async () => {
    const store = useGesangbuchliedStore();
    store.setFilter("selectedCategory", "Advent");
    store.setFilter("sortBy", "liednummer2000");
    store.setFilter("sortDirection", "desc");
    await seedFromApi(store, 50);

    await store.loadMore();

    const vars = queryVars();
    expect(vars.sort).toEqual(["-liednummer2000"]);
    expect((vars.filter as { _and: Record<string, unknown>[] })._and[1]).toEqual({
      kategorieId: { kategorie_id: { name: { _eq: "Advent" } } },
    });
  });

  it("requests a hard-coded page of 50 regardless of the initial limit", async () => {
    // Documents current behaviour: currentLimit only governs the first page, so
    // a caller that lowers it gets an inconsistent second page.
    const store = useGesangbuchliedStore();
    store.currentLimit = 3;
    await seedFromApi(store, 3);
    expect(store.hasMore).toBe(true);

    await store.loadMore();

    expect(queryVars()).toMatchObject({ limit: 50, offset: 3 });
  });
});

// ---------------------------------------------------------------------------
describe("fetchMissingFavorites", () => {
  it("fetches only the favourites that are not already loaded and appends them", async () => {
    // Favourites must stay reachable even when they fall outside the loaded page,
    // otherwise the favourites filter silently hides them.
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "a", titel: "Amen" })];
    favoritesRef().value = ["a", "b", "c"];
    h.queryGesangbuchliedByIds.mockResolvedValue([
      makeLied({ id: "b", titel: "Beten" }),
      makeLied({ id: "c", titel: "Christus" }),
    ]);

    await store.fetchMissingFavorites();

    expect(h.queryGesangbuchliedByIds).toHaveBeenCalledWith(["b", "c"]);
    expect(ids(store.lieder)).toEqual(["a", "b", "c"]);
  });

  it("does not call the API when every favourite is already loaded", async () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "a" }), makeLied({ id: "b" })];
    favoritesRef().value = ["a", "b"];

    await store.fetchMissingFavorites();

    expect(h.queryGesangbuchliedByIds).not.toHaveBeenCalled();
  });

  it("leaves the list untouched and does not throw when the lookup fails", async () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "a" })];
    favoritesRef().value = ["a", "b"];
    h.queryGesangbuchliedByIds.mockRejectedValue(new Error("offline"));

    await expect(store.fetchMissingFavorites()).resolves.toBeUndefined();

    expect(ids(store.lieder)).toEqual(["a"]);
    expect(store.error).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("filteredLieder — search", () => {
  const corpus = [
    makeLied({ id: "1", titel: "Lobe den Herren" }),
    makeLied({ id: "2", titel: "Stille Nacht", strophen: ["Alles schläft, einsam wacht"] }),
    makeLied({
      id: "3",
      titel: "Wachet auf",
      textAutoren: [{ vorname: "Philipp", nachname: "Nicolai" }],
    }),
    makeLied({
      id: "4",
      titel: "Jesu, meine Freude",
      melodieAutoren: [{ vorname: "Johann", nachname: "Crüger" }],
    }),
  ];

  it("matches the title case-insensitively", () => {
    const store = useGesangbuchliedStore();
    store.lieder = corpus;

    store.setFilter("searchQuery", "LOBE");

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });

  it("matches text inside a verse", () => {
    const store = useGesangbuchliedStore();
    store.lieder = corpus;

    store.setFilter("searchQuery", "einsam wacht");

    expect(ids(store.filteredLieder)).toEqual(["2"]);
  });

  it("matches a text author's surname", () => {
    const store = useGesangbuchliedStore();
    store.lieder = corpus;

    store.setFilter("searchQuery", "nicolai");

    expect(ids(store.filteredLieder)).toEqual(["3"]);
  });

  it("matches across the space joining a melody author's first and last name", () => {
    const store = useGesangbuchliedStore();
    store.lieder = corpus;

    store.setFilter("searchQuery", "johann crü");

    expect(ids(store.filteredLieder)).toEqual(["4"]);
  });

  it("returns everything when the query is only whitespace", () => {
    const store = useGesangbuchliedStore();
    store.lieder = corpus;

    store.setFilter("searchQuery", "   ");

    expect(store.filteredLieder).toHaveLength(4);
  });

  it("finds nothing for a padded query, because the term is lower-cased but not trimmed", () => {
    // Documents a real mismatch: buildApiFilters() trims the term for the API,
    // the client-side filter does not — so the same keystrokes give two
    // different result sets depending on whether the data came from IndexedDB.
    const store = useGesangbuchliedStore();
    store.lieder = corpus;

    store.setFilter("searchQuery", " lobe ");

    expect(store.filteredLieder).toHaveLength(0);
  });

  it("ignores songs with no title, verses or authors instead of throwing", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "bare" }), ...corpus];

    store.setFilter("searchQuery", "lobe");

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });
});

// ---------------------------------------------------------------------------
describe("filteredLieder — favourites", () => {
  it("keeps only the favourited songs", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", titel: "Amen" }),
      makeLied({ id: "2", titel: "Beten" }),
    ];
    favoritesRef().value = ["2"];

    store.setFilter("showFavoritesOnly", true);

    expect(ids(store.filteredLieder)).toEqual(["2"]);
  });

  it("intersects with the search filter rather than replacing it", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", titel: "Abendlied" }),
      makeLied({ id: "2", titel: "Abendsegen" }),
      makeLied({ id: "3", titel: "Morgenlied" }),
    ];
    favoritesRef().value = ["2", "3"];

    store.setFilter("showFavoritesOnly", true);
    store.setFilter("searchQuery", "abend");

    expect(ids(store.filteredLieder)).toEqual(["2"]);
  });

  it("reacts to a favourite being removed", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" }), makeLied({ id: "2" })];
    favoritesRef().value = ["1", "2"];
    store.setFilter("showFavoritesOnly", true);
    expect(store.filteredLieder).toHaveLength(2);

    favoritesRef().value = ["1"];

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });
});

// ---------------------------------------------------------------------------
describe("filteredLieder — category", () => {
  it("keeps songs carrying the selected category", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", kategorien: ["Advent", "Weihnachten"] }),
      makeLied({ id: "2", kategorien: ["Ostern"] }),
    ];

    store.setFilter("selectedCategory", "Weihnachten");

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });

  it("drops songs that have no category relation at all", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", kategorien: ["Advent"] }), makeLied({ id: "2" })];

    store.setFilter("selectedCategory", "Advent");

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });

  it("survives a relation row whose category record is gone", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", kategorien: [null, "Advent"] })];

    store.setFilter("selectedCategory", "Advent");

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });
});

// ---------------------------------------------------------------------------
describe("filteredLieder — file type", () => {
  const corpus = [
    makeLied({ id: "pdf", notenTypes: ["application/pdf"] }),
    makeLied({ id: "audio", notenTypes: ["audio/mpeg"] }),
    makeLied({ id: "image", notenTypes: ["image/png"] }),
    makeLied({ id: "none" }),
  ];

  it("matches each UI label against the MIME substring", () => {
    const store = useGesangbuchliedStore();
    store.lieder = corpus;

    store.setFilter("selectedFileType", "PDF");
    expect(ids(store.filteredLieder)).toEqual(["pdf"]);

    store.setFilter("selectedFileType", "Audio");
    expect(ids(store.filteredLieder)).toEqual(["audio"]);

    store.setFilter("selectedFileType", "Image");
    expect(ids(store.filteredLieder)).toEqual(["image"]);
  });

  it("matches nothing for a label outside the three known types", () => {
    const store = useGesangbuchliedStore();
    store.lieder = corpus;

    store.setFilter("selectedFileType", "Video");

    expect(store.filteredLieder).toEqual([]);
  });

  it("survives a note row with no file attached", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", notenTypes: [null, "application/pdf"] })];

    store.setFilter("selectedFileType", "PDF");

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });
});

// ---------------------------------------------------------------------------
describe("filteredLieder — sorting", () => {
  it("sorts by title ascending by default", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", titel: "Christus" }),
      makeLied({ id: "2", titel: "Abend" }),
      makeLied({ id: "3", titel: "Beten" }),
    ];

    expect(titles(store.filteredLieder)).toEqual(["Abend", "Beten", "Christus"]);
  });

  it("reverses the order when the direction is toggled, and restores it when toggled back", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", titel: "Abend" }), makeLied({ id: "2", titel: "Beten" })];

    store.toggleSortDirection();
    expect(titles(store.filteredLieder)).toEqual(["Beten", "Abend"]);

    store.toggleSortDirection();
    expect(titles(store.filteredLieder)).toEqual(["Abend", "Beten"]);
  });

  it("sorts by hymn number, treating a missing number as 0", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "high", liednummer2000: 120 }),
      makeLied({ id: "none" }),
      makeLied({ id: "low", liednummer2000: 3 }),
    ];

    store.setFilter("sortBy", "liednummer2000");

    expect(ids(store.filteredLieder)).toEqual(["none", "low", "high"]);
  });

  it("sorts by the 2026 hymn number even though it is missing from the generated types", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "b", liednummer2026: 42 }),
      makeLied({ id: "a", liednummer2026: 7 }),
    ];

    store.setFilter("sortBy", "liednummer2026");

    expect(ids(store.filteredLieder)).toEqual(["a", "b"]);
  });

  it("sorts by date_updated, putting an undated song first", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "new", date_updated: "2026-05-01T00:00:00Z" }),
      makeLied({ id: "old", date_updated: "2020-01-01T00:00:00Z" }),
      makeLied({ id: "undated" }),
    ];

    store.setFilter("sortBy", "date_updated");

    expect(ids(store.filteredLieder)).toEqual(["undated", "old", "new"]);
  });

  it("falls back to title order for an unknown sort key", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", titel: "Beten" }), makeLied({ id: "2", titel: "Abend" })];

    store.setFilter("sortBy", "popularity");

    expect(titles(store.filteredLieder)).toEqual(["Abend", "Beten"]);
  });

  it("orders titles by German collation, not UTF-16 code unit", () => {
    // Regression guard. Raw `<`/`>` comparison put "Ähre" behind "Zion" and
    // every lowercase title behind every capitalised one — visibly wrong when
    // browsing a German hymnal alphabetically.
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", titel: "Ähre" }),
      makeLied({ id: "2", titel: "abend" }),
      makeLied({ id: "3", titel: "Zion" }),
    ];

    expect(titles(store.filteredLieder)).toEqual(["abend", "Ähre", "Zion"]);
  });

  it("sorts umlauts alongside their base letter", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", titel: "Zion" }),
      makeLied({ id: "2", titel: "Über allen" }),
      makeLied({ id: "3", titel: "Und" }),
      makeLied({ id: "4", titel: "Amen" }),
    ];

    // "Über" belongs with U, not after Z.
    expect(titles(store.filteredLieder)).toEqual([
      "Amen",
      "Über allen",
      "Und",
      "Zion",
    ]);
  });

  it("reverses German collation for descending order", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", titel: "abend" }),
      makeLied({ id: "2", titel: "Ähre" }),
      makeLied({ id: "3", titel: "Zion" }),
    ];
    store.filters.sortDirection = "desc";

    expect(titles(store.filteredLieder)).toEqual(["Zion", "Ähre", "abend"]);
  });

  it("treats a missing title as an empty string rather than dropping the song", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", titel: "Abend" }), makeLied({ id: "2" })];

    expect(ids(store.filteredLieder)).toEqual(["2", "1"]);
  });

  it("does not reorder the underlying lieder array", () => {
    // filteredLieder sorts a copy; mutating store.lieder in place would scramble
    // the pagination offsets that loadMore derives from it.
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", titel: "Christus" }), makeLied({ id: "2", titel: "Abend" })];

    expect(ids(store.filteredLieder)).toEqual(["2", "1"]);
    expect(ids(store.lieder)).toEqual(["1", "2"]);
  });
});

// ---------------------------------------------------------------------------
describe("availableCategories", () => {
  it("collects unique names across all songs, alphabetically", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", kategorien: ["Weihnachten", "Advent"] }),
      makeLied({ id: "2", kategorien: ["Advent"] }),
    ];

    expect(store.availableCategories).toEqual(["Advent", "Weihnachten"]);
  });

  it("ignores songs without categories and rows with a missing category record", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", kategorien: [null, "Ostern"] }), makeLied({ id: "2" })];

    expect(store.availableCategories).toEqual(["Ostern"]);
  });
});

describe("availableFileTypes", () => {
  it("buckets MIME types into the three UI labels, deduped and sorted", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [
      makeLied({ id: "1", notenTypes: ["application/pdf", "image/png"] }),
      makeLied({ id: "2", notenTypes: ["audio/mpeg", "application/pdf"] }),
    ];

    expect(store.availableFileTypes).toEqual(["Audio", "Image", "PDF"]);
  });

  it("ignores MIME types that fall into none of the buckets", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", notenTypes: ["text/plain", "application/xml"] })];

    expect(store.availableFileTypes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("shouldShowDataSourceControl", () => {
  // happy-dom serves the document from http://localhost:3000/, which trips the
  // store's dev-only escape hatch and would mask the hasOfflineContent branch
  // entirely. Move the page onto a production-looking host for these tests.
  const ORIGINAL_URL = window.location.href;

  function setPageUrl(url: string) {
    (window as unknown as { happyDOM: { setURL: (u: string) => void } }).happyDOM.setURL(url);
  }

  beforeEach(() => setPageUrl("https://gesangbuch.example/songs"));
  afterEach(() => setPageUrl(ORIGINAL_URL));

  it("stays hidden until songs are actually on screen", () => {
    const store = useGesangbuchliedStore();
    hasOfflineContentRef().value = true;

    expect(store.lieder).toEqual([]);
    expect(store.shouldShowDataSourceControl).toBe(false);
  });

  it("appears once offline content exists and songs are loaded", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" })];
    hasOfflineContentRef().value = true;

    expect(store.shouldShowDataSourceControl).toBe(true);
  });

  it("stays hidden on a normal host while nothing has been downloaded", () => {
    // Nothing to switch between — offering an offline/online toggle here would
    // just be a dead control.
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" })];

    expect(hasOfflineContentRef().value).toBe(false);
    expect(store.shouldShowDataSourceControl).toBe(false);
  });

  it("is forced on for localhost so the toggle is always reachable in dev", () => {
    setPageUrl("http://localhost:3000/songs");
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" })];

    expect(hasOfflineContentRef().value).toBe(false);
    expect(store.shouldShowDataSourceControl).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("setFilter / clearFilters", () => {
  it("updates one key without disturbing the others", () => {
    const store = useGesangbuchliedStore();
    store.setFilter("sortDirection", "desc");

    store.setFilter("searchQuery", "abend");

    expect(store.filters.searchQuery).toBe("abend");
    expect(store.filters.sortDirection).toBe("desc");
  });

  it("restores every default", () => {
    const store = useGesangbuchliedStore();
    store.setFilter("searchQuery", "abend");
    store.setFilter("selectedCategory", "Advent");
    store.setFilter("selectedFileType", "PDF");
    store.setFilter("showFavoritesOnly", true);
    store.setFilter("sortBy", "date_updated");
    store.setFilter("sortDirection", "desc");

    store.clearFilters();

    expect(store.filters).toEqual({
      searchQuery: "",
      selectedCategory: "",
      selectedFileType: "",
      sortBy: "title",
      sortDirection: "asc",
      showFavoritesOnly: false,
    });
  });

  it("re-runs the derived list after clearing", () => {
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1", titel: "Abend" }), makeLied({ id: "2", titel: "Morgen" })];
    store.setFilter("searchQuery", "abend");
    expect(store.filteredLieder).toHaveLength(1);

    store.clearFilters();

    expect(store.filteredLieder).toHaveLength(2);
    // Clearing is purely local — the caller decides whether to re-query.
    expect(h.queryGesangbuchlied).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("getAuthors", () => {
  it("joins first and last name and lists text authors before melody authors", () => {
    const store = useGesangbuchliedStore();
    const lied = makeLied({
      id: "1",
      textAutoren: [{ vorname: "Paul", nachname: "Gerhardt" }],
      melodieAutoren: [{ vorname: "Johann", nachname: "Crüger" }],
    });

    expect(store.getAuthors(lied)).toEqual(["Paul Gerhardt", "Johann Crüger"]);
  });

  it("lists an author who wrote both text and melody only once", () => {
    const store = useGesangbuchliedStore();
    const lied = makeLied({
      id: "1",
      textAutoren: [{ vorname: "Martin", nachname: "Luther" }],
      melodieAutoren: [{ vorname: "Martin", nachname: "Luther" }],
    });

    expect(store.getAuthors(lied)).toEqual(["Martin Luther"]);
  });

  it("handles a one-name author without leaving stray whitespace", () => {
    const store = useGesangbuchliedStore();
    const lied = makeLied({ id: "1", textAutoren: [{ nachname: "Anonymus" }] });

    expect(store.getAuthors(lied)).toEqual(["Anonymus"]);
  });

  it("skips relation rows with no author record and authors with no name", () => {
    const store = useGesangbuchliedStore();
    const lied = makeLied({ id: "1", textAutoren: [null, {}, { vorname: "Ambrosius" }] });

    expect(store.getAuthors(lied)).toEqual(["Ambrosius"]);
  });

  it("returns an empty list when the song has neither text nor melody", () => {
    const store = useGesangbuchliedStore();

    expect(store.getAuthors(makeLied({ id: "1" }))).toEqual([]);
  });
});

describe("hasAudioFiles", () => {
  it("is true when any attached file is an audio MIME type", () => {
    const store = useGesangbuchliedStore();
    const lied = makeLied({ id: "1", notenTypes: ["application/pdf", "audio/mpeg"] });

    expect(store.hasAudioFiles(lied)).toBe(true);
  });

  it("is false for a song with only sheet music, and for one with no melody at all", () => {
    const store = useGesangbuchliedStore();

    expect(store.hasAudioFiles(makeLied({ id: "1", notenTypes: ["application/pdf"] }))).toBe(false);
    expect(store.hasAudioFiles(makeLied({ id: "2" }))).toBe(false);
  });
});

describe("getCategories", () => {
  it("returns the category names, dropping rows with no record", () => {
    const store = useGesangbuchliedStore();
    const lied = makeLied({ id: "1", kategorien: ["Advent", null, "Weihnachten"] });

    expect(store.getCategories(lied)).toEqual(["Advent", "Weihnachten"]);
  });

  it("returns an empty list for a song with no categories", () => {
    const store = useGesangbuchliedStore();

    expect(store.getCategories(makeLied({ id: "1" }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("setPreferOfflineData", () => {
  it("is the switch the data-source toggle flips, and it survives a fetch", async () => {
    const store = useGesangbuchliedStore();

    store.setPreferOfflineData(false);
    expect(store.preferOfflineData).toBe(false);

    await store.fetchLieder();

    expect(store.preferOfflineData).toBe(false);
  });
});

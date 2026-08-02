/**
 * Issue #5 — song search: the guard trims the query but the matching uses the raw string
 * https://github.com/johkirche/gb-pwa/issues/5
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * filteredLieder gates on `filters.value.searchQuery.trim()` and then builds the
 * needle from `filters.value.searchQuery.toLowerCase()` — the *untrimmed* value.
 * A query with a leading or trailing space therefore clears the guard and then
 * matches nothing. buildApiFilters() does trim, so the very same keystrokes give
 * two different result sets depending on whether the list came from Directus or
 * from IndexedDB.
 */
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";

import { ids, makeLied } from "../helpers/gesangbuchlieder-store";

// Everything that could reach the network or IndexedDB is replaced; the subject
// here is the purely local `filteredLieder` computation.
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

const corpus = [
  makeLied({ id: "1", titel: "Lobe den Herren" }),
  makeLied({ id: "2", titel: "Stille Nacht", strophen: ["Alles schläft, einsam wacht"] }),
  makeLied({
    id: "3",
    titel: "Wachet auf",
    textAutoren: [{ vorname: "Philipp", nachname: "Nicolai" }],
  }),
];

function storeWithCorpus() {
  const store = useGesangbuchliedStore();
  store.lieder = corpus;
  return store;
}

beforeEach(() => {
  setActivePinia(createPinia());

  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.queryGesangbuchliedByIds.mockReset().mockResolvedValue([]);
  h.getOfflineSongs.mockReset().mockResolvedValue([]);

  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("unexpected network access in test"))),
  );
});

describe("issue #5: a padded search query must match the same songs as the unpadded one", () => {
  it("matches a title when the query is padded on both sides", () => {
    const store = storeWithCorpus();

    store.setFilter("searchQuery", " lobe ");

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });

  it("matches a verse when the query has a trailing space", () => {
    const store = storeWithCorpus();

    store.setFilter("searchQuery", "einsam wacht ");

    expect(ids(store.filteredLieder)).toEqual(["2"]);
  });

  it("matches an author when the query has a leading space", () => {
    // The author haystack is "Philipp Nicolai", so a leading space only shows the
    // bug against the *first* name — " nicolai" happens to match the space that
    // joins the two names.
    const store = storeWithCorpus();

    store.setFilter("searchQuery", " Philipp");

    expect(ids(store.filteredLieder)).toEqual(["3"]);
  });

  it("gives the padded and the unpadded query identical results", () => {
    // The property the fix has to establish, stated without naming a song:
    // surrounding whitespace is not part of what the user searched for.
    const store = storeWithCorpus();

    store.setFilter("searchQuery", "lobe");
    const unpadded = ids(store.filteredLieder);

    store.setFilter("searchQuery", "\t lobe \n");
    const padded = ids(store.filteredLieder);

    expect(padded).toEqual(unpadded);
  });

  it("still matches an unpadded query", () => {
    // Guard: the trim must not disturb the ordinary path.
    const store = storeWithCorpus();

    store.setFilter("searchQuery", "LOBE");

    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });

  it("still returns everything when the query is only whitespace", () => {
    // Guard: trimming must not turn "   " into a match-nothing needle — the
    // empty query has to keep meaning "no search filter at all".
    const store = storeWithCorpus();

    store.setFilter("searchQuery", "   ");

    expect(store.filteredLieder).toHaveLength(3);
  });

  it("keeps whitespace inside the query significant", () => {
    // Guard against over-correction: trimming the ends is not the same as
    // stripping or collapsing every space, so "lobeden" must still find nothing
    // and "den Herren" must still match.
    const store = storeWithCorpus();

    store.setFilter("searchQuery", "lobeden");
    expect(store.filteredLieder).toEqual([]);

    store.setFilter("searchQuery", "den Herren");
    expect(ids(store.filteredLieder)).toEqual(["1"]);
  });
});

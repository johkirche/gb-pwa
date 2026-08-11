import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import SongsEmptyState from "@/components/songs/EmptyState.vue";
import SongsGrid from "@/components/songs/SongGrid.vue";
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";
import SongsView from "@/views/SongsView.vue";

import { restoreOnline, setOnline } from "../helpers/env";
import { makeLied } from "../helpers/gesangbuchlieder-store";

// ---------------------------------------------------------------------------
// Regression guards for issue #13.
//
// `isUsingCachedData` comes from storeToRefs, so it is a Ref object, and three
// conditions in <script setup> tested it without `.value`. `!<Ref>` is always
// false, so the refetch watcher's body — including `await fetchLieder()` — was
// unreachable and no filter change ever reached the server. For a user who has
// not downloaded the hymnal that meant searching only ever filtered the first
// 50 alphabetical songs, and the template had no branch for "songs loaded but
// none matched", so the page rendered a blank area under the search box.
//
// This is the one thing the store's own specs cannot see: the store was always
// correct, it was simply never called.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  queryGesangbuchlied: vi.fn(),
  queryGesangbuchliedByIds: vi.fn(),
  getOfflineSongs: vi.fn(),
  checkOfflineContent: vi.fn(),
}));

// Echoing the key back keeps the assertions independent of the de/en
// catalogues, and lets the store be instantiated outside a component setup —
// the real `useI18n` requires an active instance.
vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/composables/useGesangbuchlied", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/composables/useGesangbuchlied")>()),
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
      checkOfflineContent: h.checkOfflineContent,
    }),
  };
});

vi.mock("@/composables/useFavorites", async () => {
  const { ref } = await import("vue");
  const favorites = ref<string[]>([]);
  return { useFavorites: () => ({ favorites }) };
});

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", name: "home", component: { template: "<div />" } },
    { path: "/songs", name: "songs", component: { template: "<div />" } },
  ],
});

// The router is shared across tests, and so is the query mock. A view left
// mounted keeps watching `route.query` and refetches into its own (previous)
// store when the next test navigates — which shows up as phantom calls on the
// mock. Every mount is tracked and torn down.
let mounted: ReturnType<typeof mount>[] = [];

/**
 * Shallow-mounted so the assertions are about SongsView's own branching rather
 * than its children. AppLayout is given a slot-rendering stub — a default stub
 * swallows its slot, which would leave nothing to assert on.
 */
async function mountView() {
  await router.replace({ path: "/songs", query: {} });
  await router.isReady();

  const wrapper = mount(SongsView, {
    shallow: true,
    global: {
      plugins: [router],
      stubs: { AppLayout: { template: "<div><slot /></div>" } },
    },
  });
  mounted.push(wrapper);

  await vi.advanceTimersByTimeAsync(0);
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();

  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.queryGesangbuchliedByIds.mockReset().mockResolvedValue([]);
  h.getOfflineSongs.mockReset().mockResolvedValue([]);
  h.checkOfflineContent.mockReset().mockResolvedValue(undefined);

  setOnline(true);
});

afterEach(() => {
  mounted.forEach((wrapper) => wrapper.unmount());
  mounted = [];
  restoreOnline();
});

describe("SongsView — filter changes reach the server", () => {
  it("refetches when the search query changes", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    h.queryGesangbuchlied.mockResolvedValue([makeLied({ id: "1", titel: "Lobe den Herren" })]);
    await mountView();
    h.queryGesangbuchlied.mockClear();

    store.setFilter("searchQuery", "Stille Nacht");
    await vi.advanceTimersByTimeAsync(300);

    expect(h.queryGesangbuchlied).toHaveBeenCalled();
  });

  it("sends the new search term to the server rather than only filtering locally", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    await mountView();
    h.queryGesangbuchlied.mockClear();

    store.setFilter("searchQuery", "Stille Nacht");
    await vi.advanceTimersByTimeAsync(300);

    const { filter } = h.queryGesangbuchlied.mock.calls[0][0] as {
      filter: { _and: [unknown, { _or: { titel: { _icontains: string } }[] }] };
    };
    expect(filter._and[1]._or[0]).toEqual({ titel: { _icontains: "Stille Nacht" } });
  });

  it("refetches when the category changes", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    await mountView();
    h.queryGesangbuchlied.mockClear();

    store.setFilter("selectedCategory", "Advent");
    await vi.advanceTimersByTimeAsync(300);

    expect(h.queryGesangbuchlied).toHaveBeenCalled();
  });

  it("collapses a burst of keystrokes into one request", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    await mountView();
    h.queryGesangbuchlied.mockClear();

    for (const term of ["S", "St", "Sti", "Stil", "Stille"]) {
      store.setFilter("searchQuery", term);
      await vi.advanceTimersByTimeAsync(50);
    }
    await vi.advanceTimersByTimeAsync(300);

    expect(h.queryGesangbuchlied).toHaveBeenCalledOnce();
  });

  it("still does not query the server while showing downloaded songs", async () => {
    // The guard the missing `.value` was meant to express: IndexedDB already
    // holds every song, so a filter change is a local operation.
    h.getOfflineSongs.mockResolvedValue([makeLied({ id: "c1", titel: "Nun danket" })]);
    const store = useGesangbuchliedStore();
    await mountView();
    expect(store.isUsingCachedData).toBe(true);
    h.queryGesangbuchlied.mockClear();

    store.setFilter("searchQuery", "Stille Nacht");
    await vi.advanceTimersByTimeAsync(300);

    expect(h.queryGesangbuchlied).not.toHaveBeenCalled();
  });
});

describe("SongsView — a search that matches nothing", () => {
  it("renders the no-matching state instead of a blank page", async () => {
    // `filteredLieder` is empty but `lieder` is not, so neither the grid nor
    // the no-songs state applied and the whole area rendered empty.
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    h.queryGesangbuchlied.mockResolvedValue([makeLied({ id: "1", titel: "Lobe den Herren" })]);
    const wrapper = await mountView();

    store.setFilter("searchQuery", "kommt garantiert nicht vor");
    await vi.advanceTimersByTimeAsync(300);

    expect(store.lieder.length).toBeGreaterThan(0);
    expect(store.filteredLieder).toEqual([]);
    expect(wrapper.findComponent(SongsGrid).exists()).toBe(false);
    expect(wrapper.findComponent(SongsEmptyState).props("title")).toBe(
      "songs.noMatchingSongs",
    );
  });

  it("still shows the grid when something does match", async () => {
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    h.queryGesangbuchlied.mockResolvedValue([makeLied({ id: "1", titel: "Lobe den Herren" })]);
    const wrapper = await mountView();

    expect(wrapper.findComponent(SongsGrid).exists()).toBe(true);
    expect(wrapper.findComponent(SongsEmptyState).exists()).toBe(false);
  });

  it("still shows the load-songs state when nothing was ever loaded", async () => {
    // The pre-existing branch: an empty `lieder` is a different situation from
    // an empty filter result, and keeps its own call to action.
    const store = useGesangbuchliedStore();
    store.setPreferOfflineData(false);
    const wrapper = await mountView();

    expect(store.lieder).toEqual([]);
    expect(wrapper.findComponent(SongsEmptyState).props("showLoadButton")).not.toBe(false);
  });
});

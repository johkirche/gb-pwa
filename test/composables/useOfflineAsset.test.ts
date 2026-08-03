import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EffectScope, effectScope, nextTick, ref } from "vue";

import { useOfflineAsset } from "@/composables/useOfflineAsset";

import {
  deferred,
  installObjectUrlTracker,
  type ObjectUrlTracker,
  withFailingStorageWrite,
} from "../helpers/offline-asset-favorites";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// The real getOfflineAssetBlob opens IndexedDB; mocking it keeps the IDB
// success/miss/failure branches under the test's control.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  getOfflineAssetBlob: vi.fn(),
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  getOfflineAssetBlob: h.getOfflineAssetBlob,
}));

// Pinned in vitest.config.ts so built URLs are assertable.
const DIRECTUS = "https://directus.test";

// Not exported by the composable — duplicated here on purpose, so a rename of
// the storage key shows up as a failing test rather than as silently orphaned
// favorites in every user's browser.
const FAVORITES_KEY = "gesangbuch-favorites";

function coverBlob(label: string) {
  return new Blob([label], { type: "image/png" });
}

// ---------------------------------------------------------------------------
describe("useOfflineAsset", () => {
  let tracker: ObjectUrlTracker;
  const scopes: EffectScope[] = [];

  /**
   * Run the composable inside an effect scope we own, so the test can dispose
   * it deterministically (that disposal is what triggers revocation).
   */
  function mount<T>(fn: () => T): T {
    const scope = effectScope();
    scopes.push(scope);
    return scope.run(fn)!;
  }

  /**
   * The watchEffect body is async, so its result lands a few microtasks after
   * the dependency change. nextTick also drains the pre-flush watcher queue.
   */
  async function flush() {
    for (let i = 0; i < 4; i++) await nextTick();
  }

  beforeEach(() => {
    tracker = installObjectUrlTracker();
    h.getOfflineAssetBlob.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop();
    tracker.uninstall();
  });

  it("falls back to the remote Directus URL when the asset is not downloaded", async () => {
    const url = mount(() => useOfflineAsset("cover-1"));

    await flush();

    expect(url.value).toBe(`${DIRECTUS}/assets/cover-1`);
    expect(h.getOfflineAssetBlob).toHaveBeenCalledWith("cover-1");
    expect(tracker.createObjectURL).not.toHaveBeenCalled();
  });

  it("appends thumbnail params to the remote URL", async () => {
    const url = mount(() =>
      useOfflineAsset("cover-1", { params: "?width=300&height=200&fit=cover" }),
    );

    await flush();

    expect(url.value).toBe(`${DIRECTUS}/assets/cover-1?width=300&height=200&fit=cover`);
  });

  it("serves a local blob URL for the exact stored blob instead of going to the network", async () => {
    const blob = coverBlob("cover-1-bytes");
    h.getOfflineAssetBlob.mockResolvedValue(blob);

    const url = mount(() => useOfflineAsset("cover-1"));
    await flush();

    // Identity, not just "starts with blob:" — serving some other asset's blob
    // would still look like a blob URL.
    expect(tracker.blobFor(url.value!)).toBe(blob);
    expect(url.value).not.toContain(DIRECTUS);
  });

  it("ignores thumbnail params when the asset comes from IndexedDB", async () => {
    // Documented behaviour: IDB only ever holds the original, so a downloaded
    // user gets the full-size image rather than a broken thumbnail request.
    const blob = coverBlob("cover-1-bytes");
    h.getOfflineAssetBlob.mockResolvedValue(blob);

    const url = mount(() => useOfflineAsset("cover-1", { params: "?width=300" }));
    await flush();

    expect(tracker.blobFor(url.value!)).toBe(blob);
    expect(url.value).not.toContain("width=300");
  });

  it("resolves an id supplied as a getter", async () => {
    const song = ref({ cover: "cover-7" });
    const url = mount(() => useOfflineAsset(() => song.value.cover));

    await flush();

    expect(url.value).toBe(`${DIRECTUS}/assets/cover-7`);
  });

  it("stays null and never opens IndexedDB when there is no id", async () => {
    const url = mount(() => useOfflineAsset(null));

    await flush();

    expect(url.value).toBeNull();
    expect(h.getOfflineAssetBlob).not.toHaveBeenCalled();
  });

  it("re-resolves when the id changes", async () => {
    const id = ref<string | null>("cover-1");
    h.getOfflineAssetBlob.mockImplementation(async (assetId: string) =>
      assetId === "cover-2" ? coverBlob("cover-2-bytes") : null,
    );

    const url = mount(() => useOfflineAsset(id));
    await flush();
    expect(url.value).toBe(`${DIRECTUS}/assets/cover-1`);

    id.value = "cover-2";
    await flush();

    expect(tracker.blobFor(url.value!)?.type).toBe("image/png");
    expect(h.getOfflineAssetBlob).toHaveBeenLastCalledWith("cover-2");
  });

  it("revokes the previous blob URL when the id changes", async () => {
    // Without this, scrolling a song list would pin every cover blob in memory
    // for the lifetime of the tab.
    h.getOfflineAssetBlob.mockImplementation(async (assetId: string) =>
      coverBlob(`${assetId}-bytes`),
    );
    const id = ref("cover-1");

    const url = mount(() => useOfflineAsset(id));
    await flush();
    const first = url.value!;

    id.value = "cover-2";
    await flush();
    const second = url.value!;

    expect(second).not.toBe(first);
    expect(tracker.revokedUrls()).toEqual([first]);
    expect(tracker.liveUrls()).toEqual([second]);
  });

  it("revokes the blob URL when the owning scope is disposed", async () => {
    h.getOfflineAssetBlob.mockResolvedValue(coverBlob("cover-1-bytes"));
    const scope = effectScope();
    const url = scope.run(() => useOfflineAsset("cover-1"))!;
    await flush();
    const issued = url.value!;

    scope.stop();

    expect(tracker.revokedUrls()).toEqual([issued]);
  });

  it("clears the URL and revokes the blob when the id becomes empty", async () => {
    h.getOfflineAssetBlob.mockResolvedValue(coverBlob("cover-1-bytes"));
    const id = ref<string | null>("cover-1");

    const url = mount(() => useOfflineAsset(id));
    await flush();
    const issued = url.value!;

    id.value = null;
    await flush();

    expect(url.value).toBeNull();
    expect(tracker.revokedUrls()).toEqual([issued]);
  });

  it("falls back to the remote URL when the IndexedDB read throws", async () => {
    h.getOfflineAssetBlob.mockRejectedValue(new Error("IDBDatabase closed"));

    const url = mount(() => useOfflineAsset("cover-1"));
    await flush();

    expect(url.value).toBe(`${DIRECTUS}/assets/cover-1`);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("IDB read failed"),
      expect.any(Error),
    );
  });

  // -------------------------------------------------------------------------
  // Regression guard for issue #8 — the newest asset id must win.
  // https://github.com/johkirche/gb-pwa/issues/8
  //
  // The watchEffect body is async and used to have no stale-response guard. When
  // the id changed while the first getOfflineAssetBlob was still pending,
  // onCleanup for the abandoned run fired immediately — while its
  // createdBlobUrl was still null, so nothing was revoked — and the abandoned
  // run then resumed and assigned `url.value` with the *old* asset. The
  // sheet-music dialog showed the previously opened image, and the object URL it
  // minted was unreachable by any cleanup.
  // -------------------------------------------------------------------------

  /** The bytes currently served by `url`, resolved through the tracker. */
  async function servedBytes(url: string | null) {
    const blob = tracker.blobFor(url ?? "");
    return blob ? await blob.text() : url;
  }

  /**
   * The race: the read for `cover-1` is still pending when the id flips to
   * `cover-2`, and settles only after `cover-2` has already been rendered.
   */
  function startRace(resolveWith: (assetId: string) => Blob | null) {
    const slow = deferred<Blob | null>();
    const fast = deferred<Blob | null>();
    h.getOfflineAssetBlob.mockImplementation((assetId: string) =>
      assetId === "cover-1" ? slow.promise : fast.promise,
    );
    const id = ref("cover-1");
    const url = mount(() => useOfflineAsset(id));
    id.value = "cover-2";

    return {
      url,
      settleNewest: async () => {
        await flush();
        fast.resolve(resolveWith("cover-2"));
        await flush();
      },
      settleAbandoned: async () => {
        slow.resolve(resolveWith("cover-1"));
        await flush();
      },
    };
  }

  it("keeps serving the newest asset when an abandoned read settles last", async () => {
    const race = startRace((assetId) => coverBlob(`${assetId}-bytes`));

    await race.settleNewest();
    await race.settleAbandoned();

    expect(await servedBytes(race.url.value)).toBe("cover-2-bytes");
  });

  it("keeps serving the newest asset when the abandoned read finds nothing offline", async () => {
    // Same race one branch over: a miss falls through to the network URL, and
    // that assignment is just as unguarded without the flag.
    const race = startRace(() => null);

    await race.settleNewest();
    await race.settleAbandoned();

    expect(race.url.value).toBe(`${DIRECTUS}/assets/cover-2`);
  });

  it("leaves exactly one object URL alive after the race", async () => {
    // The abandoned run's blob URL used to be created after its cleanup had
    // already run, so nothing would ever revoke it. Either not minting it or
    // revoking it in the same branch that mints it satisfies this.
    const race = startRace((assetId) => coverBlob(`${assetId}-bytes`));

    await race.settleNewest();
    await race.settleAbandoned();

    expect(tracker.liveUrls()).toHaveLength(1);
    expect(tracker.liveUrls()).toContain(race.url.value);
  });

  it("revokes every object URL it minted once the scope is gone", async () => {
    const race = startRace((assetId) => coverBlob(`${assetId}-bytes`));
    await race.settleNewest();
    await race.settleAbandoned();

    for (const scope of scopes.splice(0)) scope.stop();

    expect(tracker.liveUrls()).toEqual([]);
  });

  it("still follows the id when the reads settle in order", async () => {
    // Guards against over-correction: a cancellation flag that is set too
    // eagerly would freeze the URL at the first id it ever saw.
    h.getOfflineAssetBlob.mockImplementation(async (assetId: string) =>
      coverBlob(`${assetId}-bytes`),
    );
    const id = ref("cover-1");

    const url = mount(() => useOfflineAsset(id));
    await flush();
    const first = url.value!;

    id.value = "cover-2";
    await flush();

    expect(url.value).not.toBe(first);
    expect(await tracker.blobFor(url.value!)!.text()).toBe("cover-2-bytes");
  });
});

// ---------------------------------------------------------------------------
// useFavorites keeps its state in module scope and hydrates it at import time,
// so every test re-imports the module after seeding localStorage. Without the
// reset, one test's favorites would be another test's starting state.
// ---------------------------------------------------------------------------
async function loadFavorites(persisted?: string) {
  if (persisted !== undefined) localStorage.setItem(FAVORITES_KEY, persisted);
  vi.resetModules();
  const { useFavorites } = await import("@/composables/useFavorites");
  return useFavorites();
}

function storedFavorites(): unknown {
  const raw = localStorage.getItem(FAVORITES_KEY);
  return raw === null ? null : JSON.parse(raw);
}

describe("useFavorites hydration", () => {
  it("starts empty and writes nothing when there is no persisted value", async () => {
    const fav = await loadFavorites();

    expect(fav.favorites.value).toEqual([]);
    expect(fav.favoritesCount.value).toBe(0);
    // A read must not create the key — an untouched install stays untouched.
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
  });

  it("hydrates the persisted list on first import", async () => {
    const fav = await loadFavorites(JSON.stringify(["song-1", "song-2"]));

    expect(fav.favorites.value).toEqual(["song-1", "song-2"]);
    expect(fav.favoritesCount.value).toBe(2);
    expect(fav.isFavorite("song-2")).toBe(true);
    expect(fav.isFavorite("song-3")).toBe(false);
  });

  it("discards an unparseable persisted value and deletes the key", async () => {
    const fav = await loadFavorites("{not json");

    expect(fav.favorites.value).toEqual([]);
    // Leaving the corrupt value in place would make every later save a no-op
    // read on next boot; it has to be removed, not just ignored.
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("discards a persisted value that is not an array of strings", async () => {
    const fav = await loadFavorites(JSON.stringify(["song-1", 42]));

    expect(fav.favorites.value).toEqual([]);
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it("discards a persisted value of the wrong shape entirely", async () => {
    const fav = await loadFavorites(JSON.stringify({ "song-1": true }));

    expect(fav.favorites.value).toEqual([]);
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
  });
});

describe("useFavorites mutations", () => {
  it("adds a song and persists it", async () => {
    const fav = await loadFavorites();

    fav.addToFavorites("song-1");

    expect(fav.favorites.value).toEqual(["song-1"]);
    expect(fav.isFavorite("song-1")).toBe(true);
    expect(storedFavorites()).toEqual(["song-1"]);
  });

  it("does not add the same song twice", async () => {
    const fav = await loadFavorites();

    fav.addToFavorites("song-1");
    fav.addToFavorites("song-1");

    expect(fav.favorites.value).toEqual(["song-1"]);
    expect(fav.favoritesCount.value).toBe(1);
    expect(storedFavorites()).toEqual(["song-1"]);
  });

  it("removes a song and persists the removal", async () => {
    const fav = await loadFavorites(JSON.stringify(["song-1", "song-2"]));

    fav.removeFromFavorites("song-1");

    expect(fav.favorites.value).toEqual(["song-2"]);
    expect(fav.isFavorite("song-1")).toBe(false);
    expect(storedFavorites()).toEqual(["song-2"]);
  });

  it("leaves the list untouched when removing a song that is not a favorite", async () => {
    const fav = await loadFavorites(JSON.stringify(["song-1"]));

    fav.removeFromFavorites("song-99");

    expect(fav.favorites.value).toEqual(["song-1"]);
    expect(storedFavorites()).toEqual(["song-1"]);
  });

  it("toggles a song on and back off", async () => {
    const fav = await loadFavorites();

    fav.toggleFavorite("song-1");
    expect(fav.isFavorite("song-1")).toBe(true);
    expect(storedFavorites()).toEqual(["song-1"]);

    fav.toggleFavorite("song-1");
    expect(fav.isFavorite("song-1")).toBe(false);
    expect(storedFavorites()).toEqual([]);
  });

  it("clears every favorite and persists the empty list", async () => {
    const fav = await loadFavorites(JSON.stringify(["song-1", "song-2"]));

    fav.clearAllFavorites();

    expect(fav.favorites.value).toEqual([]);
    expect(fav.favoritesCount.value).toBe(0);
    expect(storedFavorites()).toEqual([]);
  });

  it("rejects an empty id without touching storage", async () => {
    const fav = await loadFavorites();

    fav.addToFavorites("");
    fav.toggleFavorite("");
    fav.removeFromFavorites("");

    expect(fav.favorites.value).toEqual([]);
    expect(fav.isFavorite("")).toBe(false);
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it("rejects a non-string id", async () => {
    const fav = await loadFavorites();

    fav.addToFavorites(42 as unknown as string);

    expect(fav.favorites.value).toEqual([]);
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
  });
});

describe("useFavorites persistence", () => {
  it("shares one list across every call site", async () => {
    // The state is module-level on purpose: the star in the song header and the
    // favorites tab must never disagree.
    const header = await loadFavorites();
    const { useFavorites } = await import("@/composables/useFavorites");
    const list = useFavorites();

    header.addToFavorites("song-1");

    expect(list.favorites.value).toEqual(["song-1"]);
    expect(list.favoritesCount.value).toBe(1);
    expect(list.isFavorite("song-1")).toBe(true);
  });

  it("survives a reload", async () => {
    const before = await loadFavorites();
    before.addToFavorites("song-1");
    before.addToFavorites("song-2");
    before.removeFromFavorites("song-1");

    // Fresh module, same localStorage — exactly what a page reload does.
    const after = await loadFavorites();

    expect(after.favorites.value).toEqual(["song-2"]);
  });

  it("keeps the in-memory change when the storage write fails", async () => {
    // Safari private mode / a full quota must not make the star unclickable.
    const fav = await loadFavorites();

    withFailingStorageWrite(() => {
      expect(() => fav.addToFavorites("song-1")).not.toThrow();
    });

    expect(fav.favorites.value).toEqual(["song-1"]);
    expect(fav.isFavorite("song-1")).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  // "Cannot remove a song that was persisted twice" was pinned here as if the
  // dead-end star were the contract. It is a defect: hydration takes the stored
  // array verbatim and removeFromFavorites splices a single index, so a list
  // this tab did not write — which is exactly what the cross-tab hydration of
  // issue #23 produces — leaves the song starred with no way to clear it.
  // Asserted in test/known-issues/issue-23-favorites-cross-tab.test.ts, where
  // it fails visibly rather than reading as coverage for the bug.
});

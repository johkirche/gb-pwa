/**
 * Issue #23 — Favorites: a second tab's save silently discards the first tab's stars
 * https://github.com/johkirche/gb-pwa/issues/23
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * useFavorites keeps `favoriteIds` in module scope and hydrates it exactly once,
 * at import time. Nothing ever listens for `storage`, so a tab that has been
 * open since before the other tab starred a song still holds the old array — and
 * saveFavorites() writes that whole array back, overwriting the other tab's
 * work. src/composables/useAuth.ts already solves this for the session keys: a
 * `storage` event re-hydrates the in-memory state from localStorage.
 */
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { dispatchStorageEvent } from "../helpers/env";

// Duplicated rather than imported: the composable does not export it, and a
// rename of the key is itself a defect worth failing on.
const FAVORITES_KEY = "gesangbuch-favorites";

/**
 * A freshly imported module instance, hydrated from `persisted`.
 *
 * The state is module-level, so every test needs its own module registry —
 * otherwise one test's stars are the next test's starting point.
 */
async function loadFavorites(persisted?: string) {
  if (persisted !== undefined) localStorage.setItem(FAVORITES_KEY, persisted);
  vi.resetModules();
  const { useFavorites } = await import("@/composables/useFavorites");
  return useFavorites();
}

/**
 * What the browser does when another tab writes the key: the value in
 * localStorage is already the new one by the time `storage` fires here.
 */
async function otherTabSaves(ids: string[]) {
  const raw = JSON.stringify(ids);
  localStorage.setItem(FAVORITES_KEY, raw);
  dispatchStorageEvent(FAVORITES_KEY, raw);
  await nextTick();
}

function persistedFavorites(): unknown {
  const raw = localStorage.getItem(FAVORITES_KEY);
  return raw === null ? null : JSON.parse(raw);
}

describe("issue #23: a storage event must re-hydrate the favorites module", () => {
  it("adopts a star added in another tab", async () => {
    const fav = await loadFavorites(JSON.stringify(["song-1"]));

    await otherTabSaves(["song-1", "song-2"]);

    expect(fav.favorites.value).toEqual(["song-1", "song-2"]);
  });

  it("adopts a star removed in another tab", async () => {
    const fav = await loadFavorites(JSON.stringify(["song-1", "song-2"]));

    await otherTabSaves(["song-2"]);

    expect(fav.isFavorite("song-1")).toBe(false);
  });

  it("does not discard the other tab's star on the next local save", async () => {
    // The data-loss path from the issue: this tab's stale array is written back
    // whole, so song-2 disappears from storage even though nobody un-starred it.
    const fav = await loadFavorites(JSON.stringify(["song-1"]));
    await otherTabSaves(["song-1", "song-2"]);

    fav.addToFavorites("song-3");

    expect(persistedFavorites()).toEqual(["song-1", "song-2", "song-3"]);
  });

  it("un-favorites a song that the persisted list contains twice", async () => {
    // Relocated from test/composables/useOfflineAsset.test.ts, where it was
    // asserted as correct behaviour. Once this tab stops being the only writer
    // of the key, the array it hydrates is one it did not produce — and
    // removeFromFavorites splices a single index, so a duplicate leaves the
    // song starred forever with no way to clear it from the UI.
    const fav = await loadFavorites(JSON.stringify(["song-1", "song-1"]));

    fav.removeFromFavorites("song-1");

    expect(fav.isFavorite("song-1")).toBe(false);
  });

  it("ignores a storage event for an unrelated key", async () => {
    // Guards against over-correction: re-hydrating on *every* storage event
    // would let an unrelated key (language, sort order, the auth tokens) reset
    // the list on each write.
    const fav = await loadFavorites(JSON.stringify(["song-1"]));

    localStorage.setItem("preferred-language", "en");
    dispatchStorageEvent("preferred-language", "en");
    await nextTick();

    expect(fav.favorites.value).toEqual(["song-1"]);
  });

  it("still writes a local star straight through to localStorage", async () => {
    // Guards against over-correction in the other direction: whatever listener
    // is added must not turn the local write path into a read-only view.
    const fav = await loadFavorites();

    fav.addToFavorites("song-1");

    expect(fav.isFavorite("song-1")).toBe(true);
    expect(persistedFavorites()).toEqual(["song-1"]);
  });
});

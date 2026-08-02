/**
 * Issue #15 — Asset precache reports 100% success when every IndexedDB write failed
 * https://github.com/johkirche/gb-pwa/issues/15
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * The per-asset `try` in precacheAssets wraps BOTH the `fetch` and the
 * `dbManager.put`, so a storage failure is swallowed by the same catch that is
 * there to tolerate a single dropped download — and the `finally` bumps the
 * progress counter either way. With IndexedDB writes failing (quota exceeded,
 * Safari private mode, an evicted database) the run still ends at 100% with
 * "Completed precaching N assets" while nothing at all was written.
 *
 * The second half of the same defect is ordering: downloadAllContent sets
 * `downloadProgress.isComplete = true` BEFORE it awaits precacheAssets, so the
 * UI declares the download finished while the media library is still being
 * fetched — and a user who closes the app at that point gets a hymnal whose
 * sheet music is missing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Gesangbuchlied } from "@/gql/graphql";

import {
  DIRECTUS_URL,
  breakIndexedDb,
  bytesFor,
  makeBlob,
  makeSong,
  okResponse,
  resetIndexedDb,
  restoreIndexedDb,
} from "../helpers/offline-download";

// ---------------------------------------------------------------------------
// Only the network is mocked. IndexedDB is the real fake-indexeddb, so
// "the write failed" is produced by genuinely breaking the database rather than
// by stubbing the storage layer the code under test uses.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  queryGesangbuchlied: vi.fn(),
  axiosPost: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/composables/useGesangbuchlied", () => ({
  useGesangbuchlied: () => ({ queryGesangbuchlied: h.queryGesangbuchlied }),
}));

vi.mock("axios", () => ({ default: { post: h.axiosPost } }));

beforeEach(() => {
  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.axiosPost.mockReset().mockImplementation(async (_url: string, body: { query?: string }) => {
    const gql = String(body?.query ?? "");
    if (gql.includes("freie_musikstuecke")) {
      return { data: { data: { freie_musikstuecke: [] } } };
    }
    return { data: { data: { settings: { soundfont: null } } } };
  });
  h.fetch.mockReset().mockImplementation(async (input: string) => {
    const id = String(input).slice(`${DIRECTUS_URL}/assets/`.length);
    return okResponse(makeBlob(bytesFor(id)));
  });
  vi.stubGlobal("fetch", h.fetch);
});

/** Fresh module copy + empty database; pinia imported after the reset. */
async function loadComposable() {
  vi.resetModules();
  resetIndexedDb();

  const pinia = await import("pinia");
  pinia.setActivePinia(pinia.createPinia());

  const mod = await import("@/composables/useOfflineDownload");
  return { mod, dl: mod.useOfflineDownload() };
}

const asSongs = (songs: ReturnType<typeof makeSong>[]) => songs as unknown as Gesangbuchlied[];

describe("issue #15: a precache run that stored nothing must not report success", () => {
  it("does not claim to have cached the assets when every write to IndexedDB failed", async () => {
    const { mod, dl } = await loadComposable();
    const songs = asSongs([makeSong("s1", { noten: [{ id: "f-1" }] })]);

    // The fetches succeed; only the storage layer is dead.
    breakIndexedDb();
    await dl.precacheAssets(songs, []);
    restoreIndexedDb();

    // Nothing was written — the run has no business claiming otherwise. Any
    // honest message is fine ("Asset precaching failed", "Completed precaching
    // 0 of 1 assets"); the one thing it must not say is that it cached the
    // asset it never stored.
    await expect(mod.getOfflineAssetBlob("f-1")).resolves.toBeNull();
    expect(dl.assetPrecacheProgress.value.currentAsset ?? "").not.toContain(
      "Completed precaching 1 assets",
    );
  });

  it("marks the download complete only once the assets have been precached", async () => {
    const { dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue(
      asSongs([makeSong("s1", { noten: [{ id: "f-1" }] })]),
    );

    // fetch() is only ever called for assets, so this samples isComplete at the
    // exact moment the media library is still downloading.
    const completeWhileFetchingAssets: boolean[] = [];
    h.fetch.mockImplementation(async (input: string) => {
      completeWhileFetchingAssets.push(dl.downloadProgress.value.isComplete);
      const id = String(input).slice(`${DIRECTUS_URL}/assets/`.length);
      return okResponse(makeBlob(bytesFor(id)));
    });

    await dl.downloadAllContent();

    expect(completeWhileFetchingAssets).toEqual([false]);
    // ...and it is of course complete once the whole run has finished.
    expect(dl.downloadProgress.value.isComplete).toBe(true);
  });

  it("still reports a completed run and stores the blobs when IndexedDB is healthy", async () => {
    // Guards the fix against over-correction: a run in which every asset really
    // was stored must keep reporting success, and must still drive the progress
    // bar to 100% so the Settings page does not hang at "99%".
    const { mod, dl } = await loadComposable();

    await dl.precacheAssets(asSongs([makeSong("s1", { noten: [{ id: "f-1" }] })]), []);

    await expect(mod.hasOfflineAsset("f-1")).resolves.toBe(true);
    expect(dl.assetPrecacheProgress.value.percentage).toBe(100);
    expect(dl.assetPrecacheProgress.value.currentAsset).toContain("Completed precaching");
    expect(dl.isPrecachingAssets.value).toBe(false);
  });
});

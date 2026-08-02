/**
 * Issue #17 — Offline storage size reports whole-origin usage but is labelled
 * as the hymnal size
 * https://github.com/johkirche/gb-pwa/issues/17
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * getStorageInfo() returns `navigator.storage.estimate().usage`, which is what
 * the *whole origin* occupies — the service worker's precached app shell, every
 * Cache Storage entry, localStorage, and any other IndexedDB database. The
 * Settings page prints that number next to the downloaded-hymn count, so it
 * reads as "your hymnal takes 480 MB". The figure it should report is the size
 * of the stored songs, pieces and asset blobs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Gesangbuchlied } from "@/gql/graphql";

import {
  makePiece,
  makeSong,
  makeBlob,
  okResponse,
  resetIndexedDb,
  restoreStorageManager,
  setStorageManager,
} from "../helpers/offline-download";

// ---------------------------------------------------------------------------
// Only the network and navigator.storage are mocked (happy-dom implements
// neither); IndexedDB is the real fake-indexeddb, so the rows whose size is
// under discussion genuinely exist.
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

const MB = 1024 * 1024;
/** One asset of a known, deliberately modest size. */
const ASSET_BYTES = 2048;

beforeEach(() => {
  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.axiosPost.mockReset().mockImplementation(async (_url: string, body: { query?: string }) => {
    const gql = String(body?.query ?? "");
    if (gql.includes("freie_musikstuecke")) {
      return { data: { data: { freie_musikstuecke: [makePiece("p1")] } } };
    }
    return { data: { data: { settings: { soundfont: null } } } };
  });
  h.fetch.mockReset().mockImplementation(async () =>
    okResponse(makeBlob(Array.from({ length: ASSET_BYTES }, () => 0x41))),
  );
  vi.stubGlobal("fetch", h.fetch);
});

afterEach(() => {
  restoreStorageManager();
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

/** One song with one 2 KiB asset, plus one piece — a very small hymnal. */
async function downloadSmallHymnal(dl: { downloadAllContent: () => Promise<number | undefined> }) {
  h.queryGesangbuchlied.mockResolvedValue(
    asSongs([makeSong("s1", { noten: [{ id: "f-1", type: "image/png" }] })]),
  );
  await dl.downloadAllContent();
}

describe("issue #17: the reported size must describe the hymnal, not the origin", () => {
  it("does not report unrelated origin storage as the size of the download", async () => {
    // 480 MB of Cache Storage, other databases and the app shell — none of it
    // the hymnal, which here is one song, one piece and one 2 KiB image.
    setStorageManager({ estimate: vi.fn().mockResolvedValue({ usage: 480 * MB }) });
    const { dl } = await loadComposable();
    await downloadSmallHymnal(dl);

    const info = await dl.getStorageInfo();

    expect(info?.sizeInBytes).toBeLessThan(1 * MB);
  });

  it("reports the same size no matter what else the origin has stored", async () => {
    // Same rows, two very different origin totals: whatever the number means,
    // it cannot depend on data this app did not store.
    setStorageManager({
      estimate: vi
        .fn()
        .mockResolvedValueOnce({ usage: 5 * MB })
        .mockResolvedValueOnce({ usage: 400 * MB }),
    });
    const { dl } = await loadComposable();
    await downloadSmallHymnal(dl);

    const before = await dl.getStorageInfo();
    const after = await dl.getStorageInfo();

    expect(after?.sizeInBytes).toBe(before?.sizeInBytes);
  });

  it("grows when a second song is stored and not before", async () => {
    // The number is only useful if it tracks the thing it labels.
    setStorageManager({ estimate: vi.fn().mockResolvedValue({ usage: 480 * MB }) });
    const { dl } = await loadComposable();
    await downloadSmallHymnal(dl);
    const small = await dl.getStorageInfo();

    h.queryGesangbuchlied.mockResolvedValue(
      asSongs([
        makeSong("s1", { noten: [{ id: "f-1", type: "image/png" }] }),
        makeSong("s2", { strophen: ["Eine zweite Strophe voller Text".repeat(20)] }),
      ]),
    );
    await dl.downloadAllContent();
    const larger = await dl.getStorageInfo();

    expect(larger!.sizeInBytes).toBeGreaterThan(small!.sizeInBytes);
  });

  it("still accounts for the bytes of the stored asset blobs", async () => {
    // Guards the fix against over-correction: a size computed from
    // JSON.stringify(songs) alone would be honest but useless — the blobs are
    // where essentially all of the space goes.
    setStorageManager({ estimate: vi.fn().mockResolvedValue({ usage: 480 * MB }) });
    const { dl } = await loadComposable();
    await downloadSmallHymnal(dl);

    const info = await dl.getStorageInfo();

    expect(info?.sizeInBytes).toBeGreaterThanOrEqual(ASSET_BYTES);
  });

  it("still reports the stored counts and a matching megabyte rendering", async () => {
    // Guard: only the byte figure is wrong, the rest of the payload is correct
    // and must stay that way.
    setStorageManager({ estimate: vi.fn().mockResolvedValue({ usage: 480 * MB }) });
    const { dl } = await loadComposable();
    await downloadSmallHymnal(dl);

    const info = await dl.getStorageInfo();

    expect(info).toMatchObject({ itemCount: 1, pieceCount: 1, assetCount: 1 });
    expect(info?.sizeInMB).toBe((info!.sizeInBytes / MB).toFixed(2));
  });
});

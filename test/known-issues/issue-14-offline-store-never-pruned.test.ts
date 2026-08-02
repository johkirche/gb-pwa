/**
 * Issue #14 — Offline store is never pruned: withdrawn songs survive forever
 * https://github.com/johkirche/gb-pwa/issues/14
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * storeOfflineContent only ever `put`s the rows it just downloaded — it never
 * deletes rows for songs/pieces the server no longer returns. The metadata
 * record IS overwritten with the new (smaller) count, so `getOfflineSongCount()`
 * drifts above `meta.count` and a hymn that was withdrawn from the Gesangbuch
 * keeps showing up in the offline search forever. Assets are pruned at the end
 * of precacheAssets, so a withdrawn song's sheet music is deleted while the song
 * row itself stays — the worst of both worlds.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FreiesMusikstueck } from "@/gql/extra-types";
import type { Gesangbuchlied } from "@/gql/graphql";

import {
  DIRECTUS_URL,
  bytesFor,
  makeBlob,
  makePiece,
  makeSong,
  okResponse,
  resetIndexedDb,
} from "../helpers/offline-download";

// ---------------------------------------------------------------------------
// Only the network is mocked; IndexedDB is the real fake-indexeddb, so the
// pruning behaviour asserted here is genuinely exercised against a store.
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

let piecesReply: ReturnType<typeof makePiece>[] = [];

beforeEach(() => {
  piecesReply = [];
  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.axiosPost.mockReset().mockImplementation(async (_url: string, body: { query?: string }) => {
    const gql = String(body?.query ?? "");
    if (gql.includes("freie_musikstuecke")) {
      return { data: { data: { freie_musikstuecke: piecesReply } } };
    }
    return { data: { data: { settings: { soundfont: null } } } };
  });
  h.fetch.mockReset().mockImplementation(async (input: string) => {
    const id = String(input).slice(`${DIRECTUS_URL}/assets/`.length);
    return okResponse(makeBlob(bytesFor(id)));
  });
  vi.stubGlobal("fetch", h.fetch);
});

/**
 * useOfflineDownload keeps module-level state (the shared IndexedDBManager and
 * the offlineContentAvailableCache memo), so every test gets a fresh copy plus
 * an empty database. pinia is imported after the reset so `setActivePinia` and
 * the auth store can never end up on different pinia copies.
 */
async function loadComposable() {
  vi.resetModules();
  resetIndexedDb();

  const pinia = await import("pinia");
  pinia.setActivePinia(pinia.createPinia());

  const mod = await import("@/composables/useOfflineDownload");
  return { mod, dl: mod.useOfflineDownload() };
}

const asSongs = (songs: ReturnType<typeof makeSong>[]) => songs as unknown as Gesangbuchlied[];

describe("issue #14: a withdrawn song must not survive the next download", () => {
  it("deletes song rows the server no longer returns", async () => {
    const { mod, dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue(asSongs([makeSong("s1"), makeSong("s2")]));
    await dl.downloadAllContent();

    // "s2" has been withdrawn from the Gesangbuch since the last download.
    h.queryGesangbuchlied.mockResolvedValue(asSongs([makeSong("s1")]));
    await dl.downloadAllContent();

    await expect(mod.getOfflineSongCount()).resolves.toBe(1);
  });

  it("keeps the stored row count in step with the metadata record", async () => {
    // The metadata count is what the Settings page shows the user ("42 Lieder
    // offline verfügbar"); the row count is what the offline search reads. The
    // two describing different numbers is the visible symptom.
    const { mod, dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue(asSongs([makeSong("s1"), makeSong("s2")]));
    await dl.downloadAllContent();

    h.queryGesangbuchlied.mockResolvedValue(asSongs([makeSong("s1")]));
    await dl.downloadAllContent();

    await expect(mod.getOfflineSongCount()).resolves.toBe(
      dl.offlineContentInfo.value?.count,
    );
  });

  it("stops serving a withdrawn hymn from the offline search", async () => {
    const { dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue(
      asSongs([
        makeSong("s1", { titel: "Lobe den Herren" }),
        makeSong("s2", { titel: "Zurückgezogenes Lied" }),
      ]),
    );
    await dl.downloadAllContent();

    h.queryGesangbuchlied.mockResolvedValue(
      asSongs([makeSong("s1", { titel: "Lobe den Herren" })]),
    );
    await dl.downloadAllContent();

    await expect(dl.getOfflineSongs("zurückgezogenes")).resolves.toEqual([]);
    await expect(dl.getOfflineSongById("s2")).resolves.toBeNull();
  });

  it("prunes withdrawn pieces as well", async () => {
    const { dl } = await loadComposable();
    piecesReply = [makePiece("p1"), makePiece("p2")];
    h.queryGesangbuchlied.mockResolvedValue(asSongs([makeSong("s1")]));
    await dl.downloadAllContent();

    piecesReply = [makePiece("p1")];
    await dl.downloadAllContent();

    const pieces = (await dl.getOfflinePieces()) as FreiesMusikstueck[];
    expect(pieces.map((p) => p.id)).toEqual(["p1"]);
  });

  it("still keeps — and updates — a song that is still published", async () => {
    // Guards the fix against over-correction: pruning must not turn into
    // "clear the store and re-add", which would leave the hymnal empty for the
    // duration of every update, nor may it drop rows that are still current.
    const { mod, dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue(
      asSongs([makeSong("s1", { titel: "Alter Titel" }), makeSong("s2")]),
    );
    await dl.downloadAllContent();

    h.queryGesangbuchlied.mockResolvedValue(
      asSongs([makeSong("s1", { titel: "Neuer Titel" })]),
    );
    await dl.downloadAllContent();

    const song = await dl.getOfflineSongById("s1");
    expect(song?.titel).toBe("Neuer Titel");
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(true);
  });
});

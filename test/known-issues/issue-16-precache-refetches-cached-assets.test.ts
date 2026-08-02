/**
 * Issue #16 — "Update content" re-downloads the entire media library every time
 * https://github.com/johkirche/gb-pwa/issues/16
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * precacheAssets builds the desired id set and then fetches every one of them
 * unconditionally — the ASSETS_STORE is only read *afterwards*, and only to
 * prune ids that are no longer referenced. Nothing ever asks "do I already have
 * this blob?", so pressing "Inhalte aktualisieren" a second time re-downloads
 * every PDF, PNG, MP3 and MIDI in the hymnal, over what is often a phone
 * tethered from a church basement.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Gesangbuchlied } from "@/gql/graphql";

import {
  DIRECTUS_URL,
  assetUrl,
  bytesFor,
  bytesOf,
  makeBlob,
  makeSong,
  okResponse,
  resetIndexedDb,
} from "../helpers/offline-download";

// ---------------------------------------------------------------------------
// Only the network is mocked; IndexedDB is the real fake-indexeddb, so the
// second run genuinely sees the blobs the first run wrote.
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

const fetchedUrls: string[] = [];

beforeEach(() => {
  fetchedUrls.length = 0;
  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.axiosPost.mockReset().mockImplementation(async (_url: string, body: { query?: string }) => {
    const gql = String(body?.query ?? "");
    if (gql.includes("freie_musikstuecke")) {
      return { data: { data: { freie_musikstuecke: [] } } };
    }
    return { data: { data: { settings: { soundfont: null } } } };
  });
  h.fetch.mockReset().mockImplementation(async (input: string) => {
    const url = String(input);
    fetchedUrls.push(url);
    return okResponse(makeBlob(bytesFor(url.slice(`${DIRECTUS_URL}/assets/`.length))));
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

const librarySongs = () =>
  asSongs([
    makeSong("s1", {
      noten: [{ id: "f-noten", type: "image/png" }],
      midiMain: { id: "f-midi", type: "audio/midi" },
    }),
  ]);

describe("issue #16: a repeat precache run must not re-download what it already has", () => {
  it("fetches nothing on a second run over an unchanged library", async () => {
    const { dl } = await loadComposable();
    await dl.precacheAssets(librarySongs(), []);
    // Baseline: the first run does have to fetch everything.
    expect(fetchedUrls.sort()).toEqual([assetUrl("f-midi"), assetUrl("f-noten")].sort());

    fetchedUrls.length = 0;
    await dl.precacheAssets(librarySongs(), []);

    expect(fetchedUrls).toEqual([]);
  });

  it("fetches only the assets that are new since the last run", async () => {
    const { dl } = await loadComposable();
    await dl.precacheAssets(librarySongs(), []);
    fetchedUrls.length = 0;

    // A new Satz has been added to the same song.
    const grown = asSongs([
      makeSong("s1", {
        noten: [{ id: "f-noten", type: "image/png" }],
        satz: [{ id: "f-neu", type: "application/pdf" }],
        midiMain: { id: "f-midi", type: "audio/midi" },
      }),
    ]);
    await dl.precacheAssets(grown, []);

    expect(fetchedUrls).toEqual([assetUrl("f-neu")]);
  });

  it("still downloads an asset it has never seen before", async () => {
    // Guards the fix against over-correction: skipping cached ids must not turn
    // into skipping the run altogether, or a newly added Satz would never
    // become available offline.
    const { mod, dl } = await loadComposable();
    await dl.precacheAssets(librarySongs(), []);
    fetchedUrls.length = 0;

    await dl.precacheAssets(
      asSongs([
        makeSong("s1", {
          noten: [{ id: "f-noten" }],
          satz: [{ id: "f-neu" }],
          midiMain: { id: "f-midi" },
        }),
      ]),
      [],
    );

    expect(fetchedUrls).toContain(assetUrl("f-neu"));
    expect(await bytesOf(await mod.getOfflineAssetBlob("f-neu"))).toEqual(bytesFor("f-neu"));
  });

  it("still has every asset in the store after the second run", async () => {
    // Guards the fix against over-correction from the other side: a run that
    // skips the fetch must not also skip the row, and must not let the pruning
    // pass delete a blob that is still referenced.
    const { mod, dl } = await loadComposable();
    await dl.precacheAssets(librarySongs(), []);

    await dl.precacheAssets(librarySongs(), []);

    expect(await bytesOf(await mod.getOfflineAssetBlob("f-noten"))).toEqual(bytesFor("f-noten"));
    await expect(mod.hasOfflineAsset("f-midi")).resolves.toBe(true);
    expect(dl.isPrecachingAssets.value).toBe(false);
  });
});

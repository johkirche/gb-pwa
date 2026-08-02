import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FreiesMusikstueck } from "@/gql/extra-types";
import type { Gesangbuchlied } from "@/gql/graphql";

import {
  ASSETS_STORE,
  CURRENT_DB_VERSION,
  DIRECTUS_URL,
  META_KEY,
  META_STORE,
  PIECES_STORE,
  SOUNDFONT_ID_KEY,
  SONGS_STORE,
  assetUrl,
  breakIndexedDb,
  bytesFor,
  bytesOf,
  errorResponse,
  makeBlob,
  makePiece,
  makeSong,
  okResponse,
  openRaw,
  rawGet,
  rawGetAll,
  rawPut,
  resetIndexedDb,
  restoreIndexedDb,
  restoreStorageManager,
  setStorageManager,
} from "../helpers/offline-download";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// Only the *network* is mocked. IndexedDB is the real (fake-indexeddb)
// implementation, so the schema, upgrade path and transactions are genuinely
// exercised rather than asserted against a stub.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  queryGesangbuchlied: vi.fn(),
  axiosPost: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/composables/useGesangbuchlied", () => ({
  useGesangbuchlied: () => ({ queryGesangbuchlied: h.queryGesangbuchlied }),
}));

vi.mock("axios", () => ({
  default: { post: h.axiosPost },
}));

// ---------------------------------------------------------------------------
// Controllable network state
// ---------------------------------------------------------------------------
type PiecesReply =
  | ReturnType<typeof makePiece>[]
  | Error
  | { errors: { message: string }[] }
  | Record<string, never>;
type AssetReply = { bytes: number[]; type?: string } | { status: number } | { throws: Error };

let piecesReply: PiecesReply = [];
let soundfontReply: string | null | Error = null;
const assetReplies = new Map<string, AssetReply>();
const fetchedUrls: string[] = [];

/** The two GraphQL calls the composable makes are told apart by their query. */
function installAxios() {
  h.axiosPost.mockReset().mockImplementation(async (_url: string, body: { query?: string }) => {
    const gql = String(body?.query ?? "");
    if (gql.includes("freie_musikstuecke")) {
      if (piecesReply instanceof Error) throw piecesReply;
      if (Array.isArray(piecesReply)) {
        return { data: { data: { freie_musikstuecke: piecesReply } } };
      }
      return { data: piecesReply };
    }
    if (gql.includes("settings")) {
      if (soundfontReply instanceof Error) throw soundfontReply;
      return {
        data: { data: { settings: { soundfont: soundfontReply ? { id: soundfontReply } : null } } },
      };
    }
    throw new Error(`unexpected graphql query: ${gql}`);
  });
}

function installFetch() {
  h.fetch.mockReset().mockImplementation(async (input: string) => {
    const url = String(input);
    fetchedUrls.push(url);
    const prefix = `${DIRECTUS_URL}/assets/`;
    const id = url.startsWith(prefix) ? url.slice(prefix.length) : url;
    const reply = assetReplies.get(id);
    if (reply) {
      if ("throws" in reply) throw reply.throws;
      if ("status" in reply) return errorResponse(reply.status);
      return okResponse(makeBlob(reply.bytes, reply.type));
    }
    return okResponse(makeBlob(bytesFor(id)));
  });
  vi.stubGlobal("fetch", h.fetch);
}

// ---------------------------------------------------------------------------
// Harness
//
// useOfflineDownload.ts holds two pieces of module-level state — the shared
// `IndexedDBManager` (and its open connection) and the
// `offlineContentAvailableCache` memo — so every test gets a freshly-imported
// copy plus an empty IndexedDB. pinia is imported *after* the reset so that the
// auth store and `setActivePinia` can never end up on different pinia copies.
// ---------------------------------------------------------------------------
async function loadOffline(options: { keepDb?: boolean } = {}) {
  vi.resetModules();
  if (!options.keepDb) resetIndexedDb();

  const pinia = await import("pinia");
  pinia.setActivePinia(pinia.createPinia());

  const { useAuthStore } = await import("@/stores/auth");
  const store = useAuthStore();

  const mod = await import("@/composables/useOfflineDownload");
  return { mod, store };
}

/** `useOfflineDownload()` plus the module-level exports, for brevity. */
async function loadComposable(options: { keepDb?: boolean } = {}) {
  const { mod, store } = await loadOffline(options);
  return { mod, dl: mod.useOfflineDownload(), store };
}

// The codegen types demand a full Directus_Files object where the fixtures only
// carry the two fields the source reads, so the call sites cast.
const asSongs = (songs: ReturnType<typeof makeSong>[]) => songs as unknown as Gesangbuchlied[];
const asPieces = (pieces: ReturnType<typeof makePiece>[]) =>
  pieces as unknown as FreiesMusikstueck[];

beforeEach(() => {
  piecesReply = [];
  soundfontReply = null;
  assetReplies.clear();
  fetchedUrls.length = 0;
  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  installAxios();
  installFetch();
});

afterEach(() => {
  restoreStorageManager();
});

// ===========================================================================
describe("extractDirectusAssetId", () => {
  it("pulls the file id out of a Directus asset URL with query params", async () => {
    const { extractDirectusAssetId } = await loadOffline().then((r) => r.mod);

    expect(extractDirectusAssetId(`${DIRECTUS_URL}/assets/abc-123?width=200&fit=cover`)).toBe(
      "abc-123",
    );
  });

  it("stops at the first path segment so a filename suffix is not swallowed", async () => {
    const { extractDirectusAssetId } = await loadOffline().then((r) => r.mod);

    expect(extractDirectusAssetId(`${DIRECTUS_URL}/assets/abc-123/noten.png`)).toBe("abc-123");
  });

  it("returns null for a URL on another origin", async () => {
    const { extractDirectusAssetId } = await loadOffline().then((r) => r.mod);

    expect(extractDirectusAssetId("https://cdn.example.com/assets/abc-123")).toBeNull();
  });

  it("returns null for a Directus URL that is not an asset", async () => {
    const { extractDirectusAssetId } = await loadOffline().then((r) => r.mod);

    expect(extractDirectusAssetId(`${DIRECTUS_URL}/items/gesangbuchlied/1`)).toBeNull();
  });

  it("returns null for a blob: URL", async () => {
    const { extractDirectusAssetId } = await loadOffline().then((r) => r.mod);

    expect(extractDirectusAssetId("blob:https://directus.test/9f2c")).toBeNull();
  });
});

// ===========================================================================
describe("IndexedDB schema", () => {
  it("creates all four object stores at version 3", async () => {
    const { getOfflineSongCount } = await loadOffline().then((r) => r.mod);

    // Any read is enough to trigger the lazy init + upgrade.
    await getOfflineSongCount();

    const db = await openRaw();
    expect(db.version).toBe(CURRENT_DB_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual([
      ASSETS_STORE,
      META_STORE,
      PIECES_STORE,
      SONGS_STORE,
    ]);
    db.close();
  });

  it("keeps the songs store keyed by `id` and the metadata store keyless", async () => {
    // The keyPath is load-bearing: storeOfflineContent puts songs without an
    // explicit key, while the metadata record is written under "offline-meta".
    const { getOfflineSongCount } = await loadOffline().then((r) => r.mod);
    await getOfflineSongCount();

    const db = await openRaw();
    const tx = db.transaction([SONGS_STORE, META_STORE], "readonly");
    expect(tx.objectStore(SONGS_STORE).keyPath).toBe("id");
    expect(tx.objectStore(META_STORE).keyPath).toBeNull();
    db.close();
  });

  it("upgrades a v1 database without losing the songs already downloaded", async () => {
    // A user who downloaded on an older build must not be stranded: the v1→v3
    // upgrade adds `pieces` and `assets` and must leave `songs`/`metadata`
    // untouched, otherwise their offline hymnal silently empties on update.
    resetIndexedDb();
    const v1 = await openRaw(1, (db) => {
      db.createObjectStore(SONGS_STORE, { keyPath: "id" });
      db.createObjectStore(META_STORE);
    });
    await rawPut(v1, SONGS_STORE, makeSong("legacy-1", { titel: "Altes Lied" }));
    await rawPut(v1, META_STORE, { count: 1, lastUpdated: "2020-01-01", version: "1.0" }, META_KEY);
    v1.close();

    const { mod } = await loadOffline({ keepDb: true });
    const songs = await mod.getAllOfflineSongs();

    expect(songs.map((s) => s.id)).toEqual(["legacy-1"]);
    expect(songs[0].titel).toBe("Altes Lied");
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(true);

    const db = await openRaw();
    expect(db.version).toBe(CURRENT_DB_VERSION);
    expect([...db.objectStoreNames]).toContain(PIECES_STORE);
    expect([...db.objectStoreNames]).toContain(ASSETS_STORE);
    db.close();
  });

  it("leaves an existing v3 database alone on reopen", async () => {
    const first = await loadComposable();
    await first.dl.getOfflineContent();
    const db = await openRaw();
    await rawPut(db, SONGS_STORE, makeSong("keep-me"));
    db.close();

    // A second tab / a page reload reopens the same DB at the same version.
    const second = await loadOffline({ keepDb: true });
    await expect(second.mod.getOfflineSongCount()).resolves.toBe(1);
  });
});

// ===========================================================================
describe("hasOfflineContentAvailable", () => {
  it("is false before anything has been downloaded", async () => {
    const { mod } = await loadOffline();

    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);
  });

  it("is true once an offline-meta record exists", async () => {
    resetIndexedDb();
    const db = await openRaw(CURRENT_DB_VERSION, (d) => {
      d.createObjectStore(SONGS_STORE, { keyPath: "id" });
      d.createObjectStore(PIECES_STORE, { keyPath: "id" });
      d.createObjectStore(ASSETS_STORE, { keyPath: "id" });
      d.createObjectStore(META_STORE);
    });
    await rawPut(db, META_STORE, { count: 3, version: "1.0" }, META_KEY);
    db.close();

    const { mod } = await loadOffline({ keepDb: true });

    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(true);
  });

  it("memoises the answer instead of re-reading IndexedDB", async () => {
    // The router guard calls this on every navigation. Proving the memo is real
    // means changing the underlying row and still getting the cached answer.
    const { mod, dl } = await loadComposable();
    await dl.getOfflineContent();

    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);

    const db = await openRaw();
    await rawPut(db, META_STORE, { count: 9, version: "1.0" }, META_KEY);
    db.close();

    // Still the cached `false` even though the row now exists...
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);
    // ...and a fresh module (i.e. a new tab) reads the truth.
    const fresh = await loadOffline({ keepDb: true });
    await expect(fresh.mod.hasOfflineContentAvailable()).resolves.toBe(true);
  });

  it("is flipped to true by storeOfflineContent without another read", async () => {
    const { mod, dl } = await loadComposable();
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);

    await dl.downloadAllContent();

    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(true);
  });

  it("is invalidated to false by clearOfflineContent", async () => {
    // Without this invalidation a user who cleared their download would still be
    // let past the login guard in offline mode with an empty database.
    const { mod, dl } = await loadComposable();
    await dl.downloadAllContent();
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(true);

    await dl.clearOfflineContent();

    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);
  });

  it("returns false and logs when IndexedDB cannot be opened at all", async () => {
    const { mod } = await loadOffline();
    breakIndexedDb();

    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "Error checking offline content availability:",
      expect.any(Error),
    );
  });

  it("does not cache a false produced by a transient IndexedDB failure", async () => {
    // Regression guard, and the most consequential fix in this store. The
    // router guard reads this to decide whether the app is usable without a
    // session. Caching a transient failure permanently disabled offline mode
    // for the rest of the tab's life — stranding a user at /login with a fully
    // downloaded hymnal, which is the exact failure offline-first exists to
    // prevent.
    const { mod } = await loadOffline();
    breakIndexedDb();
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);

    resetIndexedDb();
    const db = await openRaw(CURRENT_DB_VERSION, (d) => {
      d.createObjectStore(SONGS_STORE, { keyPath: "id" });
      d.createObjectStore(PIECES_STORE, { keyPath: "id" });
      d.createObjectStore(ASSETS_STORE, { keyPath: "id" });
      d.createObjectStore(META_STORE);
    });
    await rawPut(db, META_STORE, { count: 3, version: "1.0" }, META_KEY);
    db.close();

    // The next call retries and sees the truth.
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(true);
  });

  it("still caches a legitimate false so the guard stays cheap", async () => {
    // The retry must not cost an IndexedDB transaction on every navigation:
    // only *failures* are left uncached, a successful "nothing downloaded"
    // answer is still memoised.
    const { mod } = await loadOffline();
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);

    const db = await openRaw(CURRENT_DB_VERSION, (d) => {
      d.createObjectStore(SONGS_STORE, { keyPath: "id" });
      d.createObjectStore(PIECES_STORE, { keyPath: "id" });
      d.createObjectStore(ASSETS_STORE, { keyPath: "id" });
      d.createObjectStore(META_STORE);
    });
    await rawPut(db, META_STORE, { count: 3, version: "1.0" }, META_KEY);
    db.close();

    // Cached, so the newly written meta row is deliberately not observed.
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);
  });
});

// ===========================================================================
describe("module-level song readers", () => {
  it("counts the songs stored offline", async () => {
    const { mod, dl } = await loadComposable();
    await dl.getOfflineContent(); // forces the lazy schema creation
    const db = await openRaw();
    await rawPut(db, SONGS_STORE, makeSong("a"));
    await rawPut(db, SONGS_STORE, makeSong("b"));
    db.close();

    await expect(mod.getOfflineSongCount()).resolves.toBe(2);
  });

  it("returns 0 rather than throwing when the database is unreachable", async () => {
    const { mod } = await loadOffline();
    breakIndexedDb();

    await expect(mod.getOfflineSongCount()).resolves.toBe(0);
    expect(console.error).toHaveBeenCalledWith("Error counting offline songs:", expect.any(Error));
  });

  it("returns [] rather than throwing when reading all songs fails", async () => {
    const { mod } = await loadOffline();
    breakIndexedDb();

    await expect(mod.getAllOfflineSongs()).resolves.toEqual([]);
  });
});

// ===========================================================================
describe("asset storage", () => {
  it("caches an asset by id under the pinned Directus URL and reads the bytes back", async () => {
    const { mod } = await loadOffline();
    assetReplies.set("sf-1", { bytes: [0x52, 0x49, 0x46, 0x46], type: "audio/sf2" });

    await mod.cacheAssetById("sf-1", "audio/sf2");

    expect(fetchedUrls).toEqual([`${DIRECTUS_URL}/assets/sf-1`]);
    const blob = await mod.getOfflineAssetBlob("sf-1");
    expect(await bytesOf(blob)).toEqual([0x52, 0x49, 0x46, 0x46]);
    expect(blob?.type).toBe("audio/sf2");
  });

  it("throws and stores nothing when the asset request fails", async () => {
    const { mod } = await loadOffline();
    assetReplies.set("missing", { status: 404 });

    await expect(mod.cacheAssetById("missing")).rejects.toThrow("HTTP 404");
    await expect(mod.getOfflineAssetBlob("missing")).resolves.toBeNull();
  });

  it("reports a missing asset as null / false instead of throwing", async () => {
    const { mod } = await loadOffline();

    await expect(mod.getOfflineAssetBlob("nope")).resolves.toBeNull();
    await expect(mod.hasOfflineAsset("nope")).resolves.toBe(false);
  });

  it("reports a cached asset as present", async () => {
    const { mod } = await loadOffline();
    await mod.cacheAssetById("present");

    await expect(mod.hasOfflineAsset("present")).resolves.toBe(true);
  });

  it("returns null and logs when the asset read blows up", async () => {
    const { mod } = await loadOffline();
    breakIndexedDb();

    await expect(mod.getOfflineAssetBlob("anything")).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith("Error reading offline asset:", expect.any(Error));
  });
});

// ===========================================================================
describe("fetchAssetByUrl", () => {
  it("serves a cached Directus asset without touching the network", async () => {
    // This is the whole point of the assets store: a MIDI/MusicXML loader in a
    // church basement must resolve from IDB, never from fetch.
    const { mod } = await loadOffline();
    assetReplies.set("midi-1", { bytes: [4, 5, 6] });
    await mod.cacheAssetById("midi-1");
    fetchedUrls.length = 0;
    h.fetch.mockClear();

    const buffer = await mod.fetchAssetByUrl(`${DIRECTUS_URL}/assets/midi-1?download`);

    expect(Array.from(new Uint8Array(buffer))).toEqual([4, 5, 6]);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("falls back to the network for a Directus asset that was never cached", async () => {
    const { mod } = await loadOffline();
    assetReplies.set("uncached", { bytes: [9, 9] });

    const buffer = await mod.fetchAssetByUrl(assetUrl("uncached"));

    expect(Array.from(new Uint8Array(buffer))).toEqual([9, 9]);
    expect(fetchedUrls).toEqual([assetUrl("uncached")]);
  });

  it("goes straight to the network for a non-Directus URL", async () => {
    const { mod } = await loadOffline();
    assetReplies.set("https://example.com/tune.mid", { bytes: [7] });

    const buffer = await mod.fetchAssetByUrl("https://example.com/tune.mid");

    expect(Array.from(new Uint8Array(buffer))).toEqual([7]);
    expect(fetchedUrls).toEqual(["https://example.com/tune.mid"]);
  });

  it("surfaces the HTTP status when the network fallback fails", async () => {
    const { mod } = await loadOffline();
    assetReplies.set("gone", { status: 503 });

    await expect(mod.fetchAssetByUrl(assetUrl("gone"))).rejects.toThrow("HTTP 503");
  });
});

// ===========================================================================
describe("when VITE_PUBLIC_DIRECTUS_URL is not configured", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_PUBLIC_DIRECTUS_URL", "");
  });

  it("refuses to build an asset URL out of an empty base", async () => {
    const { mod } = await loadOffline();

    await expect(mod.cacheAssetById("sf-1")).rejects.toThrow(
      "VITE_PUBLIC_DIRECTUS_URL is not configured",
    );
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("treats every URL as external, so no asset resolves from the cache", async () => {
    const { mod } = await loadOffline();

    expect(mod.extractDirectusAssetId(`${DIRECTUS_URL}/assets/abc`)).toBeNull();
  });

  it("skips asset precaching entirely rather than fetching from a bare path", async () => {
    const { dl } = await loadComposable();

    await dl.precacheAssets(asSongs([makeSong("s1", { noten: [{ id: "f-1" }] })]), []);

    expect(h.fetch).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "Directus URL not configured, skipping asset precaching",
    );
    expect(dl.isPrecachingAssets.value).toBe(false);
  });

  it("fails the pieces query, which the download then tolerates", async () => {
    const { dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    await expect(dl.downloadAllContent()).resolves.toBe(1);

    expect(h.axiosPost).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to fetch pieces for offline use:",
      expect.objectContaining({ message: "VITE_PUBLIC_DIRECTUS_URL is not configured" }),
    );
  });
});

// ===========================================================================
describe("cached soundfont id", () => {
  it("round-trips through localStorage", async () => {
    const { mod } = await loadOffline();

    expect(mod.getCachedSoundfontId()).toBeNull();
    mod.setCachedSoundfontId("sf-42");

    expect(localStorage.getItem(SOUNDFONT_ID_KEY)).toBe("sf-42");
    expect(mod.getCachedSoundfontId()).toBe("sf-42");
  });

  it("removes the entry when set to null", async () => {
    const { mod } = await loadOffline();
    mod.setCachedSoundfontId("sf-42");

    mod.setCachedSoundfontId(null);

    expect(localStorage.getItem(SOUNDFONT_ID_KEY)).toBeNull();
    expect(mod.getCachedSoundfontId()).toBeNull();
  });

  it("swallows a localStorage write failure rather than breaking the download", async () => {
    // Safari private mode throws on every setItem; the soundfont id is a
    // nice-to-have and must never take the whole precache run down with it.
    const { mod } = await loadOffline();
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => mod.setCachedSoundfontId("sf-42")).not.toThrow();
    expect(localStorage.getItem(SOUNDFONT_ID_KEY)).toBeNull();
  });

  it("reports no cached soundfont when localStorage cannot be read", async () => {
    const { mod } = await loadOffline();
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(mod.getCachedSoundfontId()).toBeNull();
  });
});

// ===========================================================================
describe("storeOfflineContent / checkOfflineContent", () => {
  it("writes songs, pieces and the metadata record, and reflects them in state", async () => {
    const { mod, dl } = await loadComposable();
    piecesReply = [makePiece("p1"), makePiece("p2")];
    h.queryGesangbuchlied.mockResolvedValueOnce([makeSong("s1")]).mockResolvedValueOnce([
      makeSong("s1"),
      makeSong("s2"),
    ]);

    await dl.downloadAllContent();

    const db = await openRaw();
    expect((await rawGetAll(db, SONGS_STORE)).length).toBe(2);
    expect((await rawGetAll(db, PIECES_STORE)).length).toBe(2);
    expect(await rawGet(db, META_STORE, META_KEY)).toMatchObject({
      count: 2,
      pieceCount: 2,
      version: "1.0",
    });
    db.close();

    expect(dl.hasOfflineContent.value).toBe(true);
    expect(dl.offlineContentInfo.value).toMatchObject({ count: 2, pieceCount: 2 });
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(true);
  });

  it("stamps the metadata with the download time", async () => {
    // Only Date is faked: fake-indexeddb drives its queue with setImmediate, so
    // faking timers wholesale would deadlock every transaction in this file.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
    const { dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    await dl.downloadAllContent();

    expect(dl.offlineContentInfo.value?.lastUpdated).toBe("2026-03-15T12:00:00.000Z");
  });

  it("hydrates hasOfflineContent from a metadata record written by a previous session", async () => {
    resetIndexedDb();
    const db = await openRaw(CURRENT_DB_VERSION, (d) => {
      d.createObjectStore(SONGS_STORE, { keyPath: "id" });
      d.createObjectStore(PIECES_STORE, { keyPath: "id" });
      d.createObjectStore(ASSETS_STORE, { keyPath: "id" });
      d.createObjectStore(META_STORE);
    });
    await rawPut(
      db,
      META_STORE,
      { count: 7, pieceCount: 2, lastUpdated: "2026-01-01T00:00:00.000Z", version: "1.0" },
      META_KEY,
    );
    db.close();

    const { dl } = await loadComposable({ keepDb: true });
    await dl.checkOfflineContent();

    expect(dl.hasOfflineContent.value).toBe(true);
    expect(dl.offlineContentInfo.value).toEqual({
      count: 7,
      pieceCount: 2,
      lastUpdated: "2026-01-01T00:00:00.000Z",
    });
  });

  it("falls back to zeroes and 'Unknown' for a metadata record missing fields", async () => {
    resetIndexedDb();
    const db = await openRaw(CURRENT_DB_VERSION, (d) => {
      d.createObjectStore(SONGS_STORE, { keyPath: "id" });
      d.createObjectStore(PIECES_STORE, { keyPath: "id" });
      d.createObjectStore(ASSETS_STORE, { keyPath: "id" });
      d.createObjectStore(META_STORE);
    });
    await rawPut(db, META_STORE, { version: "1.0" }, META_KEY);
    db.close();

    const { dl } = await loadComposable({ keepDb: true });
    await dl.checkOfflineContent();

    expect(dl.offlineContentInfo.value).toEqual({
      count: 0,
      pieceCount: 0,
      lastUpdated: "Unknown",
    });
  });

  it("reports no offline content when the metadata record is absent", async () => {
    const { dl } = await loadComposable();

    await dl.checkOfflineContent();

    expect(dl.hasOfflineContent.value).toBe(false);
    expect(dl.offlineContentInfo.value).toBeNull();
  });

  it("keeps hasOfflineContent false and logs when the check itself fails", async () => {
    const { dl } = await loadComposable();
    breakIndexedDb();

    await dl.checkOfflineContent();

    expect(dl.hasOfflineContent.value).toBe(false);
    expect(console.error).toHaveBeenCalledWith("Error checking offline content:", expect.any(Error));
  });

  // The songs/pieces stores never being pruned — so a withdrawn hymn survives
  // every later download and `getOfflineSongCount()` drifts above `meta.count` —
  // is a filed defect (issue #14) rather than intended behaviour. It is asserted
  // in test/known-issues/ where it fails visibly. Deliberately not pinned here:
  // a green test asserting the bug would read as coverage while blessing it.

  it("overwrites a song that changed since the last download", async () => {
    const { mod, dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1", { titel: "Alter Titel" })]);
    await dl.downloadAllContent();

    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1", { titel: "Neuer Titel" })]);
    await dl.downloadAllContent();

    expect((await dl.getOfflineSongById("s1"))?.titel).toBe("Neuer Titel");
    await expect(mod.getOfflineSongCount()).resolves.toBe(1);
    expect(dl.offlineContentInfo.value?.count).toBe(1);
  });

  it("raises a storage-space error when the write fails", async () => {
    const { dl } = await loadComposable();
    breakIndexedDb();

    await expect(
      dl.downloadAllContent(),
    ).rejects.toThrow("Failed to store offline content. Your device may be out of storage space.");
  });
});

// ===========================================================================
describe("getOfflineContent", () => {
  it("returns songs, pieces and metadata together", async () => {
    const { dl } = await loadComposable();
    piecesReply = [makePiece("p1")];
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1"), makeSong("s2")]);
    await dl.downloadAllContent();

    const content = await dl.getOfflineContent();

    expect(content?.songs.map((s) => s.id).sort()).toEqual(["s1", "s2"]);
    expect(content?.pieces.map((p) => p.id)).toEqual(["p1"]);
    expect(content?.version).toBe("1.0");
  });

  it("returns null when no metadata record exists, even with songs present", async () => {
    // The metadata record is the download marker; orphaned song rows alone must
    // not be treated as a completed download.
    const { dl } = await loadComposable();
    await dl.getOfflineContent();
    const db = await openRaw();
    await rawPut(db, SONGS_STORE, makeSong("orphan"));
    db.close();

    await expect(dl.getOfflineContent()).resolves.toBeNull();
  });

  it("labels the timestamp 'Unknown' when the metadata record has none", async () => {
    resetIndexedDb();
    const db = await openRaw(CURRENT_DB_VERSION, (d) => {
      d.createObjectStore(SONGS_STORE, { keyPath: "id" });
      d.createObjectStore(PIECES_STORE, { keyPath: "id" });
      d.createObjectStore(ASSETS_STORE, { keyPath: "id" });
      d.createObjectStore(META_STORE);
    });
    await rawPut(db, SONGS_STORE, makeSong("s1"));
    await rawPut(db, META_STORE, { count: 1, version: "0.9" }, META_KEY);
    db.close();

    const { dl } = await loadComposable({ keepDb: true });

    await expect(dl.getOfflineContent()).resolves.toMatchObject({
      lastUpdated: "Unknown",
      version: "0.9",
      pieces: [],
    });
  });

  it("returns null and logs when the read fails", async () => {
    const { dl } = await loadComposable();
    breakIndexedDb();

    await expect(dl.getOfflineContent()).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith("Error getting offline content:", expect.any(Error));
  });
});

// ===========================================================================
describe("hydration on mount", () => {
  it("opens the database and restores the download state when a component mounts", async () => {
    // The Settings page relies on this: without the onMounted hook it would
    // render "not downloaded" for a user whose hymnal is already on the device.
    resetIndexedDb();
    const seed = await openRaw(CURRENT_DB_VERSION, (d) => {
      d.createObjectStore(SONGS_STORE, { keyPath: "id" });
      d.createObjectStore(PIECES_STORE, { keyPath: "id" });
      d.createObjectStore(ASSETS_STORE, { keyPath: "id" });
      d.createObjectStore(META_STORE);
    });
    await rawPut(
      seed,
      META_STORE,
      { count: 42, pieceCount: 3, lastUpdated: "2026-02-02T09:00:00.000Z", version: "1.0" },
      META_KEY,
    );
    seed.close();

    const { mod } = await loadOffline({ keepDb: true });
    // vue must come from the post-reset module graph, otherwise `onMounted`
    // would register against a different copy's component instance.
    const vue = await import("vue");
    let dl!: ReturnType<typeof mod.useOfflineDownload>;
    const app = vue.createApp({
      setup() {
        dl = mod.useOfflineDownload();
        return () => vue.h("div");
      },
    });
    app.mount(document.createElement("div"));

    expect(dl.hasOfflineContent.value).toBe(false); // not hydrated synchronously
    await vi.waitFor(() => expect(dl.hasOfflineContent.value).toBe(true));

    expect(dl.offlineContentInfo.value).toEqual({
      count: 42,
      pieceCount: 3,
      lastUpdated: "2026-02-02T09:00:00.000Z",
    });
    app.unmount();
  });
});

// ===========================================================================
describe("reading songs and pieces back", () => {
  async function seeded() {
    const loaded = await loadComposable();
    piecesReply = [makePiece("p1"), makePiece("p2")];
    h.queryGesangbuchlied.mockResolvedValue([
      makeSong("1", { titel: "Lobe den Herren", strophen: ["Lobet den Herren"] }),
      makeSong("2", { titel: "Stille Nacht", strophen: ["Alles schläft, einsam wacht"] }),
      makeSong("3", { titel: "Großer Gott", strophen: ["Wir loben dich"] }),
    ]);
    await loaded.dl.downloadAllContent();
    return loaded;
  }

  it("returns every stored song when no query is given", async () => {
    const { dl } = await seeded();

    const songs = await dl.getOfflineSongs();

    expect(songs.map((s) => s.id).sort()).toEqual(["1", "2", "3"]);
  });

  it("filters case-insensitively on the title", async () => {
    const { dl } = await seeded();

    const songs = await dl.getOfflineSongs("stille");

    expect(songs.map((s) => s.titel)).toEqual(["Stille Nacht"]);
  });

  it("also matches on the text of an individual strophe", async () => {
    // Searching lyrics is the main way people find a hymn mid-service.
    const { dl } = await seeded();

    const songs = await dl.getOfflineSongs("einsam wacht");

    expect(songs.map((s) => s.id)).toEqual(["2"]);
  });

  it("returns nothing for a query that matches neither title nor lyrics", async () => {
    const { dl } = await seeded();

    await expect(dl.getOfflineSongs("halleluja")).resolves.toEqual([]);
  });

  it("applies the limit after filtering", async () => {
    const { dl } = await seeded();

    const songs = await dl.getOfflineSongs(undefined, 2);

    expect(songs).toHaveLength(2);
  });

  it("returns [] and logs when the song read fails", async () => {
    const { dl } = await loadComposable();
    breakIndexedDb();

    await expect(dl.getOfflineSongs()).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Error getting offline songs:", expect.any(Error));
  });

  it("looks a single song up by id", async () => {
    const { dl } = await seeded();

    const song = await dl.getOfflineSongById("2");

    expect(song?.titel).toBe("Stille Nacht");
  });

  it("returns null for an unknown song id", async () => {
    const { dl } = await seeded();

    await expect(dl.getOfflineSongById("999")).resolves.toBeNull();
  });

  it("returns null and logs when the single-song read fails", async () => {
    const { dl } = await loadComposable();
    breakIndexedDb();

    await expect(dl.getOfflineSongById("1")).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "Error getting offline song by ID:",
      expect.any(Error),
    );
  });

  it("skips strophe entries that are not objects when searching lyrics", async () => {
    // `strophenEinzeln` is a free-form JSON column in Directus, so a row can
    // legitimately contain nulls or bare strings. A crash here would take out
    // the whole offline search.
    const { dl } = await loadComposable();
    await dl.getOfflineContent();
    const db = await openRaw();
    await rawPut(db, SONGS_STORE, {
      id: "odd",
      titel: "Seltsam",
      textId: { id: "t", strophenEinzeln: [null, "nur ein String", { nummer: 1 }] },
    });
    db.close();

    await expect(dl.getOfflineSongs("nur ein String")).resolves.toEqual([]);
    await expect(dl.getOfflineSongs("seltsam")).resolves.toHaveLength(1);
  });

  it("only finds songs whose stored id is a string", async () => {
    // getOfflineSongById stringifies the key, so a numerically-keyed row — which
    // is what a non-string Directus `id` would produce — is unreachable.
    const { dl } = await loadComposable();
    await dl.getOfflineContent();
    const db = await openRaw();
    await rawPut(db, SONGS_STORE, { ...makeSong("x"), id: 7 });
    db.close();

    await expect(dl.getOfflineSongById(7)).resolves.toBeNull();
    await expect(dl.getOfflineSongs()).resolves.toHaveLength(1);
  });

  it("returns all pieces and a single piece by id", async () => {
    const { dl } = await seeded();

    await expect(dl.getOfflinePieces()).resolves.toHaveLength(2);
    expect((await dl.getOfflinePieceById("p2"))?.id).toBe("p2");
    await expect(dl.getOfflinePieceById("p9")).resolves.toBeNull();
  });

  it("returns [] for pieces when the read fails", async () => {
    const { dl } = await loadComposable();
    breakIndexedDb();

    await expect(dl.getOfflinePieces()).resolves.toEqual([]);
    await expect(dl.getOfflinePieceById("p1")).resolves.toBeNull();
  });
});

// ===========================================================================
describe("precacheAssets", () => {
  it("collects file ids from every field, de-duplicates them and stores the blobs", async () => {
    const { mod, dl } = await loadComposable();
    const songs = [
      makeSong("s1", {
        noten: [{ id: "f-noten", type: "image/png" }],
        satz: [{ id: "f-satz", type: "application/pdf" }],
        midiIntro: { id: "f-midi", type: "audio/midi" },
        midiMain: { id: "f-midi", type: "audio/midi" }, // same file twice
      }),
      makeSong("s2", { noten: [{ id: "f-noten", type: "image/png" }] }), // shared file
    ];

    await dl.precacheAssets(asSongs(songs), asPieces([makePiece("p1", { id: "f-piece" })]));

    expect(fetchedUrls.sort()).toEqual(
      ["f-midi", "f-noten", "f-piece", "f-satz"].map(assetUrl).sort(),
    );
    expect(await bytesOf(await mod.getOfflineAssetBlob("f-noten"))).toEqual(bytesFor("f-noten"));
    expect(await bytesOf(await mod.getOfflineAssetBlob("f-piece"))).toEqual(bytesFor("f-piece"));
    expect((await mod.getOfflineAssetBlob("f-satz"))?.type).toBe("");
  });

  it("preserves the Directus mime type alongside the blob", async () => {
    const { dl } = await loadComposable();
    assetReplies.set("f-midi", { bytes: [1], type: "audio/midi" });

    await dl.precacheAssets(
      asSongs([makeSong("s1", { midiMain: { id: "f-midi", type: "audio/midi" } })]),
      [],
    );

    const db = await openRaw();
    expect(await rawGet(db, ASSETS_STORE, "f-midi")).toMatchObject({
      id: "f-midi",
      type: "audio/midi",
    });
    db.close();
  });

  it("drives progress to 100% and clears the precaching flag", async () => {
    const { dl } = await loadComposable();
    const songs = [makeSong("s1", { noten: [{ id: "a" }, { id: "b" }, { id: "c" }] })];

    const running = dl.precacheAssets(asSongs(songs), []);
    expect(dl.isPrecachingAssets.value).toBe(true);
    await running;

    expect(dl.assetPrecacheProgress.value).toEqual({
      current: 3,
      total: 3,
      percentage: 100,
      currentAsset: "Completed precaching 3 assets",
    });
    expect(dl.isPrecachingAssets.value).toBe(false);
  });

  it("keeps going when individual assets fail partway through a batch", async () => {
    // One 404 or a dropped connection must not cost the user the other 400
    // assets — Promise.allSettled + the per-asset try/catch are the guarantee.
    const { mod, dl } = await loadComposable();
    assetReplies.set("bad-http", { status: 404 });
    assetReplies.set("bad-net", { throws: new TypeError("Failed to fetch") });
    const songs = [
      makeSong("s1", {
        noten: [{ id: "good-1" }, { id: "bad-http" }, { id: "bad-net" }, { id: "good-2" }],
      }),
    ];

    await dl.precacheAssets(asSongs(songs), []);

    expect(await bytesOf(await mod.getOfflineAssetBlob("good-1"))).toEqual(bytesFor("good-1"));
    expect(await bytesOf(await mod.getOfflineAssetBlob("good-2"))).toEqual(bytesFor("good-2"));
    await expect(mod.getOfflineAssetBlob("bad-http")).resolves.toBeNull();
    await expect(mod.getOfflineAssetBlob("bad-net")).resolves.toBeNull();
    // Progress still completes, otherwise the UI would hang at 50% forever.
    expect(dl.assetPrecacheProgress.value.current).toBe(4);
    expect(dl.assetPrecacheProgress.value.percentage).toBe(100);
    expect(console.warn).toHaveBeenCalledWith("Failed to precache asset bad-http: HTTP 404");
    expect(console.warn).toHaveBeenCalledWith("Error precaching asset bad-net:", expect.any(TypeError));
  });

  it("fetches in batches of five, starting the next batch only once the last has settled", async () => {
    const { dl } = await loadComposable();
    const ids = ["a1", "a2", "a3", "a4", "a5", "a6", "a7"];
    const events: string[] = [];
    let inFlight = 0;
    let peak = 0;
    h.fetch.mockImplementation((input: string) => {
      const id = String(input).slice(`${DIRECTUS_URL}/assets/`.length);
      events.push(`start:${id}`);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      return new Promise((resolve) =>
        setTimeout(() => {
          inFlight -= 1;
          events.push(`end:${id}`);
          resolve(okResponse(makeBlob(bytesFor(id))));
        }, 0),
      );
    });

    await dl.precacheAssets(asSongs([makeSong("s1", { noten: ids.map((id) => ({ id })) })]), []);

    expect(peak).toBe(5);
    const sixthStart = events.indexOf("start:a6");
    for (const id of ids.slice(0, 5)) {
      expect(events.indexOf(`end:${id}`)).toBeLessThan(sixthStart);
    }
  });

  it("prunes assets that are no longer referenced", async () => {
    // Repeated downloads would otherwise grow the store without bound.
    const { mod, dl } = await loadComposable();
    await mod.cacheAssetById("stale-1");
    await mod.cacheAssetById("keep-1");
    await expect(mod.hasOfflineAsset("stale-1")).resolves.toBe(true);

    await dl.precacheAssets(asSongs([makeSong("s1", { noten: [{ id: "keep-1" }] })]), []);

    await expect(mod.hasOfflineAsset("stale-1")).resolves.toBe(false);
    await expect(mod.hasOfflineAsset("keep-1")).resolves.toBe(true);
  });

  it("does nothing and leaves progress at zero when there is nothing to cache", async () => {
    const { dl } = await loadComposable();

    await dl.precacheAssets([], []);

    expect(fetchedUrls).toEqual([]);
    expect(dl.assetPrecacheProgress.value).toEqual({ current: 0, total: 0, percentage: 0 });
    expect(dl.isPrecachingAssets.value).toBe(false);
  });

  it("caches the soundfont and persists its id so the synth can find it offline", async () => {
    // Offline, `settings.soundfont` is unreachable, so the id in localStorage is
    // the only way back to the precached bank.
    const { mod, dl } = await loadComposable();
    soundfontReply = "sf-99";

    await dl.precacheAssets(asSongs([makeSong("s1", { noten: [{ id: "f-1" }] })]), []);

    expect(fetchedUrls).toContain(assetUrl("sf-99"));
    expect(mod.getCachedSoundfontId()).toBe("sf-99");
    await expect(mod.hasOfflineAsset("sf-99")).resolves.toBe(true);
  });

  it("continues without a soundfont when the settings query fails", async () => {
    const { mod, dl } = await loadComposable();
    soundfontReply = new Error("offline");

    await dl.precacheAssets(asSongs([makeSong("s1", { noten: [{ id: "f-1" }] })]), []);

    expect(mod.getCachedSoundfontId()).toBeNull();
    await expect(mod.hasOfflineAsset("f-1")).resolves.toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to fetch soundfont id for offline precache:",
      expect.any(Error),
    );
  });

  it("stores nothing and releases the flag when IndexedDB is unavailable", async () => {
    const { mod, dl } = await loadComposable();
    const songs = [makeSong("s1", { noten: [{ id: "f-1" }] })];
    breakIndexedDb();

    await dl.precacheAssets(asSongs(songs), []);

    // The run must not hang the UI on a dead database...
    expect(dl.isPrecachingAssets.value).toBe(false);
    // ...and must not have written anything.
    restoreIndexedDb();
    await expect(mod.getOfflineAssetBlob("f-1")).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalled();

    // What such a run *reports* is a filed defect (issue #15): it currently ends
    // at 100% with "Completed precaching 1 assets" having stored nothing, so the
    // completion message is asserted in test/known-issues/ where it fails
    // visibly. Deliberately not pinned here: a green test asserting the bug
    // would read as coverage while blessing it.
  });

  it("marks the progress as failed and clears the flag when the run itself throws", async () => {
    const { dl } = await loadComposable();

    // A malformed song list is the only way into the outer handler; everything
    // inside the per-asset loop has its own catch.
    await dl.precacheAssets(undefined as never, []);

    expect(dl.isPrecachingAssets.value).toBe(false);
    expect(dl.assetPrecacheProgress.value.currentAsset).toBe("Asset precaching failed");
    expect(console.error).toHaveBeenCalledWith("Error precaching assets:", expect.any(TypeError));
  });
});

// ===========================================================================
describe("downloadAllContent", () => {
  it("paginates until a short batch and reports progress along the way", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeSong(`s${i}`));
    const page2 = [makeSong("s100"), makeSong("s101"), makeSong("s102")];
    const { mod, dl } = await loadComposable();
    piecesReply = [makePiece("p1")];

    const snapshots: Record<string, unknown>[] = [];
    h.queryGesangbuchlied.mockImplementation(
      async (vars: { limit?: number; offset?: number }) => {
        snapshots.push({
          limit: vars.limit,
          offset: vars.offset,
          ...JSON.parse(JSON.stringify(dl.downloadProgress.value)),
        });
        if (vars.limit === 1) return [page1[0]];
        if (vars.offset === 0) return page1;
        if (vars.offset === 100) return page2;
        return [];
      },
    );

    const total = await dl.downloadAllContent();

    expect(total).toBe(103);
    // The count probe, then two content batches.
    expect(snapshots.map((s) => [s.limit, s.offset])).toEqual([
      [1, 0],
      [100, 0],
      [100, 100],
    ]);
    expect(snapshots[0]).toMatchObject({ currentItem: "Fetching song list...", percentage: 0 });
    expect(snapshots[1]).toMatchObject({
      currentItem: "Downloading songs 1 to 100...",
      current: 0,
      total: 0,
    });
    expect(snapshots[2]).toMatchObject({
      currentItem: "Downloading songs 101 to 200...",
      current: 100,
      total: 200,
      percentage: 50,
    });
    expect(dl.downloadProgress.value).toMatchObject({
      current: 103,
      total: 103,
      percentage: 100,
      isComplete: true,
      currentItem: "Download complete! 103 songs, 1 pieces and assets cached.",
    });
    await expect(mod.getOfflineSongCount()).resolves.toBe(103);
    expect(dl.isDownloading.value).toBe(false);
  }, 20000);

  it("stops after an empty first batch", async () => {
    const { mod, dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([]);

    const total = await dl.downloadAllContent();

    expect(total).toBe(0);
    expect(h.queryGesangbuchlied).toHaveBeenCalledTimes(2); // probe + one empty batch
    // An empty download still writes the marker, which is what flips the app
    // into offline mode — worth knowing.
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(true);
  });

  it("ignores a second concurrent call instead of downloading twice", async () => {
    const { dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    const first = dl.downloadAllContent();
    const second = dl.downloadAllContent();

    await expect(second).resolves.toBeUndefined();
    await expect(first).resolves.toBe(1);
    expect(h.queryGesangbuchlied).toHaveBeenCalledTimes(2);
  });

  it("sends the access token as a bearer header on the pieces query", async () => {
    const { dl, store } = await loadComposable();
    store.setTokens("access-abc", "refresh-xyz");
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    await dl.downloadAllContent();

    expect(h.axiosPost).toHaveBeenCalledWith(
      `${DIRECTUS_URL}/graphql`,
      expect.objectContaining({ query: expect.stringContaining("freie_musikstuecke") }),
      { headers: { "Content-Type": "application/json", Authorization: "Bearer access-abc" } },
    );
  });

  it("omits the bearer header when there is no access token", async () => {
    const { dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    await dl.downloadAllContent();

    expect(h.axiosPost).toHaveBeenCalledWith(
      `${DIRECTUS_URL}/graphql`,
      expect.objectContaining({ query: expect.stringContaining("freie_musikstuecke") }),
      { headers: { "Content-Type": "application/json" } },
    );
  });

  it("still stores the songs when the pieces request fails", async () => {
    // Vor-/Nachspiele are a nice-to-have; losing them must not cost the user the
    // hymnal itself.
    const { mod, dl } = await loadComposable();
    piecesReply = new Error("pieces endpoint down");
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1"), makeSong("s2")]);

    const total = await dl.downloadAllContent();

    expect(total).toBe(2);
    await expect(mod.getOfflineSongCount()).resolves.toBe(2);
    expect(dl.offlineContentInfo.value?.pieceCount).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to fetch pieces for offline use:",
      expect.any(Error),
    );
  });

  it("stores zero pieces when the pieces payload comes back empty", async () => {
    const { dl } = await loadComposable();
    piecesReply = {}; // `{ data: {} }` — no `data.freie_musikstuecke` at all
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    await expect(dl.downloadAllContent()).resolves.toBe(1);

    expect(dl.offlineContentInfo.value?.pieceCount).toBe(0);
    await expect(dl.getOfflinePieces()).resolves.toEqual([]);
    expect(console.warn).not.toHaveBeenCalledWith(
      "Failed to fetch pieces for offline use:",
      expect.anything(),
    );
  });

  it("treats GraphQL errors on the pieces query as a piece failure, not a hard failure", async () => {
    const { dl } = await loadComposable();
    piecesReply = { errors: [{ message: "FORBIDDEN" }, { message: "no read access" }] };
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    await expect(dl.downloadAllContent()).resolves.toBe(1);

    expect(console.warn).toHaveBeenCalledWith(
      "Failed to fetch pieces for offline use:",
      expect.objectContaining({ message: "FORBIDDEN, no read access" }),
    );
  });

  it("rethrows, marks the progress failed and releases the lock when songs fail", async () => {
    const { mod, dl } = await loadComposable();
    h.queryGesangbuchlied.mockRejectedValue(new Error("gateway timeout"));

    await expect(dl.downloadAllContent()).rejects.toThrow("gateway timeout");

    expect(dl.downloadProgress.value.currentItem).toBe("Download failed");
    expect(dl.downloadProgress.value.isComplete).toBe(false);
    // Nothing half-written, and the guard is released so a retry is possible.
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);
    expect(dl.isDownloading.value).toBe(false);
  });

  it("requests persistent storage so iOS does not evict the download", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    setStorageManager({ persist });
    const { dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    await dl.downloadAllContent();

    expect(persist).toHaveBeenCalledOnce();
  });

  it("downloads anyway when the persistent-storage request is refused", async () => {
    setStorageManager({ persist: vi.fn().mockRejectedValue(new Error("denied")) });
    const { mod, dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);

    await expect(dl.downloadAllContent()).resolves.toBe(1);

    await expect(mod.getOfflineSongCount()).resolves.toBe(1);
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to request persistent storage:",
      expect.any(Error),
    );
  });

  it("precaches the assets referenced by the downloaded songs and pieces", async () => {
    const { mod, dl } = await loadComposable();
    piecesReply = [makePiece("p1", { id: "f-piece", type: "audio/midi" })];
    h.queryGesangbuchlied.mockResolvedValue([
      makeSong("s1", { noten: [{ id: "f-noten", type: "image/png" }] }),
    ]);

    await dl.downloadAllContent();

    await expect(mod.hasOfflineAsset("f-noten")).resolves.toBe(true);
    await expect(mod.hasOfflineAsset("f-piece")).resolves.toBe(true);
    expect(dl.assetPrecacheProgress.value.percentage).toBe(100);
  });
});

// ===========================================================================
describe("clearOfflineContent", () => {
  it("empties every store, forgets the soundfont and resets the state", async () => {
    const { mod, dl } = await loadComposable();
    soundfontReply = "sf-1";
    piecesReply = [makePiece("p1", { id: "f-piece" })];
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1", { noten: [{ id: "f-noten" }] })]);
    await dl.downloadAllContent();
    expect(mod.getCachedSoundfontId()).toBe("sf-1");

    await dl.clearOfflineContent();

    const db = await openRaw();
    expect(await rawGetAll(db, SONGS_STORE)).toEqual([]);
    expect(await rawGetAll(db, PIECES_STORE)).toEqual([]);
    expect(await rawGetAll(db, ASSETS_STORE)).toEqual([]);
    expect(await rawGet(db, META_STORE, META_KEY)).toBeUndefined();
    db.close();

    expect(mod.getCachedSoundfontId()).toBeNull();
    expect(dl.hasOfflineContent.value).toBe(false);
    expect(dl.offlineContentInfo.value).toBeNull();
    await expect(mod.hasOfflineContentAvailable()).resolves.toBe(false);
  });

  it("swallows the error and leaves the download intact when clearing fails", async () => {
    // A half-cleared database would be worse than a failed clear: the user would
    // lose songs while the app still believed the download was complete.
    const { dl } = await loadComposable();
    soundfontReply = "sf-1";
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);
    await dl.downloadAllContent();

    // A fresh module copy has not opened its connection yet, so breaking the
    // factory now makes the very first clear() fail.
    const next = await loadOffline({ keepDb: true });
    const nextDl = next.mod.useOfflineDownload();
    breakIndexedDb();

    await expect(nextDl.clearOfflineContent()).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "Error clearing offline content:",
      expect.any(Error),
    );
    restoreIndexedDb();
    await expect(next.mod.getOfflineSongCount()).resolves.toBe(1);
    expect(next.mod.getCachedSoundfontId()).toBe("sf-1");
  });

  it("is safe to call before anything was ever downloaded", async () => {
    const { dl } = await loadComposable();

    await expect(dl.clearOfflineContent()).resolves.toBeUndefined();

    expect(dl.hasOfflineContent.value).toBe(false);
  });
});

// ===========================================================================
describe("getStorageInfo", () => {
  it("counts the songs, pieces and assets it stored and renders the size in MB", async () => {
    setStorageManager({ estimate: vi.fn().mockResolvedValue({ usage: 5 * 1024 * 1024 }) });
    const { dl } = await loadComposable();
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1", { noten: [{ id: "f-1" }] })]);
    await dl.downloadAllContent();

    const info = await dl.getStorageInfo();

    expect(info).toMatchObject({ itemCount: 1, pieceCount: 0, assetCount: 1 });
    // Whatever the byte figure ends up describing, the MB string is its
    // rendering — the Settings page prints the two side by side.
    expect(info?.sizeInMB).toBe((info!.sizeInBytes / (1024 * 1024)).toFixed(2));

    // That the byte figure is `navigator.storage.estimate().usage` — the whole
    // origin rather than the stored hymnal — is a filed defect (issue #17) and
    // is asserted in test/known-issues/ where it fails visibly. Deliberately
    // not pinned here: a green test asserting the bug would read as coverage
    // while blessing it.
  });

  it("still returns a usable report when the browser cannot produce a usage figure", async () => {
    setStorageManager({ estimate: vi.fn().mockResolvedValue({}) });
    const { dl } = await loadComposable();

    const info = await dl.getStorageInfo();

    expect(info).not.toBeNull();
    expect(info).toMatchObject({ itemCount: 0, pieceCount: 0, assetCount: 0 });
    expect(info?.sizeInMB).toBe((info!.sizeInBytes / (1024 * 1024)).toFixed(2));
  });

  it("falls back to the JSON size of the metadata when there is no estimate API", async () => {
    const { dl } = await loadComposable();
    piecesReply = [makePiece("p1")];
    h.queryGesangbuchlied.mockResolvedValue([makeSong("s1")]);
    await dl.downloadAllContent();

    const info = await dl.getStorageInfo();

    const songs = await dl.getOfflineSongs();
    const pieces = await dl.getOfflinePieces();
    const expected = JSON.stringify(songs).length + JSON.stringify(pieces).length;
    expect(info?.sizeInBytes).toBe(expected);
    expect(info?.itemCount).toBe(1);
    expect(info?.pieceCount).toBe(1);
  });

  it("returns null and logs when the read fails", async () => {
    const { dl } = await loadComposable();
    breakIndexedDb();

    await expect(dl.getStorageInfo()).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith("Error getting storage info:", expect.any(Error));
  });
});

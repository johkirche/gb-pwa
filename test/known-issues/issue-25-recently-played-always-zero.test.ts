/**
 * Issue #25 — "Kürzlich gespielt" tile always shows 0
 * https://github.com/johkirche/gb-pwa/issues/25
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * loadStats() hardcodes `recentlyPlayed: 0` behind a `// TODO: Get from local
 * storage`, on both the success and the error path, so the home-screen tile
 * (src/components/home/StatsRow.vue) is a permanent zero no matter what the
 * user does.
 *
 * What "actually played" means is a judgement call, so this spec pins the one
 * record of played songs the app already keeps rather than inventing an API:
 * the church-service history in `useChurchServiceStore` ("History of services
 * that have been played", persisted in the ChurchServiceDB `services` store).
 * Nothing else in the codebase records a play — a fix that derives the number
 * from a different, newly added source is welcome to move these assertions, but
 * "some songs were played, the tile says 0" must stop being true.
 */
import axios, { type AxiosResponse } from "axios";
import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Gesangbuchlied } from "@/gql/graphql";

import { useAuthStore } from "@/stores/auth";
import { useChurchServiceStore } from "@/stores/churchService";
import { useStatsStore } from "@/stores/stats";

// `vi.hoisted` because vi.mock factories are hoisted above the imports. Only the
// song-download reads are stubbed; the service history goes through the real
// (fake-indexeddb) database, because that history is the thing under test.
const h = vi.hoisted(() => ({
  getOfflineSongCount: vi.fn(),
  getAllOfflineSongs: vi.fn(),
  authenticatedRequest: vi.fn(),
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  getOfflineSongCount: h.getOfflineSongCount,
  getAllOfflineSongs: h.getAllOfflineSongs,
}));

vi.mock("@/composables/useDirectusApi", () => ({
  useDirectusApi: () => ({ authenticatedRequest: h.authenticatedRequest }),
}));

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data, status: 200, statusText: "OK", headers: {}, config: {},
  } as unknown as AxiosResponse<T>;
}

function countPayload(count: number) {
  return { data: { gesangbuchlied_aggregated: [{ count: { id: count } }] } };
}

function makeSong(id: string): Gesangbuchlied {
  return {
    id,
    titel: `Lied ${id}`,
    midi_intro: { id: `${id}-intro` },
    midi_main: { id: `${id}-main` },
    midi_outro: { id: `${id}-outro` },
  } as unknown as Gesangbuchlied;
}

// Spying on axios.post rather than mocking the module guarantees no request
// escapes while leaving the rest of axios real.
function spyOnPost() {
  return vi.spyOn(axios, "post");
}
let post: ReturnType<typeof spyOnPost>;

/**
 * Run a service to its end and keep it — exactly what the wizard does.
 *
 * Returns the store so the caller can assert the history really was written:
 * a spec that failed because nothing got saved would be red for the wrong
 * reason.
 */
async function playAndSaveService(name: string, songIds: string[]) {
  const service = useChurchServiceStore();
  service.startSetup();
  for (const id of songIds) service.addSong(makeSong(id));
  await service.confirmSave(name);
  return service;
}

beforeEach(() => {
  // A fresh factory per test: the database name is a module constant, so a
  // service saved in one test would otherwise still be history in the next.
  vi.stubGlobal("indexedDB", new IDBFactory());

  // Only Date is faked — fake-indexeddb drives its request queue with
  // setImmediate, and faking that deadlocks every await on the database.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));

  setActivePinia(createPinia());

  post = vi.spyOn(axios, "post");
  post.mockResolvedValue(ok(countPayload(42)));

  h.getOfflineSongCount.mockReset().mockResolvedValue(0);
  h.getAllOfflineSongs.mockReset().mockResolvedValue([]);
  h.authenticatedRequest
    .mockReset()
    .mockRejectedValue(new Error("authenticatedRequest was not stubbed in this test"));

  useAuthStore().setTokens("access-1", "refresh-1");
});

describe("issue #25: recentlyPlayed must reflect songs that were actually played", () => {
  it("counts songs from the played-service history", async () => {
    await playAndSaveService("Ostersonntag", ["s-1", "s-2"]);
    const service = await playAndSaveService("Erntedank", ["s-3"]);
    // Precondition, not the assertion under test: three songs really are in the
    // played-service history now.
    expect(service.serviceHistory.flatMap((s) => s.songs)).toHaveLength(3);
    const stats = useStatsStore();

    await stats.loadStats();

    expect(stats.stats.recentlyPlayed).toBeGreaterThan(0);
  });

  it("keeps reporting played songs when the network total cannot be fetched", async () => {
    // The history is local, so being offline is no reason for the tile to lose
    // it — the same offline-first rule loadStats already applies to
    // `offlineSongs`.
    const service = await playAndSaveService("Ostersonntag", ["s-1", "s-2"]);
    expect(service.serviceHistory).toHaveLength(1);
    post.mockRejectedValue(new Error("Network Error"));
    const stats = useStatsStore();

    await stats.loadStats();

    expect(stats.stats.recentlyPlayed).toBeGreaterThan(0);
  });

  it("stays at zero when no service has ever been played", async () => {
    // Guards against over-correction: the tile must not start showing the size
    // of the hymnal, or the download count, to a user who has played nothing.
    const stats = useStatsStore();

    await stats.loadStats();

    expect(stats.stats.recentlyPlayed).toBe(0);
    expect(stats.stats.totalSongs).toBe(42);
  });

  it("never reports more songs than were played", async () => {
    // The other over-correction guard: two songs played can never be three.
    await playAndSaveService("Ostersonntag", ["s-1", "s-2"]);
    const stats = useStatsStore();

    await stats.loadStats();

    expect(stats.stats.recentlyPlayed).toBeLessThanOrEqual(2);
  });

  it("clears the counter with the rest of the stats on logout", async () => {
    // clearStats() runs on logout; whatever backs recentlyPlayed, the displayed
    // number has to go back to zero with everything else.
    await playAndSaveService("Ostersonntag", ["s-1"]);
    const stats = useStatsStore();
    await stats.loadStats();

    stats.clearStats();

    expect(stats.stats.recentlyPlayed).toBe(0);
  });
});

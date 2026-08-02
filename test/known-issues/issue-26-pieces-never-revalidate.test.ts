/**
 * Issue #26 — Vor-/Nachspiel list never revalidates
 * https://github.com/johkirche/gb-pwa/issues/26
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * fetchPieces() returns the IndexedDB list and returns, with no TTL and no
 * background refresh; the only escape hatch is `forceOnline`, which no caller in
 * the app passes. Once a device has downloaded the collection once, a renamed,
 * added or deleted Vor-/Nachspiel never reaches it again — the organist plans a
 * service against a snapshot of unknown age.
 *
 * The correct shape is stale-while-revalidate: keep serving the cache
 * instantly (that is the whole point of the offline-first store), but when the
 * device is online, end up reflecting what the server says.
 */
import axios, { type AxiosResponse } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FreiesMusikstueck } from "@/gql/extra-types";

import { useAuthStore } from "@/stores/auth";
import { useFreieMusikstueckeStore } from "@/stores/freieMusikstuecke";

import { restoreOnline, setOnline } from "../helpers/env";

// `vi.hoisted` because vi.mock factories are hoisted above the imports. Mocking
// the IndexedDB read keeps "what is cached" under the test's control.
const h = vi.hoisted(() => ({
  getOfflinePieces: vi.fn(),
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  useOfflineDownload: () => ({ getOfflinePieces: h.getOfflinePieces }),
}));

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data, status: 200, statusText: "OK", headers: {}, config: {},
  } as unknown as AxiosResponse<T>;
}

function piece(over: Partial<FreiesMusikstueck> = {}): FreiesMusikstueck {
  return {
    id: "p-1",
    name: "Ave Verum",
    komponist: "Mozart",
    dauer_sek: 180,
    tags: ["Kommunion"],
    midi_file: { id: "f-1" } as unknown as FreiesMusikstueck["midi_file"],
    ...over,
  };
}

// Spying on axios.post rather than mocking the module guarantees no request
// escapes while leaving the rest of axios real.
function spyOnPost() {
  return vi.spyOn(axios, "post");
}
let post: ReturnType<typeof spyOnPost>;

/**
 * Let a revalidation that was kicked off but not awaited settle.
 *
 * Deliberately a fixed number of microtask turns rather than a timer: the axios
 * stub resolves immediately, so this is deterministic, and it accepts both an
 * awaited refresh and a background one.
 */
async function settleRevalidation() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

beforeEach(() => {
  setActivePinia(createPinia());

  post = vi.spyOn(axios, "post");
  post.mockRejectedValue(new Error("axios.post was not stubbed in this test"));

  h.getOfflinePieces.mockReset().mockResolvedValue([]);

  setOnline(true);
  useAuthStore().setTokens("access-1", "refresh-1");
});

afterEach(() => {
  restoreOnline();
});

describe("issue #26: a cached Vor-/Nachspiel list must still revalidate", () => {
  it("picks up a piece renamed on the server", async () => {
    h.getOfflinePieces.mockResolvedValue([piece({ id: "p-1", name: "Praeludium (alt)" })]);
    post.mockResolvedValue(
      ok({ data: { freie_musikstuecke: [piece({ id: "p-1", name: "Präludium in C" })] } }),
    );
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();
    await settleRevalidation();

    expect(store.pieces.map((p) => p.name)).toEqual(["Präludium in C"]);
  });

  it("picks up a piece added on the server", async () => {
    h.getOfflinePieces.mockResolvedValue([piece({ id: "p-1" })]);
    post.mockResolvedValue(
      ok({
        data: { freie_musikstuecke: [piece({ id: "p-1" }), piece({ id: "p-2", name: "Panis" })] },
      }),
    );
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();
    await settleRevalidation();

    expect(store.pieces.map((p) => p.id)).toEqual(["p-1", "p-2"]);
  });

  it("drops a piece deleted on the server", async () => {
    h.getOfflinePieces.mockResolvedValue([
      piece({ id: "p-1" }),
      piece({ id: "p-2", name: "Panis" }),
    ]);
    post.mockResolvedValue(ok({ data: { freie_musikstuecke: [piece({ id: "p-1" })] } }));
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();
    await settleRevalidation();

    expect(store.pieces.map((p) => p.id)).toEqual(["p-1"]);
  });

  it("serves the cache without any request while the browser is offline", async () => {
    // Guards against over-correction: revalidating must never turn into "needs
    // the network", which is the failure mode this app cannot afford.
    setOnline(false);
    h.getOfflinePieces.mockResolvedValue([piece({ id: "cached" })]);
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();
    await settleRevalidation();

    expect(store.pieces.map((p) => p.id)).toEqual(["cached"]);
    expect(store.isUsingCachedData).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it("keeps the cached list, without an error banner, when revalidation fails", async () => {
    // The other half of stale-while-revalidate: a failed refresh is invisible,
    // because the user already has a usable list.
    h.getOfflinePieces.mockResolvedValue([piece({ id: "cached" })]);
    post.mockRejectedValue(new Error("Network Error"));
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();
    await settleRevalidation();

    expect(store.pieces.map((p) => p.id)).toEqual(["cached"]);
    expect(store.isLoaded).toBe(true);
    expect(store.error).toBeNull();
  });

  it("still serves the cached list synchronously enough to render", async () => {
    // Guards the offline-first contract itself: the cached pieces must be in
    // `pieces` when fetchPieces() resolves, not only after a round-trip.
    h.getOfflinePieces.mockResolvedValue([piece({ id: "cached" })]);
    post.mockResolvedValue(ok({ data: { freie_musikstuecke: [piece({ id: "cached" })] } }));
    const store = useFreieMusikstueckeStore();

    await store.fetchPieces();

    expect(store.pieces).toHaveLength(1);
    expect(store.isLoaded).toBe(true);
  });
});

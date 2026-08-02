/**
 * Issue #27 — a failed service save wipes the editor
 * https://github.com/johkirche/gb-pwa/issues/27
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * confirmSave resets `currentService` to an empty service in its `finally`
 * block, which also runs when the IndexedDB write threw. The just-played
 * service is then gone from memory *and* was never written to disk, so there is
 * nothing left to retry with — the operator's whole preparation is lost the one
 * time the database is unavailable. Only this data-loss half is store-testable;
 * the toast/UI half of the issue is not asserted here.
 */
import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FreiesMusikstueck } from "@/gql/extra-types";
import type { Gesangbuchlied } from "@/gql/graphql";
import { useChurchServiceStore } from "@/stores/churchService";

/** A fully playable hymn: MIDI trio present, three verses in the text. */
function makeSong(overrides: Record<string, unknown> = {}): Gesangbuchlied {
  return {
    id: "s-1",
    titel: "Lobe den Herren",
    midi_intro: { id: "file-intro" },
    midi_main: { id: "file-main" },
    midi_outro: { id: "file-outro" },
    textId: {
      strophenEinzeln: [{ strophe: "Strophe 1" }, { strophe: "Strophe 2" }],
    },
    ...overrides,
  } as unknown as Gesangbuchlied;
}

/** A standalone Vorspiel/Nachspiel piece. */
function makePiece(overrides: Record<string, unknown> = {}): FreiesMusikstueck {
  return {
    id: "p-1",
    name: "Präludium in C",
    midi_file: { id: "file-piece" },
    ...overrides,
  } as unknown as FreiesMusikstueck;
}

/** Make every IndexedDB call fail before the store ever opened the database. */
function breakIndexedDB() {
  vi.stubGlobal("indexedDB", {
    open: () => {
      throw new Error("IndexedDB is unavailable");
    },
  });
}

/** A service that has just finished playing and is waiting on the save prompt. */
function playedService() {
  const store = useChurchServiceStore();
  store.startSetup();
  store.setIntroPiece(makePiece({ id: "p-vor", name: "Vorspiel" }));
  store.addSong(makeSong({ titel: "Ostersonntag-Lied" }));
  store.updateSongVerses(0, [1, 3]);
  store.updateSongSpeed(0, 0.8);
  store.startService();
  store.finishService();
  return store;
}

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());

  // Only Date is faked. fake-indexeddb drives its request queue with
  // setImmediate, and faking that would deadlock every `await` on the database.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));

  setActivePinia(createPinia());
});

describe("issue #27: a failed save must not destroy the service", () => {
  it("keeps the played service in the editor when the write fails", async () => {
    const store = playedService();
    breakIndexedDB();

    await store.confirmSave("Geht nicht");

    expect(store.currentService.songs).toHaveLength(1);
  });

  it("keeps the prelude and every tempo/verse choice, not just the song rows", async () => {
    const store = playedService();
    breakIndexedDB();

    await store.confirmSave("Geht nicht");

    expect(store.currentService.intro?.piece.id).toBe("p-vor");
    expect(store.currentService.songs[0]?.verses).toEqual([1, 3]);
    expect(store.currentService.songs[0]?.speed).toBe(0.8);
  });

  it("saves the real service, not an empty one, when the retry succeeds", async () => {
    const store = playedService();
    breakIndexedDB();
    await store.confirmSave("Ostern 2026");

    // The database comes back (e.g. the private-mode quota error clears) and
    // the operator presses save again.
    vi.stubGlobal("indexedDB", new IDBFactory());
    await store.confirmSave("Ostern 2026");

    expect(store.serviceHistory).toHaveLength(1);
    expect(store.serviceHistory[0].songs).toHaveLength(1);
    expect(store.serviceHistory[0].songs[0].song?.titel).toBe("Ostersonntag-Lied");
  });

  // ── Guards against over-correction ──────────────────────────────────────
  // Keeping the service on the failure path must not keep it on the happy path
  // as well, or every following service starts pre-filled with the last one.

  it("still clears the editor after a successful save", async () => {
    const store = playedService();

    await store.confirmSave("Fertig");

    expect(store.serviceHistory).toHaveLength(1);
    expect(store.currentService.songs).toEqual([]);
    expect(store.currentService.intro).toBeNull();
    expect(store.currentPlayingIndex).toBe(0);
  });

  it("still writes nothing to history and still logs when the save fails", async () => {
    const store = playedService();
    breakIndexedDB();

    await expect(store.confirmSave("Geht nicht")).resolves.toBeUndefined();

    expect(store.serviceHistory).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});

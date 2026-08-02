/**
 * Issue #28 — editing a prepared service creates a duplicate instead of updating it
 * https://github.com/johkirche/gb-pwa/issues/28
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * loadService copies only intro/songs/outro/createdAt into `currentService`,
 * dropping the record's `id` and `name`. saveAsPrepared (and confirmSave) then
 * mint a fresh `crypto.randomUUID()` for every write, so the IndexedDB `put`
 * lands on a new key: the edited copy is stored *beside* the original instead
 * of replacing it, and the operator's "Vorbereitet" list fills up with
 * near-identical rows they now have to delete by hand.
 */
import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      strophenEinzeln: [
        { strophe: "Strophe 1" },
        { strophe: "Strophe 2" },
        { strophe: "Strophe 3" },
      ],
    },
    ...overrides,
  } as unknown as Gesangbuchlied;
}

/** Prepare and stash one service, then hand back the store and the saved row. */
async function withOnePreparedService() {
  const store = useChurchServiceStore();
  store.startSetup();
  store.addSong(makeSong({ titel: "Advent-Lied" }));
  await store.saveAsPrepared("Advent I");

  return { store, original: store.preparedServices[0] };
}

beforeEach(() => {
  // A fresh factory per test: the DB name is a module constant, so a service
  // saved in one test would otherwise still be there in the next one.
  vi.stubGlobal("indexedDB", new IDBFactory());

  // Only Date is faked. fake-indexeddb drives its request queue with
  // setImmediate, and faking that would deadlock every `await` on the database.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));

  setActivePinia(createPinia());
});

describe("issue #28: re-saving a loaded service must update it in place", () => {
  it("keeps the record id in the editor when a prepared service is loaded", async () => {
    const { store, original } = await withOnePreparedService();

    store.loadService(original);

    expect(store.currentService.id).toBe(original.id);
  });

  it("keeps the record name in the editor when a prepared service is loaded", async () => {
    const { store, original } = await withOnePreparedService();

    store.loadService(original);

    expect(store.currentService.name).toBe("Advent I");
  });

  it("leaves exactly one prepared row after editing and re-saving", async () => {
    const { store, original } = await withOnePreparedService();

    store.loadService(original);
    store.updateSongVerses(0, [1, 2]);
    vi.setSystemTime(new Date("2026-03-16T09:30:00.000Z"));
    await store.saveAsPrepared("Advent I");

    expect(store.preparedServices).toHaveLength(1);
  });

  it("keeps the original id and stores the edit on that same row", async () => {
    const { store, original } = await withOnePreparedService();

    store.loadService(original);
    store.updateSongVerses(0, [1, 2]);
    vi.setSystemTime(new Date("2026-03-16T09:30:00.000Z"));
    await store.saveAsPrepared("Advent I");

    expect(store.preparedServices.map((s) => s.id)).toEqual([original.id]);
    expect(store.preparedServices[0].songs[0].verses).toEqual([1, 2]);
  });

  it("survives a reload from the database rather than only looking right in memory", async () => {
    const { store, original } = await withOnePreparedService();

    store.loadService(original);
    store.updateSongVerses(0, [3]);
    vi.setSystemTime(new Date("2026-03-16T09:30:00.000Z"));
    await store.saveAsPrepared("Advent I");

    setActivePinia(createPinia());
    const reloaded = useChurchServiceStore();
    await reloaded.loadPreparedServices();

    expect(reloaded.preparedServices.map((s) => s.name)).toEqual(["Advent I"]);
  });

  // ── Guards against over-correction ──────────────────────────────────────
  // Reusing the loaded id must not turn every save into an overwrite.

  it("still mints a fresh record for a service that was never loaded", async () => {
    const store = useChurchServiceStore();

    store.startSetup();
    store.addSong(makeSong());
    await store.saveAsPrepared("Erster");

    vi.setSystemTime(new Date("2026-03-16T09:30:00.000Z"));
    store.startSetup();
    store.addSong(makeSong());
    await store.saveAsPrepared("Zweiter");

    expect(store.preparedServices.map((s) => s.name)).toEqual(["Zweiter", "Erster"]);
    expect(new Set(store.preparedServices.map((s) => s.id)).size).toBe(2);
  });

  it("still restores the songs and reopens the setup step on load", async () => {
    const { store, original } = await withOnePreparedService();
    store.startSetup();

    store.loadService(original);

    expect(store.wizardStep).toBe("setup");
    expect(store.currentService.songs[0].song?.titel).toBe("Advent-Lied");
    expect(store.currentService.songs[0].verses).toEqual([1, 2, 3]);
  });

  it("startSetup still hands back a blank editor with no carried-over identity", async () => {
    const { store, original } = await withOnePreparedService();
    store.loadService(original);

    store.startSetup();

    expect(store.currentService.id).toBeUndefined();
    expect(store.currentService.name).toBeUndefined();
    expect(store.currentService.songs).toEqual([]);
  });
});

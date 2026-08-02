/**
 * Issue #29 — a hymn with an empty strophenEinzeln array gets zero verses
 * https://github.com/johkirche/gb-pwa/issues/29
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * getAllVerses guards with `song.textId?.strophenEinzeln && Array.isArray(...)`.
 * An empty array is truthy, so the first branch is taken and `[].map(...)`
 * spreads nothing — the 4-verse fallback only ever fires for an absent or
 * non-array value. `strophenEinzeln: []` is a perfectly normal state for a
 * Directus row whose text has not been split into verses yet, and such a hymn
 * is added to the service with no verses selected at all, which silently blocks
 * playback.
 */
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Gesangbuchlied } from "@/gql/graphql";
import { useChurchServiceStore } from "@/stores/churchService";

/** A hymn with the full MIDI trio; the verse breakdown is per-test. */
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

/** The same hymn, but its text was never split into verses. */
function songWithEmptyStrophen(): Gesangbuchlied {
  return makeSong({ titel: "Ohne Strophenaufteilung", textId: { strophenEinzeln: [] } });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));

  setActivePinia(createPinia());
});

describe("issue #29: an empty strophenEinzeln array must use the 4-verse fallback", () => {
  it("numbers four verses for an empty array, exactly as for an absent one", () => {
    const store = useChurchServiceStore();

    expect(store.getAllVerses(songWithEmptyStrophen())).toEqual([1, 2, 3, 4]);
  });

  it("preselects those four verses when the hymn is added to a service", () => {
    const store = useChurchServiceStore();

    store.startSetup();
    store.addSong(songWithEmptyStrophen());

    expect(store.currentService.songs[0].verses).toEqual([1, 2, 3, 4]);
  });

  it("does not flag such a hymn as broken in the setup step", () => {
    const store = useChurchServiceStore();

    store.startSetup();
    store.addSong(songWithEmptyStrophen());

    expect(store.invalidSetupSongs).toEqual([]);
  });

  it("does not block playback of a service built from such a hymn", () => {
    const store = useChurchServiceStore();

    store.startSetup();
    store.addSong(songWithEmptyStrophen());

    expect(store.canPlayService).toBe(true);
  });

  // ── Guards against over-correction ──────────────────────────────────────
  // The fallback must stay a fallback: a hymn that *does* carry its verses must
  // keep exactly those, and an emptied selection must still block playback.

  it("still numbers the verses 1..n when the text has a verse breakdown", () => {
    const store = useChurchServiceStore();

    expect(store.getAllVerses(makeSong())).toEqual([1, 2, 3]);
  });

  it("still falls back to four verses when the text is missing entirely", () => {
    const store = useChurchServiceStore();

    expect(store.getAllVerses(makeSong({ textId: null }))).toEqual([1, 2, 3, 4]);
  });

  it("still falls back to four verses when strophenEinzeln is not an array", () => {
    const store = useChurchServiceStore();

    expect(store.getAllVerses(makeSong({ textId: { strophenEinzeln: "ein Blob" } }))).toEqual(
      [1, 2, 3, 4],
    );
  });

  it("still lets the operator clear the selection by hand, which blocks playback", () => {
    const store = useChurchServiceStore();

    store.startSetup();
    store.addSong(songWithEmptyStrophen());
    store.updateSongVerses(0, []);

    expect(store.currentService.songs[0].verses).toEqual([]);
    expect(store.canPlayService).toBe(false);
    expect(store.invalidSetupSongs).toEqual([
      { label: "Ohne Strophenaufteilung", reason: "no-verses" },
    ]);
  });
});

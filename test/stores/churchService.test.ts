import { IDBFactory } from "fake-indexeddb";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FreiesMusikstueck, GesangbuchliedWithMidi } from "@/gql/extra-types";
import type { Gesangbuchlied } from "@/gql/graphql";
import { type ServiceHistoryItem, useChurchServiceStore } from "@/stores/churchService";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A fully playable hymn: MIDI trio present, three verses in the text. */
function makeSong(overrides: Partial<GesangbuchliedWithMidi> = {}): Gesangbuchlied {
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

/** A standalone Vorspiel/Nachspiel piece. */
function makePiece(overrides: Partial<FreiesMusikstueck> = {}): FreiesMusikstueck {
  return {
    id: "p-1",
    name: "Präludium in C",
    midi_file: { id: "file-piece" },
    ...overrides,
  } as unknown as FreiesMusikstueck;
}

/** Store sitting in the setup step with one complete, playable hymn. */
function playableStore() {
  const store = useChurchServiceStore();
  store.startSetup();
  store.addSong(makeSong());
  return store;
}

/** Make every IndexedDB call fail before the store ever opened the database. */
function breakIndexedDB() {
  vi.stubGlobal("indexedDB", {
    open: () => {
      throw new Error("IndexedDB is unavailable");
    },
  });
}

// ---------------------------------------------------------------------------
beforeEach(() => {
  // The DB name is a module constant, so without a fresh factory a service
  // saved in one test would still be in the history of the next one. The
  // "persists exactly one service" assertions below double as the canary for
  // this isolation actually working.
  vi.stubGlobal("indexedDB", new IDBFactory());

  // Only Date is faked. fake-indexeddb drives its request queue with
  // setImmediate, and faking that would deadlock every `await` on the database.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));

  setActivePinia(createPinia());
});

// ---------------------------------------------------------------------------
describe("playlist", () => {
  it("is empty for a fresh service", () => {
    const store = useChurchServiceStore();

    expect(store.playlist).toEqual([]);
  });

  it("orders the prelude, then the hymns, then the postlude", () => {
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece({ id: "p-vor", name: "Vorspiel" }));
    store.addSong(makeSong({ id: "s-a", titel: "Erstes Lied" }));
    store.addSong(makeSong({ id: "s-b", titel: "Zweites Lied" }));
    store.setOutroPiece(makePiece({ id: "p-nach", name: "Nachspiel" }));

    expect(store.playlist.map((e) => e.role)).toEqual([
      "intro",
      "main",
      "main",
      "outro",
    ]);
    expect(store.playlist.map((e) => e.kind)).toEqual([
      "piece",
      "song",
      "song",
      "piece",
    ]);
  });

  it("leaves a placeholder row with no song out of the runner's playlist", () => {
    // SetupStep can add an empty row before the operator has picked a hymn.
    // Handing that to the runner would crash it mid-service.
    const store = useChurchServiceStore();
    store.addSong(makeSong());
    store.addSong();

    expect(store.playlist).toHaveLength(1);
  });

  it("carries each entry's own tempo and pitch into the runner", () => {
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece());
    store.updatePieceSpeed("intro", 1.25);
    store.updatePiecePitch("intro", 3);
    store.addSong(makeSong());
    store.updateSongSpeed(0, 0.75);
    store.updateSongPitch(0, -2);

    expect(store.playlist[0]).toMatchObject({ speed: 1.25, pitchSemitones: 3 });
    expect(store.playlist[1]).toMatchObject({ speed: 0.75, pitchSemitones: -2 });
  });

  it("exposes the selected verses on the main entries only", () => {
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece());
    store.addSong(makeSong());
    store.updateSongVerses(0, [2, 4]);

    const main = store.playlist.find((e) => e.kind === "song");
    expect(main).toBeDefined();
    expect(main!.kind === "song" && main!.verses).toEqual([2, 4]);
    expect(store.playlist[0]).not.toHaveProperty("verses");
  });
});

// ---------------------------------------------------------------------------
describe("hasMidiTrio", () => {
  it("is false for an empty slot", () => {
    const store = useChurchServiceStore();

    expect(store.hasMidiTrio(null)).toBe(false);
  });

  it("requires all three files, not just some of them", () => {
    const store = useChurchServiceStore();

    expect(store.hasMidiTrio(makeSong({ midi_intro: null }))).toBe(false);
    expect(store.hasMidiTrio(makeSong({ midi_main: null }))).toBe(false);
    expect(store.hasMidiTrio(makeSong({ midi_outro: null }))).toBe(false);
  });

  it("is true when the full trio is present", () => {
    const store = useChurchServiceStore();

    expect(store.hasMidiTrio(makeSong())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("getAllVerses", () => {
  it("numbers the verses 1..n from the song text", () => {
    const store = useChurchServiceStore();

    expect(store.getAllVerses(makeSong())).toEqual([1, 2, 3]);
  });

  it("falls back to four verses when the text has no verse breakdown", () => {
    const store = useChurchServiceStore();

    expect(store.getAllVerses(makeSong({ textId: null }))).toEqual([1, 2, 3, 4]);
  });

  it("falls back to four verses when strophenEinzeln is not an array", () => {
    const store = useChurchServiceStore();
    const song = makeSong({ textId: { strophenEinzeln: "one big blob" } as never });

    expect(store.getAllVerses(song)).toEqual([1, 2, 3, 4]);
  });

  it("returns no verses at all for an empty strophenEinzeln array", () => {
    // Documents a sharp edge: an empty array is treated as "0 verses" rather
    // than falling through to the 4-verse default, so the hymn is added with
    // nothing selected and silently blocks playback.
    const store = useChurchServiceStore();
    const song = makeSong({ textId: { strophenEinzeln: [] } as never });

    expect(store.getAllVerses(song)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("addSong", () => {
  it("preselects every verse of the added hymn", () => {
    const store = useChurchServiceStore();

    store.addSong(makeSong());

    expect(store.currentService.songs[0].verses).toEqual([1, 2, 3]);
  });

  it("starts every hymn at neutral tempo and pitch", () => {
    const store = useChurchServiceStore();

    store.addSong(makeSong());

    expect(store.currentService.songs[0].speed).toBe(1);
    expect(store.currentService.songs[0].pitchSemitones).toBe(0);
  });

  it("adds an empty row with no verses when called without a song", () => {
    const store = useChurchServiceStore();

    store.addSong();

    expect(store.currentService.songs[0].song).toBeNull();
    expect(store.currentService.songs[0].verses).toEqual([]);
  });

  it("appends rather than replacing", () => {
    const store = useChurchServiceStore();

    store.addSong(makeSong({ id: "s-a" }));
    store.addSong(makeSong({ id: "s-b" }));

    expect(store.currentService.songs.map((s) => s.song?.id)).toEqual(["s-a", "s-b"]);
  });
});

// ---------------------------------------------------------------------------
describe("removeSong", () => {
  it("removes exactly the entry at the given index", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ id: "s-a" }));
    store.addSong(makeSong({ id: "s-b" }));
    store.addSong(makeSong({ id: "s-c" }));

    store.removeSong(1);

    expect(store.currentService.songs.map((s) => s.song?.id)).toEqual(["s-a", "s-c"]);
  });

  it("ignores an index past the end of the list", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ id: "s-a" }));

    store.removeSong(7);

    expect(store.currentService.songs).toHaveLength(1);
  });

  it("ignores a negative index instead of splicing from the end", () => {
    // `splice(-1, 1)` would silently delete the *last* hymn, which is the one
    // thing a mis-fired remove button must never do.
    const store = useChurchServiceStore();
    store.addSong(makeSong({ id: "s-a" }));
    store.addSong(makeSong({ id: "s-b" }));

    store.removeSong(-1);

    expect(store.currentService.songs.map((s) => s.song?.id)).toEqual(["s-a", "s-b"]);
  });
});

// ---------------------------------------------------------------------------
describe("updateSongVerses", () => {
  it("replaces the verse selection", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongVerses(0, [1, 3]);

    expect(store.currentService.songs[0].verses).toEqual([1, 3]);
  });

  it("accepts an empty selection, which then blocks playback", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongVerses(0, []);

    expect(store.currentService.songs[0].verses).toEqual([]);
    expect(store.canPlayService).toBe(false);
  });

  it("ignores an out-of-range index", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongVerses(3, [9]);
    store.updateSongVerses(-1, [9]);

    expect(store.currentService.songs[0].verses).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
describe("updateSongSpeed", () => {
  it("clamps below the minimum playback rate", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongSpeed(0, 0.1);

    expect(store.currentService.songs[0].speed).toBe(0.5);
  });

  it("clamps above the maximum playback rate", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongSpeed(0, 9);

    expect(store.currentService.songs[0].speed).toBe(2);
  });

  it("keeps fine-grained values instead of snapping them to SPEED_STEP", () => {
    // The UI steps in ±1 BPM, which is ~0.008x at 120 BPM. Snapping to the
    // 0.05 slider step would swallow those edits entirely.
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongSpeed(0, 1.234);

    expect(store.currentService.songs[0].speed).toBe(1.234);
  });

  it("ignores an out-of-range index", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongSpeed(5, 1.5);
    store.updateSongSpeed(-1, 1.5);

    expect(store.currentService.songs[0].speed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe("updateSongPitch", () => {
  it("clamps to one octave up and down", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongPitch(0, 99);
    expect(store.currentService.songs[0].pitchSemitones).toBe(12);

    store.updateSongPitch(0, -99);
    expect(store.currentService.songs[0].pitchSemitones).toBe(-12);
  });

  it("rounds fractional semitones — MIDI has no quarter tones", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongPitch(0, 2.4);
    expect(store.currentService.songs[0].pitchSemitones).toBe(2);

    // Math.round breaks ties towards +Infinity, so -1.5 lands on -1.
    store.updateSongPitch(0, -1.5);
    expect(store.currentService.songs[0].pitchSemitones).toBe(-1);
  });

  it("ignores an out-of-range index", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    store.updateSongPitch(5, 4);
    store.updateSongPitch(-1, 4);

    expect(store.currentService.songs[0].pitchSemitones).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("reorderSongs", () => {
  it("moves an entry down the list", () => {
    const store = useChurchServiceStore();
    ["a", "b", "c"].forEach((id) => store.addSong(makeSong({ id: `s-${id}` })));

    store.reorderSongs(0, 2);

    expect(store.currentService.songs.map((s) => s.song?.id)).toEqual([
      "s-b",
      "s-c",
      "s-a",
    ]);
  });

  it("moves an entry up the list", () => {
    const store = useChurchServiceStore();
    ["a", "b", "c"].forEach((id) => store.addSong(makeSong({ id: `s-${id}` })));

    store.reorderSongs(2, 0);

    expect(store.currentService.songs.map((s) => s.song?.id)).toEqual([
      "s-c",
      "s-a",
      "s-b",
    ]);
  });

  it("carries the verse selection with the moved entry", () => {
    // Dragging must move the whole row, not just the hymn: losing the verse
    // selection mid-preparation is invisible until the service is running.
    const store = useChurchServiceStore();
    store.addSong(makeSong({ id: "s-a" }));
    store.addSong(makeSong({ id: "s-b" }));
    store.updateSongVerses(0, [2]);

    store.reorderSongs(0, 1);

    expect(store.currentService.songs[1].song?.id).toBe("s-a");
    expect(store.currentService.songs[1].verses).toEqual([2]);
  });

  it("leaves the list untouched for an out-of-range source index", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ id: "s-a" }));
    store.addSong(makeSong({ id: "s-b" }));

    store.reorderSongs(5, 0);
    store.reorderSongs(-1, 0);

    expect(store.currentService.songs.map((s) => s.song?.id)).toEqual(["s-a", "s-b"]);
  });

  it("leaves the list untouched for an out-of-range target index", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ id: "s-a" }));
    store.addSong(makeSong({ id: "s-b" }));

    store.reorderSongs(0, 5);
    store.reorderSongs(0, -1);

    expect(store.currentService.songs.map((s) => s.song?.id)).toEqual(["s-a", "s-b"]);
  });

  it("is a no-op when source and target are the same", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ id: "s-a" }));
    store.addSong(makeSong({ id: "s-b" }));

    store.reorderSongs(1, 1);

    expect(store.currentService.songs.map((s) => s.song?.id)).toEqual(["s-a", "s-b"]);
  });
});

// ---------------------------------------------------------------------------
describe("intro and outro pieces", () => {
  it("wraps a chosen prelude at neutral playback", () => {
    const store = useChurchServiceStore();

    store.setIntroPiece(makePiece({ id: "p-vor" }));

    expect(store.currentService.intro).toEqual({
      piece: expect.objectContaining({ id: "p-vor" }),
      speed: 1,
      pitchSemitones: 0,
    });
  });

  it("clears the prelude slot when passed null", () => {
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece());

    store.setIntroPiece(null);

    expect(store.currentService.intro).toBeNull();
    expect(store.playlist).toEqual([]);
  });

  it("keeps the postlude in its own slot", () => {
    const store = useChurchServiceStore();

    store.setOutroPiece(makePiece({ id: "p-nach" }));

    expect(store.currentService.intro).toBeNull();
    expect(store.currentService.outro?.piece.id).toBe("p-nach");
  });

  it("replacing a piece resets its tempo and pitch overrides", () => {
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece({ id: "p-1" }));
    store.updatePieceSpeed("intro", 1.8);

    store.setIntroPiece(makePiece({ id: "p-2" }));

    expect(store.currentService.intro?.speed).toBe(1);
  });

  it("clamps the tempo of the addressed slot only", () => {
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece());
    store.setOutroPiece(makePiece());

    store.updatePieceSpeed("intro", 5);

    expect(store.currentService.intro?.speed).toBe(2);
    expect(store.currentService.outro?.speed).toBe(1);
  });

  it("rounds and clamps the pitch of the addressed slot", () => {
    const store = useChurchServiceStore();
    store.setOutroPiece(makePiece());

    store.updatePiecePitch("outro", -13.4);

    expect(store.currentService.outro?.pitchSemitones).toBe(-12);
  });

  it("silently ignores tempo/pitch edits for an empty slot", () => {
    const store = useChurchServiceStore();

    expect(() => store.updatePieceSpeed("intro", 1.5)).not.toThrow();
    expect(() => store.updatePiecePitch("outro", 2)).not.toThrow();
    expect(store.currentService.intro).toBeNull();
    expect(store.currentService.outro).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("invalidSetupSongs", () => {
  it("is empty when every hymn is complete", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    expect(store.invalidSetupSongs).toEqual([]);
  });

  it("flags a hymn with no verses selected", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ titel: "Ohne Strophen" }));
    store.updateSongVerses(0, []);

    expect(store.invalidSetupSongs).toEqual([
      { label: "Ohne Strophen", reason: "no-verses" },
    ]);
  });

  it("flags a hymn that has no MIDI trio", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ titel: "Ohne Midi", midi_main: null }));

    expect(store.invalidSetupSongs).toEqual([
      { label: "Ohne Midi", reason: "no-midi" },
    ]);
  });

  it("reports only the missing verses when both are wrong", () => {
    // One row can only produce one issue; verses win because that is the one
    // the operator can actually fix in the setup step.
    const store = useChurchServiceStore();
    store.addSong(makeSong({ titel: "Doppelt kaputt", midi_intro: null }));
    store.updateSongVerses(0, []);

    expect(store.invalidSetupSongs).toEqual([
      { label: "Doppelt kaputt", reason: "no-verses" },
    ]);
  });

  it("ignores placeholder rows that have no hymn yet", () => {
    const store = useChurchServiceStore();
    store.addSong();

    expect(store.invalidSetupSongs).toEqual([]);
  });

  it("uses an empty label for a hymn with no title", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ titel: null, midi_outro: null }));

    expect(store.invalidSetupSongs).toEqual([{ label: "", reason: "no-midi" }]);
  });

  it("lists every broken row, in list order", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ titel: "Erstes", midi_main: null }));
    store.addSong(makeSong({ titel: "Zweites" }));
    store.addSong(makeSong({ titel: "Drittes" }));
    store.updateSongVerses(2, []);

    expect(store.invalidSetupSongs.map((i) => i.label)).toEqual(["Erstes", "Drittes"]);
  });
});

// ---------------------------------------------------------------------------
describe("canPlayService", () => {
  it("is false for a completely empty service", () => {
    const store = useChurchServiceStore();

    expect(store.canPlayService).toBe(false);
  });

  it("is false while any row is still an empty placeholder", () => {
    // The placeholder is not in the playlist, so the length check alone would
    // pass it — the `every` guard is what stops a half-filled service.
    const store = useChurchServiceStore();
    store.addSong(makeSong());
    store.addSong();

    expect(store.canPlayService).toBe(false);
  });

  it("is false when a hymn has no verses selected", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());
    store.updateSongVerses(0, []);

    expect(store.canPlayService).toBe(false);
  });

  it("is false when a hymn is missing part of its MIDI trio", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ midi_outro: null }));

    expect(store.canPlayService).toBe(false);
  });

  it("is true for a complete service", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());

    expect(store.canPlayService).toBe(true);
  });

  it("is true for a prelude-only service with no hymns at all", () => {
    // `[].every(...)` is vacuously true, so a service that is nothing but a
    // Vorspiel is playable. Documented behaviour, not an accident.
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece());

    expect(store.canPlayService).toBe(true);
  });

  it("is false when a broken hymn sits next to a valid prelude", () => {
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece());
    store.addSong(makeSong({ midi_main: null }));

    expect(store.canPlayService).toBe(false);
  });

  it("canAdvanceToDevice mirrors it exactly", () => {
    const store = useChurchServiceStore();
    expect(store.canAdvanceToDevice).toBe(false);

    store.addSong(makeSong());
    expect(store.canAdvanceToDevice).toBe(true);

    store.updateSongVerses(0, []);
    expect(store.canAdvanceToDevice).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("wizard navigation", () => {
  it("startSetup throws away the previous service and enters the setup step", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());
    store.setIntroPiece(makePiece());
    store.currentPlayingIndex = 4;
    store.isPlayingService = true;

    store.startSetup();

    expect(store.wizardStep).toBe("setup");
    expect(store.currentService.songs).toEqual([]);
    expect(store.currentService.intro).toBeNull();
    expect(store.currentService.outro).toBeNull();
    expect(store.currentService.createdAt).toBe("2026-03-15T09:30:00.000Z");
    expect(store.currentPlayingIndex).toBe(0);
    expect(store.isPlayingService).toBe(false);
  });

  it("goToDevice refuses to advance an incomplete service", () => {
    const store = useChurchServiceStore();
    store.startSetup();
    store.addSong();

    store.goToDevice();

    expect(store.wizardStep).toBe("setup");
  });

  it("goToDevice advances once the service is playable", () => {
    const store = playableStore();

    store.goToDevice();

    expect(store.wizardStep).toBe("device");
  });

  it("goToSetup always goes back, even out of a running service", () => {
    const store = playableStore();
    store.goToDevice();
    store.startService();

    store.goToSetup();

    expect(store.wizardStep).toBe("setup");
  });

  it("startService refuses when the service cannot be played", () => {
    const store = useChurchServiceStore();
    store.startSetup();
    store.addSong(makeSong({ midi_intro: null }));

    store.startService();

    expect(store.wizardStep).toBe("setup");
    expect(store.isPlayingService).toBe(false);
  });

  it("startService enters the run step from the first entry", () => {
    const store = playableStore();
    store.currentPlayingIndex = 3;

    store.startService();

    expect(store.wizardStep).toBe("run");
    expect(store.isPlayingService).toBe(true);
    expect(store.currentPlayingIndex).toBe(0);
  });

  it("finishService stops playback, returns to idle and opens the save prompt", () => {
    const store = playableStore();
    store.startService();

    store.finishService();

    expect(store.isPlayingService).toBe(false);
    expect(store.wizardStep).toBe("idle");
    expect(store.saveDialogOpen).toBe(true);
    // The service must survive until the dialog is answered, otherwise there
    // would be nothing left to save.
    expect(store.currentService.songs).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
describe("onSongCompleted", () => {
  it("advances to the next playlist entry", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong({ id: "s-a" }));
    store.addSong(makeSong({ id: "s-b" }));
    store.startService();

    store.onSongCompleted();

    expect(store.currentPlayingIndex).toBe(1);
    expect(store.isPlayingService).toBe(true);
  });

  it("counts the prelude and postlude as playlist entries", () => {
    // The runner indexes into `playlist`, not into `songs` — an off-by-one here
    // would skip the Nachspiel or replay a hymn.
    const store = useChurchServiceStore();
    store.setIntroPiece(makePiece());
    store.addSong(makeSong());
    store.setOutroPiece(makePiece());
    store.startService();

    store.onSongCompleted();
    store.onSongCompleted();

    expect(store.currentPlayingIndex).toBe(2);
    expect(store.wizardStep).toBe("run");
  });

  it("finishes the service after the last entry instead of running off the end", () => {
    const store = useChurchServiceStore();
    store.addSong(makeSong());
    store.startService();

    store.onSongCompleted();

    expect(store.currentPlayingIndex).toBe(0);
    expect(store.isPlayingService).toBe(false);
    expect(store.wizardStep).toBe("idle");
    expect(store.saveDialogOpen).toBe(true);
  });

  it("finishes immediately when the playlist is empty", () => {
    const store = useChurchServiceStore();

    store.onSongCompleted();

    expect(store.currentPlayingIndex).toBe(0);
    expect(store.wizardStep).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
describe("confirmSave", () => {
  it("persists the whole service, including verses and tempo/pitch overrides", async () => {
    const store = useChurchServiceStore();
    store.startSetup();
    store.setIntroPiece(makePiece({ id: "p-vor", name: "Vorspiel" }));
    store.updatePieceSpeed("intro", 1.25);
    store.addSong(makeSong({ titel: "Ostersonntag-Lied" }));
    store.updateSongVerses(0, [1, 3]);
    store.updateSongPitch(0, -2);

    await store.confirmSave("Ostern 2026");

    expect(store.serviceHistory).toHaveLength(1);
    const saved = store.serviceHistory[0];
    expect(saved.name).toBe("Ostern 2026");
    expect(saved.intro?.piece.id).toBe("p-vor");
    expect(saved.intro?.speed).toBe(1.25);
    expect(saved.songs[0].verses).toEqual([1, 3]);
    expect(saved.songs[0].pitchSemitones).toBe(-2);
    expect(saved.songs[0].song?.titel).toBe("Ostersonntag-Lied");
  });

  it("stamps the record with a fresh id and the current time", async () => {
    const store = playableStore();

    await store.confirmSave("Mit Zeitstempel");

    expect(store.serviceHistory[0].id).toEqual(expect.any(String));
    expect(store.serviceHistory[0].id).not.toBe("");
    expect(store.serviceHistory[0].createdAt).toBe("2026-03-15T09:30:00.000Z");
  });

  it("clears the editor and closes the dialog", async () => {
    const store = playableStore();
    store.startService();
    store.onSongCompleted();
    expect(store.saveDialogOpen).toBe(true);

    await store.confirmSave("Fertig");

    expect(store.saveDialogOpen).toBe(false);
    expect(store.currentService.songs).toEqual([]);
    expect(store.currentService.intro).toBeNull();
    expect(store.currentPlayingIndex).toBe(0);
  });

  it("falls back to a generated name when the given one is only whitespace", async () => {
    const store = playableStore();

    await store.confirmSave("   ");

    expect(store.serviceHistory[0].name).toMatch(/^Gottesdienst /);
    expect(store.serviceHistory[0].name).toContain("2026");
  });

  it("falls back to a generated name when no name is given at all", async () => {
    const store = playableStore();

    await store.confirmSave();

    expect(store.serviceHistory[0].name).toMatch(/^Gottesdienst /);
  });

  it("keeps the name as typed when one is supplied", async () => {
    const store = playableStore();

    await store.confirmSave("Heiligabend");

    expect(store.serviceHistory[0].name).toBe("Heiligabend");
  });

  it("only ever holds the services saved in this test — DB isolation canary", async () => {
    const store = playableStore();

    await store.confirmSave("Einziger");

    expect(store.serviceHistory.map((s) => s.name)).toEqual(["Einziger"]);
  });

  it("happily saves a completely empty service", async () => {
    // No guard exists: finishService opens the save prompt unconditionally, so
    // confirming it right after startSetup writes an empty record to history.
    const store = useChurchServiceStore();
    store.startSetup();

    await store.confirmSave("Leerer Gottesdienst");

    expect(store.serviceHistory).toHaveLength(1);
    expect(store.serviceHistory[0].songs).toEqual([]);
  });

  it("still resets the editor when the database is unavailable", async () => {
    const store = playableStore();
    store.saveDialogOpen = true;
    breakIndexedDB();

    await expect(store.confirmSave("Geht nicht")).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
    expect(store.serviceHistory).toEqual([]);
    expect(store.saveDialogOpen).toBe(false);
    expect(store.currentService.songs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("discardService", () => {
  it("throws the service away without writing anything to history", async () => {
    const store = playableStore();
    store.startService();
    store.onSongCompleted();

    store.discardService();
    await store.loadHistory();

    expect(store.saveDialogOpen).toBe(false);
    expect(store.currentService.songs).toEqual([]);
    expect(store.currentPlayingIndex).toBe(0);
    expect(store.wizardStep).toBe("idle");
    expect(store.serviceHistory).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("service history", () => {
  it("returns the saved services newest first", async () => {
    const store = useChurchServiceStore();

    vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
    store.startSetup();
    store.addSong(makeSong());
    await store.confirmSave("Erster Sonntag");

    vi.setSystemTime(new Date("2026-03-22T10:00:00.000Z"));
    store.startSetup();
    store.addSong(makeSong());
    await store.confirmSave("Dritter Sonntag");

    vi.setSystemTime(new Date("2026-03-08T10:00:00.000Z"));
    store.startSetup();
    store.addSong(makeSong());
    await store.confirmSave("Zweiter Sonntag");

    await store.loadHistory();

    expect(store.serviceHistory.map((s) => s.name)).toEqual([
      "Dritter Sonntag",
      "Zweiter Sonntag",
      "Erster Sonntag",
    ]);
  });

  it("survives a reload from a fresh store instance", async () => {
    // History is the whole point of the IndexedDB layer: it must outlive the
    // pinia instance, not just the current page view.
    const store = playableStore();
    await store.confirmSave("Bleibt erhalten");

    setActivePinia(createPinia());
    const reloaded = useChurchServiceStore();
    expect(reloaded.serviceHistory).toEqual([]);
    await reloaded.loadHistory();

    expect(reloaded.serviceHistory.map((s) => s.name)).toEqual(["Bleibt erhalten"]);
  });

  it("deleteService removes exactly the requested entry", async () => {
    const store = useChurchServiceStore();
    vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
    store.startSetup();
    store.addSong(makeSong());
    await store.confirmSave("Behalten");

    vi.setSystemTime(new Date("2026-03-08T10:00:00.000Z"));
    store.startSetup();
    store.addSong(makeSong());
    await store.confirmSave("Löschen");

    const doomed = store.serviceHistory.find((s) => s.name === "Löschen")!;
    await store.deleteService(doomed.id);

    expect(store.serviceHistory.map((s) => s.name)).toEqual(["Behalten"]);
  });

  it("deleteService is a no-op for an unknown id", async () => {
    const store = playableStore();
    await store.confirmSave("Unberührt");

    await store.deleteService("does-not-exist");

    expect(store.serviceHistory.map((s) => s.name)).toEqual(["Unberührt"]);
  });

  it("loadHistory falls back to an empty list when the database is unavailable", async () => {
    const store = useChurchServiceStore();
    breakIndexedDB();

    await expect(store.loadHistory()).resolves.toBeUndefined();

    expect(store.serviceHistory).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it("deleteService swallows a database failure instead of rejecting", async () => {
    const store = useChurchServiceStore();
    breakIndexedDB();

    await expect(store.deleteService("any-id")).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("loadService", () => {
  it("restores a saved service into the editor and reopens the setup step", async () => {
    const store = useChurchServiceStore();
    store.startSetup();
    store.setIntroPiece(makePiece({ id: "p-vor" }));
    store.addSong(makeSong({ titel: "Wiederverwendet" }));
    store.updateSongVerses(0, [2, 3]);
    store.updateSongSpeed(0, 0.8);
    store.setOutroPiece(makePiece({ id: "p-nach" }));
    await store.confirmSave("Vorlage");

    store.loadService(store.serviceHistory[0]);

    expect(store.wizardStep).toBe("setup");
    expect(store.currentService.intro?.piece.id).toBe("p-vor");
    expect(store.currentService.outro?.piece.id).toBe("p-nach");
    expect(store.currentService.songs[0].song?.titel).toBe("Wiederverwendet");
    expect(store.currentService.songs[0].verses).toEqual([2, 3]);
    expect(store.currentService.songs[0].speed).toBe(0.8);
    expect(store.canPlayService).toBe(true);
  });

  it("drops the saved id and name, so re-saving creates a duplicate entry", async () => {
    // Loading a service is "start from this template", not "edit this record":
    // confirmSave after a load mints a new UUID and adds a second history row.
    const store = playableStore();
    await store.confirmSave("Original");
    const original = store.serviceHistory[0];

    store.loadService(original);

    expect(store.currentService.id).toBeUndefined();
    expect(store.currentService.name).toBeUndefined();

    await store.confirmSave("Original");
    expect(store.serviceHistory).toHaveLength(2);
    const ids = store.serviceHistory.map((s) => s.id);
    // The first record is untouched and a second one with a different id now
    // sits beside it under the same name.
    expect(ids).toContain(original.id);
    expect(new Set(ids).size).toBe(2);
    expect(store.serviceHistory.map((s) => s.name)).toEqual(["Original", "Original"]);
  });

  it("backfills tempo and pitch on songs saved before those fields existed", () => {
    const store = useChurchServiceStore();
    const legacy = {
      id: "old-1",
      name: "Altes Format",
      createdAt: "2025-01-01T00:00:00.000Z",
      intro: null,
      outro: null,
      songs: [{ song: makeSong(), verses: [1, 2] }],
    } as unknown as ServiceHistoryItem;

    store.loadService(legacy);

    expect(store.currentService.songs[0].speed).toBe(1);
    expect(store.currentService.songs[0].pitchSemitones).toBe(0);
  });

  it("wraps a legacy bare prelude that was stored without speed/pitch", () => {
    const store = useChurchServiceStore();
    const legacy = {
      id: "old-2",
      name: "Altes Vorspiel",
      createdAt: "2025-01-01T00:00:00.000Z",
      intro: makePiece({ id: "p-alt" }),
      outro: null,
      songs: [],
    } as unknown as ServiceHistoryItem;

    store.loadService(legacy);

    expect(store.currentService.intro).toEqual({
      piece: expect.objectContaining({ id: "p-alt" }),
      speed: 1,
      pitchSemitones: 0,
    });
  });

  it("backfills a wrapped piece whose speed/pitch are missing or the wrong type", () => {
    const store = useChurchServiceStore();
    const legacy = {
      id: "old-3",
      name: "Halb migriert",
      createdAt: "2025-01-01T00:00:00.000Z",
      intro: { piece: makePiece(), speed: "schnell" },
      outro: null,
      songs: [],
    } as unknown as ServiceHistoryItem;

    store.loadService(legacy);

    expect(store.currentService.intro?.speed).toBe(1);
    expect(store.currentService.intro?.pitchSemitones).toBe(0);
  });

  it("discards an intro blob it cannot make sense of", () => {
    const store = useChurchServiceStore();
    const corrupt = {
      id: "old-4",
      name: "Kaputt",
      createdAt: "2025-01-01T00:00:00.000Z",
      intro: { irgendwas: true },
      outro: "nicht mal ein objekt",
      songs: [],
    } as unknown as ServiceHistoryItem;

    store.loadService(corrupt);

    expect(store.currentService.intro).toBeNull();
    expect(store.currentService.outro).toBeNull();
  });

  it("accepts a record with no songs array at all", () => {
    const store = useChurchServiceStore();
    const corrupt = {
      id: "old-5",
      name: "Ohne Lieder",
      createdAt: "2025-01-01T00:00:00.000Z",
      intro: null,
      outro: null,
    } as unknown as ServiceHistoryItem;

    expect(() => store.loadService(corrupt)).not.toThrow();

    expect(store.currentService.songs).toEqual([]);
    expect(store.canPlayService).toBe(false);
  });

  it("treats any object with a `name` key as a playable prelude", () => {
    // normalizePiece's legacy branch only checks for `midi_file` OR `name`, so a
    // blob carrying just a name is wrapped as a piece with no MIDI file — and
    // canPlayService then reports the service as ready to run.
    const store = useChurchServiceStore();
    const suspicious = {
      id: "old-6",
      name: "Verdächtig",
      createdAt: "2025-01-01T00:00:00.000Z",
      intro: { name: "Nur ein Name" },
      outro: null,
      songs: [],
    } as unknown as ServiceHistoryItem;

    store.loadService(suspicious);

    expect(store.currentService.intro?.piece.midi_file).toBeUndefined();
    expect(store.canPlayService).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("prepared services", () => {
  it("opens and closes its own dialog independently of the save dialog", () => {
    const store = useChurchServiceStore();

    store.openPreparedDialog();
    expect(store.preparedDialogOpen).toBe(true);
    expect(store.saveDialogOpen).toBe(false);

    store.closePreparedDialog();
    expect(store.preparedDialogOpen).toBe(false);
  });

  it("stores the prepared service in its own list, not in the history", async () => {
    const store = playableStore();

    await store.saveAsPrepared("Erntedank");
    await store.loadHistory();

    expect(store.preparedServices.map((s) => s.name)).toEqual(["Erntedank"]);
    expect(store.serviceHistory).toEqual([]);
  });

  it("keeps the editor and the wizard step intact, unlike confirmSave", async () => {
    // The operator stashes a copy and carries on working on the same service.
    const store = playableStore();
    store.updateSongVerses(0, [1, 2]);
    store.openPreparedDialog();

    await store.saveAsPrepared("Zwischenstand");

    expect(store.wizardStep).toBe("setup");
    expect(store.currentService.songs).toHaveLength(1);
    expect(store.currentService.songs[0].verses).toEqual([1, 2]);
    expect(store.preparedDialogOpen).toBe(false);
  });

  it("persists tempo and pitch overrides", async () => {
    const store = playableStore();
    store.updateSongSpeed(0, 1.4);
    store.updateSongPitch(0, 5);
    store.setOutroPiece(makePiece({ id: "p-nach" }));
    store.updatePiecePitch("outro", -3);

    await store.saveAsPrepared("Mit Anpassungen");

    const saved = store.preparedServices[0];
    expect(saved.songs[0].speed).toBe(1.4);
    expect(saved.songs[0].pitchSemitones).toBe(5);
    expect(saved.outro?.pitchSemitones).toBe(-3);
  });

  it("falls back to a generated name for a blank one", async () => {
    const store = playableStore();

    await store.saveAsPrepared("  ");

    expect(store.preparedServices[0].name).toMatch(/^Gottesdienst /);
  });

  it("can be loaded straight back into the editor", async () => {
    const store = playableStore();
    store.updateSongVerses(0, [3]);
    await store.saveAsPrepared("Advent I");

    store.startSetup();
    expect(store.currentService.songs).toEqual([]);

    store.loadService(store.preparedServices[0]);

    expect(store.currentService.songs[0].verses).toEqual([3]);
    expect(store.wizardStep).toBe("setup");
  });

  it("lists prepared services newest first", async () => {
    const store = useChurchServiceStore();

    vi.setSystemTime(new Date("2026-04-01T08:00:00.000Z"));
    store.startSetup();
    store.addSong(makeSong());
    await store.saveAsPrepared("Älter");

    vi.setSystemTime(new Date("2026-04-05T08:00:00.000Z"));
    await store.saveAsPrepared("Neuer");

    await store.loadPreparedServices();

    expect(store.preparedServices.map((s) => s.name)).toEqual(["Neuer", "Älter"]);
  });

  it("deletePreparedService removes exactly the requested entry", async () => {
    const store = useChurchServiceStore();

    vi.setSystemTime(new Date("2026-04-01T08:00:00.000Z"));
    store.startSetup();
    store.addSong(makeSong());
    await store.saveAsPrepared("Behalten");

    vi.setSystemTime(new Date("2026-04-05T08:00:00.000Z"));
    await store.saveAsPrepared("Löschen");

    const doomed = store.preparedServices.find((s) => s.name === "Löschen")!;
    await store.deletePreparedService(doomed.id);

    expect(store.preparedServices.map((s) => s.name)).toEqual(["Behalten"]);
  });

  it("closes the dialog even when the database write fails", async () => {
    const store = playableStore();
    store.openPreparedDialog();
    breakIndexedDB();

    await expect(store.saveAsPrepared("Geht nicht")).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
    expect(store.preparedDialogOpen).toBe(false);
    // The editor is deliberately left alone even on the failure path.
    expect(store.currentService.songs).toHaveLength(1);
  });

  it("loadPreparedServices falls back to an empty list when the database is unavailable", async () => {
    const store = useChurchServiceStore();
    breakIndexedDB();

    await expect(store.loadPreparedServices()).resolves.toBeUndefined();

    expect(store.preparedServices).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it("deletePreparedService swallows a database failure instead of rejecting", async () => {
    const store = useChurchServiceStore();
    breakIndexedDB();

    await expect(store.deletePreparedService("any-id")).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
  });
});

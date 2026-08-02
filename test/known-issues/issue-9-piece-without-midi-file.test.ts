/**
 * Issue #9 — a prelude/postlude with no midi_file passes validation
 * https://github.com/johkirche/gb-pwa/issues/9
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * normalizePiece's legacy branch accepts any object that merely carries a
 * `name` key — `"midi_file" in raw || "name" in raw` — so a blob with no MIDI
 * file at all (or with `midi_file: null`) is wrapped as a playable
 * FreiesMusikstueck. canPlayService then only walks `songs`; it never inspects
 * the intro/outro slots, whose file the schema is assumed to guarantee. The
 * result is a service that reports itself ready to run and then hands the
 * runner a piece with nothing to play.
 */
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FreiesMusikstueck } from "@/gql/extra-types";
import { type ServiceHistoryItem, useChurchServiceStore } from "@/stores/churchService";

/** A standalone Vorspiel/Nachspiel piece with a real MIDI file. */
function makePiece(overrides: Record<string, unknown> = {}): FreiesMusikstueck {
  return {
    id: "p-1",
    name: "Präludium in C",
    midi_file: { id: "file-piece" },
    ...overrides,
  } as unknown as FreiesMusikstueck;
}

/** A saved history/prepared record with the given intro and outro slots. */
function savedService(slots: {
  intro?: unknown;
  outro?: unknown;
  songs?: unknown[];
}): ServiceHistoryItem {
  return {
    id: "svc-1",
    name: "Gespeicherter Gottesdienst",
    createdAt: "2025-01-01T00:00:00.000Z",
    intro: slots.intro ?? null,
    outro: slots.outro ?? null,
    songs: slots.songs ?? [],
  } as unknown as ServiceHistoryItem;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));

  setActivePinia(createPinia());
});

describe("issue #9: a piece with no MIDI file must not count as playable", () => {
  it("does not accept a legacy blob that carries only a name as a prelude", () => {
    const store = useChurchServiceStore();

    store.loadService(savedService({ intro: { name: "Nur ein Name" } }));

    expect(store.currentService.intro).toBeNull();
  });

  it("does not accept a piece whose midi_file is explicitly null", () => {
    const store = useChurchServiceStore();

    store.loadService(
      savedService({ intro: { id: "p-kaputt", name: "Ohne Datei", midi_file: null } }),
    );

    expect(store.currentService.intro).toBeNull();
  });

  it("refuses to play a service whose only entry is a prelude with no MIDI file", () => {
    // Either fix works here: drop the piece (playlist becomes empty) or teach
    // canPlayService to check the intro/outro slots. Both end at `false`.
    const store = useChurchServiceStore();

    store.loadService(savedService({ intro: { name: "Nur ein Name" } }));

    expect(store.canPlayService).toBe(false);
  });

  it("refuses to play a service whose only entry is a postlude with no MIDI file", () => {
    const store = useChurchServiceStore();

    store.loadService(savedService({ outro: { name: "Nachspiel ohne Datei" } }));

    expect(store.canPlayService).toBe(false);
  });

  it("refuses to advance to the device step for such a service", () => {
    const store = useChurchServiceStore();

    store.loadService(savedService({ intro: { id: "p-x", midi_file: null } }));
    store.goToDevice();

    expect(store.canAdvanceToDevice).toBe(false);
    expect(store.wizardStep).toBe("setup");
  });

  // ── Guards against over-correction ──────────────────────────────────────
  // Tightening normalizePiece must not throw away the pieces that are fine.

  it("still accepts a legacy bare piece that does have a MIDI file", () => {
    const store = useChurchServiceStore();

    store.loadService(savedService({ intro: makePiece({ id: "p-alt" }) }));

    expect(store.currentService.intro).toEqual({
      piece: expect.objectContaining({ id: "p-alt" }),
      speed: 1,
      pitchSemitones: 0,
    });
    expect(store.canPlayService).toBe(true);
  });

  it("still accepts a wrapped piece and keeps its tempo and pitch overrides", () => {
    const store = useChurchServiceStore();

    store.loadService(
      savedService({
        outro: { piece: makePiece({ id: "p-nach" }), speed: 1.25, pitchSemitones: -3 },
      }),
    );

    expect(store.currentService.outro).toEqual({
      piece: expect.objectContaining({ id: "p-nach" }),
      speed: 1.25,
      pitchSemitones: -3,
    });
    expect(store.canPlayService).toBe(true);
  });

  it("still accepts a piece chosen through setIntroPiece", () => {
    const store = useChurchServiceStore();

    store.startSetup();
    store.setIntroPiece(makePiece());

    expect(store.currentService.intro?.piece.id).toBe("p-1");
    expect(store.playlist).toHaveLength(1);
    expect(store.canPlayService).toBe(true);
  });
});

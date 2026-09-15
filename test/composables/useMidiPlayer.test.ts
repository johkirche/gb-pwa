import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defineComponent } from "vue";

import type { ParsedMidiFile } from "@/composables/useMidiPlayer";

// ---------------------------------------------------------------------------
// The module keeps device state and the active-player registry at module
// level, so every test imports a fresh copy. jsdom has no AudioContext: the
// browser synth reports itself inactive and swallows what is sent to it, which
// is exactly right here — the sequencing and device logic is the subject, not
// the sound.
// ---------------------------------------------------------------------------
const STORED_DEVICE_KEY = "gb-pwa.midi.selectedOutputId";

type Mod = typeof import("@/composables/useMidiPlayer");

async function loadModule(): Promise<Mod> {
  vi.resetModules();
  return import("@/composables/useMidiPlayer");
}

/** useMidiPlayer registers onUnmounted, so it needs a component instance. */
function mountPlayer(mod: Mod) {
  let api!: ReturnType<Mod["useMidiPlayer"]>;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = mod.useMidiPlayer();
        return () => null;
      },
    }),
  );
  return { api, wrapper };
}

function makeFile(durationMs: number, noteCount = 4): ParsedMidiFile {
  const events = [];
  for (let i = 0; i < noteCount; i++) {
    const timeMs = (durationMs / noteCount) * i;
    events.push({ timeMs, data: [0x90, 60 + i, 100] });
    events.push({ timeMs: timeMs + 50, data: [0x80, 60 + i, 0] });
  }
  return {
    format: 0,
    ticksPerQuarter: 480,
    initialUsPerQuarter: 500_000,
    bpm: 120,
    keySignature: null,
    events,
    durationMs,
  };
}

/** A fake Web MIDI access object exposing the given outputs. */
function stubMidiAccess(outputIds: string[]) {
  const sends = new Map<string, number[][]>();
  const outputs = new Map(
    outputIds.map((id) => [
      id,
      {
        id,
        name: `Device ${id}`,
        manufacturer: "Test",
        send: (bytes: number[]) => {
          sends.set(id, [...(sends.get(id) ?? []), bytes]);
        },
      },
    ]),
  );
  const access = { outputs, onstatechange: null as null | (() => void) };
  Object.defineProperty(window.navigator, "requestMIDIAccess", {
    configurable: true,
    value: vi.fn(async () => access),
  });
  return { access, sends };
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window.navigator as any).requestMIDIAccess;
});

// ===========================================================================
describe("playback promises", () => {
  it("resolves true when a file plays to its end", async () => {
    const mod = await loadModule();
    const { api } = mountPlayer(mod);

    const done = api.playSingle(makeFile(1000));
    expect(api.isPlaying.value).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);

    await expect(done).resolves.toBe(true);
    expect(api.isPlaying.value).toBe(false);
  });

  it("resolves false — not never — when stop() is called mid-file", async () => {
    // stop() clears the timer that would have resolved the section promise, so
    // it has to settle the promise itself. Every Stop/Vor/Zurück press in the
    // run step used to leave an awaited frame pending for the page's lifetime.
    const mod = await loadModule();
    const { api } = mountPlayer(mod);

    const done = api.playSingle(makeFile(1000));
    await vi.advanceTimersByTimeAsync(200);
    api.stop();

    await expect(done).resolves.toBe(false);
    expect(api.isPlaying.value).toBe(false);
    expect(api.progress.value.stage).toBe("idle");
  });

  it("resolves the whole trio sequence false when stopped during a verse", async () => {
    const mod = await loadModule();
    const { api } = mountPlayer(mod);

    const done = api.playSequence(makeFile(400), makeFile(400), makeFile(400), 3);
    // Past the intro and its pause, into the first main verse.
    await vi.advanceTimersByTimeAsync(1600);
    expect(api.progress.value.stage).toBe("verse");
    api.stop();

    await expect(done).resolves.toBe(false);
  });

  it("resolves false without playing when no output is selected", async () => {
    const mod = await loadModule();
    const { api } = mountPlayer(mod);
    api.setSelectedOutput("");

    await expect(api.playSingle(makeFile(500))).resolves.toBe(false);
    expect(api.isPlaying.value).toBe(false);
  });

  it("supersedes its own earlier run: the first promise resolves false", async () => {
    const mod = await loadModule();
    const { api } = mountPlayer(mod);

    const first = api.playSingle(makeFile(1000));
    await vi.advanceTimersByTimeAsync(100);
    const second = api.playSingle(makeFile(300));

    await expect(first).resolves.toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    await expect(second).resolves.toBe(true);
  });
});

// ===========================================================================
describe("one audible instance at a time", () => {
  it("stops the other instance when a second one starts playing", async () => {
    // Every song row in the setup step owns its own player. Previewing a
    // second song used to play both at once through the shared sink.
    const mod = await loadModule();
    const a = mountPlayer(mod).api;
    const b = mountPlayer(mod).api;

    const playA = a.playSingle(makeFile(1000));
    await vi.advanceTimersByTimeAsync(100);
    expect(a.isPlaying.value).toBe(true);

    const playB = b.playSingle(makeFile(500));

    expect(a.isPlaying.value).toBe(false);
    expect(b.isPlaying.value).toBe(true);
    await expect(playA).resolves.toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    await expect(playB).resolves.toBe(true);
  });

  it("stops playback when the owning component unmounts", async () => {
    const mod = await loadModule();
    const { api, wrapper } = mountPlayer(mod);

    const done = api.playSingle(makeFile(1000));
    await vi.advanceTimersByTimeAsync(100);
    wrapper.unmount();

    await expect(done).resolves.toBe(false);
  });
});

// ===========================================================================
describe("selected output device", () => {
  it("falls back to the browser synth before MIDI access is granted", async () => {
    const mod = await loadModule();
    const { api } = mountPlayer(mod);

    expect(api.selectedOutputId.value).toBe(mod.BROWSER_SYNTH_ID);
  });

  it("keeps the stored device id when the device is not (yet) enumerated", async () => {
    // The outputs list is seeded at module load, before MIDI access exists.
    // That used to blank the stored organ id and persist the browser synth in
    // its place — on every launch — so the organist re-picked the organ each
    // Sunday.
    localStorage.setItem(STORED_DEVICE_KEY, "organ-1");
    const mod = await loadModule();
    const { api } = mountPlayer(mod);

    expect(api.selectedOutputId.value).toBe(mod.BROWSER_SYNTH_ID);
    expect(localStorage.getItem(STORED_DEVICE_KEY)).toBe("organ-1");
  });

  it("selects the stored device as soon as it appears", async () => {
    localStorage.setItem(STORED_DEVICE_KEY, "organ-1");
    stubMidiAccess(["organ-1", "keyboard-2"]);
    const mod = await loadModule();
    const { api } = mountPlayer(mod);

    await api.requestAccess();

    expect(api.selectedOutputId.value).toBe("organ-1");
  });

  it("auto-picks a single real device without persisting the choice", async () => {
    stubMidiAccess(["organ-1"]);
    const mod = await loadModule();
    const { api } = mountPlayer(mod);

    await api.requestAccess();

    expect(api.selectedOutputId.value).toBe("organ-1");
    expect(localStorage.getItem(STORED_DEVICE_KEY)).toBeNull();
  });

  it("persists only an explicit pick", async () => {
    stubMidiAccess(["organ-1", "keyboard-2"]);
    const mod = await loadModule();
    const { api } = mountPlayer(mod);
    await api.requestAccess();

    api.setSelectedOutput("keyboard-2");

    expect(api.selectedOutputId.value).toBe("keyboard-2");
    expect(localStorage.getItem(STORED_DEVICE_KEY)).toBe("keyboard-2");
  });

  it("silences the outgoing device when the output is switched mid-playback", async () => {
    // The organ otherwise held whatever chord was sounding; only reselecting it
    // and pressing Play would clear it.
    const { sends } = stubMidiAccess(["organ-1", "keyboard-2"]);
    const mod = await loadModule();
    const { api } = mountPlayer(mod);
    await api.requestAccess();
    api.setSelectedOutput("organ-1");

    const done = api.playSingle(makeFile(1000));
    await vi.advanceTimersByTimeAsync(300);
    // Starting playback already sends an all-notes-off to the current sink;
    // only what arrives after the switch is the outgoing-device panic.
    const before = (sends.get("organ-1") ?? []).length;
    api.setSelectedOutput("keyboard-2");

    const toOrgan = (sends.get("organ-1") ?? []).slice(before);
    // CC 120 (All Sound Off) and CC 123 (All Notes Off) on every channel.
    expect(toOrgan.filter((m) => m[1] === 120)).toHaveLength(16);
    expect(toOrgan.filter((m) => m[1] === 123)).toHaveLength(16);

    // The rest of the file goes to the new device.
    await vi.advanceTimersByTimeAsync(700);
    await done;
    expect((sends.get("keyboard-2") ?? []).some((m) => (m[0] & 0xf0) === 0x90)).toBe(true);
  });
});

// ===========================================================================
// Parser. A Standard MIDI File is built by hand so the expectations are about
// bytes, not about a fixture nobody can read.
// ===========================================================================
function be32(n: number) {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}
function be16(n: number) {
  return [(n >>> 8) & 0xff, n & 0xff];
}
function ascii(s: string) {
  return [...s].map((c) => c.charCodeAt(0));
}

/** Format-0 file, 480 ticks per quarter, with the given track events. */
function smf(track: number[]): ArrayBuffer {
  const bytes = [
    ...ascii("MThd"),
    ...be32(6),
    ...be16(0),
    ...be16(1),
    ...be16(480),
    ...ascii("MTrk"),
    ...be32(track.length),
    ...track,
  ];
  return new Uint8Array(bytes).buffer;
}

describe("parseMidiFile", () => {
  it("reads tempo, key signature and note timing from a format-0 file", async () => {
    const { parseMidiFile } = await loadModule();
    const track = [
      0x00,
      0xff,
      0x51,
      0x03,
      0x07,
      0xa1,
      0x20, // tempo 500 000 µs/quarter = 120 BPM
      0x00,
      0xff,
      0x59,
      0x02,
      0x01,
      0x00, // key signature: 1 sharp, major
      0x00,
      0x90,
      0x3c,
      0x64, // note on C4 at t=0
      0x83,
      0x60,
      0x80,
      0x3c,
      0x00, // note off after 480 ticks (VLQ 0x83 0x60)
      0x00,
      0xff,
      0x2f,
      0x00, // end of track
    ];

    const file = parseMidiFile(smf(track));

    expect(file.format).toBe(0);
    expect(file.ticksPerQuarter).toBe(480);
    expect(file.initialUsPerQuarter).toBe(500_000);
    expect(file.bpm).toBe(120);
    expect(file.keySignature).toEqual({ sf: 1, mi: 0 });
    const notes = file.events.filter((e) => e.data.length > 0);
    expect(notes.map((e) => e.data)).toEqual([
      [0x90, 0x3c, 0x64],
      [0x80, 0x3c, 0x00],
    ]);
    expect(notes[0].timeMs).toBe(0);
    // 480 ticks at 500 000 µs per quarter = 500 ms.
    expect(notes[1].timeMs).toBeCloseTo(500, 6);
    expect(file.durationMs).toBeGreaterThanOrEqual(499.99);
  });

  it("handles running status and a large variable-length delta", async () => {
    const { parseMidiFile } = await loadModule();
    const track = [
      0x00,
      0x90,
      0x40,
      0x60, // note on E4 (sets running status)
      0x81,
      0x80,
      0x00,
      0x40,
      0x00, // 16384 ticks later, note off via running status (vel 0)
      0x00,
      0xff,
      0x2f,
      0x00,
    ];

    const file = parseMidiFile(smf(track));

    const notes = file.events.filter((e) => e.data.length > 0);
    expect(notes[1]).toEqual({ timeMs: (16384 / 480) * 500, data: [0x90, 0x40, 0x00] });
  });

  it("rejects anything that is not a Standard MIDI File", async () => {
    const { parseMidiFile } = await loadModule();

    expect(() => parseMidiFile(new Uint8Array(ascii("RIFF....")).buffer)).toThrow(
      /Standard MIDI File/,
    );
  });
});

// ===========================================================================
describe("transposition", () => {
  it("shifts note keys by the requested semitones and drops notes that leave the range", async () => {
    const { sends } = stubMidiAccess(["organ-1"]);
    const mod = await loadModule();
    const { api } = mountPlayer(mod);
    await api.requestAccess();

    const file: ParsedMidiFile = {
      ...makeFile(200, 0),
      events: [
        { timeMs: 0, data: [0x90, 60, 100] },
        { timeMs: 0, data: [0x90, 127, 100] }, // 127 + 2 leaves 0..127 → dropped
        { timeMs: 0, data: [0xb0, 7, 100] }, // a controller passes through untouched
      ],
    };
    const done = api.playSingle(file, { pitchSemitones: 2 });
    await vi.advanceTimersByTimeAsync(200);
    await done;

    const noteOns = (sends.get("organ-1") ?? []).filter((m) => (m[0] & 0xf0) === 0x90);
    expect(noteOns).toEqual([[0x90, 62, 100]]);
    expect(sends.get("organ-1")).toContainEqual([0xb0, 7, 100]);
  });
});

// ===========================================================================
describe("reference tone", () => {
  it("sounds a note now and silences it after the duration", async () => {
    const { sends } = stubMidiAccess(["organ-1"]);
    const mod = await loadModule();
    const { api } = mountPlayer(mod);
    await api.requestAccess();

    api.playTone(60, 100);
    expect(sends.get("organ-1")).toContainEqual([0x90, 60, 96]);

    await vi.advanceTimersByTimeAsync(100);
    expect(sends.get("organ-1")).toContainEqual([0x80, 60, 0]);
  });
});

// ===========================================================================
describe("shared settings", () => {
  it("clamps and persists the synth volume and program", async () => {
    const mod = await loadModule();
    const settings = mod.useSynthSettings();

    settings.setVolume(150);
    settings.setProgram(-3);

    expect(settings.volume.value).toBe(100);
    expect(settings.program.value).toBe(0);
    expect(localStorage.getItem("gb-pwa.synth.volume")).toBe("100");
    expect(localStorage.getItem("gb-pwa.synth.program")).toBe("0");
    expect(settings.presets.some((p) => p.key === "churchOrgan")).toBe(true);
  });

  it("persists the key-change tone toggle, defaulting to on", async () => {
    const mod = await loadModule();
    const tone = mod.useKeyChangeTone();
    expect(tone.enabled.value).toBe(true);

    tone.setEnabled(false);

    expect(tone.enabled.value).toBe(false);
    expect(localStorage.getItem("gb-pwa.synth.keyChangeTone")).toBe("0");
  });

  it("exposes the device view without the playback state", async () => {
    const mod = await loadModule();
    const devices = mod.useMidiDevices();

    expect(devices.isSupported.value).toBe(false);
    expect(devices.outputs.value.map((o) => o.id)).toEqual([mod.BROWSER_SYNTH_ID]);

    await devices.requestAccess();

    expect(devices.accessError.value).toMatch(/not supported/);
  });
});

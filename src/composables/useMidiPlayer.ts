import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { WorkletSynthesizer } from "spessasynth_lib";
import { computed, onUnmounted, readonly, ref } from "vue";

import {
  fetchAssetByUrl,
  getCachedSoundfontId,
  setCachedSoundfontId,
} from "@/composables/useOfflineDownload";

// Parsed representation of a single MIDI file. The structure intentionally
// drops timing-conversion concerns into a flat sorted event list — playback
// just walks it.
export interface ParsedMidiFile {
  format: number;
  ticksPerQuarter: number;
  // First SetTempo Meta-Event in microseconds-per-quarter-note. 500_000 = 120 BPM.
  initialUsPerQuarter: number;
  // Convenience: BPM derived from `initialUsPerQuarter`. UI surfaces this so a
  // user can adjust playback in BPM instead of opaque speed multipliers.
  bpm: number;
  // First KeySignature Meta-Event in the file (FF 59 02 sf mi). Optional —
  // many engraved hymn files omit it, in which case downstream UI falls back
  // to a semitone-only display.
  keySignature: MidiKeySignature | null;
  events: AbsoluteMidiEvent[];
  // Total length (ms) — computed at parse time, used for status & schedulers.
  durationMs: number;
}

// Raw MIDI KeySignature event payload. `sf` is the signed sharps/flats count
// (positive = sharps, negative = flats, range -7..7). `mi` distinguishes
// major (0) from minor (1).
export interface MidiKeySignature {
  sf: number;
  mi: 0 | 1;
}

export interface AbsoluteMidiEvent {
  // Absolute time from start of file, in milliseconds.
  timeMs: number;
  // Raw MIDI bytes ready to send via MIDIOutput.send(). Empty for meta-only events
  // we don't forward (tempo changes are applied during parse, not forwarded).
  data: number[];
}

export interface MidiOutputDevice {
  id: string;
  name: string;
  manufacturer: string;
  // Dispatch a raw MIDI message (status + data bytes). For real Web MIDI outputs
  // this delegates to `MIDIOutput.send`; for the in-browser fallback synth it
  // routes into a small Web Audio synthesizer. The caller doesn't care which.
  send: (bytes: number[]) => void;
}

// Sentinel ID for the always-available in-browser synth fallback. Exported so
// the picker UI can detect it (e.g. to translate the name or suppress the
// "(manufacturer)" suffix).
export const BROWSER_SYNTH_ID = "browser-synth";

// Stages reported by the playback engine. "single" is the standalone-piece
// path (intro/outro Vorspiel/Nachspiel) where there is exactly one file and
// no verse iteration — the other stages only apply to the trio sequence.
export type SequenceStage = "intro" | "verse" | "outro" | "pause" | "single" | "idle";

export interface SequenceProgress {
  stage: SequenceStage;
  // 1-based for "verse" stage, otherwise 0.
  verseNumber: number;
  totalVerses: number;
}

// Optional per-playback overrides. Applied to both the trio sequence and the
// pause between sections. `speed = 1` and `pitchSemitones = 0` are neutral and
// callers can omit the option entirely to get original-tempo, original-pitch.
export interface PlaybackOptions {
  // Playback rate multiplier (1 = original tempo, 2 = double speed).
  speed?: number;
  // Semitone transposition applied to Note On/Off/Aftertouch events.
  pitchSemitones?: number;
}

// Curated subset of General MIDI programs that make sense for hymn playback.
// Translation keys live under `settings.synth.presets.<key>`.
export interface SynthPreset {
  program: number;
  key: string;
}
export const SYNTH_PRESETS: readonly SynthPreset[] = [
  { program: 19, key: "churchOrgan" },
  { program: 16, key: "drawbarOrgan" },
  { program: 20, key: "reedOrgan" },
  { program: 0, key: "acousticGrandPiano" },
  { program: 6, key: "harpsichord" },
  { program: 48, key: "stringsEnsemble" },
  { program: 52, key: "choirAahs" },
];

const DEFAULT_US_PER_QUARTER = 500_000; // 120 BPM
const STORED_DEVICE_KEY = "gb-pwa.midi.selectedOutputId";
const STORED_VOLUME_KEY = "gb-pwa.synth.volume"; // 0-100
const STORED_PROGRAM_KEY = "gb-pwa.synth.program"; // 0-127 (GM)
const STORED_KEY_TONE_KEY = "gb-pwa.synth.keyChangeTone"; // "1" | "0"
const DEFAULT_VOLUME = 70;
const DEFAULT_PROGRAM = 19; // Church Organ

// --------------------------------------------------------------------------
// Parser
// --------------------------------------------------------------------------

export function parseMidiFile(buffer: ArrayBuffer): ParsedMidiFile {
  const data = new Uint8Array(buffer);
  if (data.length < 14 || readAscii(data, 0, 4) !== "MThd") {
    throw new Error("Not a valid Standard MIDI File");
  }
  const headerLength = readUint32(data, 4);
  const format = readUint16(data, 8);
  const trackCount = readUint16(data, 10);
  const division = readUint16(data, 12);
  if ((division & 0x8000) !== 0) {
    // SMPTE timecode division — extremely rare for our use case.
    throw new Error("SMPTE timecode MIDI files are not supported");
  }
  const ticksPerQuarter = division;

  let offset = 8 + headerLength;
  let initialUsPerQuarter: number | null = null;
  let keySignature: MidiKeySignature | null = null;

  type RawTrackEvent = { absoluteTicks: number; data: number[] };
  const tracks: RawTrackEvent[][] = [];

  for (let t = 0; t < trackCount; t++) {
    if (readAscii(data, offset, 4) !== "MTrk") {
      throw new Error(`Missing MTrk at offset ${offset}`);
    }
    const trackLength = readUint32(data, offset + 4);
    const trackEnd = offset + 8 + trackLength;
    offset += 8;

    const events: RawTrackEvent[] = [];
    let absoluteTicks = 0;
    let runningStatus = 0;

    while (offset < trackEnd) {
      const vlq = readVariableLength(data, offset);
      offset += vlq.length;
      absoluteTicks += vlq.value;

      let statusByte = data[offset];
      if (statusByte < 0x80) {
        // Running status: reuse previous status byte, don't advance.
        statusByte = runningStatus;
      } else {
        offset++;
        runningStatus = statusByte;
      }

      if (statusByte >= 0x80 && statusByte <= 0xef) {
        // Channel voice/mode message
        const dataLen = channelMessageDataLength(statusByte);
        const bytes = [statusByte];
        for (let i = 0; i < dataLen; i++) bytes.push(data[offset++]);
        events.push({ absoluteTicks, data: bytes });
      } else if (statusByte === 0xff) {
        // Meta event
        const metaType = data[offset++];
        const len = readVariableLength(data, offset);
        offset += len.length;
        const start = offset;
        offset += len.value;
        if (metaType === 0x51 && len.value === 3) {
          // SetTempo: 3 bytes microseconds-per-quarter-note
          const us = (data[start] << 16) | (data[start + 1] << 8) | data[start + 2];
          // We only honor the very first tempo (heuristic — most hymnal files
          // have a single tempo). Multi-tempo files would degrade gracefully:
          // playback timing follows the *first* tempo throughout.
          if (initialUsPerQuarter === null) {
            initialUsPerQuarter = us;
          }
        } else if (metaType === 0x59 && len.value === 2 && keySignature === null) {
          // KeySignature: signed sharps/flats + minor flag. Honor only the
          // first occurrence (mirrors the tempo policy above).
          const sfRaw = data[start];
          const sf = sfRaw > 127 ? sfRaw - 256 : sfRaw;
          if (sf >= -7 && sf <= 7) {
            keySignature = { sf, mi: data[start + 1] === 1 ? 1 : 0 };
          }
        }
        // Other meta events (text, time signature, end-of-track…) are discarded
        // — they don't drive playback to a MIDI device.
      } else if (statusByte === 0xf0 || statusByte === 0xf7) {
        // SysEx — pass through verbatim, in case the device expects it.
        const len = readVariableLength(data, offset);
        offset += len.length;
        const bytes: number[] = [statusByte];
        for (let i = 0; i < len.value; i++) bytes.push(data[offset++]);
        events.push({ absoluteTicks, data: bytes });
      } else {
        throw new Error(`Unknown MIDI status byte 0x${statusByte.toString(16)}`);
      }
    }
    tracks.push(events);
  }

  const usPerQuarter = initialUsPerQuarter ?? DEFAULT_US_PER_QUARTER;
  const msPerTick = usPerQuarter / 1000 / ticksPerQuarter;

  const merged: AbsoluteMidiEvent[] = [];
  let maxTicks = 0;
  for (const track of tracks) {
    for (const ev of track) {
      merged.push({ timeMs: ev.absoluteTicks * msPerTick, data: ev.data });
      if (ev.absoluteTicks > maxTicks) maxTicks = ev.absoluteTicks;
    }
  }
  merged.sort((a, b) => a.timeMs - b.timeMs);

  return {
    format,
    ticksPerQuarter,
    initialUsPerQuarter: usPerQuarter,
    bpm: 60_000_000 / usPerQuarter,
    keySignature,
    events: merged,
    durationMs: maxTicks * msPerTick,
  };
}

// --------------------------------------------------------------------------
// Key signature → tonic helpers
//
// MIDI's KeySignature event encodes the key by (sf, mi) — number of sharps/
// flats plus major/minor. We project to a pitch class (0..11, C=0), apply the
// user's semitone transposition, then render in German nomenclature.
// --------------------------------------------------------------------------

// Pitch class (0..11) of a key's tonic. Major and minor use the same circle-
// of-fifths math; minor is shifted 3 semitones down to land on the relative
// minor (C major shares a signature with A minor).
export function tonicPitchClass(sig: MidiKeySignature): number {
  const base = sig.mi === 1 ? sig.sf * 7 - 3 : sig.sf * 7;
  return ((base % 12) + 12) % 12;
}

// Pick sharp vs flat spelling: keys with flats prefer flats (Es, As, B),
// everything else prefers sharps (Cis, Dis, Gis). Natural keys (sf=0) read
// the same in either system.
const GERMAN_SHARP = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "Ais", "H"];
const GERMAN_FLAT = ["C", "Des", "D", "Es", "E", "F", "Ges", "G", "As", "A", "B", "H"];

export function tonicNameGerman(
  sig: MidiKeySignature,
  semitoneOffset = 0,
): string {
  const pc = ((tonicPitchClass(sig) + semitoneOffset) % 12 + 12) % 12;
  const useFlats = sig.sf < 0;
  const name = (useFlats ? GERMAN_FLAT : GERMAN_SHARP)[pc];
  // Lower-case "m" suffix marks minor. Major just shows the bare tonic.
  return sig.mi === 1 ? `${name}m` : name;
}

// --------------------------------------------------------------------------
// In-browser fallback synthesizer
//
// Two-stage strategy:
//   1. SpessaSynth (AudioWorklet + SoundFont) — the good-sounding default.
//      Soundfont is fetched lazily from Directus on first use.
//   2. Oscillator fallback — kicks in when no soundfont is configured, fetch
//      fails, or AudioWorklet isn't supported. Same naive triangle+sine voice
//      we had before SpessaSynth was introduced; better than silence.
//
// State (volume, instrument program) is exposed via `useSynthSettings()` so
// the Settings page can read/write without knowing which backend is active.
// --------------------------------------------------------------------------

const WORKLET_URL = `${import.meta.env.BASE_URL}spessasynth_processor.min.js`;

/**
 * Resolves the soundfont asset URL. Online, it reads the id from the Directus
 * `settings` singleton and back-fills it into local storage so the soundfont
 * stays usable offline. Offline (or when the settings query fails), it falls
 * back to the id persisted at download time — the blob was precached into
 * IndexedDB, so `fetchAssetByUrl` serves it without a network round-trip.
 *
 * The URL is always `${directusUrl}/assets/<id>` so `fetchAssetByUrl` can map
 * it back to the cached blob. Returns null only when there's genuinely no
 * soundfont to load (no id online, none cached offline) → oscillator fallback.
 *
 * A null/failed result is NOT cached, so a later call retries (e.g. once the id
 * has been persisted or connectivity returns).
 */
let cachedSoundfontUrlPromise: Promise<string | null> | null = null;
export function getSoundfontUrl(): Promise<string | null> {
  if (cachedSoundfontUrlPromise) return cachedSoundfontUrlPromise;

  const promise = (async () => {
    const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
    if (!directusUrl) return null;

    const buildUrl = (id: string) => `${directusUrl}/assets/${id}`;
    const cachedId = getCachedSoundfontId();
    const online = typeof navigator === "undefined" || navigator.onLine;

    // Offline: rely on the id persisted at download time.
    if (!online) {
      return cachedId ? buildUrl(cachedId) : null;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // Auth header only if available — the field SHOULD be readable by the
      // public role, but if it isn't we'll still try the user's token.
      const authStore = useAuthStore();
      if (authStore.accessToken) {
        headers["Authorization"] = `Bearer ${authStore.accessToken}`;
      }
      const res = await axios.post<{
        data: { settings: { soundfont: { id: string } | null } | null };
      }>(
        `${directusUrl}/graphql`,
        { query: "query { settings { soundfont { id } } }" },
        { headers },
      );
      const sfId = res.data?.data?.settings?.soundfont?.id;
      if (sfId) {
        // Back-fill so the soundfont resolves offline next time (also fixes
        // downloads made before the id was persisted).
        setCachedSoundfontId(sfId);
        return buildUrl(sfId);
      }
      // Settings reachable but no soundfont configured: fall back to a cached
      // id if we have one (don't clear it — a transient empty read shouldn't
      // wipe a known-good reference), otherwise none.
      return cachedId ? buildUrl(cachedId) : null;
    } catch (err) {
      console.warn("Failed to fetch soundfont reference from settings:", err);
      // Network/permission failure despite being "online" — use the last known
      // id if available.
      return cachedId ? buildUrl(cachedId) : null;
    }
  })();

  cachedSoundfontUrlPromise = promise;
  // Don't memoize a null/failed resolution — allow a later retry.
  promise
    .then((url) => {
      if (!url) cachedSoundfontUrlPromise = null;
    })
    .catch(() => {
      cachedSoundfontUrlPromise = null;
    });
  return promise;
}

// Module-level synth settings (persisted to localStorage).
const synthVolumeRef = ref<number>(loadStoredVolume());
const synthProgramRef = ref<number>(loadStoredProgram());
type SynthBackend = "spessasynth" | "oscillator" | "loading" | "idle";
const synthBackendRef = ref<SynthBackend>("idle");
const synthLoadErrorRef = ref<string | null>(null);

function loadStoredVolume(): number {
  if (typeof localStorage === "undefined") return DEFAULT_VOLUME;
  const raw = localStorage.getItem(STORED_VOLUME_KEY);
  if (raw === null) return DEFAULT_VOLUME;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_VOLUME;
}

function loadStoredProgram(): number {
  if (typeof localStorage === "undefined") return DEFAULT_PROGRAM;
  const raw = localStorage.getItem(STORED_PROGRAM_KEY);
  if (raw === null) return DEFAULT_PROGRAM;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 127 ? n : DEFAULT_PROGRAM;
}

// Whether changing a song/piece key in the setup step plays a short reference
// tone of the resulting tonic. On by default; persisted so the operator's
// preference survives reloads. Shared module-level so every per-song control
// stays in lockstep with a single toggle.
const keyChangeToneEnabledRef = ref<boolean>(loadStoredKeyTone());

function loadStoredKeyTone(): boolean {
  if (typeof localStorage === "undefined") return true;
  // Default on: only an explicit "0" disables it.
  return localStorage.getItem(STORED_KEY_TONE_KEY) !== "0";
}

function setKeyChangeToneEnabledShared(v: boolean) {
  keyChangeToneEnabledRef.value = v;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORED_KEY_TONE_KEY, v ? "1" : "0");
  }
}

/**
 * Shared toggle for the "play a reference tone when the key changes" behavior
 * in the church-service setup step. Reactive across every playback-control
 * instance so flipping it on one song applies everywhere.
 */
export function useKeyChangeTone() {
  return {
    enabled: readonly(keyChangeToneEnabledRef),
    setEnabled: setKeyChangeToneEnabledShared,
  };
}

function setSynthVolumeShared(v: number) {
  const clamped = Math.min(100, Math.max(0, v));
  synthVolumeRef.value = clamped;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORED_VOLUME_KEY, String(clamped));
  }
  getBrowserSynth().applyVolume(clamped);
}

function setSynthProgramShared(p: number) {
  const clamped = Math.min(127, Math.max(0, Math.floor(p)));
  synthProgramRef.value = clamped;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORED_PROGRAM_KEY, String(clamped));
  }
  getBrowserSynth().applyProgram(clamped);
}

/**
 * Wraps SpessaSynth with an oscillator fallback. Both stages share one
 * AudioContext + master GainNode so the volume slider works regardless of
 * which backend is currently driving sound.
 */
class BrowserSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private worklet: WorkletSynthesizer | null = null;
  private oscFallback: OscFallback | null = null;
  // Messages received while SpessaSynth is still loading. Flushed on init
  // completion (or routed to the oscillator fallback if init fails).
  private pendingMessages: number[][] = [];
  private initStarted = false;

  send(data: number[]) {
    if (!data.length) return;
    this.ensureInit();
    if (this.oscFallback) {
      this.oscFallback.send(data);
      return;
    }
    if (!this.worklet) {
      // Init still in flight — buffer so the first notes after page-load
      // aren't lost. Worst case the user hears a tiny startup delay.
      this.pendingMessages.push(data);
      return;
    }
    // Drop Program Change so the user's chosen preset isn't clobbered by
    // whatever the MIDI file declares (hymn files often default to piano).
    if ((data[0] & 0xf0) === 0xc0) return;
    this.worklet.sendMessage(data);
  }

  applyVolume(v: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(v / 100, this.ctx.currentTime, 0.01);
    }
  }

  applyProgram(p: number) {
    if (!this.worklet) return;
    for (let ch = 0; ch < 16; ch++) this.worklet.programChange(ch, p);
  }

  private ensureInit() {
    if (this.initStarted) return;
    this.initStarted = true;

    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      console.warn("Web Audio API not available — browser synth inactive");
      synthBackendRef.value = "idle";
      return;
    }

    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = synthVolumeRef.value / 100;
    this.masterGain.connect(this.ctx.destination);
    // First send() during playback IS a user gesture (the operator clicked
    // "Lied starten"), so resume() succeeds here.
    if (this.ctx.state === "suspended") void this.ctx.resume();

    synthBackendRef.value = "loading";
    synthLoadErrorRef.value = null;
    void this.initSpessaSynth();
  }

  private async initSpessaSynth() {
    try {
      const sfUrl = await getSoundfontUrl();
      if (!sfUrl) {
        this.useOscFallback("no soundfont configured in settings");
        return;
      }
      await this.ctx!.audioWorklet.addModule(WORKLET_URL);
      // `fetchAssetByUrl` reads from IndexedDB first when the soundfont was
      // precached during offline download, otherwise hits the network.
      const sfBuffer = await fetchAssetByUrl(sfUrl);

      // SpessaSynth ships with reverb + chorus built in; the SynthConfig only
      // exposes plumbing-level toggles (oneOutput, event system) — sound design
      // is controlled via MIDI CC, not constructor flags.
      const worklet = new WorkletSynthesizer(this.ctx!);
      worklet.connect(this.masterGain!);
      await worklet.soundBankManager.addSoundBank(sfBuffer, "main");
      await worklet.isReady;

      this.worklet = worklet;
      for (let ch = 0; ch < 16; ch++) worklet.programChange(ch, synthProgramRef.value);

      // Flush queued messages (skip program changes — preset is locked).
      for (const msg of this.pendingMessages) {
        if ((msg[0] & 0xf0) === 0xc0) continue;
        worklet.sendMessage(msg);
      }
      this.pendingMessages = [];
      synthBackendRef.value = "spessasynth";
    } catch (err) {
      console.error("SpessaSynth init failed, falling back to oscillator:", err);
      this.useOscFallback((err as Error)?.message ?? "init failed");
    }
  }

  private useOscFallback(reason: string) {
    synthLoadErrorRef.value = reason;
    if (!this.ctx || !this.masterGain) {
      synthBackendRef.value = "idle";
      return;
    }
    const fb = new OscFallback(this.ctx, this.masterGain);
    this.oscFallback = fb;
    synthBackendRef.value = "oscillator";
    for (const msg of this.pendingMessages) fb.send(msg);
    this.pendingMessages = [];
  }
}

/**
 * Original ~50-line oscillator synth. Kept verbatim minus the AudioContext +
 * masterGain management, which is now owned by the parent `BrowserSynth`.
 * Honors Note On/Off and All-Sound-Off / All-Notes-Off (CC 120/123). Program
 * change, pitch bend, CC etc. are silently dropped.
 */
class OscFallback {
  // Parameter properties aren't permitted under `erasableSyntaxOnly`, so the
  // ctx/out fields are declared and assigned the long way.
  private ctx: AudioContext;
  private out: GainNode;
  private active = new Map<string, { oscs: OscillatorNode[]; gain: GainNode }>();
  constructor(ctx: AudioContext, out: GainNode) {
    this.ctx = ctx;
    this.out = out;
  }

  send(data: number[]) {
    if (!data.length) return;
    const status = data[0];
    const type = status & 0xf0;
    const channel = status & 0x0f;

    if (type === 0x90 && data[2] > 0) {
      this.noteOn(channel, data[1], data[2]);
    } else if (type === 0x80 || (type === 0x90 && data[2] === 0)) {
      this.noteOff(channel, data[1]);
    } else if (type === 0xb0 && (data[1] === 120 || data[1] === 123)) {
      this.allOff();
    }
  }

  private noteOn(channel: number, note: number, velocity: number) {
    this.noteOff(channel, note);
    const freq = 440 * Math.pow(2, (note - 69) / 12);
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.value = freq;
    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    const gain = this.ctx.createGain();
    // Conservative per-voice peak — many simultaneous voices in a hymn chord
    // would clip if we ran near unity (master gain handles user volume on top).
    const peak = (velocity / 127) * 0.25;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.025);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.out);
    osc1.start(now);
    osc2.start(now);
    this.active.set(this.key(channel, note), { oscs: [osc1, osc2], gain });
  }

  private noteOff(channel: number, note: number) {
    const v = this.active.get(this.key(channel, note));
    if (!v) return;
    const now = this.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + 0.12);
    v.oscs.forEach((o) => o.stop(now + 0.14));
    this.active.delete(this.key(channel, note));
  }

  private allOff() {
    const now = this.ctx.currentTime;
    for (const v of this.active.values()) {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0, now + 0.05);
      v.oscs.forEach((o) => o.stop(now + 0.07));
    }
    this.active.clear();
  }

  private key(channel: number, note: number) {
    return `${channel}:${note}`;
  }
}

let browserSynthInstance: BrowserSynth | null = null;
function getBrowserSynth(): BrowserSynth {
  if (!browserSynthInstance) browserSynthInstance = new BrowserSynth();
  return browserSynthInstance;
}

/**
 * Browser-synth settings (volume, instrument preset, loading state). Reactive
 * across the app — both the Settings page and the player header observe the
 * same refs.
 */
export function useSynthSettings() {
  return {
    volume: readonly(synthVolumeRef),
    program: readonly(synthProgramRef),
    backend: readonly(synthBackendRef),
    loadError: readonly(synthLoadErrorRef),
    presets: SYNTH_PRESETS,
    setVolume: setSynthVolumeShared,
    setProgram: setSynthProgramShared,
  };
}

// --------------------------------------------------------------------------
// Shared device state (module-level singleton)
//
// MIDI access is global to the browser session — multiple components asking
// independently would duplicate the permission prompt and desync the device
// list. We hoist all device-related refs out of `useMidiPlayer` so the picker
// in Settings and the picker in any player stay in lockstep automatically.
// --------------------------------------------------------------------------

const isSupportedRef = ref(
  typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function",
);
const midiAccessRef = ref<WebMidi.MIDIAccess | null>(null);
const outputsRef = ref<MidiOutputDevice[]>([]);
const selectedOutputIdRef = ref<string>(
  typeof localStorage !== "undefined" ? (localStorage.getItem(STORED_DEVICE_KEY) ?? "") : "",
);
const accessErrorRef = ref<string | null>(null);

let accessRequest: Promise<void> | null = null;

async function requestAccessShared(): Promise<void> {
  if (!isSupportedRef.value) {
    accessErrorRef.value = "Web MIDI API not supported in this browser";
    return;
  }
  // Idempotent — multiple components can call this on mount safely.
  if (midiAccessRef.value) return;
  if (accessRequest) return accessRequest;
  accessRequest = (async () => {
    try {
      midiAccessRef.value = await navigator.requestMIDIAccess();
      refreshOutputsShared();
      midiAccessRef.value.onstatechange = refreshOutputsShared;
      accessErrorRef.value = null;
    } catch (err) {
      console.error("Failed to access MIDI:", err);
      accessErrorRef.value = (err as Error)?.message ?? "MIDI access denied";
    } finally {
      accessRequest = null;
    }
  })();
  return accessRequest;
}

function refreshOutputsShared() {
  const list: MidiOutputDevice[] = [];
  // Real Web MIDI outputs (if access has been granted). The synth fallback
  // works without permission, so this block is conditional but the synth below
  // is unconditional.
  if (midiAccessRef.value) {
    midiAccessRef.value.outputs.forEach((out) => {
      list.push({
        id: out.id,
        name: out.name || "Unknown device",
        manufacturer: out.manufacturer || "",
        send: (bytes) => out.send(bytes),
      });
    });
  }
  // In-browser synth — always available, no hardware, no permission required.
  // The picker UI translates the display name based on the BROWSER_SYNTH_ID
  // sentinel so this raw string never reaches the user.
  list.push({
    id: BROWSER_SYNTH_ID,
    name: "Browser-Synthesizer",
    manufacturer: "in-browser",
    send: (bytes) => getBrowserSynth().send(bytes),
  });

  outputsRef.value = list;

  // Drop the stored device if it's no longer connected. The synth is always in
  // the list, so a previously-selected synth survives.
  if (selectedOutputIdRef.value && !list.some((d) => d.id === selectedOutputIdRef.value)) {
    selectedOutputIdRef.value = "";
  }
  // Auto-pick: a single real device wins; otherwise default to the synth so
  // the run step has *something* to play to from the moment the user lands.
  if (!selectedOutputIdRef.value) {
    const real = list.filter((d) => d.id !== BROWSER_SYNTH_ID);
    if (real.length === 1) setSelectedOutputShared(real[0].id);
    else if (real.length === 0) setSelectedOutputShared(BROWSER_SYNTH_ID);
  }
}

// Seed the outputs list at module load so the synth is immediately selectable —
// the user shouldn't have to grant MIDI access just to use the fallback.
refreshOutputsShared();

function setSelectedOutputShared(id: string) {
  selectedOutputIdRef.value = id;
  if (typeof localStorage !== "undefined") {
    if (id) localStorage.setItem(STORED_DEVICE_KEY, id);
    else localStorage.removeItem(STORED_DEVICE_KEY);
  }
}

const selectedOutputShared = computed<MidiOutputDevice | null>(() => {
  return outputsRef.value.find((o) => o.id === selectedOutputIdRef.value) ?? null;
});

/**
 * Device-only view of the MIDI state. Use this in components that only need
 * to display/change the selected device (Settings page, header status).
 */
export function useMidiDevices() {
  return {
    isSupported: readonly(isSupportedRef),
    midiAccess: readonly(midiAccessRef),
    outputs: readonly(outputsRef),
    selectedOutputId: readonly(selectedOutputIdRef),
    selectedOutput: selectedOutputShared,
    accessError: readonly(accessErrorRef),
    requestAccess: requestAccessShared,
    setSelectedOutput: setSelectedOutputShared,
  };
}

// --------------------------------------------------------------------------
// Per-instance player state (each component owns its own playback)
// --------------------------------------------------------------------------

export function useMidiPlayer() {
  const isPlaying = ref(false);
  const progress = ref<SequenceProgress>({
    stage: "idle",
    verseNumber: 0,
    totalVerses: 0,
  });
  // Wall-clock progress through the current sequence (or single file). Both
  // are 0 while idle; `totalMs` is the precomputed sum of all sections + pauses
  // (already scaled by `speed`), `elapsedMs` is driven by a ~10Hz ticker from
  // `performance.now()`. UI code uses these for a smooth time-based progress
  // bar instead of stepping by stage.
  const elapsedMs = ref(0);
  const totalMs = ref(0);

  const scheduledTimers: ReturnType<typeof setTimeout>[] = [];
  // Sentinel that lets a running sequence detect cancellation across `await`s.
  let runId = 0;
  let sequenceStartTime = 0;
  let tickerId: ReturnType<typeof setInterval> | null = null;

  function startTicker() {
    stopTicker();
    sequenceStartTime = performance.now();
    elapsedMs.value = 0;
    tickerId = setInterval(() => {
      elapsedMs.value = performance.now() - sequenceStartTime;
    }, 100);
  }

  function stopTicker() {
    if (tickerId !== null) {
      clearInterval(tickerId);
      tickerId = null;
    }
  }

  /**
   * Play a sequence: intro → main × (versesCount - 1) → outro.
   *
   * Pauses between sections derive from the section's own tempo: 4 beats
   * (i.e. one bar in 4/4) at the BPM read from its SetTempo meta-event.
   *
   * `versesCount` is the total number of verses including the outro verse,
   * so versesCount=1 → intro + outro, versesCount=4 → intro + main×3 + outro.
   */
  async function playSequence(
    intro: ParsedMidiFile,
    main: ParsedMidiFile,
    outro: ParsedMidiFile,
    versesCount: number,
    options: PlaybackOptions = {},
  ): Promise<void> {
    if (!selectedOutputShared.value) {
      accessErrorRef.value = "No MIDI output device selected";
      return;
    }
    stop(); // Cancel anything in flight.

    const speed = sanitizeSpeed(options.speed);
    const pitch = sanitizePitch(options.pitchSemitones);

    const myRunId = ++runId;
    isPlaying.value = true;
    const totalVerses = Math.max(1, Math.floor(versesCount));

    // Precompute the wall-clock length of the full sequence so the UI can show
    // a smooth time-based progress bar. Pauses match `pauseAfter` exactly.
    const introMs = intro.durationMs / speed;
    const mainMs = main.durationMs / speed;
    const outroMs = outro.durationMs / speed;
    const introPauseMs = computePauseMs(intro, speed);
    const mainPauseMs = computePauseMs(main, speed);
    const mainCount = Math.max(0, totalVerses - 1);
    totalMs.value =
      introMs + introPauseMs + mainCount * (mainMs + mainPauseMs) + outroMs;
    startTicker();

    try {
      // Intro
      progress.value = { stage: "intro", verseNumber: 0, totalVerses };
      await playFile(intro, myRunId, speed, pitch);
      if (myRunId !== runId) return;
      await pauseAfter(intro, myRunId, speed);
      if (myRunId !== runId) return;

      // Main verses (everything except the final one, which is the outro).
      const mainCount = Math.max(0, totalVerses - 1);
      for (let v = 1; v <= mainCount; v++) {
        progress.value = { stage: "verse", verseNumber: v, totalVerses };
        await playFile(main, myRunId, speed, pitch);
        if (myRunId !== runId) return;
        await pauseAfter(main, myRunId, speed);
        if (myRunId !== runId) return;
      }

      // Outro (counts as the final verse).
      progress.value = { stage: "outro", verseNumber: totalVerses, totalVerses };
      await playFile(outro, myRunId, speed, pitch);
    } catch (err) {
      console.error("MIDI playback error:", err);
    } finally {
      if (myRunId === runId) {
        stopTicker();
        // Pin to 100% briefly on natural completion — the scheduled timers may
        // fire a touch before the precomputed total, so the bar would otherwise
        // freeze short of full.
        elapsedMs.value = totalMs.value;
        isPlaying.value = false;
        progress.value = { stage: "idle", verseNumber: 0, totalVerses: 0 };
        allNotesOff();
      }
    }
  }

  /**
   * Play a single MIDI file once. Used for standalone Vorspiel/Nachspiel pieces
   * — no intro/main/outro trio, no verse iteration — and for the setup-step
   * "preview listen" of a song's main MIDI. Resolves when the file's last note
   * time elapses (or stop() is called). `options` apply the same tempo/pitch
   * overrides as the trio sequence.
   */
  async function playSingle(
    file: ParsedMidiFile,
    options: PlaybackOptions = {},
  ): Promise<void> {
    if (!selectedOutputShared.value) {
      accessErrorRef.value = "No MIDI output device selected";
      return;
    }
    stop();
    const speed = sanitizeSpeed(options.speed);
    const pitch = sanitizePitch(options.pitchSemitones);
    const myRunId = ++runId;
    isPlaying.value = true;
    progress.value = { stage: "single", verseNumber: 1, totalVerses: 1 };
    totalMs.value = file.durationMs / speed;
    startTicker();
    try {
      await playFile(file, myRunId, speed, pitch);
    } catch (err) {
      console.error("MIDI playback error:", err);
    } finally {
      if (myRunId === runId) {
        stopTicker();
        elapsedMs.value = totalMs.value;
        isPlaying.value = false;
        progress.value = { stage: "idle", verseNumber: 0, totalVerses: 0 };
        allNotesOff();
      }
    }
  }

  function playFile(
    file: ParsedMidiFile,
    myRunId: number,
    speed = 1,
    pitchSemitones = 0,
  ): Promise<void> {
    return new Promise((resolve) => {
      const sink = selectedOutputShared.value;
      if (!sink || !file.events.length) {
        resolve();
        return;
      }
      const rate = speed > 0 ? speed : 1;
      for (const ev of file.events) {
        if (!ev.data.length) continue;
        const data = pitchSemitones === 0 ? ev.data : transposeEvent(ev.data, pitchSemitones);
        if (!data) continue; // dropped because transposed note left 0..127
        const timer = setTimeout(() => {
          if (myRunId !== runId) return;
          try {
            sink.send(data);
          } catch (err) {
            console.error("MIDI send failed:", err);
          }
        }, ev.timeMs / rate);
        scheduledTimers.push(timer);
      }
      // Resolve after the last note's nominal time. We don't strictly know
      // when the device finishes its envelope, but for sequencing purposes
      // that's irrelevant — the next section starts after pauseAfter().
      const endTimer = setTimeout(() => resolve(), file.durationMs / rate);
      scheduledTimers.push(endTimer);
    });
  }

  function pauseAfter(file: ParsedMidiFile, myRunId: number, speed = 1): Promise<void> {
    return new Promise((resolve) => {
      const pauseMs = computePauseMs(file, speed);
      progress.value = { ...progress.value, stage: "pause" };
      const timer = setTimeout(() => {
        if (myRunId === runId) resolve();
        else resolve();
      }, pauseMs);
      scheduledTimers.push(timer);
    });
  }

  function stop() {
    runId++; // Invalidate any in-flight sequence.
    clearTimers();
    stopTicker();
    elapsedMs.value = 0;
    totalMs.value = 0;
    allNotesOff();
    isPlaying.value = false;
    progress.value = { stage: "idle", verseNumber: 0, totalVerses: 0 };
  }

  function clearTimers() {
    while (scheduledTimers.length) {
      const t = scheduledTimers.pop();
      if (t) clearTimeout(t);
    }
  }

  function allNotesOff() {
    const sink = selectedOutputShared.value;
    if (!sink) return;
    try {
      for (let ch = 0; ch < 16; ch++) {
        // CC 120 = All Sound Off, CC 123 = All Notes Off
        sink.send([0xb0 + ch, 120, 0]);
        sink.send([0xb0 + ch, 123, 0]);
      }
    } catch (err) {
      console.error("All-notes-off failed:", err);
    }
  }

  /**
   * Sound a single short reference note (Note On now, Note Off after
   * `durationMs`) on the selected output. Used by the setup step to play the
   * resulting tonic when the operator transposes a song. Fire-and-forget and
   * independent of the sequence scheduler — it intentionally plays over any
   * preview already running so the operator hears the new pitch immediately.
   */
  function playTone(note: number, durationMs = 900, velocity = 96) {
    const sink = selectedOutputShared.value;
    if (!sink) return;
    const n = Math.min(127, Math.max(0, Math.round(note)));
    try {
      sink.send([0x90, n, Math.min(127, Math.max(1, velocity))]);
    } catch (err) {
      console.error("Reference tone note-on failed:", err);
      return;
    }
    setTimeout(() => {
      try {
        sink.send([0x80, n, 0]);
      } catch (err) {
        console.error("Reference tone note-off failed:", err);
      }
    }, durationMs);
  }

  onUnmounted(() => {
    stop();
  });

  return {
    // Shared device state (re-exported for convenience).
    isSupported: readonly(isSupportedRef),
    accessError: readonly(accessErrorRef),
    midiAccess: readonly(midiAccessRef),
    outputs: readonly(outputsRef),
    selectedOutputId: readonly(selectedOutputIdRef),
    selectedOutput: selectedOutputShared,
    requestAccess: requestAccessShared,
    setSelectedOutput: setSelectedOutputShared,

    // Per-instance playback state.
    isPlaying: readonly(isPlaying),
    progress: readonly(progress),
    elapsedMs: readonly(elapsedMs),
    totalMs: readonly(totalMs),
    playSequence,
    playSingle,
    playTone,
    stop,
  };
}

// --------------------------------------------------------------------------
// Byte helpers
// --------------------------------------------------------------------------

function readAscii(data: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += String.fromCharCode(data[offset + i]);
  return out;
}

function readUint16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function readUint32(data: Uint8Array, offset: number): number {
  // Avoid `<<` for the top byte: it sign-extends past 2^31.
  return data[offset] * 0x1000000 + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3];
}

function readVariableLength(data: Uint8Array, offset: number): { value: number; length: number } {
  let value = 0;
  let length = 0;
  while (length < 4) {
    const byte = data[offset + length];
    value = (value << 7) | (byte & 0x7f);
    length++;
    if ((byte & 0x80) === 0) break;
  }
  return { value, length };
}

function channelMessageDataLength(status: number): number {
  const hi = status & 0xf0;
  if (hi === 0xc0 || hi === 0xd0) return 1; // ProgramChange, ChannelPressure
  return 2; // NoteOn/Off, Aftertouch, ControlChange, PitchBend
}

// Inter-section pause length: 2 beats of the section's own tempo, scaled by
// the playback rate. Picked by feel — 4 beats (one bar in 4/4) was musically
// "correct" but felt sluggish in the run-step UI between verses.
const PAUSE_BEATS = 2;
function computePauseMs(file: ParsedMidiFile, speed: number): number {
  const usPerQuarter = file.initialUsPerQuarter || DEFAULT_US_PER_QUARTER;
  const beatMs = usPerQuarter / 1000;
  const rate = speed > 0 ? speed : 1;
  return (beatMs * PAUSE_BEATS) / rate;
}

// Clamp speed to a sane band so a typo in caller code can't freeze the player
// (rate→0) or fire 100k timers in a millisecond.
function sanitizeSpeed(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return 1;
  return Math.min(4, Math.max(0.25, v));
}

function sanitizePitch(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.min(24, Math.max(-24, Math.round(v)));
}

// Return a transposed copy for note-carrying events (Note On/Off + Polyphonic
// Aftertouch — all use byte 1 as the key). Non-note events pass through as-is.
// Returns null when the transposed key falls outside the MIDI 0..127 range so
// the caller can drop the event entirely rather than wrap or clamp.
function transposeEvent(data: number[], semitones: number): number[] | null {
  if (data.length < 2) return data;
  const hi = data[0] & 0xf0;
  if (hi !== 0x80 && hi !== 0x90 && hi !== 0xa0) return data;
  const note = data[1] + semitones;
  if (note < 0 || note > 127) return null;
  const copy = data.slice();
  copy[1] = note;
  return copy;
}

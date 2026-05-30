import { defineStore } from "pinia";

import { computed, ref } from "vue";

import type { FreiesMusikstueck, GesangbuchliedWithMidi } from "@/gql/extra-types";
import type { Gesangbuchlied } from "@/gql/graphql";

// A "main" entry: one of the hymns in the service body. Has selectable verses
// and is played via the full MIDI trio (intro / main × verses / outro).
//
// `speed` is a playback rate multiplier (1 = original tempo, 0.5 = half, 2 = double).
// `pitchSemitones` shifts every Note On/Off by the given number of semitones
// (negative = down, positive = up). Both default to neutral.
export interface ChurchServiceSong {
  song: Gesangbuchlied | null;
  verses: number[];
  speed: number;
  pitchSemitones: number;
}

// An intro/outro slot ("Vorspiel"/"Nachspiel"): one standalone MIDI piece plus
// the same tempo/pitch overrides the main songs carry, so the operator can
// transpose or retime a prelude/postlude to match the service.
export interface ChurchServicePiece {
  piece: FreiesMusikstueck;
  speed: number;
  pitchSemitones: number;
}

// Speed/pitch bounds — kept here so the UI, store and player agree.
export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2.0;
export const SPEED_STEP = 0.05;
export const PITCH_MIN = -12;
export const PITCH_MAX = 12;

// Discriminated union over the flat playlist. Intro/outro slots hold a single
// standalone MIDI file (`FreiesMusikstueck`) from the `freie_musikstuecke`
// collection — no verses, no trio. Main entries are full hymns and carry the
// user-chosen per-song speed/pitch into the runner.
export type PlaylistEntry =
  | {
      kind: "piece";
      role: "intro" | "outro";
      piece: FreiesMusikstueck;
      speed: number;
      pitchSemitones: number;
    }
  | {
      kind: "song";
      role: "main";
      song: Gesangbuchlied;
      verses: number[];
      speed: number;
      pitchSemitones: number;
    };

export interface ChurchService {
  id?: string;
  name?: string;
  // Optional standalone Vorspiel piece (+ tempo/pitch) played before the main set.
  intro: ChurchServicePiece | null;
  // Main song list — draggable in the setup UI.
  songs: ChurchServiceSong[];
  // Optional standalone Nachspiel piece (+ tempo/pitch) played after the main set.
  outro: ChurchServicePiece | null;
  createdAt: string;
}

export interface ServiceHistoryItem extends ChurchService {
  id: string;
  name: string;
}

// Wizard step machine: idle is the entry screen (with history + start CTA);
// setup → device → run are the three guided steps.
export type WizardStep = "idle" | "setup" | "device" | "run";

// IndexedDB constants
const DB_NAME = "ChurchServiceDB";
// v2 adds the `prepared` store for "future" services the operator saves to
// load later (separate from the played-service history).
const DB_VERSION = 2;
const SERVICES_STORE = "services";
const PREPARED_STORE = "prepared";

class ServiceDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // History of services that have been played.
        if (!db.objectStoreNames.contains(SERVICES_STORE)) {
          const store = db.createObjectStore(SERVICES_STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Prepared ("future") services. Same record shape as history entries,
        // kept in a separate store so the two lists never mix.
        if (!db.objectStoreNames.contains(PREPARED_STORE)) {
          const store = db.createObjectStore(PREPARED_STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  // ── Generic store helpers (shared by history + prepared) ─────────────────

  private putInStore(storeName: string, service: ServiceHistoryItem): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const request = transaction.objectStore(storeName).put(service);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private getAllFromStore(storeName: string): Promise<ServiceHistoryItem[]> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const index = transaction.objectStore(storeName).index("createdAt");
      const request = index.getAll();
      request.onsuccess = () => {
        const services = (request.result as ServiceHistoryItem[])
          .map(normalizeService)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(services);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private removeFromStore(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const request = transaction.objectStore(storeName).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Played-service history.
  saveService(service: ServiceHistoryItem): Promise<void> {
    return this.putInStore(SERVICES_STORE, service);
  }
  getAllServices(): Promise<ServiceHistoryItem[]> {
    return this.getAllFromStore(SERVICES_STORE);
  }
  deleteService(id: string): Promise<void> {
    return this.removeFromStore(SERVICES_STORE, id);
  }

  // Prepared ("future") services.
  savePrepared(service: ServiceHistoryItem): Promise<void> {
    return this.putInStore(PREPARED_STORE, service);
  }
  getAllPrepared(): Promise<ServiceHistoryItem[]> {
    return this.getAllFromStore(PREPARED_STORE);
  }
  deletePrepared(id: string): Promise<void> {
    return this.removeFromStore(PREPARED_STORE, id);
  }
}

function emptyService(): ChurchService {
  return {
    intro: null,
    songs: [],
    outro: null,
    createdAt: new Date().toISOString(),
  };
}

// Older saved services stored intro/outro as a bare `FreiesMusikstueck`; newer
// ones wrap it in a `ChurchServicePiece` with speed/pitch. Accept both and
// always return the wrapped shape (or null).
function normalizePiece(raw: unknown): ChurchServicePiece | null {
  if (!raw || typeof raw !== "object") return null;
  // Already wrapped — backfill any missing tempo/pitch fields.
  if ("piece" in raw && (raw as ChurchServicePiece).piece) {
    const wrapped = raw as ChurchServicePiece;
    return {
      piece: wrapped.piece,
      speed: typeof wrapped.speed === "number" ? wrapped.speed : 1,
      pitchSemitones:
        typeof wrapped.pitchSemitones === "number" ? wrapped.pitchSemitones : 0,
    };
  }
  // Legacy bare piece (has its own midi_file/name) — wrap at neutral playback.
  if ("midi_file" in raw || "name" in raw) {
    return { piece: raw as FreiesMusikstueck, speed: 1, pitchSemitones: 0 };
  }
  return null;
}

function normalizeService<T extends ChurchService>(svc: T): T {
  // Backfill speed/pitch on older saved entries that predate the field.
  const songs = (svc.songs ?? []).map((s) => ({
    ...s,
    speed: typeof s.speed === "number" ? s.speed : 1,
    pitchSemitones: typeof s.pitchSemitones === "number" ? s.pitchSemitones : 0,
  }));
  return {
    ...svc,
    intro: normalizePiece(svc.intro),
    outro: normalizePiece(svc.outro),
    songs,
  };
}

export const useChurchServiceStore = defineStore("churchService", () => {
  // Simple toast replacement with console.log for now
  const toast = (options: { title: string; description: string; variant?: string }) => {
    console.log(`${options.title}: ${options.description}`);
  };

  // State
  const currentService = ref<ChurchService>(emptyService());

  const serviceHistory = ref<ServiceHistoryItem[]>([]);
  // Prepared ("future") services — saved from the setup step, loadable later.
  const preparedServices = ref<ServiceHistoryItem[]>([]);
  const wizardStep = ref<WizardStep>("idle");
  const isPlayingService = ref(false);
  const currentPlayingIndex = ref(0);

  // Save-prompt dialog visibility — opened by finishService() and bound from the view.
  const saveDialogOpen = ref(false);
  // "Save for later" dialog visibility — opened from the setup step.
  const preparedDialogOpen = ref(false);

  // Database manager
  const dbManager = new ServiceDBManager();
  let dbInitialized = false;

  // A main song is playable iff it carries the full MIDI trio (intro/main/outro).
  const hasMidiTrio = (song: Gesangbuchlied | null): boolean => {
    if (!song) return false;
    const s = song as GesangbuchliedWithMidi;
    return !!(s.midi_intro && s.midi_main && s.midi_outro);
  };

  // Flat ordered playlist for the runner: intro piece (if set) + main songs +
  // outro piece (if set). Each entry knows its own kind/role so RunStep can
  // branch playback (single file vs. trio sequence).
  const playlist = computed<PlaylistEntry[]>(() => {
    const out: PlaylistEntry[] = [];
    if (currentService.value.intro) {
      out.push({
        kind: "piece",
        role: "intro",
        piece: currentService.value.intro.piece,
        speed: currentService.value.intro.speed,
        pitchSemitones: currentService.value.intro.pitchSemitones,
      });
    }
    for (const s of currentService.value.songs) {
      if (s.song)
        out.push({
          kind: "song",
          role: "main",
          song: s.song,
          verses: s.verses,
          speed: s.speed,
          pitchSemitones: s.pitchSemitones,
        });
    }
    if (currentService.value.outro) {
      out.push({
        kind: "piece",
        role: "outro",
        piece: currentService.value.outro.piece,
        speed: currentService.value.outro.speed,
        pitchSemitones: currentService.value.outro.pitchSemitones,
      });
    }
    return out;
  });

  // Set of slots the user has touched but not completed — used by SetupStep to
  // flag issues. Pieces are always valid if non-null (the file is required in
  // Directus), so only main songs can land here.
  const invalidSetupSongs = computed(() => {
    const all: { label: string; reason: "no-verses" | "no-midi" }[] = [];
    for (const s of currentService.value.songs) {
      if (!s.song) continue;
      const label = s.song.titel ?? "";
      if (s.verses.length === 0) all.push({ label, reason: "no-verses" });
      else if (!hasMidiTrio(s.song)) all.push({ label, reason: "no-midi" });
    }
    return all;
  });

  // Computed: every main entry must have verses + MIDI trio, and the playlist
  // must be non-empty. Pieces only need their midi_file to be present, which
  // the schema guarantees.
  const canPlayService = computed(() => {
    if (playlist.value.length === 0) return false;
    return currentService.value.songs.every(
      (s) => s.song && s.verses.length > 0 && hasMidiTrio(s.song),
    );
  });

  const canAdvanceToDevice = computed(() => canPlayService.value);

  // Actions
  const initDB = async () => {
    if (!dbInitialized) {
      await dbManager.init();
      dbInitialized = true;
    }
  };

  // ── Song-list mutations (main list) ──────────────────────────────────────

  const addSong = (song?: Gesangbuchlied) => {
    const newSong: ChurchServiceSong = {
      song: song || null,
      verses: song ? getAllVerses(song) : [],
      speed: 1,
      pitchSemitones: 0,
    };
    currentService.value.songs.push(newSong);
  };

  // Clamp the speed multiplier to the allowed band. We deliberately do NOT
  // snap to SPEED_STEP — callers may step in finer units (e.g. ±1 BPM, which
  // is ~0.008× at 120 BPM). Snapping would silently swallow those edits.
  const clampSpeed = (v: number) => Math.min(SPEED_MAX, Math.max(SPEED_MIN, v));
  const clampPitch = (v: number) =>
    Math.min(PITCH_MAX, Math.max(PITCH_MIN, Math.round(v)));

  const updateSongSpeed = (index: number, speed: number) => {
    if (index < 0 || index >= currentService.value.songs.length) return;
    currentService.value.songs[index].speed = clampSpeed(speed);
  };

  const updateSongPitch = (index: number, pitchSemitones: number) => {
    if (index < 0 || index >= currentService.value.songs.length) return;
    currentService.value.songs[index].pitchSemitones = clampPitch(pitchSemitones);
  };

  const removeSong = (index: number) => {
    if (index >= 0 && index < currentService.value.songs.length) {
      currentService.value.songs.splice(index, 1);
    }
  };

  const updateSongVerses = (index: number, verses: number[]) => {
    if (index >= 0 && index < currentService.value.songs.length) {
      currentService.value.songs[index].verses = verses;
    }
  };

  const reorderSongs = (oldIndex: number, newIndex: number) => {
    if (oldIndex < 0 || oldIndex >= currentService.value.songs.length) return;
    if (newIndex < 0 || newIndex >= currentService.value.songs.length) return;

    const song = currentService.value.songs.splice(oldIndex, 1)[0];
    currentService.value.songs.splice(newIndex, 0, song);
  };

  // ── Intro/outro piece mutations ──────────────────────────────────────────

  const setIntroPiece = (piece: FreiesMusikstueck | null) => {
    currentService.value.intro = piece
      ? { piece, speed: 1, pitchSemitones: 0 }
      : null;
  };

  const setOutroPiece = (piece: FreiesMusikstueck | null) => {
    currentService.value.outro = piece
      ? { piece, speed: 1, pitchSemitones: 0 }
      : null;
  };

  // Tempo/pitch mutations for the intro/outro slots — mirror the per-song
  // controls but keyed by role since there's at most one of each.
  const updatePieceSpeed = (role: "intro" | "outro", speed: number) => {
    const slot = currentService.value[role];
    if (slot) slot.speed = clampSpeed(speed);
  };

  const updatePiecePitch = (role: "intro" | "outro", pitchSemitones: number) => {
    const slot = currentService.value[role];
    if (slot) slot.pitchSemitones = clampPitch(pitchSemitones);
  };

  // ── Verse helpers ────────────────────────────────────────────────────────

  const getAllVerses = (song: Gesangbuchlied): number[] => {
    // Try to determine number of verses from the song text
    const verses: number[] = [];

    if (song.textId?.strophenEinzeln && Array.isArray(song.textId.strophenEinzeln)) {
      // Count actual verses from strophenEinzeln
      verses.push(...song.textId.strophenEinzeln.map((_, index) => index + 1));
    } else {
      // Default to 4 verses if we can't determine
      verses.push(1, 2, 3, 4);
    }

    return verses;
  };

  // ── Wizard navigation ────────────────────────────────────────────────────

  const startSetup = () => {
    // Begin a fresh service from the idle entry screen.
    currentService.value = emptyService();
    wizardStep.value = "setup";
    currentPlayingIndex.value = 0;
    isPlayingService.value = false;
  };

  const goToDevice = () => {
    if (!canAdvanceToDevice.value) return;
    wizardStep.value = "device";
  };

  const goToSetup = () => {
    wizardStep.value = "setup";
  };

  const startService = () => {
    if (!canPlayService.value) return;
    wizardStep.value = "run";
    isPlayingService.value = true;
    currentPlayingIndex.value = 0;

    toast({
      title: "Service Started",
      description: "Playing service audio...",
    });
  };

  const finishService = () => {
    // Called when the run step ends (naturally completed or user-stopped).
    // We leave currentService populated so the save dialog can use it; the
    // dialog handlers below (confirmSave / discardService) reset state.
    isPlayingService.value = false;
    wizardStep.value = "idle";
    saveDialogOpen.value = true;

    toast({
      title: "Service Completed",
      description: "All songs in the service have been played.",
    });
  };

  // ── Save dialog handlers ─────────────────────────────────────────────────

  const defaultServiceName = () =>
    `Gottesdienst ${new Date().toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

  const confirmSave = async (name?: string) => {
    try {
      await initDB();

      const serviceName = (name && name.trim()) || defaultServiceName();

      const serviceToSave: ServiceHistoryItem = {
        ...currentService.value,
        id: crypto.randomUUID(),
        name: serviceName,
        createdAt: new Date().toISOString(),
      };

      const cleanService = JSON.parse(JSON.stringify(serviceToSave));

      await dbManager.saveService(cleanService);
      await loadHistory();

      toast({
        title: "Service Saved",
        description: `"${serviceName}" has been saved to history.`,
      });
    } catch (error) {
      console.error("Failed to save service:", error);
      toast({
        title: "Error",
        description: "Failed to save service. Please try again.",
        variant: "destructive",
      });
    } finally {
      saveDialogOpen.value = false;
      currentService.value = emptyService();
      currentPlayingIndex.value = 0;
    }
  };

  const discardService = () => {
    saveDialogOpen.value = false;
    currentService.value = emptyService();
    currentPlayingIndex.value = 0;

    wizardStep.value = "idle";
  };

  // ── History ──────────────────────────────────────────────────────────────

  const loadService = (service: ServiceHistoryItem) => {
    const normalized = normalizeService(service);
    currentService.value = {
      intro: normalized.intro,
      songs: normalized.songs,
      outro: normalized.outro,
      createdAt: normalized.createdAt,
    };
    wizardStep.value = "setup";

    toast({
      title: "Service Loaded",
      description: `"${service.name}" has been loaded.`,
    });
  };

  const deleteService = async (id: string) => {
    try {
      await initDB();
      await dbManager.deleteService(id);
      await loadHistory();

      toast({
        title: "Service Deleted",
        description: "Service has been removed from history.",
      });
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadHistory = async () => {
    try {
      await initDB();
      serviceHistory.value = await dbManager.getAllServices();
    } catch (error) {
      console.error("Failed to load service history:", error);
      serviceHistory.value = [];
    }
  };

  // ── Prepared ("future") services ─────────────────────────────────────────

  const loadPreparedServices = async () => {
    try {
      await initDB();
      preparedServices.value = await dbManager.getAllPrepared();
    } catch (error) {
      console.error("Failed to load prepared services:", error);
      preparedServices.value = [];
    }
  };

  const openPreparedDialog = () => {
    preparedDialogOpen.value = true;
  };

  const closePreparedDialog = () => {
    preparedDialogOpen.value = false;
  };

  // Persist the current setup (prelude, songs, postlude — including every
  // tempo/pitch change) as a reusable "future" service. Unlike confirmSave this
  // does NOT clear the editor or change the wizard step: the operator keeps
  // working on the same service after stashing a copy.
  const saveAsPrepared = async (name?: string) => {
    try {
      await initDB();

      const serviceName = (name && name.trim()) || defaultServiceName();

      const serviceToSave: ServiceHistoryItem = {
        ...currentService.value,
        id: crypto.randomUUID(),
        name: serviceName,
        createdAt: new Date().toISOString(),
      };

      const cleanService = JSON.parse(JSON.stringify(serviceToSave));

      await dbManager.savePrepared(cleanService);
      await loadPreparedServices();

      toast({
        title: "Prepared service saved",
        description: `"${serviceName}" has been saved for later.`,
      });
    } catch (error) {
      console.error("Failed to save prepared service:", error);
      toast({
        title: "Error",
        description: "Failed to save prepared service. Please try again.",
        variant: "destructive",
      });
    } finally {
      preparedDialogOpen.value = false;
    }
  };

  const deletePreparedService = async (id: string) => {
    try {
      await initDB();
      await dbManager.deletePrepared(id);
      await loadPreparedServices();

      toast({
        title: "Prepared service deleted",
        description: "Prepared service has been removed.",
      });
    } catch (error) {
      console.error("Failed to delete prepared service:", error);
      toast({
        title: "Error",
        description: "Failed to delete prepared service. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── Run-step callbacks (called from RunStep on song progression) ─────────

  const onSongCompleted = () => {
    if (currentPlayingIndex.value < playlist.value.length - 1) {
      currentPlayingIndex.value++;
    } else {
      finishService();
    }
  };

  return {
    // State
    currentService,
    serviceHistory,
    preparedServices,
    wizardStep,
    isPlayingService,
    currentPlayingIndex,
    saveDialogOpen,
    preparedDialogOpen,

    // Computed
    playlist,
    invalidSetupSongs,
    canPlayService,
    canAdvanceToDevice,

    // Helpers
    hasMidiTrio,
    getAllVerses,

    // Song-list mutations
    addSong,
    removeSong,
    updateSongVerses,
    updateSongSpeed,
    updateSongPitch,
    reorderSongs,

    // Intro/outro piece mutations
    setIntroPiece,
    setOutroPiece,
    updatePieceSpeed,
    updatePiecePitch,

    // Wizard navigation
    startSetup,
    goToSetup,
    goToDevice,
    startService,
    finishService,

    // Save dialog
    confirmSave,
    discardService,

    // History
    loadService,
    deleteService,
    loadHistory,

    // Prepared ("future") services
    openPreparedDialog,
    closePreparedDialog,
    saveAsPrepared,
    deletePreparedService,
    loadPreparedServices,

    // Run-step callbacks
    onSongCompleted,
  };
});

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
  | { kind: "piece"; role: "intro" | "outro"; piece: FreiesMusikstueck }
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
  // Optional standalone Vorspiel piece played before the main set.
  intro: FreiesMusikstueck | null;
  // Main song list — draggable in the setup UI.
  songs: ChurchServiceSong[];
  // Optional standalone Nachspiel piece played after the main set.
  outro: FreiesMusikstueck | null;
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
const DB_VERSION = 1;
const SERVICES_STORE = "services";

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

        // Create services store
        if (!db.objectStoreNames.contains(SERVICES_STORE)) {
          const store = db.createObjectStore(SERVICES_STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  async saveService(service: ServiceHistoryItem): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SERVICES_STORE], "readwrite");
      const store = transaction.objectStore(SERVICES_STORE);

      const request = store.put(service);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllServices(): Promise<ServiceHistoryItem[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SERVICES_STORE], "readonly");
      const store = transaction.objectStore(SERVICES_STORE);
      const index = store.index("createdAt");

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

  async deleteService(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SERVICES_STORE], "readwrite");
      const store = transaction.objectStore(SERVICES_STORE);

      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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

function normalizeService<T extends ChurchService>(svc: T): T {
  // Backfill speed/pitch on older saved entries that predate the field.
  const songs = (svc.songs ?? []).map((s) => ({
    ...s,
    speed: typeof s.speed === "number" ? s.speed : 1,
    pitchSemitones: typeof s.pitchSemitones === "number" ? s.pitchSemitones : 0,
  }));
  return {
    ...svc,
    intro: svc.intro ?? null,
    outro: svc.outro ?? null,
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
  const wizardStep = ref<WizardStep>("idle");
  const isPlayingService = ref(false);
  const currentPlayingIndex = ref(0);

  // Save-prompt dialog visibility — opened by finishService() and bound from the view.
  const saveDialogOpen = ref(false);

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
      out.push({ kind: "piece", role: "intro", piece: currentService.value.intro });
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
      out.push({ kind: "piece", role: "outro", piece: currentService.value.outro });
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
    currentService.value.intro = piece;
  };

  const setOutroPiece = (piece: FreiesMusikstueck | null) => {
    currentService.value.outro = piece;
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
    wizardStep,
    isPlayingService,
    currentPlayingIndex,
    saveDialogOpen,

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

    // Run-step callbacks
    onSongCompleted,
  };
});

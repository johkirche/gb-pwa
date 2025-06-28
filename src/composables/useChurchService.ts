import { computed, ref } from "vue";

import type { Gesangbuchlied } from "@/gql/graphql";

export interface ChurchServiceSong {
  song: Gesangbuchlied | null;
  verses: number[];
}

export interface ChurchService {
  id?: string;
  name?: string;
  songs: ChurchServiceSong[];
  createdAt: string;
}

export interface ServiceHistoryItem extends ChurchService {
  id: string;
  name: string;
}

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
    if (!this.db) await this.init();

    // Simple JSON serialization to ensure clean, cloneable object
    const cleanService = JSON.parse(JSON.stringify(service));

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SERVICES_STORE], "readwrite");
      const store = transaction.objectStore(SERVICES_STORE);
      const request = store.put(cleanService);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllServices(): Promise<ServiceHistoryItem[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SERVICES_STORE], "readonly");
      const store = transaction.objectStore(SERVICES_STORE);
      const index = store.index("createdAt");
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Sort by createdAt descending (newest first)
        const services = request.result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        resolve(services);
      };
    });
  }

  async deleteService(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SERVICES_STORE], "readwrite");
      const store = transaction.objectStore(SERVICES_STORE);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const dbManager = new ServiceDBManager();

export function useChurchService() {
  // Simple toast replacement with console.log for now
  const toast = (options: { title: string; description: string; variant?: string }) => {
    console.log(`${options.title}: ${options.description}`);
  };

  // Current service state
  const currentService = ref<ChurchService>({
    songs: [],
    createdAt: new Date().toISOString(),
  });

  // Service history
  const serviceHistory = ref<ServiceHistoryItem[]>([]);

  // Playback state
  const isPlayingService = ref(false);
  const currentPlayingIndex = ref(0); // Index of currently playing song

  // Computed properties
  const canPlayService = computed(() => {
    return (
      currentService.value.songs.length > 0 &&
      currentService.value.songs.every(
        (serviceSong) =>
          serviceSong.song && serviceSong.verses.length > 0 && hasAudioFiles(serviceSong.song),
      )
    );
  });

  const canSaveService = computed(() => {
    return (
      currentService.value.songs.length > 0 &&
      currentService.value.songs.every(
        (serviceSong) => serviceSong.song && serviceSong.verses.length > 0,
      )
    );
  });

  const currentPlayingSong = computed(() => {
    if (
      currentPlayingIndex.value >= 0 &&
      currentPlayingIndex.value < currentService.value.songs.length
    ) {
      return currentService.value.songs[currentPlayingIndex.value];
    }
    return null;
  });

  // Helper functions
  const hasAudioFiles = (song: Gesangbuchlied): boolean => {
    return !!song.melodieId?.noten?.some((note) =>
      note?.directus_files_id?.type?.includes("audio"),
    );
  };

  const generateServiceId = (): string => {
    return `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const getAudioFiles = (song: Gesangbuchlied) => {
    return (
      song.melodieId?.noten?.filter((note) => note?.directus_files_id?.type?.includes("audio")) ||
      []
    );
  };

  // Actions
  const addSong = (song?: Gesangbuchlied) => {
    const serviceSong: ChurchServiceSong = {
      song: song || null,
      verses: song ? getAllVerses(song) : [],
    };
    currentService.value.songs.push(serviceSong);
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
    if (
      oldIndex >= 0 &&
      oldIndex < currentService.value.songs.length &&
      newIndex >= 0 &&
      newIndex < currentService.value.songs.length
    ) {
      const song = currentService.value.songs.splice(oldIndex, 1)[0];
      currentService.value.songs.splice(newIndex, 0, song);
    }
  };

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

  const playService = () => {
    if (!canPlayService.value) return;

    isPlayingService.value = true;
    currentPlayingIndex.value = 0;

    toast({
      title: "Service Started",
      description: "Playing church service songs...",
    });
  };

  const saveService = async () => {
    if (!canSaveService.value) return;

    try {
      const serviceName = `Service ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

      const serviceToSave: ServiceHistoryItem = {
        ...currentService.value,
        id: generateServiceId(),
        name: serviceName,
        createdAt: new Date().toISOString(),
      };

      await dbManager.saveService(serviceToSave);
      await loadHistory();

      toast({
        title: "Service Saved",
        description: `"${serviceName}" has been saved to history.`,
      });
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: "Error",
        description: "Failed to save service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearService = () => {
    currentService.value = {
      songs: [],
      createdAt: new Date().toISOString(),
    };
    isPlayingService.value = false;
    currentPlayingIndex.value = 0;
  };

  const loadService = (service: ServiceHistoryItem) => {
    currentService.value = {
      songs: service.songs,
      createdAt: service.createdAt,
    };

    toast({
      title: "Service Loaded",
      description: `"${service.name}" has been loaded.`,
    });
  };

  const deleteService = async (id: string) => {
    try {
      await dbManager.deleteService(id);
      await loadHistory();

      toast({
        title: "Service Deleted",
        description: "Service has been removed from history.",
      });
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadHistory = async () => {
    try {
      serviceHistory.value = await dbManager.getAllServices();
    } catch (error) {
      console.error("Error loading service history:", error);
    }
  };

  const onSongCompleted = () => {
    if (currentPlayingIndex.value < currentService.value.songs.length - 1) {
      // Move to next song
      currentPlayingIndex.value++;
    } else {
      // All songs completed, service is done
      onServiceCompleted();
    }
  };

  const onServiceCompleted = () => {
    isPlayingService.value = false;
    currentPlayingIndex.value = 0;

    toast({
      title: "Service Completed",
      description: "Church service has finished playing.",
    });
  };

  return {
    // State
    currentService,
    serviceHistory,
    isPlayingService,
    currentPlayingIndex,
    currentPlayingSong,

    // Computed
    canPlayService,
    canSaveService,

    // Actions
    addSong,
    removeSong,
    updateSongVerses,
    reorderSongs,
    playService,
    saveService,
    clearService,
    loadService,
    deleteService,
    loadHistory,
    onSongCompleted,
    onServiceCompleted,

    // Helpers
    hasAudioFiles,
    getAudioFiles,
    getAllVerses,
  };
}

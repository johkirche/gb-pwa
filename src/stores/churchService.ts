import { defineStore } from "pinia";

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
        // Sort by createdAt descending (newest first)
        const services = request.result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
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

export const useChurchServiceStore = defineStore("churchService", () => {
  // Simple toast replacement with console.log for now
  const toast = (options: { title: string; description: string; variant?: string }) => {
    console.log(`${options.title}: ${options.description}`);
  };

  // State
  const currentService = ref<ChurchService>({
    songs: [],
    createdAt: new Date().toISOString(),
  });

  const serviceHistory = ref<ServiceHistoryItem[]>([]);
  const isPlayingService = ref(false);
  const currentPlayingIndex = ref(0);

  // Database manager
  const dbManager = new ServiceDBManager();
  let dbInitialized = false;

  // Computed
  const canPlayService = computed(() => {
    return (
      currentService.value.songs.length > 0 &&
      currentService.value.songs.some((s) => s.song && s.verses.length > 0)
    );
  });

  const canSaveService = computed(() => {
    return currentService.value.songs.length > 0;
  });

  // Actions
  const initDB = async () => {
    if (!dbInitialized) {
      await dbManager.init();
      dbInitialized = true;
    }
  };

  const addSong = (song?: Gesangbuchlied) => {
    const newSong: ChurchServiceSong = {
      song: song || null,
      verses: song ? getAllVerses(song) : [],
    };
    currentService.value.songs.push(newSong);
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
      description: "Playing service audio...",
    });
  };

  const saveService = async () => {
    if (!canSaveService.value) return;

    try {
      await initDB();

      const serviceName = `Service ${new Date().toLocaleDateString("de-DE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;

      const serviceToSave: ServiceHistoryItem = {
        id: crypto.randomUUID(),
        name: serviceName,
        songs: currentService.value.songs,
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
    }
  };

  const clearService = () => {
    currentService.value = {
      songs: [],
      createdAt: new Date().toISOString(),
    };
    isPlayingService.value = false;
    currentPlayingIndex.value = 0;

    toast({
      title: "Service Cleared",
      description: "All songs have been removed from the current service.",
    });
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

  const onSongCompleted = () => {
    if (currentPlayingIndex.value < currentService.value.songs.length - 1) {
      currentPlayingIndex.value++;
    } else {
      onServiceCompleted();
    }
  };

  const onServiceCompleted = () => {
    isPlayingService.value = false;
    currentPlayingIndex.value = 0;

    toast({
      title: "Service Completed",
      description: "All songs in the service have been played.",
    });
  };

  return {
    // State
    currentService,
    serviceHistory,
    isPlayingService,
    currentPlayingIndex,

    // Computed
    canPlayService,
    canSaveService,

    // Actions
    addSong,
    removeSong,
    updateSongVerses,
    reorderSongs,
    getAllVerses,
    playService,
    saveService,
    clearService,
    loadService,
    deleteService,
    loadHistory,
    onSongCompleted,
    onServiceCompleted,
  };
});

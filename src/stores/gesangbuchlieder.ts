import { defineStore } from "pinia";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { Strophe } from "@/gql";
import type { Gesangbuchlied } from "@/gql/graphql";

import { useFavorites } from "@/composables/useFavorites";
import { useGesangbuchlied } from "@/composables/useGesangbuchlied";
import { useOfflineDownload } from "@/composables/useOfflineDownload";

export interface GesangbuchliedFilters {
  searchQuery: string;
  selectedCategory: string;
  selectedFileType: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
  showFavoritesOnly: boolean;
}

export interface GesangbuchliedState {
  lieder: Gesangbuchlied[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  currentLimit: number;
  isUsingCachedData: boolean;
  preferOfflineData: boolean;
  filters: GesangbuchliedFilters;
}

export const useGesangbuchliedStore = defineStore("gesangbuchlieder", () => {
  const { t } = useI18n();
  const { favorites } = useFavorites();
  const { queryGesangbuchlied, queryGesangbuchliedByIds } = useGesangbuchlied();
  const { hasOfflineContent, getOfflineSongs } = useOfflineDownload();

  // State
  const lieder = ref<Gesangbuchlied[]>([]);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(true);
  const currentLimit = ref(50);
  const isUsingCachedData = ref(false);
  const preferOfflineData = ref(true);

  const filters = ref<GesangbuchliedFilters>({
    searchQuery: "",
    selectedCategory: "",
    selectedFileType: "",
    sortBy: "title",
    sortDirection: "asc",
    showFavoritesOnly: false,
  });

  // Computed
  const shouldShowDataSourceControl = computed(() => {
    return (
      (hasOfflineContent.value ||
        (typeof window !== "undefined" && window.location.hostname === "localhost")) &&
      lieder.value.length > 0
    );
  });

  const availableCategories = computed(() => {
    const categories = new Set<string>();
    lieder.value.forEach((lied) => {
      if (lied.kategorieId) {
        lied.kategorieId.forEach((kat) => {
          if (kat?.kategorie_id?.name) {
            categories.add(kat.kategorie_id.name);
          }
        });
      }
    });
    return Array.from(categories).sort();
  });

  const availableFileTypes = computed(() => {
    const fileTypes = new Set<string>();
    lieder.value.forEach((lied) => {
      if (lied.melodieId?.noten) {
        lied.melodieId.noten.forEach((note) => {
          if (note?.directus_files_id?.type) {
            const type = note.directus_files_id.type;
            if (type.includes("pdf")) fileTypes.add("PDF");
            else if (type.includes("audio")) fileTypes.add("Audio");
            else if (type.includes("image")) fileTypes.add("Image");
          }
        });
      }
    });
    return Array.from(fileTypes).sort();
  });

  const filteredLieder = computed(() => {
    let filtered = [...lieder.value];

    // Favorites filter (apply first for better performance)
    if (filters.value.showFavoritesOnly) {
      filtered = filtered.filter((lied) => favorites.value.includes(lied.id || ""));
    }

    // Search filter
    if (filters.value.searchQuery.trim()) {
      const query = filters.value.searchQuery.toLowerCase();
      filtered = filtered.filter((lied) => {
        // Search in title
        if (lied.titel?.toLowerCase().includes(query)) return true;

        // Search in text content
        if (lied.textId?.strophenEinzeln) {
          const textContent = lied.textId.strophenEinzeln
            .map((strophe: Strophe) => strophe?.strophe || "")
            .join(" ")
            .toLowerCase();
          if (textContent.includes(query)) return true;
        }

        // Search in authors
        const authors = getAuthors(lied);
        if (authors.some((author) => author.toLowerCase().includes(query))) return true;

        return false;
      });
    }

    // Category filter
    if (filters.value.selectedCategory) {
      filtered = filtered.filter((lied) => {
        if (!lied.kategorieId) return false;
        return lied.kategorieId.some(
          (kat) => kat?.kategorie_id?.name === filters.value.selectedCategory,
        );
      });
    }

    // File type filter
    if (filters.value.selectedFileType) {
      filtered = filtered.filter((lied) => {
        if (!lied.melodieId?.noten) return false;
        return lied.melodieId.noten.some((note) => {
          if (!note?.directus_files_id?.type) return false;
          const type = note.directus_files_id.type;

          switch (filters.value.selectedFileType) {
            case "PDF":
              return type.includes("pdf");
            case "Audio":
              return type.includes("audio");
            case "Image":
              return type.includes("image");
            default:
              return false;
          }
        });
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let valueA: string | number | Date | null;
      let valueB: string | number | Date | null;

      switch (filters.value.sortBy) {
        case "title":
          valueA = a.titel || "";
          valueB = b.titel || "";
          break;
        case "date_updated":
          valueA = new Date(a.date_updated || 0);
          valueB = new Date(b.date_updated || 0);
          break;
        case "liednummer2000":
          valueA = a.liednummer2000 || 0;
          valueB = b.liednummer2000 || 0;
          break;
        default:
          valueA = a.titel || "";
          valueB = b.titel || "";
      }

      if (valueA < valueB) return filters.value.sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return filters.value.sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  });

  // Actions
  const buildApiFilters = () => {
    const baseFilters = {
      status: { _eq: "published" },
      bewertungKleinerKreis: { rangfolge: { _eq: 5 } },
    };

    const dynamicFilters: Record<string, unknown>[] = [];

    // Add search filter if present
    if (filters.value.searchQuery.trim()) {
      const searchTerm = filters.value.searchQuery.trim();
      dynamicFilters.push({
        _or: [
          { titel: { _icontains: searchTerm } },
          {
            textId: {
              autorId: { autor_id: { vorname: { _icontains: searchTerm } } },
            },
          },
          {
            textId: {
              autorId: { autor_id: { nachname: { _icontains: searchTerm } } },
            },
          },
          {
            melodieId: {
              autorId: { autor_id: { vorname: { _icontains: searchTerm } } },
            },
          },
          {
            melodieId: {
              autorId: { autor_id: { nachname: { _icontains: searchTerm } } },
            },
          },
        ],
      });
    }

    // Add category filter if present
    if (filters.value.selectedCategory) {
      dynamicFilters.push({
        kategorieId: { kategorie_id: { name: { _eq: filters.value.selectedCategory } } },
      });
    }

    // Add file type filter if present
    if (filters.value.selectedFileType) {
      let fileTypeFilter;
      switch (filters.value.selectedFileType) {
        case "PDF":
          fileTypeFilter = {
            melodieId: {
              noten: { directus_files_id: { type: { _contains: "pdf" } } },
            },
          };
          break;
        case "Audio":
          fileTypeFilter = {
            melodieId: {
              noten: { directus_files_id: { type: { _contains: "audio" } } },
            },
          };
          break;
        case "Image":
          fileTypeFilter = {
            melodieId: {
              noten: { directus_files_id: { type: { _contains: "image" } } },
            },
          };
          break;
      }
      if (fileTypeFilter) {
        dynamicFilters.push(fileTypeFilter);
      }
    }

    // Combine base filters with dynamic filters
    if (dynamicFilters.length > 0) {
      return {
        _and: [baseFilters, ...dynamicFilters],
      };
    }

    return baseFilters;
  };

  const fetchLieder = async (forceOnline = false) => {
    try {
      console.log("fetchLieder called with forceOnline:", forceOnline);
      console.log("preferOfflineData:", preferOfflineData.value);
      isLoading.value = true;
      error.value = null;

      // If user prefers offline data (and not forcing online), try offline first
      if (preferOfflineData.value && !forceOnline) {
        console.log("Trying offline data first...");
        const offlineSongs = await getOfflineSongs();
        console.log("offlineSongs", offlineSongs);

        if (offlineSongs.length > 0) {
          console.log(`Found ${offlineSongs.length} songs in IndexedDB`);
          lieder.value = offlineSongs;
          isUsingCachedData.value = true;
          hasMore.value = false; // IndexedDB contains all songs
          return;
        }
      }

      // If user prefers online data or no offline songs available, try API
      if (typeof window !== "undefined" && !navigator.onLine) {
        // Try offline as fallback if online isn't available
        const offlineSongs = await getOfflineSongs();
        if (offlineSongs.length > 0) {
          console.log(`Using offline songs as fallback (${offlineSongs.length} available)`);
          lieder.value = offlineSongs;
          isUsingCachedData.value = true;
          hasMore.value = false;
          return;
        }

        error.value = t("songs.noOfflineContentAvailable");
        return;
      }

      console.log("Fetching songs from API");
      // Map sort fields to actual database column names
      const sortFieldMap: Record<string, string> = {
        title: "titel",
        date_updated: "date_updated",
        liednummer2000: "liednummer2000",
      };
      const dbSortField = sortFieldMap[filters.value.sortBy] || filters.value.sortBy;
      const sortField = filters.value.sortDirection === "desc" ? `-${dbSortField}` : dbSortField;

      const variables = {
        limit: currentLimit.value,
        offset: 0,
        filter: buildApiFilters(),
        sort: [sortField],
      };

      const result = await queryGesangbuchlied(variables);

      if (result) {
        console.log(`Loaded ${result.length} songs from API`);
        lieder.value = result;
        isUsingCachedData.value = false;
        hasMore.value = result.length === currentLimit.value;
      } else {
        error.value = t("songs.noSongsFound");
      }
    } catch (err) {
      console.error("Error fetching gesangbuchlieder:", err);

      // Try offline as fallback on API error
      const offlineSongs = await getOfflineSongs();
      if (offlineSongs.length > 0) {
        console.log(
          `Using offline songs as fallback after API error (${offlineSongs.length} available)`,
        );
        lieder.value = offlineSongs;
        isUsingCachedData.value = true;
        hasMore.value = false;
        return;
      }

      // Handle offline errors gracefully
      if (typeof window !== "undefined" && !navigator.onLine) {
        error.value = t("songs.noOfflineContentAvailableConnect");
      } else {
        error.value = err instanceof Error ? err.message : t("utils.unknownError");
      }
    } finally {
      isLoading.value = false;
    }
  };

  const loadMore = async () => {
    try {
      isLoadingMore.value = true;

      // If we're using cached data, don't load more (IndexedDB contains all songs)
      if (isUsingCachedData.value) {
        hasMore.value = false;
        return;
      }

      // Only load more from API if we're using fresh data
      const sortFieldMap: Record<string, string> = {
        title: "titel",
        date_updated: "date_updated",
        liednummer2000: "liednummer2000",
      };
      const dbSortField = sortFieldMap[filters.value.sortBy] || filters.value.sortBy;
      const sortField = filters.value.sortDirection === "desc" ? `-${dbSortField}` : dbSortField;

      const variables = {
        limit: 50,
        offset: lieder.value.length,
        filter: buildApiFilters(),
        sort: [sortField],
      };

      const result = await queryGesangbuchlied(variables);
      lieder.value.push(...result);
      hasMore.value = result.length === 50;
    } catch (err) {
      console.error("Error loading more songs:", err);
    } finally {
      isLoadingMore.value = false;
    }
  };

  const fetchMissingFavorites = async () => {
    try {
      const currentlyLoadedIds = new Set(lieder.value.map((lied) => lied.id).filter(Boolean));
      const missingFavoriteIds = favorites.value.filter((id) => !currentlyLoadedIds.has(id));

      if (missingFavoriteIds.length > 0) {
        console.log(
          `Fetching ${missingFavoriteIds.length} missing favorite songs:`,
          missingFavoriteIds,
        );

        const missingFavorites = await queryGesangbuchliedByIds(missingFavoriteIds);

        if (missingFavorites.length > 0) {
          // Add the missing favorites to the main array
          lieder.value = [...lieder.value, ...missingFavorites];
          console.log(`Added ${missingFavorites.length} missing favorite songs to the list`);
        }
      }
    } catch (error) {
      console.error("Error fetching missing favorites:", error);
    }
  };

  const getAuthors = (lied: Gesangbuchlied): string[] => {
    const authors: string[] = [];

    // Text authors
    if (lied.textId?.autorId) {
      lied.textId.autorId.forEach((autorRel) => {
        if (autorRel?.autor_id) {
          const autor = autorRel.autor_id;
          const name = `${autor.vorname || ""} ${autor.nachname || ""}`.trim();
          if (name) authors.push(name);
        }
      });
    }

    // Melody authors
    if (lied.melodieId?.autorId) {
      lied.melodieId.autorId.forEach((autorRel) => {
        if (autorRel?.autor_id) {
          const autor = autorRel.autor_id;
          const name = `${autor.vorname || ""} ${autor.nachname || ""}`.trim();
          if (name && !authors.includes(name)) authors.push(name);
        }
      });
    }

    return authors;
  };

  const hasAudioFiles = (lied: Gesangbuchlied): boolean => {
    return !!lied.melodieId?.noten?.some((note) =>
      note?.directus_files_id?.type?.includes("audio"),
    );
  };

  const getCategories = (lied: Gesangbuchlied): string[] => {
    return (
      (lied.kategorieId?.map((kat) => kat?.kategorie_id?.name).filter(Boolean) as string[]) || []
    );
  };

  const setFilter = <K extends keyof GesangbuchliedFilters>(
    key: K,
    value: GesangbuchliedFilters[K],
  ) => {
    filters.value[key] = value;
  };

  const clearFilters = () => {
    filters.value = {
      searchQuery: "",
      selectedCategory: "",
      selectedFileType: "",
      sortBy: "title",
      sortDirection: "asc",
      showFavoritesOnly: false,
    };
  };

  const toggleSortDirection = () => {
    filters.value.sortDirection = filters.value.sortDirection === "asc" ? "desc" : "asc";
  };

  const setPreferOfflineData = (value: boolean) => {
    preferOfflineData.value = value;
  };

  return {
    // State
    lieder,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    currentLimit,
    isUsingCachedData,
    preferOfflineData,
    filters,

    // Computed
    shouldShowDataSourceControl,
    availableCategories,
    availableFileTypes,
    filteredLieder,

    // Actions
    fetchLieder,
    loadMore,
    fetchMissingFavorites,
    getAuthors,
    hasAudioFiles,
    getCategories,
    setFilter,
    clearFilters,
    toggleSortDirection,
    setPreferOfflineData,
  };
});

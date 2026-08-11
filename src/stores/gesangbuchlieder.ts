import { defineStore } from "pinia";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { Strophe } from "@/gql";
import type { Gesangbuchlied } from "@/gql/graphql";

import { useFavorites } from "@/composables/useFavorites";
import { NoSessionError, useGesangbuchlied } from "@/composables/useGesangbuchlied";
import { useOfflineDownload } from "@/composables/useOfflineDownload";

// UI sort keys mapped onto the Directus column names. Module scope because both
// the first page and every subsequent one build their request from it — keeping
// two copies is what let loadMore drift away from fetchLieder.
const SORT_FIELD_MAP: Record<string, string> = {
  title: "titel",
  date_updated: "date_updated",
  liednummer2000: "liednummer2000",
  liednummer2026: "liednummer2026",
};

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
    // `import.meta.env.DEV` is replaced at build time, so the dev escape hatch
    // is eliminated from the production bundle entirely. The hostname check it
    // replaces was evaluated at runtime and therefore still fired for a
    // production build served from localhost — a kiosk install or `vite
    // preview` — offering a toggle with nothing downloaded to toggle to.
    return (hasOfflineContent.value || import.meta.env.DEV) && lieder.value.length > 0;
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

    // Search filter. Trim once and reuse: the guard used to test the trimmed
    // value while the needle below was built from the raw one, so a pasted
    // " Lobe " cleared the guard and then matched nothing — while
    // buildApiFilters() trimmed, giving the same keystrokes two different
    // result sets depending on which path served the list.
    const query = filters.value.searchQuery.trim().toLowerCase();
    if (query) {
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
        case "liednummer2026":
          valueA = (a as { liednummer2026?: number | null }).liednummer2026 || 0;
          valueB = (b as { liednummer2026?: number | null }).liednummer2026 || 0;
          break;
        default:
          valueA = a.titel || "";
          valueB = b.titel || "";
      }

      // Titles must use German collation, not raw UTF-16 code-unit order.
      // Comparing with < / > puts every umlaut behind "Z" ("Ähre" after "Zion")
      // and every lowercase title behind every capitalised one.
      if (typeof valueA === "string" && typeof valueB === "string") {
        const result = valueA.localeCompare(valueB, "de");
        return filters.value.sortDirection === "asc" ? result : -result;
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

  // The one place a list request is built. fetchLieder and loadMore used to
  // assemble the same variables independently and had already drifted: the page
  // size was hard-coded to 50 here and read from currentLimit there, and the
  // sort map existed twice.
  const buildListRequest = (offset: number) => {
    const dbSortField = SORT_FIELD_MAP[filters.value.sortBy] || filters.value.sortBy;
    const sortField =
      filters.value.sortDirection === "desc" ? `-${dbSortField}` : dbSortField;

    return {
      limit: currentLimit.value,
      offset,
      filter: buildApiFilters(),
      sort: [sortField],
    };
  };

  // Bumped by every fetchLieder. loadMore captures it before awaiting and drops
  // its page if it changed in the meantime: fetchLieder *replaces* the list
  // while loadMore *appends* to it, so a debounced search landing mid-page
  // would otherwise splice the previous query's songs onto the new results.
  let requestGeneration = 0;

  const fetchLieder = async (forceOnline = false) => {
    requestGeneration++;
    try {
      isLoading.value = true;
      error.value = null;
      // Re-derived below on the one path that can page. Clearing it up front
      // means no terminal path can leave a stale "there is more" behind for
      // loadMore to act on after a filter change.
      hasMore.value = false;

      // If user prefers offline data (and not forcing online), try offline first
      if (preferOfflineData.value && !forceOnline) {
        const offlineSongs = await getOfflineSongs();

        if (offlineSongs.length > 0) {
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
          lieder.value = offlineSongs;
          isUsingCachedData.value = true;
          hasMore.value = false;
          return;
        }

        error.value = t("songs.noOfflineContentAvailable");
        return;
      }

      const result = await queryGesangbuchlied(buildListRequest(0));

      if (result) {
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
        lieder.value = offlineSongs;
        isUsingCachedData.value = true;
        hasMore.value = false;
        return;
      }

      // Handle offline errors gracefully
      if (typeof window !== "undefined" && !navigator.onLine) {
        error.value = t("songs.noOfflineContentAvailableConnect");
      } else if (err instanceof NoSessionError) {
        // The only error the user can actually resolve — say so in their own
        // language instead of surfacing the data layer's English.
        error.value = t(err.i18nKey);
      } else {
        error.value = err instanceof Error ? err.message : t("utils.unknownError");
      }
    } finally {
      isLoading.value = false;
    }
  };

  const loadMore = async () => {
    // Guard before touching the flag, and in the store rather than in each
    // view: the scroll listener fires repeatedly, and both current callers
    // happening to check `!isLoadingMore && hasMore` themselves is not
    // something the next caller will remember to do.
    if (isLoadingMore.value || !hasMore.value) return;

    // If we're using cached data, don't load more (IndexedDB contains all songs)
    if (isUsingCachedData.value) {
      hasMore.value = false;
      return;
    }

    const generation = requestGeneration;

    try {
      isLoadingMore.value = true;

      const result = await queryGesangbuchlied(buildListRequest(lieder.value.length));

      // A fetchLieder landed while this page was in flight and replaced the
      // list. Appending now would put the previous query's songs under the new
      // results.
      if (generation !== requestGeneration) return;

      lieder.value.push(...result);
      hasMore.value = result.length === currentLimit.value;
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
        const missingFavorites = await queryGesangbuchliedByIds(missingFavoriteIds);

        if (missingFavorites.length > 0) {
          // Add the missing favorites to the main array
          lieder.value = [...lieder.value, ...missingFavorites];
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

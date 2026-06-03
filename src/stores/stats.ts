import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { query } from "gql-query-builder";
import { defineStore } from "pinia";

import { computed, ref } from "vue";

import type { Kategorie } from "@/gql/graphql";

import { useDirectusApi } from "@/composables/useDirectusApi";
import { getAllOfflineSongs, getOfflineSongCount } from "@/composables/useOfflineDownload";

export interface StatsData {
  totalSongs: number;
  offlineSongs: number;
  favorites: number;
  recentlyPlayed: number;
}

export interface CategoryWithCount {
  id: string;
  name: string;
  typ?: string;
  count: number;
}

export const useStatsStore = defineStore("stats", () => {
  // State
  const stats = ref<StatsData>({
    totalSongs: 0,
    offlineSongs: 0,
    favorites: 0,
    recentlyPlayed: 0,
  });

  const categories = ref<CategoryWithCount[]>([]);
  const isLoadingStats = ref(false);
  const isLoadingCategories = ref(false);
  const statsError = ref<string | null>(null);
  const categoriesError = ref<string | null>(null);

  // Getters
  const hasStats = computed(() => stats.value.totalSongs > 0);
  const hasCategories = computed(() => categories.value.length > 0);

  // Helper functions
  const getGraphQLEndpoint = () => `${import.meta.env.VITE_PUBLIC_DIRECTUS_URL}/graphql`;

  const createAuthHeaders = (additionalHeaders?: Record<string, string>) => {
    const authStore = useAuthStore();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...additionalHeaders,
    };

    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    return headers;
  };

  const makeGraphQLRequest = async <T = unknown>(queryBuilder: {
    query: string;
    variables?: Record<string, unknown>;
  }): Promise<T> => {
    const authStore = useAuthStore();
    const directusApi = useDirectusApi();

    if (!authStore.accessToken) {
      throw new Error("No access token available. Please log in.");
    }

    try {
      const response = await axios.post<T>(getGraphQLEndpoint(), queryBuilder, {
        headers: createAuthHeaders(),
      });

      return response.data;
    } catch (error: unknown) {
      // If we get a 401 error, try using the directusApi's authenticated request
      // which handles token refresh automatically
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return await directusApi.authenticatedRequest<T>(getGraphQLEndpoint(), {
          method: "POST",
          data: queryBuilder,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      throw error;
    }
  };

  // Actions
  const fetchTotalSongsCount = async (): Promise<number> => {
    // Based on the GraphQL validation errors, we know the structure should be nested
    // Let's try the manual GraphQL approach first since we know the correct structure
    try {
      console.log("Trying manual GraphQL query with count.id and rangfolge filter...");

      const manualQuery = {
        query: `
          query GetSongCount($filter: gesangbuchlied_filter) {
            gesangbuchlied_aggregated(filter: $filter) {
              count {
                id
              }
            }
          }
        `,
        variables: {
          filter: {
            bewertungKleinerKreis: { rangfolge: { _eq: 5 } },
          },
        },
      };

      const response = await makeGraphQLRequest<{
        data: {
          gesangbuchlied_aggregated: Array<{
            count: { id: number };
          }>;
        };
      }>(manualQuery);

      const result = response.data?.gesangbuchlied_aggregated[0]?.count?.id;
      if (typeof result === "number") {
        return result;
      }
    } catch (error) {
      console.error("Manual GraphQL with count.id and filter failed:", error);
    }

    // Fallback: try without filter if the filtered query fails
    try {
      console.log("Trying manual GraphQL query with count.id (no filter)...");

      const manualQuery = {
        query: `
          query GetSongCount {
            gesangbuchlied_aggregated {
              count {
                id
              }
            }
          }
        `,
        variables: {},
      };

      const response = await makeGraphQLRequest<{
        data: {
          gesangbuchlied_aggregated: Array<{
            count: { id: number };
          }>;
        };
      }>(manualQuery);

      const result = response.data?.gesangbuchlied_aggregated[0]?.count?.id;
      if (typeof result === "number") {
        return result;
      }
    } catch (error) {
      console.error("Manual GraphQL with count.id (no filter) failed:", error);
    }

    // Try other possible subfields for count
    const countSubfields = ["id", "*", "all"];

    for (const subfield of countSubfields) {
      try {
        console.log(`Trying manual GraphQL query with count.${subfield}...`);

        const manualQuery = {
          query: `
            query GetSongCount {
              gesangbuchlied_aggregated {
                count {
                  ${subfield}
                }
              }
            }
          `,
          variables: {},
        };

        const response = await makeGraphQLRequest<{
          data: {
            gesangbuchlied_aggregated: Array<{
              count: { [key: string]: number };
            }>;
          };
        }>(manualQuery);

        const result = response.data?.gesangbuchlied_aggregated[0]?.count?.[subfield];
        if (typeof result === "number" && result > 0) {
          return result;
        }
      } catch (error) {
        console.error(`Manual GraphQL with count.${subfield} failed:`, error);
        continue;
      }
    }

    // Try countDistinct with different subfields
    for (const subfield of countSubfields) {
      try {
        console.log(`Trying manual GraphQL query with countDistinct.${subfield}...`);

        const manualQuery = {
          query: `
            query GetSongCount {
              gesangbuchlied_aggregated {
                countDistinct {
                  ${subfield}
                }
              }
            }
          `,
          variables: {},
        };

        const response = await makeGraphQLRequest<{
          data: {
            gesangbuchlied_aggregated: Array<{
              countDistinct: { [key: string]: number };
            }>;
          };
        }>(manualQuery);

        const result = response.data?.gesangbuchlied_aggregated[0]?.countDistinct?.[subfield];
        if (typeof result === "number" && result > 0) {
          return result;
        }
      } catch (error) {
        console.error(`Manual GraphQL with countDistinct.${subfield} failed:`, error);
        continue;
      }
    }

    // Final fallback: try to get all songs and count them (not efficient but works)
    try {
      console.log("All aggregated approaches failed, falling back to fetching all songs...");

      const allSongsQuery = query({
        operation: "gesangbuchlied",
        fields: ["id"],
      });

      const allSongsResponse = await makeGraphQLRequest<{
        data: {
          gesangbuchlied: Array<{ id: string }>;
        };
      }>(allSongsQuery);

      return allSongsResponse.data?.gesangbuchlied?.length || 0;
    } catch (finalError) {
      console.error("All approaches failed:", finalError);
      throw finalError;
    }
  };

  const fetchCategoriesWithCount = async (): Promise<CategoryWithCount[]> => {
    // First get all categories
    const categoriesQueryBuilder = query({
      operation: "kategorie",
      fields: ["id", "name", "typ"],
    });

    try {
      // Get categories first
      const categoriesResponse = await makeGraphQLRequest<{
        data: {
          kategorie: Kategorie[];
        };
      }>(categoriesQueryBuilder);

      const categoriesData = categoriesResponse.data?.kategorie || [];

      // Try manual GraphQL query for category counts with proper structure
      try {
        console.log("Trying manual GraphQL query for category counts...");

        const categoryCountQuery = {
          query: `
            query GetCategoryCounts($filter: gesangbuchlied_kategorie_filter, $groupBy: [String]) {
              gesangbuchlied_kategorie_aggregated(filter: $filter, groupBy: $groupBy) {
                group
                count {
                  id
                }
              }
            }
          `,
          variables: {
            groupBy: ["kategorie_id"],
            filter: {
              gesangbuchlied_id: {
                bewertungKleinerKreis: { rangfolge: { _eq: 5 } },
              },
            },
          },
        };

        const countsResponse = await makeGraphQLRequest<{
          data: {
            gesangbuchlied_kategorie_aggregated: Array<{
              group: { kategorie_id: string };
              count: { id: number };
            }>;
          };
        }>(categoryCountQuery);

        const counts = countsResponse.data?.gesangbuchlied_kategorie_aggregated || [];

        // Create a map for easy lookup
        const countMap = new Map<string, number>();
        counts.forEach((item) => {
          if (item.group?.kategorie_id) {
            countMap.set(item.group.kategorie_id.toString(), item.count?.id || 0);
          }
        });

        // Combine categories with their counts
        return categoriesData.map((category) => ({
          id: category.id,
          name: category.name || "Unbekannt",
          typ: category.typ || undefined,
          count: countMap.get(category.id.toString()) || 0,
        }));
      } catch (countError) {
        console.error("Failed to get category counts with manual query:", countError);

        // Fallback: try without the nested filter
        try {
          console.log("Trying simplified manual GraphQL query for category counts...");

          const simpleCategoryCountQuery = {
            query: `
              query GetCategoryCounts($groupBy: [String]) {
                gesangbuchlied_kategorie_aggregated(groupBy: $groupBy) {
                  group
                  count {
                    id
                  }
                }
              }
            `,
            variables: {
              groupBy: ["kategorie_id"],
            },
          };

          const countsResponse = await makeGraphQLRequest<{
            data: {
              gesangbuchlied_kategorie_aggregated: Array<{
                group: { kategorie_id: string };
                count: { id: number };
              }>;
            };
          }>(simpleCategoryCountQuery);

          const counts = countsResponse.data?.gesangbuchlied_kategorie_aggregated || [];

          // Create a map for easy lookup
          const countMap = new Map<string, number>();
          counts.forEach((item) => {
            if (item.group?.kategorie_id) {
              countMap.set(item.group.kategorie_id.toString(), item.count?.id || 0);
            }
          });

          // Combine categories with their counts
          return categoriesData.map((category) => ({
            id: category.id,
            name: category.name || "Unbekannt",
            typ: category.typ || undefined,
            count: countMap.get(category.id.toString()) || 0,
          }));
        } catch (fallbackError) {
          console.error("All category count approaches failed:", fallbackError);

          // Final fallback: return categories with zero counts
          return categoriesData.map((category) => ({
            id: category.id,
            name: category.name || "Unbekannt",
            typ: category.typ || undefined,
            count: 0,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching categories with count:", error);
      throw error;
    }
  };

  const loadStats = async () => {
    if (isLoadingStats.value) return;

    isLoadingStats.value = true;
    statsError.value = null;

    // Read the offline count from IndexedDB first — it doesn't depend on the
    // network, so it must survive a failed (e.g. offline) totalSongs fetch.
    const offlineSongs = await getOfflineSongCount();

    try {
      const totalSongs = await fetchTotalSongsCount();

      stats.value = {
        totalSongs,
        offlineSongs,
        favorites: 0, // TODO: Get from user preferences/local storage
        recentlyPlayed: 0, // TODO: Get from local storage
      };
    } catch (error) {
      console.error("Error loading stats:", error);
      statsError.value = error instanceof Error ? error.message : "Failed to load stats";

      // Network total failed (e.g. offline) — still surface the offline count.
      stats.value = {
        totalSongs: 0,
        offlineSongs,
        favorites: 0,
        recentlyPlayed: 0,
      };
    } finally {
      isLoadingStats.value = false;
    }
  };

  // Derive categories (with counts) from the songs stored offline in IndexedDB.
  // The downloaded set is exactly the rangfolge=5 songs the online counts are
  // based on, so these numbers match what the API returns — unlike the old mock
  // fallback, which showed a handful of fake categories. Counts each category
  // junction on each song (mirroring the server-side aggregate over the
  // gesangbuchlied_kategorie rows).
  const buildOfflineCategories = async (): Promise<CategoryWithCount[]> => {
    const songs = await getAllOfflineSongs();
    const map = new Map<string, CategoryWithCount>();

    for (const song of songs) {
      const kats = song.kategorieId;
      if (!Array.isArray(kats)) continue;

      for (const kat of kats) {
        const cat = kat?.kategorie_id as
          | { id?: string | number; name?: string; typ?: string }
          | null
          | undefined;
        if (!cat?.name) continue;

        // Prefer the real category id (needed for the emoji icon map); fall
        // back to the name as key for older downloads that lack it.
        const id = cat.id != null ? cat.id.toString() : cat.name;
        const existing = map.get(id);
        if (existing) {
          existing.count++;
        } else {
          map.set(id, {
            id,
            name: cat.name,
            typ: cat.typ ?? undefined,
            count: 1,
          });
        }
      }
    }

    return Array.from(map.values());
  };

  const loadCategories = async () => {
    if (isLoadingCategories.value) return;

    isLoadingCategories.value = true;
    categoriesError.value = null;

    try {
      const authStore = useAuthStore();
      const online = typeof navigator === "undefined" || navigator.onLine;

      // Offline-first: when the API is unreachable (no network or no session),
      // derive categories from downloaded songs instead of hitting the network.
      if (!online || !authStore.accessToken) {
        const offline = await buildOfflineCategories();
        if (offline.length > 0) {
          categories.value = offline;
          return;
        }
      }

      categories.value = await fetchCategoriesWithCount();
    } catch (error) {
      console.error("Error loading categories:", error);
      categoriesError.value = error instanceof Error ? error.message : "Failed to load categories";

      // Network path failed — fall back to whatever was downloaded for offline
      // use (empty array if nothing is downloaded, which is honest).
      categories.value = await buildOfflineCategories();
    } finally {
      isLoadingCategories.value = false;
    }
  };

  const refreshStats = async () => {
    await Promise.all([loadStats(), loadCategories()]);
  };

  const clearStats = () => {
    stats.value = {
      totalSongs: 0,
      offlineSongs: 0,
      favorites: 0,
      recentlyPlayed: 0,
    };
    categories.value = [];
    statsError.value = null;
    categoriesError.value = null;
  };

  return {
    // State
    stats,
    categories,
    isLoadingStats,
    isLoadingCategories,
    statsError,
    categoriesError,

    // Getters
    hasStats,
    hasCategories,

    // Actions
    loadStats,
    loadCategories,
    refreshStats,
    clearStats,
  };
});

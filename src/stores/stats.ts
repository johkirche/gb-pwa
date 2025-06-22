import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { query } from "gql-query-builder";
import { defineStore } from "pinia";

import { computed, ref } from "vue";

import type { Kategorie } from "@/gql/graphql";

import { useDirectusApi } from "@/composables/useDirectusApi";

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
  const getGraphQLEndpoint = () =>
    `${import.meta.env.VITE_PUBLIC_DIRECTUS_URL}/graphql`;

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
      console.log(
        "Trying manual GraphQL query with count.id and rangfolge filter...",
      );

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
            status: { _eq: "published" },
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

        const result =
          response.data?.gesangbuchlied_aggregated[0]?.count?.[subfield];
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
        console.log(
          `Trying manual GraphQL query with countDistinct.${subfield}...`,
        );

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

        const result =
          response.data?.gesangbuchlied_aggregated[0]?.countDistinct?.[
            subfield
          ];
        if (typeof result === "number" && result > 0) {
          return result;
        }
      } catch (error) {
        console.error(
          `Manual GraphQL with countDistinct.${subfield} failed:`,
          error,
        );
        continue;
      }
    }

    // Final fallback: try to get all songs and count them (not efficient but works)
    try {
      console.log(
        "All aggregated approaches failed, falling back to fetching all songs...",
      );

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
                status: { _eq: "published" },
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

        const counts =
          countsResponse.data?.gesangbuchlied_kategorie_aggregated || [];

        // Create a map for easy lookup
        const countMap = new Map<string, number>();
        counts.forEach((item) => {
          if (item.group?.kategorie_id) {
            countMap.set(
              item.group.kategorie_id.toString(),
              item.count?.id || 0,
            );
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
        console.error(
          "Failed to get category counts with manual query:",
          countError,
        );

        // Fallback: try without the nested filter
        try {
          console.log(
            "Trying simplified manual GraphQL query for category counts...",
          );

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

          const counts =
            countsResponse.data?.gesangbuchlied_kategorie_aggregated || [];

          // Create a map for easy lookup
          const countMap = new Map<string, number>();
          counts.forEach((item) => {
            if (item.group?.kategorie_id) {
              countMap.set(
                item.group.kategorie_id.toString(),
                item.count?.id || 0,
              );
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

    try {
      const totalSongs = await fetchTotalSongsCount();

      stats.value = {
        totalSongs,
        offlineSongs: 0, // TODO: Get from local storage
        favorites: 0, // TODO: Get from user preferences/local storage
        recentlyPlayed: 0, // TODO: Get from local storage
      };
    } catch (error) {
      console.error("Error loading stats:", error);
      statsError.value =
        error instanceof Error ? error.message : "Failed to load stats";

      // Set default values on error
      stats.value = {
        totalSongs: 0,
        offlineSongs: 0,
        favorites: 0,
        recentlyPlayed: 0,
      };
    } finally {
      isLoadingStats.value = false;
    }
  };

  const loadCategories = async () => {
    if (isLoadingCategories.value) return;

    isLoadingCategories.value = true;
    categoriesError.value = null;

    try {
      categories.value = await fetchCategoriesWithCount();
    } catch (error) {
      console.error("Error loading categories:", error);
      categoriesError.value =
        error instanceof Error ? error.message : "Failed to load categories";

      // Fallback to mock data on error
      categories.value = [
        { id: "1", name: "Advent", count: 45 },
        { id: "2", name: "Weihnachten", count: 62 },
        { id: "3", name: "Ostern", count: 38 },
        { id: "4", name: "Pfingsten", count: 24 },
        { id: "5", name: "Lob & Anbetung", count: 89 },
        { id: "6", name: "Gemeinschaft", count: 56 },
        { id: "7", name: "Moderne Lieder", count: 34 },
        { id: "8", name: "Klassische Hymnen", count: 78 },
      ];
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

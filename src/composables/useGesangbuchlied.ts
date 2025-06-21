import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { query } from "gql-query-builder";

import { type Ref, computed, unref } from "vue";

import type { Gesangbuchlied, Gesangbuchlied_Filter } from "@/gql/graphql";

import { useDirectusApi } from "@/composables/useDirectusApi";

export const useGesangbuchlied = () => {
  const directusApi = useDirectusApi();
  const authStore = useAuthStore();

  // GraphQL endpoint
  const graphqlEndpoint = `${import.meta.env.VITE_PUBLIC_DIRECTUS_URL}/graphql`;

  // Create authenticated headers
  const createAuthHeaders = (additionalHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...additionalHeaders,
    };

    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    return headers;
  };

  // Axios instance for GraphQL requests with authentication
  const makeGraphQLRequest = async <T = unknown>(queryBuilder: {
    query: string;
    variables?: Record<string, unknown>;
  }): Promise<T> => {
    if (!authStore.accessToken) {
      throw new Error("No access token available. Please log in.");
    }

    try {
      const response = await axios.post<T>(graphqlEndpoint, queryBuilder, {
        headers: createAuthHeaders(),
      });

      return response.data;
    } catch (error: unknown) {
      // If we get a 401 error, try using the directusApi's authenticated request
      // which handles token refresh automatically
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return await directusApi.authenticatedRequest<T>(graphqlEndpoint, {
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

  const fileFields = ["id", "title", "type", "filename_download", "filesize"];

  const autorFields = [
    "geburtsjahr",
    "id",
    "nachname",
    "status",
    "sterbejahr",
    "vorname",
  ];

  // Common fields for gesangbuchlied queries
  const getGesangbuchliedFields = () => [
    "id",
    "status",
    "titel",
    "date_updated",
    "einreicherName",
    "externerLink",
    "liedHatAenderung",
    "liednummer2000",
    "linkCloud",
    "melodieGeaendert",
    "textGeaendert",
    "rueckfrageAutor",
    {
      kategorieId: [
        "id",
        {
          kategorie_id: ["name", "typ"],
        },
      ],
    },
    {
      melodieId: [
        "id",
        {
          noten: [
            "id",
            {
              directus_files_id: fileFields,
            },
          ],
        },
        {
          autorId: [
            "id",
            {
              autor_id: autorFields,
            },
          ],
        },
      ],
    },
    {
      textId: [
        "id",
        "strophenEinzeln",
        {
          autorId: [
            "id",
            {
              autor_id: autorFields,
            },
          ],
        },
      ],
    },
  ];

  // Build query for fetching gesangbuchlied list
  const buildGesangbuchliedQuery = (variables: {
    limit?: number;
    offset?: number;
    filter?: Gesangbuchlied_Filter | null;
  }) => {
    const queryVars: Record<string, { value: unknown; type: string }> = {};

    if (variables.limit !== undefined) {
      queryVars.limit = { value: variables.limit, type: "Int" };
    }
    if (variables.offset !== undefined) {
      queryVars.offset = { value: variables.offset, type: "Int" };
    }
    if (variables.filter !== undefined && variables.filter !== null) {
      queryVars.filter = {
        value: variables.filter,
        type: "gesangbuchlied_filter",
      };
    }
    return query({
      operation: "gesangbuchlied",
      variables: queryVars,
      fields: getGesangbuchliedFields(),
    });
  };

  // Build query for fetching single gesangbuchlied by ID
  const buildGesangbuchliedByIdQuery = (id: string | number) => {
    return query({
      operation: "gesangbuchlied_by_id",
      variables: {
        id: { value: id, type: "ID!" },
      },
      fields: getGesangbuchliedFields(),
    });
  };

  /**
   * Direct async query for gesangbuchlied - perfect for button clicks and imperative calls
   * Uses axios with automatic token refresh via DirectusApi fallback
   */
  const queryGesangbuchlied = async (variables: {
    limit?: number;
    offset?: number;
    filter?: Gesangbuchlied_Filter | null;
  }): Promise<Gesangbuchlied[]> => {
    const queryBuilder = buildGesangbuchliedQuery({
      limit: variables.limit || 100,
      offset: variables.offset || 0,
      filter: variables.filter || null,
    });

    console.log(queryBuilder);

    try {
      const response = await makeGraphQLRequest<{
        data: {
          gesangbuchlied: Gesangbuchlied[];
        };
      }>(queryBuilder);

      return response.data?.gesangbuchlied || [];
    } catch (error) {
      console.error("Error fetching gesangbuchlied:", error);
      throw error;
    }
  };

  /**
   * Direct async query for single gesangbuchlied by ID
   * Uses axios with automatic token refresh via DirectusApi fallback
   */
  const queryGesangbuchliedById = async (
    id: string | number,
  ): Promise<Gesangbuchlied | null> => {
    const queryBuilder = buildGesangbuchliedByIdQuery(id);

    try {
      const response = await makeGraphQLRequest<{
        data: {
          gesangbuchlied_by_id: Gesangbuchlied;
        };
      }>(queryBuilder);

      return response.data?.gesangbuchlied_by_id || null;
    } catch (error) {
      console.error("Error fetching gesangbuchlied by ID:", error);
      throw error;
    }
  };

  /**
   * Fetch all gesangbuchlied with optional filtering
   * Uses direct axios call with proper authentication
   */
  const fetchGesangbuchlied = async (options?: {
    limit?: number;
    offset?: number;
    filter?: Gesangbuchlied_Filter | null;
  }): Promise<Gesangbuchlied[]> => {
    const variables = {
      limit: options?.limit || 100,
      offset: options?.offset || 0,
      filter: options?.filter || null,
    };

    return await queryGesangbuchlied(variables);
  };

  /**
   * Fetch a single gesangbuchlied by ID
   * Uses direct axios call with proper authentication
   */
  const fetchGesangbuchliedById = async (
    id: string | number,
  ): Promise<Gesangbuchlied | null> => {
    return await queryGesangbuchliedById(id);
  };

  /**
   * Reactive computed properties for gesangbuchlied
   * Note: These are now simple wrappers around the async functions
   * For true reactivity, you might want to use a different approach like composables with refs
   */
  const useGesangbuchliedQuery = (options?: {
    limit?: number;
    offset?: number;
    filter?: Gesangbuchlied_Filter | null;
  }) => {
    // For now, return the async function - you may want to implement proper reactivity later
    return {
      queryGesangbuchlied: () => queryGesangbuchlied(options || {}),
    };
  };

  /**
   * Reactive computed properties for single gesangbuchlied
   * Note: These are now simple wrappers around the async functions
   * For true reactivity, you might want to use a different approach like composables with refs
   */
  const useGesangbuchliedByIdQuery = (
    id: Ref<string | number> | string | number,
  ) => {
    const idRef = computed(() => unref(id));

    return {
      queryGesangbuchliedById: () => queryGesangbuchliedById(idRef.value),
    };
  };

  return {
    // Direct async methods with axios and automatic token refresh
    queryGesangbuchlied,
    queryGesangbuchliedById,

    // Methods using direct axios calls
    fetchGesangbuchlied,
    fetchGesangbuchliedById,

    // Simplified reactive composables (you may want to enhance these later)
    useGesangbuchliedQuery,
    useGesangbuchliedByIdQuery,

    // Utility functions
    createAuthHeaders,
    makeGraphQLRequest,
  };
};

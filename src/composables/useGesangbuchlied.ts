import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { query } from "gql-query-builder";

import { type Ref, computed, unref } from "vue";

import type { Gesangbuchlied, Gesangbuchlied_Filter } from "@/gql/graphql";

import { useDirectusApi } from "@/composables/useDirectusApi";

/**
 * The session is gone and a re-login is the only fix.
 *
 * Carries a translation key rather than a user-facing string: this is thrown
 * deep in the data layer, which has no `useI18n`, and the message used to reach
 * the German UI as raw English. Whoever renders it maps `i18nKey` through `t()`.
 */
export class NoSessionError extends Error {
  readonly i18nKey = "auth.sessionExpired";

  constructor() {
    super("No access token available");
    this.name = "NoSessionError";
  }
}

/**
 * A GraphQL response that carried `errors`.
 *
 * Directus answers a rejected query with HTTP 200 and `{ data: null, errors }`,
 * so nothing below the transport layer would notice without this.
 */
export class GraphQLRequestError extends Error {
  constructor(errors: { message?: string }[]) {
    super(errors.map((e) => e?.message ?? "Unknown GraphQL error").join("; "));
    this.name = "GraphQLRequestError";
  }
}

/**
 * Throw if a 200 response body carries GraphQL errors.
 *
 * `errors` is only ever present and non-empty when something went wrong — but
 * an `errors: []` written by a proxy or a mock is *truthy*, so the length check
 * is what keeps a healthy response healthy.
 */
function assertNoGraphQLErrors(payload: unknown): void {
  const errors = (payload as { errors?: { message?: string }[] } | null)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    throw new GraphQLRequestError(errors);
  }
}

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
      throw new NoSessionError();
    }

    try {
      const response = await axios.post<T>(graphqlEndpoint, queryBuilder, {
        headers: createAuthHeaders(),
      });

      // A rejected query still comes back 200, so the envelope is the only place
      // the failure is visible. Checking it here — the one funnel every query
      // goes through — is what makes the callers' `|| []` safe and lets their
      // catch blocks (and the offline fallback behind them) engage at all.
      assertNoGraphQLErrors(response.data);

      return response.data;
    } catch (error: unknown) {
      // If we get a 401 error, try using the directusApi's authenticated request
      // which handles token refresh automatically
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const retried = await directusApi.authenticatedRequest<T>(graphqlEndpoint, {
          method: "POST",
          data: queryBuilder,
          headers: {
            "Content-Type": "application/json",
          },
        });

        // The retry is a fresh response and can carry errors of its own.
        assertNoGraphQLErrors(retried);

        return retried;
      }

      throw error;
    }
  };

  const fileFields = ["id", "title", "type", "filename_download", "filesize"];

  const autorFields = ["geburtsjahr", "id", "nachname", "status", "sterbejahr", "vorname"];

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
    "liednummer2026",
    "linkCloud",
    "melodieGeaendert",
    "textGeaendert",
    "rueckfrageAutor",
    { midi_intro: fileFields },
    { midi_main: fileFields },
    { midi_outro: fileFields },
    {
      kategorieId: [
        "id",
        {
          kategorie_id: ["id", "name", "typ"],
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
    sort?: string[] | null;
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
    if (variables.sort !== undefined && variables.sort !== null) {
      queryVars.sort = {
        value: variables.sort,
        type: "[String]",
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
    sort?: string[] | null;
  }): Promise<Gesangbuchlied[]> => {
    const queryBuilder = buildGesangbuchliedQuery({
      limit: variables.limit || 100,
      offset: variables.offset || 0,
      filter: variables.filter || null,
      sort: variables.sort || null,
    });

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
  const queryGesangbuchliedById = async (id: string | number): Promise<Gesangbuchlied | null> => {
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
    sort?: string[] | null;
  }): Promise<Gesangbuchlied[]> => {
    const variables = {
      limit: options?.limit || 100,
      offset: options?.offset || 0,
      filter: options?.filter || null,
      sort: options?.sort || null,
    };

    return await queryGesangbuchlied(variables);
  };

  /**
   * Fetch a single gesangbuchlied by ID
   * Uses direct axios call with proper authentication
   */
  const fetchGesangbuchliedById = async (id: string | number): Promise<Gesangbuchlied | null> => {
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
  const useGesangbuchliedByIdQuery = (id: Ref<string | number> | string | number) => {
    const idRef = computed(() => unref(id));

    return {
      queryGesangbuchliedById: () => queryGesangbuchliedById(idRef.value),
    };
  };

  /**
   * Direct async query for multiple gesangbuchlied by IDs
   * Uses axios with automatic token refresh via DirectusApi fallback
   */
  const queryGesangbuchliedByIds = async (ids: string[]): Promise<Gesangbuchlied[]> => {
    if (ids.length === 0) return [];

    const filter = {
      id: { _in: ids },
    };

    const queryBuilder = buildGesangbuchliedQuery({
      filter,
      limit: ids.length,
      sort: null,
    });

    try {
      const response = await makeGraphQLRequest<{
        data: {
          gesangbuchlied: Gesangbuchlied[];
        };
      }>(queryBuilder);

      return response.data?.gesangbuchlied || [];
    } catch (error) {
      console.error("Error fetching gesangbuchlied by IDs:", error);
      throw error;
    }
  };

  return {
    // Direct async methods with axios and automatic token refresh
    queryGesangbuchlied,
    queryGesangbuchliedById,
    queryGesangbuchliedByIds,

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

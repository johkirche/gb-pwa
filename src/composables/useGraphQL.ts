import { useAuthStore } from "@/stores/auth";
import axios from "axios";

import { useDirectusApi } from "@/composables/useDirectusApi";

/**
 * The one GraphQL transport for the Directus backend.
 *
 * `useGesangbuchlied` and the stats store each used to carry a private copy of
 * `makeGraphQLRequest`. The copies drifted: #10 taught the songs path to throw
 * a translatable `NoSessionError`, and the stats copy kept throwing raw English
 * — #32. A single funnel is what stops that class of fix from having to travel.
 */

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
export function assertNoGraphQLErrors(payload: unknown): void {
  const errors = (payload as { errors?: { message?: string }[] } | null)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    throw new GraphQLRequestError(errors);
  }
}

export interface GraphQLQuery {
  query: string;
  variables?: Record<string, unknown>;
}

const graphqlEndpoint = () => `${import.meta.env.VITE_PUBLIC_DIRECTUS_URL}/graphql`;

/** JSON headers plus a bearer token when there is a session. */
export const createAuthHeaders = (additionalHeaders?: Record<string, string>) => {
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

/**
 * POST a query to Directus and return the envelope.
 *
 * Throws `NoSessionError` without touching the network when there is no token,
 * retries once through the refreshing client on a 401, and throws
 * `GraphQLRequestError` when either response carries `errors`.
 */
export const makeGraphQLRequest = async <T = unknown>(queryBuilder: GraphQLQuery): Promise<T> => {
  const authStore = useAuthStore();

  if (!authStore.accessToken) {
    throw new NoSessionError();
  }

  const endpoint = graphqlEndpoint();

  try {
    const response = await axios.post<T>(endpoint, queryBuilder, {
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
      const retried = await useDirectusApi().authenticatedRequest<T>(endpoint, {
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

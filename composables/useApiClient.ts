/**
 * Composable that provides an API client with automatic token refresh
 * Use this for all authenticated API calls in your application
 */

export const useApiClient = () => {
  const directusApi = useDirectusApi();
  const authStore = useAuthStore();

  /**
   * Make an authenticated API call with automatic token refresh
   */
  const apiCall = async <T = any>(
    url: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: any;
      headers?: Record<string, string>;
      query?: Record<string, any>;
    } = {}
  ): Promise<T> => {
    if (!authStore.accessToken) {
      throw new Error("No access token available. Please log in.");
    }

    const { method = "GET", body, headers = {}, query } = options;

    return await directusApi.authenticatedRequest<T>(url, {
      method,
      body,
      headers,
      query,
    });
  };

  /**
   * GraphQL query/mutation with automatic token refresh
   */
  const graphql = async <T = any>(
    endpoint: string,
    query: any,
    options?: { headers?: Record<string, string> }
  ): Promise<T> => {
    return await apiCall<T>(endpoint, {
      method: "POST",
      body: query,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  };

  /**
   * GET request
   */
  const get = <T = any>(
    url: string,
    options?: { headers?: Record<string, string>; query?: Record<string, any> }
  ) => {
    return apiCall<T>(url, { ...options, method: "GET" });
  };

  /**
   * POST request
   */
  const post = <T = any>(
    url: string,
    body?: any,
    options?: { headers?: Record<string, string> }
  ) => {
    return apiCall<T>(url, { ...options, method: "POST", body });
  };

  /**
   * PUT request
   */
  const put = <T = any>(
    url: string,
    body?: any,
    options?: { headers?: Record<string, string> }
  ) => {
    return apiCall<T>(url, { ...options, method: "PUT", body });
  };

  /**
   * PATCH request
   */
  const patch = <T = any>(
    url: string,
    body?: any,
    options?: { headers?: Record<string, string> }
  ) => {
    return apiCall<T>(url, { ...options, method: "PATCH", body });
  };

  /**
   * DELETE request
   */
  const del = <T = any>(
    url: string,
    options?: { headers?: Record<string, string> }
  ) => {
    return apiCall<T>(url, { ...options, method: "DELETE" });
  };

  /**
   * Create authenticated headers for use with useFetch
   * This is useful when you need to use useFetch but still want auth headers
   */
  const createAuthHeaders = (additionalHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = {
      ...additionalHeaders,
    };

    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    return headers;
  };

  /**
   * Create a reactive authenticated fetch function for use with useFetch
   * Note: This doesn't provide automatic token refresh, but gives you the current token
   */
  const createReactiveFetch = () => {
    return {
      headers: computed(() => createAuthHeaders()),
      graphqlHeaders: computed(() =>
        createAuthHeaders({
          "Content-Type": "application/json",
        })
      ),
    };
  };

  return {
    // Generic API call
    apiCall,
    // GraphQL specific
    graphql,
    // HTTP method shortcuts
    get,
    post,
    put,
    patch,
    delete: del,
    // Utilities for useFetch integration
    createAuthHeaders,
    createReactiveFetch,
    // Direct access to underlying clients
    directus: directusApi,
  };
};

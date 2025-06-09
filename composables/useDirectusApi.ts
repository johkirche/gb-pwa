/**
 * Native Directus API client for authentication
 */

import type { User } from "~/stores/auth";

export interface LoginRequest {
  email: string;
  password: string;
  mode?: "json" | "cookie" | "session";
  otp?: string;
}

export interface LoginResponse {
  access_token: string;
  expires: number;
  refresh_token: string;
}

export interface RefreshRequest {
  refresh_token: string;
  mode?: "json" | "cookie" | "session";
}

export interface RefreshResponse {
  access_token: string;
  expires: number;
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token?: string;
  mode?: "json" | "cookie" | "session";
}

export class DirectusApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await $fetch<{ data: LoginResponse }>(
      `${this.baseUrl}/auth/login`,
      {
        method: "POST",
        body: {
          email: credentials.email,
          password: credentials.password,
          mode: credentials.mode || "json",
          otp: credentials.otp,
        },
      }
    );

    return response.data;
  }

  /**
   * Refresh access token
   */
  async refresh(request: RefreshRequest): Promise<RefreshResponse> {
    const response = await $fetch<{ data: RefreshResponse }>(
      `${this.baseUrl}/auth/refresh`,
      {
        method: "POST",
        body: {
          refresh_token: request.refresh_token,
          mode: request.mode || "json",
        },
      }
    );

    return response.data;
  }

  /**
   * Logout
   */
  async logout(request?: LogoutRequest): Promise<void> {
    await $fetch(`${this.baseUrl}/auth/logout`, {
      method: "POST",
      body: request || {},
    });
  }

  /**
   * Get current user
   */
  async getCurrentUser(accessToken: string): Promise<User> {
    const response = await $fetch<{ data: User }>(`${this.baseUrl}/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  /**
   * Create an authenticated fetch function with automatic token refresh
   */
  createAuthenticatedFetch(accessToken: string) {
    return async (url: string, options: any = {}) => {
      try {
        return await $fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error: any) {
        // If we get a 401 error, try to refresh the token
        if (error.statusCode === 401 && import.meta.client) {
          const authStore = useAuthStore();

          if (authStore.refreshToken) {
            try {
              // Try to refresh the token
              const refreshResponse = await this.refresh({
                refresh_token: authStore.refreshToken,
                mode: "json",
              });

              // Update tokens in store
              authStore.setTokens(
                refreshResponse.access_token,
                refreshResponse.refresh_token
              );

              // Retry the original request with the new token
              return await $fetch(url, {
                ...options,
                headers: {
                  ...options.headers,
                  Authorization: `Bearer ${refreshResponse.access_token}`,
                },
              });
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              // Clear auth and redirect to login
              authStore.clearAuth();
              await navigateTo("/auth/login");
              throw refreshError;
            }
          }
        }

        throw error;
      }
    };
  }

  /**
   * Generic API call with automatic token refresh
   */
  async authenticatedRequest<T = any>(
    url: string,
    options: any = {},
    accessToken?: string
  ): Promise<T> {
    const authStore = useAuthStore();
    const token = accessToken || authStore.accessToken;

    if (!token) {
      throw new Error("No access token available");
    }

    const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
    const fetchFn = this.createAuthenticatedFetch(token);

    return (await fetchFn(fullUrl, options)) as T;
  }
}

// Singleton instance
let apiClient: DirectusApiClient | null = null;

export function useDirectusApi() {
  if (!apiClient) {
    const config = useRuntimeConfig();
    const baseUrl = config.public.directus.url;

    if (!baseUrl) {
      throw new Error("Directus URL not configured");
    }

    apiClient = new DirectusApiClient(baseUrl);
  }

  return apiClient;
}

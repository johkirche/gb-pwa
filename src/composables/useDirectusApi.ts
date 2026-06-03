/**
 * Native Directus API client for authentication
 */
import type { User } from "@/stores/auth";
import { useAuthStore } from "@/stores/auth";
import axios, { type AxiosRequestConfig } from "axios";

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
    const response = await axios.post<{ data: LoginResponse }>(
      `${this.baseUrl}/auth/login`,
      {
        email: credentials.email,
        password: credentials.password,
        mode: credentials.mode || "json",
        otp: credentials.otp,
      },
    );

    return response.data.data;
  }

  /**
   * Refresh access token
   */
  async refresh(request: RefreshRequest): Promise<RefreshResponse> {
    const response = await axios.post<{ data: RefreshResponse }>(
      `${this.baseUrl}/auth/refresh`,
      {
        refresh_token: request.refresh_token,
        mode: request.mode || "json",
      },
    );

    return response.data.data;
  }

  /**
   * Logout
   */
  async logout(request?: LogoutRequest): Promise<void> {
    await axios.post(`${this.baseUrl}/auth/logout`, request || {});
  }

  /**
   * Get current user
   */
  async getCurrentUser(accessToken: string): Promise<User> {
    const response = await axios.get<{ data: User }>(
      `${this.baseUrl}/users/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data.data;
  }

  /**
   * Create an authenticated fetch function with automatic token refresh.
   *
   * On a 401 it attempts a single token refresh and retries. It deliberately
   * does NOT clear the session or redirect to /login on failure — that would
   * defeat offline-first usage. Instead it throws, letting callers fall back to
   * cached/IndexedDB content. Session teardown is owned by useAuth.
   */
  createAuthenticatedFetch(accessToken: string) {
    return async (url: string, options: AxiosRequestConfig = {}) => {
      try {
        const response = await axios({
          url,
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return response.data;
      } catch (error: unknown) {
        // If we get a 401 error, try to refresh the token once.
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          const authStore = useAuthStore();

          // Prefer the freshest persisted refresh token (another tab may have
          // rotated it) over the possibly-stale in-memory copy.
          const refreshToken =
            (typeof window !== "undefined" &&
              localStorage.getItem("auth-refresh-token")) ||
            authStore.refreshToken;

          if (refreshToken) {
            try {
              const refreshResponse = await this.refresh({
                refresh_token: refreshToken,
                mode: "json",
              });

              authStore.setTokens(
                refreshResponse.access_token,
                refreshResponse.refresh_token,
              );

              // Retry the original request with the new token.
              const retryResponse = await axios({
                url,
                ...options,
                headers: {
                  ...options.headers,
                  Authorization: `Bearer ${refreshResponse.access_token}`,
                },
              });
              return retryResponse.data;
            } catch (refreshError) {
              // Don't clear auth / redirect — keep the user in (possibly
              // offline) and let the caller fall back to cached data.
              console.warn(
                "Authenticated request refresh failed; falling back:",
                refreshError,
              );
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
  async authenticatedRequest<T = unknown>(
    url: string,
    options: AxiosRequestConfig = {},
    accessToken?: string,
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
    const baseUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;

    if (!baseUrl) {
      throw new Error("Directus URL not configured");
    }

    apiClient = new DirectusApiClient(baseUrl);
  }

  return apiClient;
}

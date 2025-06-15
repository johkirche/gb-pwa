/**
 * Native Directus API client for authentication
 */

import { useRouter } from "vue-router";
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
      }
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
      }
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
      }
    );

    return response.data.data;
  }

  /**
   * Create an authenticated fetch function with automatic token refresh
   */
  createAuthenticatedFetch(accessToken: string) {
    const router = useRouter();

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
      } catch (error: any) {
        // If we get a 401 error, try to refresh the token
        if (error.response?.status === 401) {
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
              console.error("Token refresh failed:", refreshError);
              // Clear auth and redirect to login
              authStore.clearAuth();
              await router.push("/login");
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
    options: AxiosRequestConfig = {},
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
    const baseUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;

    if (!baseUrl) {
      throw new Error("Directus URL not configured");
    }

    apiClient = new DirectusApiClient(baseUrl);
  }

  return apiClient;
}

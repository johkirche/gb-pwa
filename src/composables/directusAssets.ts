import { useAuthStore } from "@/stores/auth";

import { useDirectusApi } from "@/composables/useDirectusApi";

/**
 * Session-aware access to Directus `/assets/<id>` files.
 *
 * The soundfont, the MIDI trios, the recordings and the notation images used to
 * be fetched anonymously everywhere, on the assumption that files stay readable
 * by the public role. That is a backend setting nobody in this repo controls,
 * so every asset read now carries the session when there is one:
 *
 * - `fetchAsset` for code that reads bytes (`fetch`): a bearer header, and one
 *   refresh-and-retry on a 401, the same as the GraphQL transport.
 * - `withAccessToken` for native elements (`<img>`, `<audio>`, a download link)
 *   that cannot send headers: Directus accepts the token as an `access_token`
 *   query parameter for exactly this case.
 *
 * Neither requires a session — a public file must keep working for a visitor
 * who is not logged in — and both leave the IndexedDB-first resolution of the
 * offline layer untouched: a downloaded blob never reaches the network at all.
 */

/** The canonical URL of an asset, with optional Directus transform params. */
export function assetUrl(id: string, params = ""): string {
  return `${import.meta.env.VITE_PUBLIC_DIRECTUS_URL}/assets/${id}${params}`;
}

/**
 * Append the session's access token to an asset URL for a native element.
 * Returns the URL unchanged when there is no session or it is not a URL that
 * can carry a query (a blob: object URL is left alone).
 */
export function withAccessToken(url: string): string {
  const token = useAuthStore().accessToken;
  if (!token || url.startsWith("blob:")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access_token=${encodeURIComponent(token)}`;
}

/**
 * `fetch` an asset with the session's bearer header, refreshing the session
 * once and retrying when the server answers 401.
 *
 * Returns the `Response` — callers keep their own `ok` checks — so a public
 * file still resolves without a session, and a 401 with no session (or one the
 * server refuses to refresh) is handed back for the caller to report.
 */
export async function fetchAsset(url: string, init: RequestInit = {}): Promise<Response> {
  const authStore = useAuthStore();

  const request = (token: string | null) =>
    fetch(url, {
      ...init,
      headers: token ? { ...init.headers, Authorization: `Bearer ${token}` } : init.headers,
    });

  const token = authStore.accessToken;
  const response = await request(token);
  if (response.status !== 401 || !token) return response;

  // The session expired between the background refreshes. One rotation,
  // through the same single-flight the GraphQL path uses.
  let freshToken: string | null;
  try {
    freshToken = await useDirectusApi().refreshSession();
  } catch (error) {
    console.warn("Asset request refresh failed; falling back:", error);
    return response;
  }
  if (!freshToken) return response;

  return request(freshToken);
}

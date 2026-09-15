import { fetchSoundfontId } from "@/composables/directusQueries";
import { getCachedSoundfontId, setCachedSoundfontId } from "@/composables/useOfflineDownload";

/**
 * Resolves the soundfont asset URL. Online, it reads the id from the Directus
 * `settings` singleton and back-fills it into local storage so the soundfont
 * stays usable offline. Offline (or when the settings query fails), it falls
 * back to the id persisted at download time — the blob was precached into
 * IndexedDB, so `fetchAssetByUrl` serves it without a network round-trip.
 *
 * The URL is always `${directusUrl}/assets/<id>` so `fetchAssetByUrl` can map
 * it back to the cached blob. Returns null only when there's genuinely no
 * soundfont to load (no id online, none cached offline) → oscillator fallback.
 *
 * A null/failed result is NOT cached, so a later call retries (e.g. once the id
 * has been persisted or connectivity returns).
 */
let cachedSoundfontUrlPromise: Promise<string | null> | null = null;
export function getSoundfontUrl(): Promise<string | null> {
  if (cachedSoundfontUrlPromise) return cachedSoundfontUrlPromise;

  const promise = (async () => {
    const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
    if (!directusUrl) return null;

    const buildUrl = (id: string) => `${directusUrl}/assets/${id}`;
    const cachedId = getCachedSoundfontId();
    const online = typeof navigator === "undefined" || navigator.onLine;

    // Offline: rely on the id persisted at download time.
    if (!online) {
      return cachedId ? buildUrl(cachedId) : null;
    }

    try {
      // Sent with the session when there is one, anonymously otherwise — the
      // field is readable by the public role.
      const sfId = await fetchSoundfontId();
      if (sfId) {
        // Back-fill so the soundfont resolves offline next time (also fixes
        // downloads made before the id was persisted).
        setCachedSoundfontId(sfId);
        return buildUrl(sfId);
      }
      // Settings reachable but no soundfont configured: fall back to a cached
      // id if we have one (don't clear it — a transient empty read shouldn't
      // wipe a known-good reference), otherwise none.
      return cachedId ? buildUrl(cachedId) : null;
    } catch (err) {
      console.warn("Failed to fetch soundfont reference from settings:", err);
      // Network/permission failure despite being "online" — use the last known
      // id if available.
      return cachedId ? buildUrl(cachedId) : null;
    }
  })();

  cachedSoundfontUrlPromise = promise;
  // Don't memoize a null/failed resolution — allow a later retry.
  promise
    .then((url) => {
      if (!url) cachedSoundfontUrlPromise = null;
    })
    .catch(() => {
      cachedSoundfontUrlPromise = null;
    });
  return promise;
}

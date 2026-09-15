import type { FreiesMusikstueck } from "@/gql/extra-types";

import { makeGraphQLRequest } from "@/composables/useGraphQL";

/**
 * Small Directus reads that more than one module needs.
 *
 * These are plain functions rather than store actions so the offline
 * downloader can call them from outside a component setup without importing a
 * store that in turn imports the downloader. They throw on failure; each caller
 * has its own idea of what a failure means (an error banner, a silent fallback
 * to a cached id) and keeps that decision.
 */

/** The Vor-/Nachspiele, sorted by name so no picker has to re-sort them. */
export async function fetchFreieMusikstuecke(): Promise<FreiesMusikstueck[]> {
  const query = `
    query {
      freie_musikstuecke(sort: ["name"]) {
        id
        name
        komponist
        dauer_sek
        tags
        midi_file {
          id
          title
          type
          filename_download
          filesize
        }
      }
    }
  `;

  const res = await makeGraphQLRequest<{
    data?: { freie_musikstuecke?: FreiesMusikstueck[] };
  }>({ query }, { session: "optional" });

  return res.data?.freie_musikstuecke ?? [];
}

/**
 * The file id of the soundfont configured in the Directus `settings`
 * singleton, or null when none is configured. Readable by the public role, so
 * it is asked for anonymously when there is no session.
 */
export async function fetchSoundfontId(): Promise<string | null> {
  const res = await makeGraphQLRequest<{
    data?: { settings?: { soundfont?: { id?: string } | null } | null };
  }>({ query: "query { settings { soundfont { id } } }" }, { session: "optional" });

  return res.data?.settings?.soundfont?.id ?? null;
}

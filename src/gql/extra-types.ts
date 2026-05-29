import type { Directus_Files, Gesangbuchlied } from "./graphql";

export type Strophe = {
    aenderungsvorschlag: string | null;
    anmerkung: string | null;
    strophe: string;
};

// Extension for the gesangbuchlied schema until graphql-codegen catches up.
//
// Bundles all fields that exist in the Directus collection but haven't been
// pulled into gql/graphql.ts yet:
//   - midi_intro / midi_main / midi_outro: 1:1 relations to directus_files
//     for the MIDI trio (Vorspiel / Standard-Strophe / Letzte Strophe).
//   - liednummer2026: the upcoming 2026 hymnal index (preferred over
//     liednummer2000 in displays — that's the number people will look up
//     in the new book).
export type GesangbuchliedWithMidi = Gesangbuchlied & {
    midi_intro?: Directus_Files | null;
    midi_main?: Directus_Files | null;
    midi_outro?: Directus_Files | null;
    liednummer2026?: number | null;
};

// Standalone MIDI piece for service intros/outros ("Vor- und Nachspiele").
// Not a hymn — no verses, no MIDI trio. Just a single file the operator picks
// from a small library. Mirrored from the `freie_musikstuecke` Directus
// collection until codegen catches up.
export type FreiesMusikstueck = {
    id: string;
    name: string;
    komponist?: string | null;
    midi_file: Directus_Files;
    dauer_sek?: number | null;
    tags?: string[] | null;
};

// Prefer the 2026 number wherever a song is displayed; fall back to the legacy
// 2000 number for songs that haven't been re-indexed yet. Returns null only
// when neither exists.
export function getLiedNumber(
    lied: Gesangbuchlied | GesangbuchliedWithMidi | null | undefined,
): number | null {
    if (!lied) return null;
    const l = lied as GesangbuchliedWithMidi;
    return l.liednummer2026 ?? l.liednummer2000 ?? null;
}
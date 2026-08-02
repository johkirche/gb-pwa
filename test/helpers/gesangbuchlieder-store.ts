/**
 * Fixture builder for src/stores/gesangbuchlieder.ts.
 *
 * The generated `Gesangbuchlied` type has ~30 fields, almost none of which the
 * store reads. Spelling out the nested Directus relation shape by hand in every
 * test would bury the one field a test is actually about, so this builder takes
 * a flat spec and expands it.
 *
 * Optional groups are left *absent* rather than set to null or `[]`, because the
 * store branches on `if (lied.kategorieId)` / `lied.melodieId?.noten` — a
 * missing key and an empty array are different code paths, and tests need to be
 * able to hit both.
 */

import type { Gesangbuchlied } from "@/gql/graphql";

export interface AutorSpec {
  vorname?: string;
  nachname?: string;
}

export interface LiedSpec {
  id: string;
  /** `null` is meaningful: the store falls back to "" for a missing title. */
  titel?: string | null;
  /** ISO date string, as Directus returns it. */
  date_updated?: string | null;
  liednummer2000?: number | null;
  /** Not in the generated types yet — the store reads it through a cast. */
  liednummer2026?: number | null;
  /** `kategorieId[].kategorie_id.name`; a `null` entry is a relation row whose category is gone. */
  kategorien?: (string | null)[];
  /** `melodieId.noten[].directus_files_id.type` — raw Directus MIME strings; `null` is an empty relation row. */
  notenTypes?: (string | null)[];
  /** `textId.strophenEinzeln[].strophe` */
  strophen?: string[];
  textAutoren?: (AutorSpec | null)[];
  melodieAutoren?: (AutorSpec | null)[];
}

function autorRows(id: string, kind: string, autoren: (AutorSpec | null)[]) {
  return autoren.map((autor, index) =>
    autor === null
      ? null
      : {
          id: `${id}-${kind}-autor-${index}`,
          autor_id: {
            id: `autor-${autor.vorname ?? ""}-${autor.nachname ?? ""}`,
            vorname: autor.vorname ?? null,
            nachname: autor.nachname ?? null,
          },
        },
  );
}

export function makeLied(spec: LiedSpec): Gesangbuchlied {
  const lied: Record<string, unknown> = {
    __typename: "gesangbuchlied",
    id: spec.id,
  };

  if (spec.titel !== undefined) lied.titel = spec.titel;
  if (spec.date_updated !== undefined) lied.date_updated = spec.date_updated;
  if (spec.liednummer2000 !== undefined) lied.liednummer2000 = spec.liednummer2000;
  if (spec.liednummer2026 !== undefined) lied.liednummer2026 = spec.liednummer2026;

  if (spec.kategorien !== undefined) {
    lied.kategorieId = spec.kategorien.map((name, index) =>
      name === null
        ? { id: `${spec.id}-kat-${index}`, kategorie_id: null }
        : {
            id: `${spec.id}-kat-${index}`,
            kategorie_id: { id: `kat-${name}`, name, typ: null },
          },
    );
  }

  if (spec.notenTypes !== undefined || spec.melodieAutoren !== undefined) {
    const melodie: Record<string, unknown> = { id: `${spec.id}-melodie` };

    if (spec.notenTypes !== undefined) {
      melodie.noten = spec.notenTypes.map((type, index) =>
        type === null
          ? { id: `${spec.id}-note-${index}`, directus_files_id: null }
          : {
              id: `${spec.id}-note-${index}`,
              directus_files_id: {
                id: `${spec.id}-file-${index}`,
                title: `file-${index}`,
                type,
                filename_download: `file-${index}`,
                filesize: "1",
              },
            },
      );
    }

    if (spec.melodieAutoren !== undefined) {
      melodie.autorId = autorRows(spec.id, "melodie", spec.melodieAutoren);
    }

    lied.melodieId = melodie;
  }

  if (spec.strophen !== undefined || spec.textAutoren !== undefined) {
    const text: Record<string, unknown> = { id: `${spec.id}-text` };

    if (spec.strophen !== undefined) {
      text.strophenEinzeln = spec.strophen.map((strophe) => ({
        strophe,
        anmerkung: null,
        aenderungsvorschlag: null,
      }));
    }

    if (spec.textAutoren !== undefined) {
      text.autorId = autorRows(spec.id, "text", spec.textAutoren);
    }

    lied.textId = text;
  }

  return lied as unknown as Gesangbuchlied;
}

/** `n` distinct songs — for exercising the "was the page full?" pagination check. */
export function makePage(count: number, prefix = "p"): Gesangbuchlied[] {
  return Array.from({ length: count }, (_, index) =>
    makeLied({ id: `${prefix}-${index}`, titel: `Lied ${index}` }),
  );
}

/** The titles of a result list, which is what most filter/sort assertions are really about. */
export function titles(lieder: Gesangbuchlied[]): (string | null | undefined)[] {
  return lieder.map((lied) => lied.titel);
}

/** The ids of a result list. */
export function ids(lieder: Gesangbuchlied[]): string[] {
  return lieder.map((lied) => lied.id);
}

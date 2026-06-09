// Build a "merged" emojibase dataset per UI locale: keep the locale's own
// `label` + `tags` (so category headers and emoji names render in the user's
// language) but also fold in the other locale's label + tags as additional
// search tags. Net effect: search hits work for both German and English
// keywords regardless of which UI locale is active.
//
// Output: public/emojibase/{locale}/{data.json,messages.json}
// Picked up at runtime via the emoji picker's emojibaseUrl="/emojibase".
//
// NOTE: the output folder MUST be a valid emojibase locale name (e.g. "en",
// "de"). vue-frimousse runs the `locale` prop through `validateLocale`, which
// silently falls back to "en" for unknown locales — so a "*-merged" folder
// name would make it fetch a non-existent path and load no emojis at all.
//
// Run with: pnpm run build:emoji-data
//
// Re-run whenever the emojibase-data package is updated or the supported
// locale list changes. The output JSON is committed so dev/build don't
// depend on this script having been run in CI.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DATA_ROOT = resolve(REPO_ROOT, "node_modules/emojibase-data");
const OUT_ROOT = resolve(REPO_ROOT, "public/emojibase");

// (primary, secondary) — primary's labels are kept; secondary contributes
// extra search tags. Add another pair here when adding a new UI language.
const LOCALE_PAIRS = [
  ["de", "en"],
  ["en", "de"],
];

const loadJson = async (p) => JSON.parse(await readFile(p, "utf8"));

const normalize = (s) => s.toLowerCase().trim();

const mergeTags = (primaryTags, secondary) => {
  const seen = new Set();
  const out = [];
  const push = (t) => {
    if (!t) return;
    const n = normalize(t);
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(t);
  };

  for (const t of primaryTags ?? []) push(t);
  if (secondary) {
    if (secondary.label) push(secondary.label);
    for (const t of secondary.tags ?? []) push(t);
  }
  return out;
};

const buildMergedData = (primaryEmojis, secondaryEmojis) => {
  const secondaryByHex = new Map();
  for (const e of secondaryEmojis) secondaryByHex.set(e.hexcode, e);

  return primaryEmojis.map((e) => {
    const other = secondaryByHex.get(e.hexcode);
    return { ...e, tags: mergeTags(e.tags, other) };
  });
};

const main = async () => {
  for (const [primary, secondary] of LOCALE_PAIRS) {
    const primaryData = await loadJson(resolve(DATA_ROOT, primary, "data.json"));
    const secondaryData = await loadJson(resolve(DATA_ROOT, secondary, "data.json"));
    const messages = await loadJson(resolve(DATA_ROOT, primary, "messages.json"));

    const merged = buildMergedData(primaryData, secondaryData);

    // Folder name must stay a valid emojibase locale (see header note).
    const outDir = resolve(OUT_ROOT, primary);
    await mkdir(outDir, { recursive: true });
    await writeFile(resolve(outDir, "data.json"), JSON.stringify(merged));
    await writeFile(resolve(outDir, "messages.json"), JSON.stringify(messages));

    console.log(
      `wrote ${primary} (${merged.length} emojis, ${primary} labels + ${secondary} tags)`,
    );
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

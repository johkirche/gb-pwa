import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getDefaultLocale()` is module-private and runs at import time, so the only
 * way to observe it is to arrange the environment and then re-import.
 */
async function loadI18n() {
  vi.resetModules();
  const mod = await import("@/plugins/i18n");
  return mod.default;
}

function setBrowserLanguages(languages: string[]) {
  Object.defineProperty(navigator, "languages", {
    configurable: true,
    get: () => languages,
  });
  Object.defineProperty(navigator, "language", {
    configurable: true,
    get: () => languages[0],
  });
}

beforeEach(() => {
  setBrowserLanguages(["de-DE"]);
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).languages;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).language;
});

describe("initial locale resolution", () => {
  it("honours a saved preference over the browser language", async () => {
    localStorage.setItem("preferred-language", "en");
    setBrowserLanguages(["de-DE"]);

    const i18n = await loadI18n();

    expect(i18n.global.locale.value).toBe("en");
  });

  it("ignores a saved preference for an unsupported locale", async () => {
    // Guards against a stale or hand-edited localStorage value putting the app
    // into a locale that has no messages at all.
    localStorage.setItem("preferred-language", "fr");
    setBrowserLanguages(["en-GB"]);

    const i18n = await loadI18n();

    expect(i18n.global.locale.value).toBe("en");
  });

  it("matches the browser language on its base tag", async () => {
    setBrowserLanguages(["en-GB", "en"]);

    const i18n = await loadI18n();

    expect(i18n.global.locale.value).toBe("en");
  });

  it("picks the first supported entry from the browser's preference list", async () => {
    setBrowserLanguages(["fr-FR", "de-CH", "en-US"]);

    const i18n = await loadI18n();

    expect(i18n.global.locale.value).toBe("de");
  });

  it("falls back to German when nothing matches", async () => {
    setBrowserLanguages(["fr-FR", "es-ES"]);

    const i18n = await loadI18n();

    expect(i18n.global.locale.value).toBe("de");
  });
});

describe("message bundles", () => {
  it("loads every locale namespace under both languages", async () => {
    const i18n = await loadI18n();
    const messages = i18n.global.messages.value;

    // One namespace per file in src/locales/<lang>/. If a new namespace is
    // added for one language but not the other, this fails.
    expect(Object.keys(messages.de).sort()).toEqual(
      Object.keys(messages.en).sort(),
    );
    expect(Object.keys(messages.de)).toContain("song");
    expect(Object.keys(messages.de)).toContain("churchService");
  });

  it("resolves a real key in both languages", async () => {
    const i18n = await loadI18n();

    i18n.global.locale.value = "de";
    expect(i18n.global.t("song.songText")).toBe("Liedtext");

    i18n.global.locale.value = "en";
    expect(i18n.global.t("song.songText")).toBe("Song Text");
  });

  it("does not strip the namespace prefix from keys", async () => {
    // The plugin builds `messages[filename] = contents`, so keys are always
    // namespaced. A regression that flattened them would return the raw key.
    const i18n = await loadI18n();

    expect(i18n.global.t("song.songText")).not.toBe("song.songText");
  });
});

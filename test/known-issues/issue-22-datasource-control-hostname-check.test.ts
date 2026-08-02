/**
 * Issue #22 — the data-source toggle is force-enabled by a hostname check that ships to production
 * https://github.com/johkirche/gb-pwa/issues/22
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * shouldShowDataSourceControl ORs `window.location.hostname === "localhost"`
 * into its condition. That is a build-time concern tested at runtime: the string
 * comparison is still in the production bundle, so any production build served
 * from localhost — `vite preview`, a LAN/kiosk install, a reverse proxy that
 * forwards the Host header — shows an offline/online switch to a user who has
 * downloaded nothing. The dev escape hatch belongs on `import.meta.env.DEV`,
 * which is statically replaced and drops out of the production build entirely.
 */
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Ref } from "vue";

import { useOfflineDownload } from "@/composables/useOfflineDownload";
import { useGesangbuchliedStore } from "@/stores/gesangbuchlieder";

import { makeLied } from "../helpers/gesangbuchlieder-store";

const h = vi.hoisted(() => ({
  queryGesangbuchlied: vi.fn(),
  queryGesangbuchliedByIds: vi.fn(),
  getOfflineSongs: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/composables/useGesangbuchlied", () => ({
  useGesangbuchlied: () => ({
    queryGesangbuchlied: h.queryGesangbuchlied,
    queryGesangbuchliedByIds: h.queryGesangbuchliedByIds,
  }),
}));

vi.mock("@/composables/useOfflineDownload", async () => {
  const { ref } = await import("vue");
  const hasOfflineContent = ref(false);
  return {
    useOfflineDownload: () => ({
      hasOfflineContent,
      getOfflineSongs: h.getOfflineSongs,
    }),
  };
});

vi.mock("@/composables/useFavorites", async () => {
  const { ref } = await import("vue");
  const favorites = ref<string[]>([]);
  return { useFavorites: () => ({ favorites }) };
});

function hasOfflineContentRef(): Ref<boolean> {
  return useOfflineDownload().hasOfflineContent as unknown as Ref<boolean>;
}

/** happy-dom serves the document from http://localhost:3000/ by default. */
const ORIGINAL_URL = window.location.href;

function setPageUrl(url: string) {
  (window as unknown as { happyDOM: { setURL: (u: string) => void } }).happyDOM.setURL(url);
}

/** Pretend this bundle was produced by `vite build` rather than by the dev server. */
function asProductionBuild() {
  vi.stubEnv("DEV", false);
  vi.stubEnv("PROD", true);
  // The premise of every assertion below — if stubbing ever stopped working,
  // these specs would go quietly green for the wrong reason.
  expect(import.meta.env.DEV).toBe(false);
}

/** Pretend this bundle is the dev server's. */
function asDevBuild() {
  vi.stubEnv("DEV", true);
  vi.stubEnv("PROD", false);
  expect(import.meta.env.DEV).toBe(true);
}

beforeEach(() => {
  setActivePinia(createPinia());

  h.queryGesangbuchlied.mockReset().mockResolvedValue([]);
  h.queryGesangbuchliedByIds.mockReset().mockResolvedValue([]);
  h.getOfflineSongs.mockReset().mockResolvedValue([]);
  hasOfflineContentRef().value = false;

  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("unexpected network access in test"))),
  );
});

afterEach(() => {
  setPageUrl(ORIGINAL_URL);
});

describe("issue #22: the dev-only escape hatch must key off the build, not the hostname", () => {
  it("stays hidden in a production build served from localhost", () => {
    asProductionBuild();
    setPageUrl("http://localhost:3000/songs");
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" })];

    expect(hasOfflineContentRef().value).toBe(false);
    expect(store.shouldShowDataSourceControl).toBe(false);
  });

  it("stays hidden in a production build served from 127.0.0.1", () => {
    // Same deployment, different loopback spelling. A hostname allow-list is the
    // wrong shape of check no matter how many spellings it enumerates.
    asProductionBuild();
    setPageUrl("http://127.0.0.1:4173/songs");
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" })];

    expect(store.shouldShowDataSourceControl).toBe(false);
  });

  it("is available in a dev build regardless of the host it is served from", () => {
    // The flip side: the escape hatch has to survive `vite dev --host`, where the
    // page is opened from another device over the LAN hostname.
    asDevBuild();
    setPageUrl("https://gesangbuch.example/songs");
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" })];

    expect(store.shouldShowDataSourceControl).toBe(true);
  });

  it("still appears in a production build once songs have been downloaded", () => {
    // Guard: the real reason to show the toggle is that there is something to
    // toggle between. Removing the hostname branch must not remove this one.
    asProductionBuild();
    setPageUrl("https://gesangbuch.example/songs");
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" })];
    hasOfflineContentRef().value = true;

    expect(store.shouldShowDataSourceControl).toBe(true);
  });

  it("still stays hidden while no songs are on screen, even in a dev build", () => {
    // Guard: the `lieder.length > 0` condition is independent of both branches.
    asDevBuild();
    setPageUrl("http://localhost:3000/songs");
    const store = useGesangbuchliedStore();
    hasOfflineContentRef().value = true;

    expect(store.lieder).toEqual([]);
    expect(store.shouldShowDataSourceControl).toBe(false);
  });

  it("still stays hidden in a production build on a normal host with nothing downloaded", () => {
    // Guard: the behaviour that is already correct today has to stay correct.
    asProductionBuild();
    setPageUrl("https://gesangbuch.example/songs");
    const store = useGesangbuchliedStore();
    store.lieder = [makeLied({ id: "1" })];

    expect(store.shouldShowDataSourceControl).toBe(false);
  });
});

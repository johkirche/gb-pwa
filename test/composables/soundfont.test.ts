import { restoreOnline, setOnline } from "../helpers/env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// `getSoundfontUrl()` is the pure decision of which soundfont to load, from the
// settings read, the cached id and the connectivity state. It lives in its own
// module rather than in useMidiPlayer.ts so it can be loaded here without
// dragging the Web MIDI / AudioWorklet engine — which stays deliberately
// untested, see the coverage note in vitest.config.ts — into the run.
//
// The module memoises the resolved URL in a module-level promise, so each test
// gets a fresh copy via vi.resetModules() + dynamic import — the same pattern
// useAuth's spec uses for its module-level state.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  fetchSoundfontId: vi.fn(),
}));

vi.mock("@/composables/directusQueries", () => ({
  fetchSoundfontId: h.fetchSoundfontId,
  fetchFreieMusikstuecke: vi.fn(),
}));

const DIRECTUS_URL = "https://directus.test";
const SOUNDFONT_ID_KEY = "gb-pwa.offline.soundfontId";

async function loadSoundfont() {
  vi.resetModules();
  return import("@/composables/soundfont");
}

function cachedId(): string | null {
  return localStorage.getItem(SOUNDFONT_ID_KEY);
}

beforeEach(() => {
  h.fetchSoundfontId.mockReset();
  setOnline(true);
});

afterEach(() => {
  restoreOnline();
});

describe("getSoundfontUrl", () => {
  it("resolves nothing when the backend URL is not configured", async () => {
    vi.stubEnv("VITE_PUBLIC_DIRECTUS_URL", "");
    localStorage.setItem(SOUNDFONT_ID_KEY, "sf-cached");
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBeNull();
    expect(h.fetchSoundfontId).not.toHaveBeenCalled();
  });

  it("reads the id from settings and persists it for offline use", async () => {
    h.fetchSoundfontId.mockResolvedValue("sf-1");
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBe(`${DIRECTUS_URL}/assets/sf-1`);
    // Back-filled so the synth can find its precached blob next time offline —
    // including for downloads made before the id was persisted.
    expect(cachedId()).toBe("sf-1");
  });

  it("offline, uses the id persisted at download time without a request", async () => {
    setOnline(false);
    localStorage.setItem(SOUNDFONT_ID_KEY, "sf-cached");
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBe(`${DIRECTUS_URL}/assets/sf-cached`);
    expect(h.fetchSoundfontId).not.toHaveBeenCalled();
  });

  it("offline with nothing cached, resolves nothing rather than guessing", async () => {
    setOnline(false);
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBeNull();
    expect(h.fetchSoundfontId).not.toHaveBeenCalled();
  });

  it("keeps the cached id when settings has no soundfont configured", async () => {
    // A transient empty read must not wipe a known-good reference.
    h.fetchSoundfontId.mockResolvedValue(null);
    localStorage.setItem(SOUNDFONT_ID_KEY, "sf-cached");
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBe(`${DIRECTUS_URL}/assets/sf-cached`);
    expect(cachedId()).toBe("sf-cached");
  });

  it("resolves nothing when settings has no soundfont and nothing is cached", async () => {
    h.fetchSoundfontId.mockResolvedValue(null);
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBeNull();
  });

  it("falls back to the cached id when the settings read fails while online", async () => {
    // "Online" per the browser, but the request failed — captive portal,
    // permission change, backend down. The last known id still works because
    // the blob was precached into IndexedDB.
    h.fetchSoundfontId.mockRejectedValue(new Error("Network Error"));
    localStorage.setItem(SOUNDFONT_ID_KEY, "sf-cached");
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBe(`${DIRECTUS_URL}/assets/sf-cached`);
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to fetch soundfont reference from settings:",
      expect.any(Error),
    );
  });

  it("resolves nothing, and never rejects, when the read fails with nothing cached", async () => {
    h.fetchSoundfontId.mockRejectedValue(new Error("Network Error"));
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBeNull();
  });

  it("memoises a successful resolution so the synth does not re-query settings", async () => {
    h.fetchSoundfontId.mockResolvedValue("sf-1");
    const { getSoundfontUrl } = await loadSoundfont();

    const first = getSoundfontUrl();
    const second = getSoundfontUrl();

    expect(second).toBe(first);
    await expect(second).resolves.toBe(`${DIRECTUS_URL}/assets/sf-1`);
    await expect(getSoundfontUrl()).resolves.toBe(`${DIRECTUS_URL}/assets/sf-1`);
    expect(h.fetchSoundfontId).toHaveBeenCalledTimes(1);
  });

  it("does not memoise an empty resolution, so a later call retries", async () => {
    // First the id is not there yet (settings not filled in, or the request
    // failed); once it is, the next call must pick it up.
    h.fetchSoundfontId.mockResolvedValueOnce(null).mockResolvedValueOnce("sf-1");
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBeNull();
    await expect(getSoundfontUrl()).resolves.toBe(`${DIRECTUS_URL}/assets/sf-1`);
    expect(h.fetchSoundfontId).toHaveBeenCalledTimes(2);
  });

  it("does not memoise a failed resolution either", async () => {
    h.fetchSoundfontId
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce("sf-1");
    const { getSoundfontUrl } = await loadSoundfont();

    await expect(getSoundfontUrl()).resolves.toBeNull();
    await expect(getSoundfontUrl()).resolves.toBe(`${DIRECTUS_URL}/assets/sf-1`);
    expect(h.fetchSoundfontId).toHaveBeenCalledTimes(2);
  });
});

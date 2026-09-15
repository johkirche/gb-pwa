import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { usePWA as usePWAType } from "@/composables/usePWA";

type InstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
};

/**
 * usePWA keeps its install state and window listeners at module level (they
 * are registered once, at import, so `beforeinstallprompt` is not missed), so
 * every test imports a fresh copy of the module.
 */
async function mountPWA() {
  vi.resetModules();
  const { usePWA } = await import("@/composables/usePWA");
  const api: ReturnType<typeof usePWAType> = usePWA();
  return { api };
}

function stubDisplayMode(standalone: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(display-mode: standalone)" ? standalone : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

function makeInstallPromptEvent(outcome: string): InstallPromptEvent {
  const event = new Event("beforeinstallprompt") as InstallPromptEvent;
  event.prompt = vi.fn();
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

// Each fresh import registers its listeners on the shared window; drop them
// again so a stale module copy never answers an event meant for the new one.
const registered: Array<[string, EventListenerOrEventListenerObject]> = [];

beforeEach(() => {
  stubDisplayMode(false);

  const original = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject, opts?: unknown) => {
      registered.push([type, listener]);
      original(type, listener, opts as never);
    },
  );
});

afterEach(() => {
  for (const [type, listener] of registered.splice(0)) {
    window.removeEventListener(type, listener);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window.navigator as any).standalone;
});

describe("install detection", () => {
  it("reports not installed in a normal browser tab", async () => {
    const { api } = await mountPWA();

    expect(api.isInstalled.value).toBe(false);
    expect(api.isInstallable.value).toBe(false);
  });

  it("detects an installed PWA via display-mode: standalone", async () => {
    stubDisplayMode(true);

    const { api } = await mountPWA();

    expect(api.isInstalled.value).toBe(true);
  });

  it("detects an installed PWA on iOS via navigator.standalone", async () => {
    // iOS Safari never reports display-mode: standalone, so this separate
    // check is the only way the app knows it was added to the home screen.
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });

    const { api } = await mountPWA();

    expect(api.isInstalled.value).toBe(true);
  });
});

describe("beforeinstallprompt", () => {
  it("suppresses the mini-infobar and marks the app installable", async () => {
    const { api } = await mountPWA();
    const event = makeInstallPromptEvent("accepted");
    const preventDefault = vi.spyOn(event, "preventDefault");

    window.dispatchEvent(event);

    // Without preventDefault the browser shows its own install banner, which
    // would compete with the app's own install tutorial.
    expect(preventDefault).toHaveBeenCalled();
    expect(api.isInstallable.value).toBe(true);
  });

  it("marks the app installed when the browser reports appinstalled", async () => {
    const { api } = await mountPWA();
    window.dispatchEvent(makeInstallPromptEvent("accepted"));
    expect(api.isInstallable.value).toBe(true);

    window.dispatchEvent(new Event("appinstalled"));

    expect(api.isInstalled.value).toBe(true);
    expect(api.isInstallable.value).toBe(false);
  });
});

describe("install()", () => {
  it("returns false when no install prompt has been captured", async () => {
    const { api } = await mountPWA();

    await expect(api.install()).resolves.toBe(false);
  });

  it("resolves true and flips state when the user accepts", async () => {
    const { api } = await mountPWA();
    const event = makeInstallPromptEvent("accepted");
    window.dispatchEvent(event);

    await expect(api.install()).resolves.toBe(true);

    expect(event.prompt).toHaveBeenCalledOnce();
    expect(api.isInstalled.value).toBe(true);
    expect(api.isInstallable.value).toBe(false);
  });

  it("resolves false and leaves state alone when the user dismisses", async () => {
    const { api } = await mountPWA();
    window.dispatchEvent(makeInstallPromptEvent("dismissed"));

    await expect(api.install()).resolves.toBe(false);

    expect(api.isInstalled.value).toBe(false);
  });

  it("cannot be replayed — the prompt is single-use", async () => {
    // Chrome invalidates the deferred event after one use; calling prompt()
    // twice throws. The second call must fail gracefully.
    const { api } = await mountPWA();
    window.dispatchEvent(makeInstallPromptEvent("accepted"));

    await api.install();

    await expect(api.install()).resolves.toBe(false);
  });

  it("returns false and logs when the prompt throws", async () => {
    const { api } = await mountPWA();
    const event = makeInstallPromptEvent("accepted");
    event.prompt = vi.fn(() => {
      throw new Error("prompt already used");
    });
    window.dispatchEvent(event);

    await expect(api.install()).resolves.toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("returns false when userChoice rejects", async () => {
    const { api } = await mountPWA();
    const event = makeInstallPromptEvent("accepted");
    event.userChoice = Promise.reject(new Error("user agent aborted"));
    window.dispatchEvent(event);

    await expect(api.install()).resolves.toBe(false);
  });
});

describe("exposed state", () => {
  it("hands out readonly refs so callers cannot fake an install", async () => {
    const { api } = await mountPWA();

    // @ts-expect-error readonly refs reject writes at the type level
    api.isInstalled.value = true;

    expect(api.isInstalled.value).toBe(false);
  });
});

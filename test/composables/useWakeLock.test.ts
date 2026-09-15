import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defineComponent } from "vue";

import { useWakeLock } from "@/composables/useWakeLock";

/** A minimal WakeLockSentinel: releasable, and able to announce its release. */
function makeSentinel() {
  let onRelease: (() => void) | null = null;
  return {
    release: vi.fn(async () => {}),
    addEventListener: vi.fn((type: string, cb: () => void) => {
      if (type === "release") onRelease = cb;
    }),
    /** What the OS does when the page is hidden. */
    releasedByOs: () => onRelease?.(),
  };
}

function stubWakeLock(request: () => Promise<unknown>) {
  Object.defineProperty(window.navigator, "wakeLock", {
    configurable: true,
    value: { request: vi.fn(request) },
  });
  return (window.navigator as unknown as { wakeLock: { request: ReturnType<typeof vi.fn> } })
    .wakeLock.request;
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

function mountLock() {
  return mount(
    defineComponent({
      setup() {
        useWakeLock();
        return () => null;
      },
    }),
  );
}

beforeEach(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window.navigator as any).wakeLock;
});

describe("useWakeLock", () => {
  it("requests a screen lock on mount and releases it on unmount", async () => {
    const sentinel = makeSentinel();
    const request = stubWakeLock(async () => sentinel);

    const wrapper = mountLock();
    await flushPromises();
    expect(request).toHaveBeenCalledWith("screen");

    wrapper.unmount();
    await flushPromises();
    expect(sentinel.release).toHaveBeenCalledOnce();
  });

  it("asks again when the page returns to the foreground after the OS let go", async () => {
    // The lock is released by the OS whenever the tab is hidden. A tablet on
    // the organ bench goes to sleep between hymns otherwise.
    const first = makeSentinel();
    const second = makeSentinel();
    const request = stubWakeLock(async () => (request.mock.calls.length === 1 ? first : second));

    const wrapper = mountLock();
    await flushPromises();
    first.releasedByOs();

    setVisibility("hidden");
    await flushPromises();
    expect(request).toHaveBeenCalledTimes(1);

    setVisibility("visible");
    await flushPromises();
    expect(request).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it("does not request twice while a lock is still held", async () => {
    const sentinel = makeSentinel();
    const request = stubWakeLock(async () => sentinel);

    const wrapper = mountLock();
    await flushPromises();
    setVisibility("visible");
    await flushPromises();

    expect(request).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("is a silent no-op where the browser has no Wake Lock API", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window.navigator as any).wakeLock;

    const wrapper = mountLock();
    await flushPromises();

    expect(() => wrapper.unmount()).not.toThrow();
  });

  it("swallows a refused request — low battery is not an error the user can act on", async () => {
    stubWakeLock(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });

    const wrapper = mountLock();
    await flushPromises();

    expect(console.warn).toHaveBeenCalled();
    wrapper.unmount();
  });
});

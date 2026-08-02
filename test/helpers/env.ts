/** Helpers for faking browser environment state that the auth layer branches on. */

/**
 * Override `navigator.onLine`.
 *
 * happy-dom defines `onLine` as a prototype getter, so `vi.spyOn` cannot always
 * patch it; redefining the own property is reliable. `vitest.config.ts` sets
 * `unstubGlobals`/`restoreMocks`, but neither undoes a defineProperty — call
 * `restoreOnline()` in an afterEach.
 */
export function setOnline(online: boolean): void {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
}

/** Remove the `navigator.onLine` override, restoring happy-dom's own value. */
export function restoreOnline(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (navigator as any).onLine;
}

/** Dispatch a cross-tab `storage` event for the given key. */
export function dispatchStorageEvent(key: string, newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

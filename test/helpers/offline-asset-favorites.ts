/**
 * Helpers for test/composables/useOfflineAsset.test.ts.
 *
 * Nothing here is shared with the auth suite — it exists so the object-URL
 * bookkeeping (which is the actual contract of useOfflineAsset) can be asserted
 * on instead of merely spied on.
 */
import { vi } from "vitest";

export type ObjectUrlTracker = {
  /** The installed `URL.createObjectURL`, as a spy. */
  createObjectURL: ReturnType<typeof vi.fn>;
  /** The installed `URL.revokeObjectURL`, as a spy. */
  revokeObjectURL: ReturnType<typeof vi.fn>;
  /** The Blob a given `blob:` URL was minted from, or undefined if we never issued it. */
  blobFor(url: string): Blob | undefined;
  /** Every URL handed out, in creation order. */
  issuedUrls(): string[];
  /** Every URL that was revoked, in revocation order. */
  revokedUrls(): string[];
  /** Issued but never revoked — i.e. leaked, if the owner is already disposed. */
  liveUrls(): string[];
  /** Put the environment's own implementations back. */
  uninstall(): void;
};

/**
 * Replace `URL.createObjectURL` / `URL.revokeObjectURL` with a bookkeeping pair.
 *
 * happy-dom's own implementation hands back opaque strings that cannot be
 * mapped back to the Blob they came from, so a test could only assert "the URL
 * starts with blob:" — which would pass even if the composable served the wrong
 * asset. The tracker keeps the url → Blob mapping so tests can assert identity.
 */
export function installObjectUrlTracker(): ObjectUrlTracker {
  const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

  const blobs = new Map<string, Blob>();
  const revoked: string[] = [];
  let counter = 0;

  const createObjectURL = vi.fn((blob: Blob) => {
    counter += 1;
    const url = `blob:https://gesangbuch.test/object-${counter}`;
    blobs.set(url, blob);
    return url;
  });

  const revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  });

  return {
    createObjectURL,
    revokeObjectURL,
    blobFor: (url) => blobs.get(url),
    issuedUrls: () => [...blobs.keys()],
    revokedUrls: () => [...revoked],
    liveUrls: () => [...blobs.keys()].filter((url) => !revoked.includes(url)),
    uninstall() {
      if (originalCreate) {
        Object.defineProperty(URL, "createObjectURL", originalCreate);
      } else {
        delete (URL as unknown as Record<string, unknown>).createObjectURL;
      }
      if (originalRevoke) {
        Object.defineProperty(URL, "revokeObjectURL", originalRevoke);
      } else {
        delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
      }
    },
  };
}

/**
 * Run `fn` with every `localStorage.setItem` call throwing, then restore.
 *
 * `vi.spyOn(localStorage, ...)` is not usable here: happy-dom's Storage is a
 * Proxy whose `getOwnPropertyDescriptor` trap hides its methods, so vitest
 * cannot capture — or safely restore — the original. Defining the own property
 * ourselves goes through the Proxy's `defineProperty` trap, which is supported.
 */
export function withFailingStorageWrite<T>(fn: () => T): T {
  const original = localStorage.setItem.bind(localStorage);
  const define = (value: unknown) =>
    Object.defineProperty(localStorage, "setItem", {
      configurable: true,
      writable: true,
      value,
    });

  define(() => {
    throw new Error("QuotaExceededError");
  });
  try {
    return fn();
  } finally {
    define(original);
  }
}

/** A promise whose settlement the test controls, for ordering async races. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

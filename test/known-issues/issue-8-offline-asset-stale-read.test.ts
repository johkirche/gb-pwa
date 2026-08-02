/**
 * Issue #8 — useOfflineAsset: stale in-flight read overwrites url and leaks its
 * blob URL
 * https://github.com/johkirche/gb-pwa/issues/8
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * The `watchEffect` body is async and has no stale-response guard. When the id
 * changes while the first `getOfflineAssetBlob` is still pending, `onCleanup`
 * for the abandoned run fires immediately — while its `createdBlobUrl` is still
 * null, so nothing is revoked — and the abandoned run then resumes and assigns
 * `url.value` with the *old* asset. The sheet-music dialog shows the previously
 * opened image, and the object URL it minted is unreachable by any cleanup.
 *
 * The newest id must win, and no run may leave an object URL behind.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EffectScope, effectScope, nextTick, ref } from "vue";

import { useOfflineAsset } from "@/composables/useOfflineAsset";

import {
  deferred,
  installObjectUrlTracker,
  type ObjectUrlTracker,
} from "../helpers/offline-asset-favorites";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// The real getOfflineAssetBlob opens IndexedDB; mocking it is what lets the
// test control *when* each read settles, which is the whole mechanism here.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  getOfflineAssetBlob: vi.fn(),
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  getOfflineAssetBlob: h.getOfflineAssetBlob,
}));

/** Pinned in vitest.known-issues.config.ts so built URLs are assertable. */
const DIRECTUS = "https://directus.test";

/** A blob whose bytes name the asset, so a mix-up is legible in the diff. */
function coverBlob(assetId: string) {
  return new Blob([`${assetId}-bytes`], { type: "image/png" });
}

describe("issue #8: the newest asset id must win", () => {
  let tracker: ObjectUrlTracker;
  const scopes: EffectScope[] = [];

  /** Run the composable in a scope the test owns, so disposal is deterministic. */
  function mount<T>(fn: () => T): T {
    const scope = effectScope();
    scopes.push(scope);
    return scope.run(fn)!;
  }

  /**
   * The watchEffect body is async, so its result lands a few microtasks after
   * the dependency change. nextTick also drains the pre-flush watcher queue.
   */
  async function flush() {
    for (let i = 0; i < 4; i++) await nextTick();
  }

  /** The bytes currently served by `url`, resolved through the tracker. */
  async function servedBytes(url: string | null) {
    const blob = tracker.blobFor(url ?? "");
    return blob ? await blob.text() : url;
  }

  /**
   * The race: the read for `cover-1` is still pending when the id flips to
   * `cover-2`, and settles only after `cover-2` has already been rendered.
   */
  function startRace(resolveWith: (assetId: string) => Blob | null) {
    const slow = deferred<Blob | null>();
    const fast = deferred<Blob | null>();
    h.getOfflineAssetBlob.mockImplementation((assetId: string) =>
      assetId === "cover-1" ? slow.promise : fast.promise,
    );
    const id = ref("cover-1");
    const url = mount(() => useOfflineAsset(id));
    id.value = "cover-2";

    return {
      url,
      settleNewest: async () => {
        await flush();
        fast.resolve(resolveWith("cover-2"));
        await flush();
      },
      settleAbandoned: async () => {
        slow.resolve(resolveWith("cover-1"));
        await flush();
      },
    };
  }

  beforeEach(() => {
    tracker = installObjectUrlTracker();
    h.getOfflineAssetBlob.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop();
    tracker.uninstall();
  });

  it("keeps serving the newest asset when an abandoned read settles last", async () => {
    const race = startRace(coverBlob);

    await race.settleNewest();
    await race.settleAbandoned();

    expect(await servedBytes(race.url.value)).toBe("cover-2-bytes");
  });

  it("keeps serving the newest asset when the abandoned read finds nothing offline", async () => {
    // Same race one branch over: a miss falls through to the network URL, and
    // that assignment is just as unguarded.
    const race = startRace(() => null);

    await race.settleNewest();
    await race.settleAbandoned();

    expect(race.url.value).toBe(`${DIRECTUS}/assets/cover-2`);
  });

  it("leaves exactly one object URL alive after the race", async () => {
    // The abandoned run's blob URL is created after its cleanup has already run,
    // so nothing will ever revoke it. Either not minting it or revoking it in
    // the same branch that mints it satisfies this.
    const race = startRace(coverBlob);

    await race.settleNewest();
    await race.settleAbandoned();

    expect(tracker.liveUrls()).toHaveLength(1);
    expect(tracker.liveUrls()).toContain(race.url.value);
  });

  it("revokes every object URL it minted once the scope is gone", async () => {
    const race = startRace(coverBlob);
    await race.settleNewest();
    await race.settleAbandoned();

    for (const scope of scopes.splice(0)) scope.stop();

    expect(tracker.liveUrls()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("issue #8: behaviour a stale-read guard must preserve", () => {
  let tracker: ObjectUrlTracker;
  const scopes: EffectScope[] = [];

  function mount<T>(fn: () => T): T {
    const scope = effectScope();
    scopes.push(scope);
    return scope.run(fn)!;
  }

  async function flush() {
    for (let i = 0; i < 4; i++) await nextTick();
  }

  beforeEach(() => {
    tracker = installObjectUrlTracker();
    h.getOfflineAssetBlob.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop();
    tracker.uninstall();
  });

  it("still follows the id when the reads settle in order", async () => {
    // Guards the fix against over-correction: a cancellation flag that is set
    // too eagerly would freeze the URL at the first id it ever saw.
    h.getOfflineAssetBlob.mockImplementation(async (assetId: string) =>
      new Blob([`${assetId}-bytes`], { type: "image/png" }),
    );
    const id = ref("cover-1");

    const url = mount(() => useOfflineAsset(id));
    await flush();
    const first = url.value!;

    id.value = "cover-2";
    await flush();

    expect(url.value).not.toBe(first);
    expect(await tracker.blobFor(url.value!)!.text()).toBe("cover-2-bytes");
  });

  it("still revokes the previous blob URL on an ordinary id change", async () => {
    h.getOfflineAssetBlob.mockImplementation(async (assetId: string) =>
      new Blob([`${assetId}-bytes`], { type: "image/png" }),
    );
    const id = ref("cover-1");

    const url = mount(() => useOfflineAsset(id));
    await flush();
    const first = url.value!;

    id.value = "cover-2";
    await flush();

    expect(tracker.revokedUrls()).toEqual([first]);
    expect(tracker.liveUrls()).toEqual([url.value]);
  });
});

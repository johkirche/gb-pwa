import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { effectScope, nextTick } from "vue";

import { useAudioPreview } from "@/composables/useAudioPreview";
import { useAuthStore } from "@/stores/auth";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  getOfflineAssetBlob: vi.fn(),
}));

vi.mock("@/composables/useOfflineDownload", () => ({
  getOfflineAssetBlob: h.getOfflineAssetBlob,
}));

// ---------------------------------------------------------------------------
// A stand-in for HTMLAudioElement. happy-dom's Audio never actually plays,
// and the composable's contract is about *which* element is playing and when
// it is torn down — so the fake records exactly that and lets a test fire the
// media events by hand.
// ---------------------------------------------------------------------------
class FakeAudio {
  static instances: FakeAudio[] = [];
  static playImpl: () => Promise<void> = () => Promise.resolve();

  src: string;
  paused = true;
  play = vi.fn(async () => {
    await FakeAudio.playImpl();
    this.paused = false;
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  load = vi.fn();
  removeAttribute = vi.fn((name: string) => {
    if (name === "src") this.src = "";
  });
  private listeners = new Map<string, Array<() => void>>();

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

const createObjectURL = vi.fn(() => "blob:preview");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  setActivePinia(createPinia());
  FakeAudio.instances = [];
  FakeAudio.playImpl = () => Promise.resolve();
  vi.stubGlobal("Audio", FakeAudio);
  // Only the two object-URL functions are used; the rest of URL is untouched.
  vi.stubGlobal("URL", Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
  h.getOfflineAssetBlob.mockResolvedValue(null);
});

/** A deferred play() so the in-flight window can be observed. */
function deferredPlay() {
  let release!: () => void;
  FakeAudio.playImpl = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  return () => release();
}

describe("useAudioPreview", () => {
  it("starts idle", () => {
    const preview = useAudioPreview();

    expect(preview.playingId.value).toBeNull();
    expect(preview.loadingId.value).toBeNull();
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("streams from Directus when the asset is not downloaded", async () => {
    const preview = useAudioPreview();

    await preview.play("f-1");

    expect(h.getOfflineAssetBlob).toHaveBeenCalledWith("f-1");
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toBe("https://directus.test/assets/f-1");
    expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(1);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(preview.playingId.value).toBe("f-1");
    expect(preview.loadingId.value).toBeNull();
  });

  it("streams with the session token when logged in, since <audio> cannot send a header", async () => {
    useAuthStore().setTokens("access-1", "refresh-1");
    const preview = useAudioPreview();

    await preview.play("f-1");

    expect(FakeAudio.instances[0].src).toBe("https://directus.test/assets/f-1?access_token=access-1");
  });

  it("plays the downloaded blob offline and revokes its URL on stop", async () => {
    // The church-service flow runs on tablets with no signal: a downloaded
    // recording must never trigger a network fetch.
    const blob = new Blob(["audio"], { type: "audio/mpeg" });
    h.getOfflineAssetBlob.mockResolvedValue(blob);
    const preview = useAudioPreview();

    await preview.play("f-1");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(FakeAudio.instances[0].src).toBe("blob:preview");

    preview.stop();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
    expect(preview.playingId.value).toBeNull();
  });

  it("reports the asset as loading until the browser starts playing", async () => {
    const release = deferredPlay();
    const preview = useAudioPreview();

    const pending = preview.play("f-1");
    await nextTick();
    // getOfflineAssetBlob has resolved and the element is created, but play()
    // has not settled yet.
    await vi.waitFor(() => expect(FakeAudio.instances).toHaveLength(1));

    expect(preview.loadingId.value).toBe("f-1");
    expect(preview.playingId.value).toBeNull();

    release();
    await pending;

    expect(preview.loadingId.value).toBeNull();
    expect(preview.playingId.value).toBe("f-1");
  });

  it("plays one asset at a time: starting a second stops the first", async () => {
    const preview = useAudioPreview();

    await preview.play("f-1");
    await preview.play("f-2");

    const [first, second] = FakeAudio.instances;
    expect(first.pause).toHaveBeenCalled();
    expect(first.removeAttribute).toHaveBeenCalledWith("src");
    expect(second.play).toHaveBeenCalled();
    expect(preview.playingId.value).toBe("f-2");
  });

  it("toggle() stops the asset that is already playing", async () => {
    const preview = useAudioPreview();

    await preview.toggle("f-1");
    expect(preview.playingId.value).toBe("f-1");

    await preview.toggle("f-1");

    expect(preview.playingId.value).toBeNull();
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
  });

  it("toggle() while still loading cancels rather than starting a second copy", async () => {
    const release = deferredPlay();
    const preview = useAudioPreview();

    const pending = preview.toggle("f-1");
    await vi.waitFor(() => expect(preview.loadingId.value).toBe("f-1"));

    await preview.toggle("f-1");
    release();
    await pending;

    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
    expect(preview.playingId.value).toBeNull();
    expect(preview.loadingId.value).toBeNull();
  });

  it("returns to idle when the file ends", async () => {
    const preview = useAudioPreview();
    await preview.play("f-1");

    FakeAudio.instances[0].emit("ended");

    expect(preview.playingId.value).toBeNull();
  });

  it("returns to idle on a media error after playback started", async () => {
    const preview = useAudioPreview();
    await preview.play("f-1");

    FakeAudio.instances[0].emit("error");

    expect(preview.playingId.value).toBeNull();
  });

  it("ignores a late 'ended' from an element that was already replaced", async () => {
    const preview = useAudioPreview();
    await preview.play("f-1");
    await preview.play("f-2");

    FakeAudio.instances[0].emit("ended");

    expect(preview.playingId.value).toBe("f-2");
  });

  it("rejects and resets when the browser refuses to play", async () => {
    // Unsupported codec, 404, autoplay policy — the caller shows the toast;
    // the button must not be left on "stop" for a file that is not playing.
    FakeAudio.playImpl = () => Promise.reject(new DOMException("nope", "NotSupportedError"));
    const preview = useAudioPreview();

    await expect(preview.play("f-1")).rejects.toThrow("nope");

    expect(preview.playingId.value).toBeNull();
    expect(preview.loadingId.value).toBeNull();
  });

  it("does not report a failure when stop() interrupts a pending play()", async () => {
    // Pausing an element mid-play() makes the browser reject with AbortError.
    // That is the user's own click, not an error to surface.
    let reject!: (reason: unknown) => void;
    FakeAudio.playImpl = () =>
      new Promise<void>((_resolve, rej) => {
        reject = rej;
      });
    const preview = useAudioPreview();

    const pending = preview.play("f-1");
    await vi.waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    preview.stop();
    reject(new DOMException("interrupted", "AbortError"));

    await expect(pending).resolves.toBeUndefined();
    expect(preview.playingId.value).toBeNull();
  });

  it("drops a blob read that resolves after the preview was stopped", async () => {
    let resolveBlob!: (blob: Blob | null) => void;
    h.getOfflineAssetBlob.mockImplementation(
      () =>
        new Promise<Blob | null>((resolve) => {
          resolveBlob = resolve;
        }),
    );
    const preview = useAudioPreview();

    const pending = preview.play("f-1");
    preview.stop();
    resolveBlob(null);
    await pending;

    expect(FakeAudio.instances).toHaveLength(0);
    expect(preview.playingId.value).toBeNull();
    expect(preview.loadingId.value).toBeNull();
  });

  it("stops playback when the owning scope is disposed", async () => {
    // A row's dialog closing or the component unmounting must not leave audio
    // running with no button left to stop it.
    const scope = effectScope();
    const preview = scope.run(() => useAudioPreview())!;
    await preview.play("f-1");

    scope.stop();

    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
    expect(preview.playingId.value).toBeNull();
  });
});

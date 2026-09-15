import { getCurrentScope, onScopeDispose, readonly, ref } from "vue";

import { getOfflineAssetBlob } from "@/composables/useOfflineDownload";

/**
 * One-at-a-time playback of a Directus audio asset, for "let me hear this
 * before I pick it" buttons in a list.
 *
 * Exactly one file plays at a time: starting another stops the current one.
 * The asset is read from the offline store when it has been downloaded (the
 * church-service flow runs on tablets with no signal) and streamed from
 * Directus otherwise — the same resolution AudioFilesPlayer uses on the song
 * page. Playback stops on its own when the owning scope is disposed.
 */
export function useAudioPreview() {
  // The asset currently audible, and the one whose blob/stream is still
  // being set up. Both are exposed so a row can render a spinner, a stop
  // button or a play button without re-deriving the state.
  const playingId = ref<string | null>(null);
  const loadingId = ref<string | null>(null);

  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  // Bumped by every stop(). A play() that resumes after an await and finds
  // the generation moved on has been superseded and must not touch state.
  let generation = 0;

  const stop = () => {
    generation++;
    if (audio) {
      audio.pause();
      // Detach the source so the element stops buffering and can be collected.
      audio.removeAttribute("src");
      audio.load();
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    playingId.value = null;
    loadingId.value = null;
  };

  /**
   * Start playing `fileId`, stopping whatever was playing first.
   *
   * Rejects when the browser refuses to play (unsupported codec, 404, an
   * autoplay policy that did not see a user gesture) so the caller can tell the
   * user. Being superseded by another play()/stop() is not an error and
   * resolves silently.
   */
  const play = async (fileId: string): Promise<void> => {
    stop();
    const gen = generation;
    loadingId.value = fileId;

    try {
      const blob = await getOfflineAssetBlob(fileId);
      if (gen !== generation) return;

      let url: string;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        url = objectUrl;
      } else {
        url = `${import.meta.env.VITE_PUBLIC_DIRECTUS_URL}/assets/${fileId}`;
      }

      const element = new Audio(url);
      audio = element;
      // Natural end of the file: back to idle. The identity check keeps a late
      // event from a superseded element from stopping its successor.
      element.addEventListener("ended", () => {
        if (audio === element) stop();
      });
      // A media error after play() resolved (the stream died mid-file) has no
      // promise to reject; clear the button rather than leave it on "stop".
      element.addEventListener("error", () => {
        if (audio === element) stop();
      });

      await element.play();
      if (gen !== generation) return;

      loadingId.value = null;
      playingId.value = fileId;
    } catch (error) {
      // stop() during the awaits pauses the element, which makes play() reject
      // with AbortError — that is the user's own doing, not a failure.
      if (gen !== generation) return;
      stop();
      throw error;
    }
  };

  /** Play `fileId`, or stop it if it is the one already playing or loading. */
  const toggle = async (fileId: string): Promise<void> => {
    if (playingId.value === fileId || loadingId.value === fileId) {
      stop();
      return;
    }
    await play(fileId);
  };

  if (getCurrentScope()) {
    onScopeDispose(stop);
  }

  return {
    playingId: readonly(playingId),
    loadingId: readonly(loadingId),
    play,
    toggle,
    stop,
  };
}

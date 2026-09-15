import { onBeforeUnmount, onMounted } from "vue";

/**
 * Hold a screen wake lock for the lifetime of the calling component.
 *
 * The lock is released by the OS whenever the page is hidden, so it is
 * re-requested on every return to the foreground. Browsers without the API
 * (Firefox < 126, older iOS) make this a no-op — the request is best effort
 * and never surfaces an error to the user.
 */
export function useWakeLock() {
  let sentinel: WakeLockSentinel | null = null;

  const request = async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      sentinel = lock;
      // The OS releases the lock whenever the page is hidden; forget it so the
      // visibility handler knows to ask again.
      lock.addEventListener("release", () => {
        if (sentinel === lock) sentinel = null;
      });
    } catch (err) {
      // Low battery, a permissions policy, or a background tab — all expected.
      console.warn("Screen wake lock unavailable:", err);
      sentinel = null;
    }
  };

  const release = async () => {
    const current = sentinel;
    sentinel = null;
    if (!current) return;
    try {
      await current.release();
    } catch {
      // Already released by the OS.
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && !sentinel) void request();
  };

  onMounted(() => {
    void request();
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    void release();
  });
}

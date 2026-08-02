// Global test setup — runs before every test file.
import "fake-indexeddb/auto";

import { afterEach, beforeEach, vi } from "vitest";

// happy-dom gives us localStorage/sessionStorage, but they are per-file
// singletons: without this, a test that persists a session leaks it into the
// next test. Auth state lives in localStorage, so this is load-bearing.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// The auth + offline layers log heavily on their error paths, and those paths
// are exactly what we assert on. Silence the output but keep it a spy, so tests
// can still assert `expect(console.warn).toHaveBeenCalled()` when the log itself
// is the observable behaviour. `restoreMocks: true` puts the originals back
// after each test.
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// `restoreMocks` does not undo fake timers. Auth schedules real setTimeout
// refreshes, so a test that forgets to hand the clock back would hang every
// later test in the file.
afterEach(() => {
  vi.useRealTimers();
});

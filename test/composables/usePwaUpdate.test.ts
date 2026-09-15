import { describe, expect, it, vi } from "vitest";

// `virtual:pwa-register` only exists inside a Vite build; the tests stand in
// for it and capture the callbacks the composable hands over.
const h = vi.hoisted(() => ({
  registerSW: vi.fn(),
  updateSW: vi.fn(async () => {}),
}));

vi.mock("virtual:pwa-register", () => ({ registerSW: h.registerSW }));

type Options = { onNeedRefresh: () => void; onRegisterError: (error: Error) => void };

/** Fresh module per test — the update state is module-level by design. */
async function load() {
  vi.resetModules();
  h.registerSW.mockReset().mockReturnValue(h.updateSW);
  h.updateSW.mockClear();
  const mod = await import("@/composables/usePwaUpdate");
  mod.registerPwaUpdates();
  return { mod, options: h.registerSW.mock.calls[0][0] as Options };
}

describe("usePwaUpdate", () => {
  it("registers the worker once and starts with no update pending", async () => {
    const { mod } = await load();

    expect(h.registerSW).toHaveBeenCalledOnce();
    expect(mod.usePwaUpdate().needRefresh.value).toBe(false);
  });

  it("flags a waiting worker and activates it only when the user accepts", async () => {
    // registerType is "prompt": nothing reloads on its own. A deploy landing
    // mid-service used to reload the page under the running Gottesdienst.
    const { mod, options } = await load();
    const { needRefresh, applyUpdate } = mod.usePwaUpdate();

    options.onNeedRefresh();
    expect(needRefresh.value).toBe(true);
    expect(h.updateSW).not.toHaveBeenCalled();

    await applyUpdate();

    expect(h.updateSW).toHaveBeenCalledWith(true);
    expect(needRefresh.value).toBe(false);
  });

  it("lets the user dismiss the banner without activating the worker", async () => {
    const { mod, options } = await load();
    const { needRefresh, dismissUpdate } = mod.usePwaUpdate();
    options.onNeedRefresh();

    dismissUpdate();

    expect(needRefresh.value).toBe(false);
    expect(h.updateSW).not.toHaveBeenCalled();
  });

  it("reports a failed registration — that means no offline mode", async () => {
    const { options } = await load();

    options.onRegisterError(new Error("scope mismatch"));

    expect(console.error).toHaveBeenCalledWith("SW registration error", expect.any(Error));
  });
});

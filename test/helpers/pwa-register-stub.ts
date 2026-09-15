// Stand-in for `virtual:pwa-register`, which only exists inside a Vite build
// with vite-plugin-pwa active. Aliased in vitest.config.ts so modules that
// import it can be loaded under test; tests mock it with `vi.mock`.
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}

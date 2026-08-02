import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * The known-issues suite.
 *
 * Every spec here asserts the behaviour the app SHOULD have, for a defect that
 * is currently filed as a GitHub issue. It is therefore RED on purpose, and is
 * kept out of `pnpm test` so that a failure in the main suite still means
 * "this change broke something" rather than "one of the known bugs is still a
 * known bug".
 *
 * Workflow:
 *   1. A bug is found  -> file an issue, add a spec here named after it.
 *   2. The bug is fixed -> that spec's failing assertions go green.
 *   3. Move the whole spec into the main suite and close the issue.
 *
 * Step 3 is not optional. If a spec here is fully green, it is no longer
 * describing an open defect — move it.
 *
 * Individual passing tests inside a spec are fine and encouraged: each file
 * should also guard against over-correction (e.g. "a normal token is still
 * valid"), so a fix cannot swing past the target. What matters is that every
 * file contains at least one assertion that is red today.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/known-issues/**/*.test.ts"],
    env: {
      VITE_PUBLIC_DIRECTUS_URL: "https://directus.test",
    },
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});

// @ts-check
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginOxlint from "eslint-plugin-oxlint";
import pluginVue from "eslint-plugin-vue";
import { globalIgnores } from "eslint/config";

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
    rules: {
      // Debug logging used to ship to users: 46 unconditional console.log calls
      // across 12 files (issue #12), narrating request paths and dumping the
      // whole song list and the full GraphQL query — including user-typed filter
      // text — on every load. That is noise in a user-submitted console
      // screenshot and real serialisation work on the low-end tablets this app
      // runs on during a service.
      //
      // warn/error stay allowed: they are the error paths, several are asserted
      // by the test suite, and test/setup.ts keeps them as inspectable spies.
      // The tree is clean under this rule with zero per-file disables — if you
      // need one, prefer deleting the log or making it a warn.
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  globalIgnores([
    "**/dist/**",
    "**/dev-dist/**",
    "**/dist-ssr/**",
    "**/coverage/**",
    "**node_modules/*",
    "*.d.ts",
    "**/public/**",
    "**/src/components/ui/**",
    "**/src/gql/**",
    "**/vite-env.d.ts",
  ]),

  pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  ...pluginOxlint.configs["flat/recommended"],
  skipFormatting,
);

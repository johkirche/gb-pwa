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

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // Ignore compiled JS artifacts in src/, build output, and coverage
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "src/**/*.js",   // compiled .js twins — lint .ts/.tsx only
      "e2e/**/*.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  // Browser globals for all src TypeScript files
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  // E2E TypeScript files
  {
    files: ["e2e/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  // Node globals for server + tools
  {
    files: ["server/**/*.mjs", "tools/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        fetch: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
);

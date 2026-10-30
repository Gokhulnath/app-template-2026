import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["playwright-report/", "test-results/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // Plain Node scripts (build-and-serve-web.mjs, static-server.mjs):
    // `js.configs.recommended`'s `no-undef` otherwise has no idea these run under Node,
    // unlike `.ts` files, where typescript-eslint's own recommended config already
    // turns `no-undef` off (the compiler already checks this, with full `@types/node`
    // knowledge).
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
      },
    },
  },
  // Last, so Prettier owns formatting and ESLint only reports code problems.
  prettier,
]);

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Fumadocs MDX's generated type-safe source, and the generated reference content.
    ".source/**",
    "content/docs/reference/**",
  ]),
  // Last, so Prettier owns formatting and ESLint only reports code problems.
  prettier,
]);

export default eslintConfig;

// Generates content/docs/reference/api/*.mdx from the API's own OpenAPI schema, and
// .generated/openapi.json (which lib/openapi.ts reads at request time, for the
// interactive <OpenAPIPage /> component). apps/api/openapi.json -- committed, checked by
// `pnpm contract:check` (docs/architecture.md) -- is the one producer of that schema; this
// script only reads it and copies it into place, it never regenerates it itself. Run
// `pnpm contract:generate` from the repo root after changing an API route or model, before
// running this (or `pnpm --filter docs build`, which runs this first).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateFiles } from "fumadocs-openapi";
import { openapi } from "../lib/openapi";

const generatedDir = path.resolve(import.meta.dirname, "../.generated");
const outputDir = path.resolve(
  import.meta.dirname,
  "../content/docs/reference/api",
);

const schema = readFileSync(
  path.resolve(import.meta.dirname, "../../api/openapi.json"),
  "utf-8",
);

mkdirSync(generatedDir, { recursive: true });
writeFileSync(path.join(generatedDir, "openapi.json"), schema);

// Regenerated every run, so a removed or renamed endpoint doesn't leave a stale page.
rmSync(outputDir, { recursive: true, force: true });

void generateFiles({
  input: openapi,
  output: outputDir,
  per: "tag",
  includeDescription: true,
  meta: true,
});

// Generates content/docs/reference/api/*.mdx from the API's own OpenAPI schema, and
// .generated/openapi.json (which lib/openapi.ts reads at request time, for the
// interactive <OpenAPIPage /> component). Neither apps/api/scripts/export_openapi.py nor
// generateFiles() below needs a running API or a database -- see that script.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateFiles } from "fumadocs-openapi";
import { openapi } from "../lib/openapi";

const apiDir = path.resolve(import.meta.dirname, "../../api");
const generatedDir = path.resolve(import.meta.dirname, "../.generated");
const outputDir = path.resolve(
  import.meta.dirname,
  "../content/docs/reference/api",
);

const schema = execFileSync(
  "uv",
  ["run", "python", "scripts/export_openapi.py"],
  {
    cwd: apiDir,
    encoding: "utf-8",
  },
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

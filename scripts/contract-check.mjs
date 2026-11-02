#!/usr/bin/env node
// Regenerates the contract (scripts/contract-generate.mjs) and fails if that changed
// either generated file on disk -- i.e. apps/api/openapi.json or packages/api-types/
// src/schema.d.ts have drifted from the API's actual routes and models. It compares the
// files before and after regenerating, not against git: a contract that was regenerated
// and staged but isn't committed yet is current, and must pass (lefthook runs this on
// exactly that commit). Run by `pnpm lint` and by lefthook's pre-commit hook whenever
// files under apps/api/src are staged (lefthook.yml), so contract drift never reaches a
// PR.
//
//   pnpm contract:check
//
// Tracked here: the files contract:generate's steps write. A later step that adds more
// generated output (e.g. Python models for apps/cli) adds its own path to this list.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const TRACKED = ["apps/api/openapi.json", "packages/api-types/src/schema.d.ts"];

const read = (file) => {
  const full = path.join(root, file);
  return existsSync(full) ? readFileSync(full, "utf-8") : null;
};

const before = TRACKED.map(read);
execFileSync("node", [path.join(root, "scripts/contract-generate.mjs")], {
  cwd: root,
  stdio: "inherit",
});
const changed = TRACKED.filter((file, i) => read(file) !== before[i]);

if (changed.length) {
  for (const file of changed) console.error(`changed: ${file}`);
  console.error(
    "API contract was out of date: pnpm contract:generate has now updated the files above; review and commit them",
  );
  process.exit(1);
}

console.log("API contract is up to date.");

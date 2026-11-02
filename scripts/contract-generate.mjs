#!/usr/bin/env node
// Regenerates the API's committed contract and everything derived from it: apps/api/
// openapi.json (the schema itself, exported straight from the FastAPI app -- see that
// script) and packages/api-types/src/schema.d.ts (the TypeScript types every TS client
// imports instead of hand-writing its own copy -- docs/architecture.md). Run this after
// changing an API route or model (CLAUDE.md, "Working in the apps") and commit the
// result; never hand-edit either generated file.
//
//   pnpm contract:generate
//
// Each step is independent and ordered: a later step -- generating the CLI's Python
// models (apps/cli/src/myapp/client.py) from this same schema, say -- appends another
// step() call below, after the ones its input depends on.
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function step(name, args) {
  console.log(`==> ${name}`);
  execFileSync("pnpm", args, { cwd: root, stdio: "inherit" });
}

step("export the OpenAPI schema (apps/api/openapi.json)", [
  "--filter",
  "api",
  "run",
  "export-openapi",
]);
step("generate TypeScript API types (packages/api-types/src/schema.d.ts)", [
  "--filter",
  "@myapp/api-types",
  "run",
  "generate",
]);

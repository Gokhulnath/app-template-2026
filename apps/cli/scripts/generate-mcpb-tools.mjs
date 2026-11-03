#!/usr/bin/env node
// Regenerates mcpb/manifest.json's own `tools` array from the API's actually-registered
// MCP tools (apps/api/src/api/mcp.py's `build_mcp_server`), so the two can never drift.
// Run through `pnpm contract:generate` (never by hand) -- see that script's header for
// why, and scripts/contract-check.mjs for how staleness here fails the build.
//
//   pnpm --filter cli run generate-mcpb-tools
//
// Reuses apps/api/scripts/export_mcp_tools.py (the same introspection apps/docs's own
// MCP reference page is generated from) rather than re-implementing it: that script
// builds the real `FastMCP` server in-process -- no running API, no database -- and
// lists every tool with its name and full docstring, in the same order `list_tools()`
// returns (mcp.py's own registration order -- deterministic given the same source, so
// this array's order is stable across runs).
//
// Nothing is filtered out today: myapp has exactly one tool (get_status) and no concept
// yet of a tool that should stay out of an external client's hands. donna (the private
// product this template was extracted from) added one once it needed it: a worker-only
// tool gated on a service credential would only ever error for an external MCP client
// like Claude Desktop, so its generator drops any tool name a frozenset like
// `api.mcp.INTERNAL_ONLY_TOOLS` lists before writing this array. If myapp ever grows a
// worker-only tool the same way, add that same frozenset to api/mcp.py and filter on it
// here -- don't invent a different mechanism.
//
// A tool's one-line description here is its docstring's first paragraph (up to the
// first blank line, the summary/detail split most of mcp.py's docstrings already use),
// with any internal line wrapping collapsed to single spaces -- a plain textual join,
// not word-aware, so a docstring that wraps mid-token (no hyphen) can read with an
// extra space; that's an existing docstring-wrapping quirk, not something this script
// tries to fix.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const cliDir = path.resolve(import.meta.dirname, "..");
const apiDir = path.resolve(cliDir, "../api");
const manifestPath = path.join(cliDir, "mcpb/manifest.json");

function oneLineDescription(description) {
  const firstParagraph = description.split("\n\n")[0];
  return firstParagraph
    .split("\n")
    .map((line) => line.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function exportMcpTools() {
  const raw = execFileSync(
    "uv",
    ["run", "python", "scripts/export_mcp_tools.py"],
    { cwd: apiDir, encoding: "utf-8" },
  );
  return JSON.parse(raw);
}

function main() {
  const tools = exportMcpTools();
  const manifestTools = tools.map((tool) => ({
    name: tool.name,
    description: oneLineDescription(tool.description ?? ""),
  }));

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  manifest.tools = manifestTools;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  // JSON.stringify always expands every array one element per line; Prettier (which
  // `pnpm lint` checks this file against, same as every other JSON file here) collapses
  // one back onto a single line when it fits the print width, e.g. `compatibility.
  // platforms`/`keywords` below `tools`. Re-formatting here, rather than leaving the
  // mismatch for a human to `prettier --write` by hand, keeps this script's own output
  // clean on every run.
  execFileSync("pnpm", ["exec", "prettier", "--write", "mcpb/manifest.json"], {
    cwd: cliDir,
    stdio: "inherit",
  });
  console.log(
    `Wrote ${manifestTools.length} tool(s) to ${path.relative(cliDir, manifestPath)}.`,
  );
}

main();

#!/usr/bin/env node
// Selects the workspace packages a branch's changes can affect, so CI on a pull request
// (and `pnpm verify --affected`) type-checks, builds and tests only those, instead of the
// whole repo on every change. Pushes to main still run everything (`--all`).
//
//   node scripts/affected.mjs --base origin/main            # JSON on stdout
//   node scripts/affected.mjs --base origin/main --local    # also uncommitted + untracked
//   node scripts/affected.mjs --all --github-output         # CI: write job outputs
//   eval "$(node scripts/affected.mjs --base origin/main --local --shell)"
//
// How a changed file maps to packages:
//   1. A file inside a workspace package (apps/*, packages/*) selects that package.
//   2. A file outside them matched by PATH_RULES selects the packages that read it.
//   3. A file matched by LINT_ONLY selects nothing (lint, which always runs in full,
//      covers it).
//   4. Anything else -- root package.json, the lockfile, workflows, scripts/, a package
//      being added or removed -- selects every package. Unknown means "run everything".
// Then every package that depends on a selected one (a `workspace:` dependency, read from
// each package.json) is selected too, transitively. A dependency that isn't declared is
// invisible here, so declare it: apps/docs devDepends on api and cli (its generators read
// them), apps/desktop on web (it wraps web's export) and packages/e2e on api and web (it
// starts them) for exactly this reason.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// Test suites that need the local Postgres, in the CI jobs that run them in parallel.
// Everything else is tested in the database-free `checks` job. A new app whose tests need
// the database joins a group here (or gets its own, for its own parallel job).
const DB_GROUPS = [{ name: "api", packages: ["api"], schema_lint: true }];
const DB_PACKAGES = DB_GROUPS.flatMap((group) => group.packages);

// Paths outside the workspace packages that a package reads.
const PATH_RULES = [
  // The docs site renders docs/*.md itself (apps/docs/content/docs/build is a symlink).
  { pattern: /^docs\//, packages: ["docs"] },
  // Migrations, seed and roles: every suite that runs against Postgres.
  { pattern: /^supabase\//, packages: DB_PACKAGES },
  // The Agent Skill drives the CLI and ships in the CLI's release packages.
  { pattern: /^skills\//, packages: ["cli"] },
];

// Files that can't change what any package builds or tests.
const LINT_ONLY = [
  /^[^/]+\.md$/,
  /^\.claude\//,
  /^\.vscode\//,
  /^\.github\/[^/]+\.md$/,
  /^\.github\/rulesets\//,
  /^(LICENSE|\.editorconfig|\.gitignore|\.prettierrc\.json|\.prettierignore|lefthook\.yml|renovate\.json|release-please-config\.json|\.release-please-manifest\.json|skills-lock\.json|\.mcp\.json)$/,
];

function parseArgs(argv) {
  const args = {
    base: "origin/main",
    all: false,
    local: false,
    format: "json",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--base") args.base = argv[++i];
    else if (arg === "--all") args.all = true;
    else if (arg === "--local") args.local = true;
    else if (arg === "--github-output") args.format = "github";
    else if (arg === "--shell") args.format = "shell";
    else {
      console.error(
        "usage: affected.mjs [--base <ref>] [--all] [--local] [--github-output | --shell]",
      );
      process.exit(2);
    }
  }
  if (!args.base) {
    console.error("affected.mjs: --base needs a git ref");
    process.exit(2);
  }
  return args;
}

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function lines(text) {
  return text.split("\n").filter(Boolean);
}

// The workspace globs from pnpm-workspace.yaml. Only `dir/*` entries are supported, which
// is all this repo uses; anything else fails loudly rather than silently missing packages.
function workspacePackages() {
  const yaml = readFileSync(path.join(ROOT, "pnpm-workspace.yaml"), "utf8");
  const globs = [];
  let inPackages = false;
  for (const line of yaml.split("\n")) {
    if (/^packages:\s*$/.test(line)) inPackages = true;
    else if (inPackages && /^\s+-\s+/.test(line)) {
      globs.push(
        line
          .replace(/^\s+-\s+/, "")
          .replace(/["']/g, "")
          .trim(),
      );
    } else if (inPackages && /^\S/.test(line)) inPackages = false;
  }
  const packages = [];
  for (const glob of globs) {
    const match = /^([\w.-]+)\/\*$/.exec(glob);
    if (!match)
      throw new Error(`affected.mjs: unsupported workspace glob "${glob}"`);
    const parent = path.join(ROOT, match[1]);
    if (!existsSync(parent)) continue;
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      const manifest = path.join(parent, entry.name, "package.json");
      if (!entry.isDirectory() || !existsSync(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, "utf8"));
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.optionalDependencies,
        ...pkg.peerDependencies,
      };
      packages.push({
        name: pkg.name,
        dir: `${match[1]}/${entry.name}`,
        workspaceDeps: Object.keys(deps).filter((dep) =>
          String(deps[dep]).startsWith("workspace:"),
        ),
      });
    }
  }
  return { globs: globs.map((glob) => glob.slice(0, -1)), packages };
}

function changedFiles(base, local) {
  let mergeBase;
  try {
    mergeBase = git(["merge-base", base, "HEAD"]).trim();
  } catch {
    return {
      error: `can't find a merge base with ${base} (shallow clone or unknown ref?)`,
    };
  }
  // --no-renames lists a renamed file under both its old and its new path.
  const files = new Set(
    lines(git(["diff", "--name-only", "--no-renames", mergeBase, "HEAD"])),
  );
  if (local) {
    for (const file of lines(
      git(["diff", "--name-only", "--no-renames", "HEAD"]),
    ))
      files.add(file);
    for (const file of lines(
      git(["ls-files", "--others", "--exclude-standard"]),
    ))
      files.add(file);
  }
  return { files: [...files].sort() };
}

function select(files, workspace) {
  const byDir = new Map(workspace.packages.map((pkg) => [pkg.dir, pkg]));
  const names = new Set(workspace.packages.map((pkg) => pkg.name));
  const direct = new Set();
  const reasons = [];
  for (const file of files) {
    const parts = file.split("/");
    const owner = byDir.get(`${parts[0]}/${parts[1]}`);
    if (owner && parts.length > 2) {
      direct.add(owner.name);
    } else if (workspace.globs.includes(`${parts[0]}/`)) {
      // A file directly in apps/ or packages/, or in a directory without a package.json
      // (a package being added or removed): the workspace itself changed.
      reasons.push(file);
    } else {
      const rule = PATH_RULES.find((r) => r.pattern.test(file));
      if (rule)
        rule.packages
          .filter((name) => names.has(name))
          .forEach((name) => direct.add(name));
      else if (!LINT_ONLY.some((pattern) => pattern.test(file)))
        reasons.push(file);
    }
  }
  if (reasons.length)
    return { all: true, reasons, packages: [...names].sort() };

  const dependents = new Map();
  for (const pkg of workspace.packages) {
    for (const dep of pkg.workspaceDeps) {
      if (!dependents.has(dep)) dependents.set(dep, []);
      dependents.get(dep).push(pkg.name);
    }
  }
  const selected = new Set(direct);
  const queue = [...direct];
  while (queue.length) {
    for (const dependent of dependents.get(queue.shift()) ?? []) {
      if (!selected.has(dependent)) {
        selected.add(dependent);
        queue.push(dependent);
      }
    }
  }
  return { all: false, reasons: [], packages: [...selected].sort() };
}

function plan(selection, workspace) {
  const { all, packages } = selection;
  const has = (name) => packages.includes(name);
  const filters = (list) => list.map((name) => `--filter=${name}`).join(" ");
  const nonDb = packages.filter((name) => !DB_PACKAGES.includes(name));
  const dbMatrix = DB_GROUPS.map((group) => ({
    ...group,
    packages: group.packages.filter((name) => has(name)),
  }))
    .filter((group) => group.packages.length)
    .map((group) => ({
      name: group.name,
      filter: filters(group.packages),
      schema_lint: group.schema_lint,
    }));
  return {
    all,
    reasons: selection.reasons,
    packages,
    // For lint/typecheck/build: every selected package. "--recursive" when it's all of
    // them, so the command matches the plain root scripts exactly.
    filter: all ? "--recursive" : filters(packages),
    // For the database-free test job: the selected packages minus the database suites.
    test_filter: all
      ? DB_PACKAGES.map((name) => `--filter=!${name}`).join(" ")
      : filters(nonDb),
    db_matrix: dbMatrix,
    chromium: has("@myapp/ui"),
    desktop: has("desktop"),
    release_packages: has("cli"),
    workspace_size: workspace.packages.length,
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

const args = parseArgs(process.argv.slice(2));
const workspace = workspacePackages();
const everything = (reason) => ({
  all: true,
  reasons: [reason],
  packages: workspace.packages.map((pkg) => pkg.name).sort(),
});
let selection;
if (args.all) {
  selection = everything("--all");
} else {
  const changed = changedFiles(args.base, args.local);
  selection = changed.error
    ? everything(changed.error)
    : select(changed.files, workspace);
}
const result = plan(selection, workspace);

const why = result.all
  ? `all ${result.workspace_size} packages (${result.reasons.slice(0, 5).join(", ")}${result.reasons.length > 5 ? ", ..." : ""})`
  : result.packages.length
    ? `${result.packages.length} of ${result.workspace_size} packages: ${result.packages.join(", ")}`
    : "no packages (only lint-checked files changed)";
console.error(`affected: ${why}`);

if (args.format === "github") {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    console.error("affected.mjs: --github-output needs $GITHUB_OUTPUT");
    process.exit(2);
  }
  const outputs = {
    all: result.all,
    packages: result.packages.join(" "),
    filter: result.packages.length ? result.filter : "",
    test_filter: result.test_filter,
    db_matrix: JSON.stringify(result.db_matrix),
    chromium: result.chromium,
  };
  appendFileSync(
    out,
    Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(""),
  );
} else if (args.format === "shell") {
  const vars = {
    AFFECTED_ALL: result.all,
    AFFECTED_PACKAGES: result.packages.join(" "),
    AFFECTED_FILTER: result.packages.length ? result.filter : "",
    AFFECTED_DB_FILTER: result.all
      ? DB_PACKAGES.map((name) => `--filter=${name}`).join(" ")
      : result.db_matrix.map((group) => group.filter).join(" "),
    AFFECTED_DESKTOP: result.desktop,
    AFFECTED_RELEASE_PACKAGES: result.release_packages,
  };
  for (const [key, value] of Object.entries(vars))
    console.log(`${key}=${shellQuote(value)}`);
} else {
  console.log(JSON.stringify(result, null, 2));
}

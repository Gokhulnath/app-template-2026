// Generates content/docs/reference/cli.mdx from apps/cli's own Typer app, using Typer's
// built-in `utils docs` command (ships with the `typer` dependency apps/cli already has;
// no new dependency). Needs no running API: `myapp.cli`'s commands only build their
// `typer.Typer()` object at import time, they don't call the API.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const cliDir = path.resolve(import.meta.dirname, "../../cli");
const outputFile = path.resolve(
  import.meta.dirname,
  "../content/docs/reference/cli.mdx",
);
const tmpDir = mkdtempSync(path.join(tmpdir(), "myapp-cli-docs-"));
const tmpFile = path.join(tmpDir, "cli.md");

try {
  execFileSync(
    "uv",
    [
      "run",
      "typer",
      "myapp.cli",
      "utils",
      "docs",
      "--name",
      "myapp",
      "--output",
      tmpFile,
    ],
    { cwd: cliDir },
  );

  // The generated page repeats "myapp" as its own first line (an H1); the frontmatter
  // title already says that, so drop it to avoid showing the title twice.
  const body = readFileSync(tmpFile, "utf-8").replace(/^# `myapp`\n\n/, "");

  const frontmatter = [
    "---",
    "title: CLI reference",
    "description: Every myapp command, generated from apps/cli's Typer app.",
    "---",
    "",
    "",
  ].join("\n");

  writeFileSync(outputFile, frontmatter + body);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

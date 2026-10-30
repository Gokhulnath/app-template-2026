#!/usr/bin/env node
// Playwright's `webServer` command for apps/web (packages/e2e/playwright.config.ts).
//
// apps/web ships as a static export (`output: "export"`, apps/web/next.config.ts), and
// Next.js refuses a second `next dev` in the same project directory regardless of port
// whenever a developer's own `next dev` is already running from apps/web -- the normal
// situation, not an edge case. So this harness builds and serves exactly what actually
// ships: `next build` into its own isolated directory (MYAPP_WEB_DIST_DIR, never
// apps/web/out, which `pnpm build` writes to), then `static-server.mjs` serves that
// directory on the harness's own port. `next build` takes no such single-instance lock,
// so it runs fine beside a `next dev` already running from the same folder.
//
// Required env: WEB_PORT (the port to serve on) and NEXT_PUBLIC_API_URL (inlined into
// the build, same as the `next dev` entry's own env). MYAPP_WEB_DIST_DIR is this
// script's own choice, not the caller's -- apps/web/next.config.ts only reads it to
// decide where `next build`'s export lands.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStaticServer } from "./static-server.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// packages/e2e/scripts -> repo root -> apps/web
const webDir = path.resolve(here, "../../../apps/web");
const distDirName = "dist-e2e";

const port = process.env.WEB_PORT;
if (!port) {
  console.error("build-and-serve-web: WEB_PORT is required");
  process.exit(1);
}

console.log(`build-and-serve-web: building apps/web into ${distDirName}/ ...`);
const buildStartedAt = Date.now();
const build = spawnSync("pnpm", ["exec", "next", "build"], {
  cwd: webDir,
  stdio: "inherit",
  env: { ...process.env, MYAPP_WEB_DIST_DIR: distDirName },
});
const buildSeconds = ((Date.now() - buildStartedAt) / 1000).toFixed(1);

if (build.error) {
  console.error(
    `build-and-serve-web: failed to start \`next build\`: ${build.error}`,
  );
  process.exit(1);
}
if (build.status !== 0) {
  console.error(
    `build-and-serve-web: \`next build\` failed after ${buildSeconds}s`,
  );
  process.exit(build.status ?? 1);
}
console.log(`build-and-serve-web: build finished in ${buildSeconds}s`);

const exportDir = path.join(webDir, distDirName);
const server = createStaticServer(exportDir, Number(port));

server.on("listening", () => {
  console.log(
    `build-and-serve-web: serving ${exportDir} on http://localhost:${port}`,
  );
});
server.on("error", (err) => {
  console.error(`build-and-serve-web: static server error: ${err}`);
  process.exit(1);
});

// Playwright stops a webServer process by signal when the run ends; there's no child
// process left alive at this point (the build above already exited), so closing the
// server is the whole shutdown.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

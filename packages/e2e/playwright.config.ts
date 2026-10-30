import path from "node:path";

import { defineConfig } from "@playwright/test";

import { E2E_API_URL, E2E_WEB_URL, REPO_ROOT, portOf } from "./src/env.js";

const apiPort = portOf(E2E_API_URL);
const webPort = portOf(E2E_WEB_URL);

/**
 * This suite's own real local stack (docs/testing.md "Isolation rules"). Every value
 * above comes from `src/env.ts`'s env-var contract (`E2E_API_URL`/`E2E_WEB_URL`), so
 * this file only ever formalizes defaults, it never hardcodes a second copy of them.
 *
 * `webServer` always starts the harness's own API and web app -- there is no "reuse the
 * developer's running stack" mode, and `reuseExistingServer: false` on both makes that
 * literal: a leftover process already bound to 8580/3580 fails the run loudly instead of
 * silently being reused (including the owner's own dev stack, which never binds these
 * ports in the first place -- see docs/testing.md).
 */
export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: E2E_WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `../../scripts/with-doppler.sh uv run fastapi dev --port ${apiPort}`,
      cwd: path.join(REPO_ROOT, "apps/api"),
      // /openapi.json, not /health: this template has no database requirement for the
      // e2e suite (docs/testing.md), and /health reports 503 whenever the database is
      // down -- a status Playwright's own webServer readiness probe treats as "not up
      // yet" (it only accepts 200-403) and would wait on until this entry's own timeout,
      // even though the API process is in fact up and the smoke spec below only needs
      // it to be reachable. /openapi.json is always 200 once the app has booted,
      // database or no database.
      url: `${E2E_API_URL}/openapi.json`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        // Lets the web app (on its own 3580-block port) call this API across origins --
        // the same flag `pnpm dev:api` already sets for `next dev`'s own floating port.
        CORS_ALLOW_LOCALHOST: "true",
      },
    },
    {
      // apps/web ships as a static export (`output: "export"`), so the harness builds
      // and serves exactly what ships, instead of running a second `next dev` in the
      // same project directory -- which Next 16 refuses outright whenever a developer's
      // own `next dev` is already running from apps/web, the normal situation, not an
      // edge case (see build-and-serve-web.mjs's own comment for the full story).
      // `node` directly, not `pnpm exec`: Playwright spawns this command without
      // pnpm's own run-script PATH, same reason the dev script needs `pnpm exec`.
      //
      // WITH_DOPPLER_PRESERVE_ENV=NEXT_PUBLIC_API_URL: without it, `doppler run` (which
      // `with-doppler.sh` execs into) overwrites this entry's own NEXT_PUBLIC_API_URL
      // below with apps/web's own Doppler secret (the owner's own dev API) before `next
      // build` ever sees it -- `doppler run` replaces inherited env vars with its own
      // values unless told to preserve them.
      command: `WITH_DOPPLER_PRESERVE_ENV=NEXT_PUBLIC_API_URL ../../scripts/with-doppler.sh node ../../packages/e2e/scripts/build-and-serve-web.mjs`,
      cwd: path.join(REPO_ROOT, "apps/web"),
      url: E2E_WEB_URL,
      reuseExistingServer: false,
      // `next build` (Turbopack, first compile) plus the static export.
      timeout: 120_000,
      // "pipe": without it, Playwright only forwards this process's stdout when
      // DEBUG=pw:webserver is set (stderr is piped by default) -- so the build-timing
      // lines build-and-serve-web.mjs prints would otherwise never appear in a plain
      // `pnpm e2e` run.
      stdout: "pipe",
      env: {
        NEXT_PUBLIC_API_URL: E2E_API_URL,
        WEB_PORT: webPort,
      },
    },
  ],
});

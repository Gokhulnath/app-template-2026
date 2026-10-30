---
title: Testing
description: packages/e2e -- a real Playwright suite against this harness's own API and web app, and why it's opt-in.
---

# End-to-end testing

`packages/e2e` is a Playwright suite that drives the real home page in a real browser,
against this template's own API and web app. It proves what `apps/api/tests` and
`packages/ui`'s Storybook stories can't on their own: that a person's browser can
actually reach the built web app, and that app can actually reach the API across a real
network round trip -- end to end, through the real UI, never a mock.

This template has no authentication or database requirement yet
(`docs/architecture.md`'s status table), so the one spec here is a smoke test, not a
sign-in flow: it loads the home page and asserts on the browser's own call to the API's
`/health` endpoint, the same already-shipped check `apps/web/src/components/
api-status.tsx` renders. Once an app built from this template adds real authentication
or a real data-backed flow, a spec driving that flow through the real UI belongs here --
see `CLAUDE.md`'s "Tests" section first either way: a spec protects one real behavior,
tested once, at the strongest boundary, and this suite is that boundary for a
cross-surface flow (browser → built web app → API); anything one layer can already prove
on its own stays in that layer's own tests.

## Running it

```bash
pnpm e2e
```

That's `pnpm --filter e2e pw` under the hood (Playwright Test, pinned to the same
`1.64.x` line `packages/ui` already uses). It needs nothing else running first -- see
"Isolation rules" below.

`pnpm verify` does **not** run it by default (see "Why it's opt-in"). Run it explicitly
with:

```bash
pnpm verify --e2e
```

## Isolation rules

- **The harness always starts its own API and web app.** There is no "point it at your
  running `pnpm dev`" mode. `playwright.config.ts`'s `webServer` entries start `apps/api`
  and `apps/web` on their own ports (`8580`/`3580` by default) before the spec runs, and
  stop them again afterward. `reuseExistingServer: false` on both makes this literal: if
  something is already listening on either port, the run fails loudly instead of quietly
  reusing it.
- **The web entry serves a static export, not a second `next dev`.** `apps/web` ships
  as a static export (`output: "export"`), so `packages/e2e/scripts/build-and-serve-web
.mjs` runs `next build` into its own directory (`MYAPP_WEB_DIST_DIR`, never
  `apps/web/out`, which `pnpm build` writes to) and serves that export on `3580` with a
  small built-in static file server (`packages/e2e/scripts/static-server.mjs`, no new
  runtime dependency in `apps/web`) that resolves clean URLs the way a production static
  host does -- `/foo` serves `foo.html`, `/` serves `index.html`, a missing route falls
  back to the export's own `404.html`. This exists because Next 16 refuses a second
  `next dev` in the same project directory outright, regardless of port, whenever a
  developer's own `next dev` is already running from `apps/web`. A production build
  takes no such lock, so it runs fine beside one. The build's own `NEXT_PUBLIC_API_URL`
  must survive `scripts/with-doppler.sh` unchanged: `apps/web`'s Doppler secrets include
  a same-named value for the owner's own dev API, and `doppler run` overwrites an
  inherited env var with its own unless told to preserve it --
  `WITH_DOPPLER_PRESERVE_ENV=NEXT_PUBLIC_API_URL` on the web entry's command is what
  tells it to.
- **Never port 3000 or 8000.** Those are this template's own `next dev` and
  `fastapi dev` defaults; this suite's defaults (`8580`/`3580`) stay clear of both.
- **No database required.** This template's API starts and serves `/health` (degraded,
  without a `db: "ok"`) whether or not a local database is running, and the smoke spec
  accepts either outcome -- see the spec's own comment for why. A product built from this
  template that adds real data access should extend this suite with a spec that drives
  that flow (sign-in, a database row) end to end, once there is one to drive.
- **Every port and URL is overridable.** `E2E_API_URL` and `E2E_WEB_URL` (see
  `packages/e2e/src/env.ts`) are this suite's whole env-var contract -- a CI runner or a
  different local port block sets these, nothing else.
- **No test-only hooks in `apps/web`.** The spec reads exactly what a person would see:
  the page's own rendered text and the already-shipped `api-status` element's own state,
  never a `window.__e2e*` hook or a build flag added to `apps/web` only for this suite
  (`CLAUDE.md`: no hooks added to production code only for tests).

## Why it's opt-in

- **It's slower.** A cold `next build` of `apps/web` takes real wall-clock time that
  every other `pnpm verify`/CI run shouldn't have to pay for on every push.
- **The script is deliberately not named `test`.** `packages/e2e/package.json`'s script
  is `pw`, not `test` -- the root `test` script is a bare
  `pnpm --recursive --if-present test` with no filter, so a package whose script were
  named `test` would ride along in every plain `pnpm test` (and every `scripts/verify.sh`
  run) with no opt-in at all. `pnpm e2e` (`pnpm --filter e2e pw`) is the only way this
  suite ever runs.

## CI

`.github/workflows/e2e.yml` runs on `workflow_dispatch` and a nightly `schedule` only --
never on `pull_request` or `push`, for the same "it's slower" reason above. It needs no
secrets and no database: the template has neither requirement yet (see "Isolation
rules"). On failure, the Playwright HTML report and trace are uploaded as a build
artifact.

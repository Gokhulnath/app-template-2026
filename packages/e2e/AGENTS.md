# packages/e2e

Playwright suite that drives the real web app in a real browser against this harness's
own API — the one cross-surface proof (browser → built web export → API) no layer-local
test can give. Read `docs/testing.md` first: it's the full spec-by-spec contract, the
isolation rules, and why this suite is opt-in. Re-read root `CLAUDE.md`'s "Tests" section
before adding a scenario — this package is "the strongest boundary" for a cross-surface
flow only; anything one layer already proves on its own stays in that layer's own tests.

## Hard boundaries

- Never add a test-only hook to `apps/web` just to make a spec pass. This template has
  no auth yet, so the one spec here is a smoke test reading `apps/web`'s own already-
  shipped `api-status` element, never a `window.__e2e*` hook (`docs/testing.md`
  "Isolation rules").
- Never point this suite at the owner's running dev stack (API `:8000`, web `:3000`).
  `playwright.config.ts`'s `webServer` always starts its own `apps/api`/`apps/web` on
  `8580`/`3580` with `reuseExistingServer: false` — a leftover process on either port
  fails the run loudly instead of being silently reused.
- Never add a script here named `test`. This suite's opt-in posture depends on root
  `pnpm test` never picking it up; `pnpm e2e` (`pnpm --filter e2e pw`) is the only way it
  ever runs.

## Commands (from repo root)

```bash
pnpm e2e             # pnpm --filter e2e pw
pnpm --filter e2e lint
pnpm --filter e2e typecheck
pnpm verify --e2e    # full verify chain including this suite (off by default)
```

No local database needed: this template's API serves `/health` (degraded, without
`db: "ok"`) whether or not Postgres is running, and the smoke spec accepts either.

## Files to read before changing anything

- `docs/testing.md` — the full contract, the isolation rules, and the "Why it's opt-in"
  rationale.
- `src/env.ts` — the whole env-var contract (`E2E_API_URL`/`E2E_WEB_URL`) and the ports
  this suite claims (8580/3580), chosen to stay clear of `apps/api`'s and `apps/web`'s
  own dev defaults (8000/3000).
- `playwright.config.ts` — why `fullyParallel: false` (shared fixed-port processes), and
  why the API `webServer` probes `/openapi.json` rather than `/health` (a `503` would
  make Playwright's own readiness probe wait out its timeout even though the process is
  genuinely up).
- `scripts/build-and-serve-web.mjs` + `scripts/static-server.mjs` — builds `apps/web`
  into its own `dist-e2e/` (never `apps/web/out`, which `pnpm build` writes to) and
  serves it the way a production static host would, since Next.js refuses a second
  `next dev` in the same project directory.

## Conventions and gotchas

- Imports use explicit `.js` extensions in `.ts` source (`NodeNext` module resolution).
- `specs/smoke.spec.ts` asserts `"ok"` or `"degraded (database ...)"` are both passing
  outcomes — this harness runs its own API with no database behind it by default, so
  `"degraded"` is expected, not a failure.
- `WITH_DOPPLER_PRESERVE_ENV=NEXT_PUBLIC_API_URL` on the web `webServer` entry's command
  stops `doppler run` from overwriting this suite's own API URL with `apps/web`'s own
  Doppler secret before `next build` ever sees it.

## Tests

This package owns the one cross-surface journey (browser → built web export → API) that
neither `apps/api/tests` nor `packages/ui`'s Storybook stories can prove alone. CI runs
it only on `workflow_dispatch` and a nightly schedule, never on `pull_request`/`push`
(`.github/workflows/e2e.yml`) — a cold `next build` is slower than every PR should pay.

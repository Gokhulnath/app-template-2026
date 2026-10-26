# myapp

myapp is one FastAPI backend serving many thin clients. The repo is also a template for
future monorepos (published as `Gokhulnath/app-template-2026`), so how it's built matters
as much as what it does.

## Architecture rules

- All business logic and all data access live in the FastAPI backend (`apps/api`). Every
  client (web, desktop, CLI/TUI, MCP server, Agent Skill, and iOS/Android later) talks only
  to its HTTP API. Clients never talk to the database directly.
- Don't put logic in a client that another client would have to reimplement. If two
  clients need it, it belongs in the API.
- Details and conventions (versioning, errors, CORS, auth plan): `docs/architecture.md`.

## Working in the apps

- Run everything from the root with pnpm: `pnpm dev`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build`, `pnpm format`. Install only from the root (one
  `pnpm-lock.yaml`), and never add a `pnpm-workspace.yaml` or lockfile inside an app.
- Before merging a PR, run `pnpm verify`: lint, type-check, tests against the local
  database (`MYAPP_REQUIRE_DB=1`, as in CI), the builds, and the macOS app and Linux bundles
  (in Docker). CI runs the same except the desktop builds, which run only for releases.
  `pnpm verify --no-desktop` skips them for a change that can't affect the desktop app.
- Python apps (`apps/api`, `apps/cli`): uv only (`uv add`, `uv run`), never `pip`.
  `.python-version` is `3.14+gil` on purpose: plain `3.14` lets uv pick its free-threaded
  build. `+gil` never downloads, so each app's postinstall runs `uv python install 3.14`
  first.
- Formatting is Prettier (JS/TS/JSON/CSS/Markdown) and ruff (Python); types are tsc and
  pyright. Lefthook runs the formatters and a Conventional Commits check on every commit.
- `apps/web`: Next.js 16.4 differs from older versions. Read `apps/web/AGENTS.md` and the
  matching guide in `apps/web/node_modules/next/dist/docs/` before writing Next.js code.
  The app is a static export, so there are no server components that fetch data, no server
  actions and no route handlers. Data comes from the API through `src/lib/api.ts`.
- New config values get a commented line in the app's `.env.example`.

## Keep the setup log current

Whenever you change the repo's structure, tooling, dependencies or conventions, add the
exact commands and the reason to `docs/setup-log.md` in the same commit. That covers new
apps or packages, new tools, config changes and version bumps. Ordinary feature work
doesn't need a log entry.

## Keep the template current

`Gokhulnath/app-template-2026` is the public starter new apps are created from. When a
change touches the repo's setup rather than the product (tooling, CI and release
workflows, scripts, Docker files, conventions, this file, `docs/template.md`), make the
same change there through its own PR: `myapp` names, its own setup-log entry, and nothing
private (secrets, cloud identifiers, local paths). Product features stay here.

## Commits

- Conventional Commits: `type(scope): subject`, imperative, at most 72 characters.
  Scopes: `repo`, `web`, `api`, `db`, `cli`, `mcp`, `skill`, `desktop`, `docs`, `ci`.
- One logical change per commit, and each commit leaves the repo working. Stage explicit
  paths (`git add <paths>`), not `git add -A`, so nothing unrelated slips in.
- When a generator creates files (create-next-app, `uv init`, `tauri init`), commit its
  output untouched first, then customize it in a separate commit so the diff shows what's
  ours.

## Branches and PRs

- `main` is protected by a ruleset (`.github/rulesets/main.json`): no direct pushes, and
  every change arrives through a PR with the CI check `Lint, type-check, build and test`
  green. There are 0 required approvals (it's a solo repo). The admin bypass works only
  through a PR, for release PRs.
- One feature per branch, named `<type>/<short-slug>` (for example `feat/items-endpoint`
  or `fix/health-timeout`), with one or more Conventional Commits.
- Open the PR with `gh pr create` using `.github/pull_request_template.md` (What, Why,
  Verified, Setup log). Wait for CI, then `gh pr merge <n> --rebase`. Rebase is the only
  merge method enabled. **Keep the branch:** no `--delete-branch`.

## Releases

- release-please cuts releases from the Conventional Commits on `main`, with one product
  version for every app. See `docs/releasing.md`. Don't hand-edit versions in
  `tauri.conf.json`, `Cargo.toml`, the `pyproject.toml` files, `apps/web/package.json` or
  `apps/cli/mcpb/manifest.json`; the release PR bumps them.
- The owner decides when to release by merging the release PR (with `--admin`, since its CI
  doesn't run).
- CI builds the desktop installers only for releases and manual runs, never on PRs, to save
  CI minutes. Test a desktop change locally (`pnpm dev:desktop`, `pnpm build:desktop`).

## Secrets

- Never read, print or copy a real env file (`.env`, `.env.local`, `.env.production` and so
  on). Only `.env.example` files are safe to open. `.claude/settings.json` denies the Read
  tool on the common names, and a PreToolUse hook (`.claude/hooks/block-env-reads.py`)
  blocks shell commands that read them.
- Never ask for a secret in chat. The owner puts secret values in place themselves.
- Real secrets live in Doppler, in a **personal** workplace. Before any `doppler` command,
  run `doppler me` from the repo and make sure the workplace isn't the owner's employer.
  App scripts go through `scripts/with-doppler.sh`. It falls back to `.env` files when a
  folder isn't set up for Doppler, and it refuses to inject secrets when the login's
  workplace isn't the one in `.doppler-workplace`.

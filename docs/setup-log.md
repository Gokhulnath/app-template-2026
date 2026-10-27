# Setup log

Every step taken to build this monorepo, in order, with the exact commands and the reason
for each choice. Each numbered step is one commit, so `git log --reverse --oneline` lists
the same steps. Following the log from an empty folder reproduces the repo, which is what
makes it usable as a template.

Commands run from the repo root unless a `cd` says otherwise.

## Toolchain

Recorded on 2026-10-25.

| Tool        | Version                             | Notes                                             |
| ----------- | ----------------------------------- | ------------------------------------------------- |
| macOS       | 27.0 (Darwin 27.0.0), Apple Silicon |                                                   |
| Node.js     | 26.7.0                              | Node 25+ no longer ships corepack                 |
| pnpm        | 11.7.0                              | Homebrew                                          |
| uv          | 0.12.2                              | Installs and manages Python                       |
| Python      | 3.14.7                              | GIL build, see step 5                             |
| Rust        | 1.98.0                              | For the Tauri desktop app                         |
| Docker      | 29.8.2                              | For the local Supabase stack                      |
| Doppler CLI | 3.76.5                              | Homebrew; uses a personal workplace, see its step |
| gh          | authenticated as `Gokhulnath`       |                                                   |

---

## 1. Repository baseline

Commit: `chore(repo): add repository baseline`

```bash
gh repo create Gokhulnath/donna --private      # empty repo: no README, license or .gitignore
cd ~/Private/donna
git init -b main
git remote add origin git@github.com:Gokhulnath/donna.git
```

Files:

- `.gitignore`: repo-wide rules for OS and editor files, Node, Python (`.venv`,
  `__pycache__`, `.pytest_cache`, `.ruff_cache`, `*.egg-info`), env files and Claude Code's
  per-user settings. Every env file is ignored except `.env.example`. Apps add their own
  `.gitignore` only for tool-specific output.
- `.editorconfig`: UTF-8, LF line endings, final newline, 2-space indent (4 for Python).
- `.claude/settings.json`: denies Claude Code reads of real env files. Each entry is
  `Read(**/<name>)`, and the `**/` prefix is what makes it match at any depth rather than
  only at the root. The names: `.env`, `.env.local`, `.env.*.local`, `.env.development`,
  `.env.staging`, `.env.production`, `.env.test` (step 28 adds more). There's no wildcard,
  because deny beats allow and `.env.example` must stay readable. It keeps agents from
  reading secrets out of a local env file.
- `CLAUDE.md`: the rules every change follows: the architecture (all logic in the API,
  thin clients), keeping this log current, the commit convention and the secrets rule.
- `README.md`: a one-paragraph description, which grows as the apps land.

## 2. Scaffold the web app (generator output)

Commit: `chore(web): scaffold apps/web with create-next-app 16.4.3`

```bash
mkdir -p apps && cd apps
pnpm dlx create-next-app@16.4.3 web \
  --ts --tailwind --eslint --app --src-dir --import-alias "@/*" \
  --no-react-compiler --agents-md \
  --use-pnpm --skip-install --disable-git --no-agent-feedback --yes
cd ..
```

The generator's output is committed as-is. Step 3 customizes it, so its diff shows exactly
what's ours.

Why these flags:

- Every option is passed explicitly. `--yes` fills any option you leave out from saved
  preferences in `~/Library/Preferences/create-next-app-nodejs/config.json`, which would
  make the output depend on the machine.
- `--skip-install`: dependencies are installed once, from the workspace root (step 6).
- `--disable-git`: the repo already exists.
- `--no-agent-feedback`: no feedback prompt.

What 16.4.3 generates that differs from older Next.js:

- `next.config.ts` turns on `cacheComponents` and `partialPrefetching`. Step 8 turns both
  off, because they can't be combined with a static export.
- Tailwind v4 through `@tailwindcss/turbopack`, with no `tailwind.config` file.
- `AGENTS.md` tells coding agents to read `node_modules/next/dist/docs/` before writing
  code. `next dev` re-adds this block if it is removed.
- `apps/web/pnpm-workspace.yaml` holds `allowBuilds` settings. A nested workspace file
  would make `apps/web` its own workspace root, so step 6 moves these settings to the repo
  root.
- `next-env.d.ts` is generated too, but `apps/web/.gitignore` excludes it.

## 3. Adapt the web scaffold

Commit: `chore(web): adapt the scaffold for donna`

```bash
git rm apps/web/public/{file,globe,next,vercel,window}.svg   # boilerplate assets
```

- `src/app/page.tsx`: replaces the boilerplate with a minimal "donna" page. The API call
  comes in step 8.
- `src/app/layout.tsx`: `metadata` becomes `title: "donna"`, `description: "donna web app"`.
- `README.md`: replaces the create-next-app README with a short one for this app.

To verify, copy `apps/web` somewhere else and run `pnpm install && pnpm lint && pnpm build`
there. The workspace doesn't exist until step 6. Expected: ESLint clean, `/` prerendered
as static.

## 4. Scaffold the API (generator output)

Commit: `chore(api): scaffold apps/api with uv init`

```bash
uv init apps/api --app --name api --python 3.14 --vcs none
```

Committed as-is, the same approach as step 2. uv 0.12's `--app` creates a **src-layout,
packaged** project:

- `src/api/__init__.py` with a `main()` stub
- the `uv_build` backend
- `[project.scripts] api = "api:main"`
- `.python-version` set to `3.14`
- an empty `README.md`

`authors` comes from your git config.

## 5. Turn the scaffold into a FastAPI app

Commit: `feat(api): add the FastAPI app with a health endpoint`

```bash
cd apps/api
echo "3.14+gil" > .python-version        # BEFORE the first uv add, see below
uv add "fastapi[standard]==0.162.0"
uv add --dev pytest ruff
cd ../..
```

- **Gotcha: free-threaded Python.** With `.python-version` set to `3.14`, which is what
  `uv init` writes, uv 0.12 picked its managed `cpython-3.14+freethreaded` build ahead of
  Homebrew's standard 3.14.7. The venv then ran with the GIL off. `3.14+gil` forces a
  standard build. On a machine without one, uv downloads one. To check, run
  `uv run python -c "import sys; print(sys._is_gil_enabled())"`, which should print `True`.
- FastAPI is pinned exactly. Dev tools get uv's default `>=` bound, and `uv.lock` pins
  everything that's actually installed.
- `pyproject.toml`: set the description, delete the `[project.scripts]` stub, and add
  `[tool.fastapi] entrypoint = "api.main:app"`. With that, `fastapi dev` and `fastapi run`
  need no path argument. FastAPI CLI reads `[tool.fastapi]` from the current directory's
  `pyproject.toml`.
- `src/api/__init__.py` is emptied (it held the `main()` stub).
- `src/api/main.py`: the app, `GET /health` returning `{"status": "ok"}` and tagged `health`,
  and a `generate_unique_id_function` that produces OpenAPI operation IDs like
  `health-get_health`. Clients generated from the schema later get readable method names
  that don't change, and choosing the scheme now costs nothing. Versioned resources go under
  `/v1`. `/health` stays unversioned.
- `tests/test_health.py` covers the health response, and checks that every
  `fastapi.routing.APIRoute` in `app.routes` has a tag. It filters with
  `isinstance(route, APIRoute)` because FastAPI's own routes (`/openapi.json`, docs) aren't
  `APIRoute`s. An untagged route would get an inconsistent operation ID. It also checks that
  `/health`'s operation ID is `health-get_health`.
- `README.md`: layout, run commands, and uv-only dependency management.

Verify (in `apps/api`): `uv run pytest` (3 passed), `uv run ruff check`,
`uv run ruff format --check`, and `uv run fastapi run` then `curl localhost:8000/health`.

## 6. Wire the pnpm workspace

Commit: `chore(repo): wire the pnpm workspace`

```bash
git rm apps/web/pnpm-workspace.yaml   # its settings move to the root file below
pnpm install                          # one pnpm-lock.yaml at the root; also runs apps/api's uv sync
```

- **pnpm is the single task runner for both languages.** `apps/api` gets a tiny
  `package.json` whose scripts call uv, so the root `pnpm dev`, `lint` and `test` cover
  Python too, without Turborepo, Make or `concurrently`:

  ```json
  {
    "name": "api",
    "private": true,
    "scripts": {
      "postinstall": "uv sync",
      "dev": "uv run fastapi dev",
      "start": "uv run fastapi run",
      "lint": "uv run ruff check && uv run ruff format --check",
      "test": "uv run pytest"
    }
  }
  ```

  `postinstall` means one `pnpm install` also builds the Python venv. Without `lint` and
  `test` here, the root scripts would silently skip the API. The scripts don't hardcode a
  port: `fastapi dev` defaults to 8000, reads `PORT`, and accepts
  `pnpm dev:api --port 8001`. Steps 14 and 26 add the Doppler wrapper and
  `CORS_ALLOW_LOCALHOST=true` to `dev`.

- `pnpm-workspace.yaml`: `packages: [apps/*]`, plus the `allowBuilds` block that
  create-next-app wrote into `apps/web`. In pnpm 11, `true` lets a dependency's install
  script run, `false` blocks it, and an unlisted package is deferred to `pnpm approve-builds`.
  `sharp` and `unrs-resolver` ship prebuilt binaries, so blocking their scripts is fine.
- Root `package.json`: `"name": "donna"`, `"private": true`,
  `"packageManager": "pnpm@11.7.0"`, and scripts:

  | Script    | Command                               |
  | --------- | ------------------------------------- |
  | `dev`     | `pnpm --recursive --parallel dev`     |
  | `dev:web` | `pnpm --filter web dev`               |
  | `dev:api` | `pnpm --filter api dev`               |
  | `build`   | `pnpm --recursive --if-present build` |
  | `lint`    | `pnpm --recursive --if-present lint`  |
  | `test`    | `pnpm --recursive --if-present test`  |

  `--recursive` skips the root package, so `dev` doesn't call itself. `--parallel` runs the
  long-lived dev servers together and prefixes each output line with the app's path.

- Package names stay generic (`web`, `api`), which keeps the rename list short when the
  repo is used as a template.
- pnpm warns `deprecated eslint@9.39.5`. That's the version create-next-app 16.4.3 pins;
  upgrade it along with `eslint-config-next`, not separately.

Verify: `pnpm lint`, `pnpm test` (3 passed), `pnpm build` (`/` prerendered as static), and
`pnpm dev` (API on :8000; web on :3000, or the next free port if 3000 is taken).

## 7. Pin the toolchain

Commit: `chore(repo): pin the toolchain versions`

- Root `package.json`: `"engines": { "node": ">=24" }`, alongside the existing
  `"packageManager": "pnpm@11.7.0"`. pnpm 11 only **warns** on a mismatch
  (`[WARN] Unsupported engine`). `engineStrict` is deliberately left off, because it also
  fails installs when a dependency declares a narrow range (Renovate's CLI wants Node
  `^24.11`). pnpm uses `packageManager` to switch to the pinned pnpm version on its own.
- `apps/api/pyproject.toml`: `[tool.uv] required-version = ">=0.12"`, so an older uv fails
  fast instead of resolving differently. Python itself is already pinned by
  `requires-python` and `.python-version` (`3.14+gil`).
- No version manager (mise, asdf, nvm) yet: one machine, one version of each tool. Add mise
  when several projects need different Node or Python versions.

## 8. Static export with client-side API calls

Commit: `feat(web): ship a static export that calls the API from the browser`

```bash
cd apps/web
pnpm add -D -E serve@14.2.6     # previews the export; `next start` doesn't work with it
cd ../..
```

Why: every client is a thin UI over the API, and the web build must also be wrappable by
desktop shells (Tauri). A static export gives exactly that.

- `next.config.ts`:
  - `output: "export"`.
  - `images: { unoptimized: true }`, because `next/image`'s default loader needs a server.
  - `cacheComponents` and `partialPrefetching` removed. With them on, `next build` fails
    with `Invariant: PPR cannot be enabled in export mode`.
- **Guardrail:** export mode makes `next build` fail on server-only features. We tried this:
  a page calling `cookies()` fails with
  ``couldn't be rendered statically because it used `cookies()` ``.
- `src/lib/api.ts`: `API_URL` (from `NEXT_PUBLIC_API_URL`, default
  `http://localhost:8000`) and `apiFetch()`. It's the only file that knows where the API is,
  so a generated API client can replace it later.
- `src/components/api-status.tsx`: a client component that fetches `/health` in the browser
  and has a **Check again** button.
- `src/components/runtime-info.tsx`: shows the shell (Browser or Tauri) and
  `window.location.origin`, which is what the API's CORS check sees. It uses
  `useSyncExternalStore` so the prerendered HTML and the first client render agree.
- `src/app/page.tsx`: shows the API status, the API URL and the runtime info.
- `package.json`: `start` (`next start`) is replaced by `preview` (`serve out`).
- `README.md`: gains Run, How it works (static export, browser-side data) and Config
  (`NEXT_PUBLIC_API_URL`) sections.
- `.env.example`: `NEXT_PUBLIC_API_URL=http://localhost:8000`. `.gitignore` gets
  `!.env.example`, because create-next-app's `.env*` rule ignores the example file too.
- `NEXT_PUBLIC_*` values are inlined at build time, so each environment and each desktop
  build is its own build. Never put a secret in one.

Verify: `pnpm --filter web lint`, and `pnpm --filter web build` (`/` prerendered as
`○ (Static)`, output in `apps/web/out/`). The browser check needs CORS, so it happens in
step 9.

## 9. API settings and CORS

Commit: `feat(api): add settings and CORS for browser-based clients`

```bash
cd apps/api
uv add "pydantic-settings>=2.16.1"   # already installed by fastapi[standard]; we import it, so declare it
cd ../..
```

- `src/api/settings.py`: a `pydantic-settings` `Settings` class. It reads environment
  variables, with `.env` in the working directory as the fallback.
  - `cors_origins` (comma-separated) defaults to the packaged Tauri origins,
    `tauri://localhost` (macOS/Linux) and `http://tauri.localhost` (Windows).
  - `cors_allow_localhost` allows any `http://localhost` or `127.0.0.1` port, for
    `next dev`, `serve` and `tauri dev`. It's implemented as CORSMiddleware's
    `allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?"`, which Starlette
    full-matches. This step defaulted it to `true`; step 26 changes the default to `false`
    and has the dev script turn it on.
- `src/api/main.py` becomes an app factory, `create_app(settings)`, so tests can build the
  app with different settings. `app = create_app()` keeps `api.main:app` as the entrypoint.
- Only browser-based clients need CORS. Native clients (CLI, MCP server, mobile apps) send
  no `Origin` header, so CORS never applies to them.
- Prototype finding: `tauri dev` without a `devUrl` serves the export from its own server at
  `http://127.0.0.1:1430` (or the next free port). Only a packaged app uses
  `tauri://localhost`. That's why localhost is allowed on any port during development.
- `.env.example` documents both variables, commented out, since the defaults suit
  development.
- `tests/test_cors.py`: defaults allow the Tauri origins and any localhost port, reject other
  origins, and production-style settings allow only the listed origins.

Verify steps 8 and 9 together:

```bash
pnpm test                                  # 6 passed
pnpm build                                 # static export in apps/web/out/
pnpm dev:api                               # terminal 1
pnpm --filter web preview -l 3600          # terminal 2 (no "--": pnpm 11 passes it through literally)
```

Opening http://localhost:3600 showed **API status: ok** and
**Running in: Browser · origin http://localhost:3600** in a real browser.

## 10. Errors as RFC 9457 problem details

Commit: `feat(api): return errors as RFC 9457 problem details`

Why now: the error format is part of the API contract, and every client (web, CLI, MCP,
mobile) will write error handling against it. Changing it later breaks all of them.

- `src/api/problems.py`, about 50 lines and no new dependency. `fastapi-problem` (0.12, pre-1.0)
  was considered, but for this little code the extra dependency isn't worth it.
  - Every error becomes `application/problem+json` with `type` (`about:blank`), `title`
    (the HTTP reason phrase) and `status`. `detail` is added when it says more than the
    title.
  - `HTTPException` keeps its status and headers.
  - Validation errors return 422 with an `errors` list (FastAPI's usual error details).
  - Unhandled exceptions return a generic 500. The server still logs the exception, but the
    client never sees its message.
- Public names that later steps and tests use:
  - `PROBLEM_JSON` (the media type)
  - `problem(status, detail=None, headers=None, **extensions) -> JSONResponse`, where the
    keyword arguments become extension members
  - `add_problem_handlers(app)`, which `create_app()` calls
- `tests/test_problems.py` adds test-only routes to a fresh app and checks 404, 422 and 500.
  The 500 test confirms the exception message doesn't leak.
- Known gap: the generated OpenAPI schema still describes FastAPI's default 422 body. Fix
  it when the first real endpoint lands.

## 11. Request IDs

Commit: `feat(api): tag every request with an X-Request-ID`

```bash
cd apps/api && uv add "asgi-correlation-id>=5.0.1" && cd ../..
```

- `CorrelationIdMiddleware` is the outermost middleware. Every response carries
  `X-Request-ID`. An incoming valid UUID4 is reused; otherwise a new one is generated.
- CORS exposes `X-Request-ID` (`expose_headers`), so browser clients can read it.
- Problem bodies include `request_id`: `problem()` reads
  `asgi_correlation_id.correlation_id.get()`. At this step a 500 response was sent by
  Starlette's outermost error middleware and so lacked the `X-Request-ID` header. Step 25
  fixes that.
- `tests/test_request_id.py` checks the header is generated, a valid incoming ID is reused,
  problem bodies carry the ID and CORS exposes the header.
- `tests/test_problems.py` must change too. The 404 test now compares only `type`, `title`
  and `status`, because bodies gain `request_id`. The 500 test also asserts
  `response.json()["request_id"]`.
- Logging integration (`CorrelationIdFilter`) waits until the API gets a logging config.

## 12. Scalar API reference at /docs

Commit: `feat(api): serve a Scalar API reference at /docs`

```bash
cd apps/api && uv add "scalar-fastapi>=1.9.1" && cd ../..
```

The API is a product surface ("For Humans: API"), so it gets one polished, interactive
reference.

- `FastAPI(docs_url=None, redoc_url=None)`, plus a `/docs` route (`include_in_schema=False`)
  that returns `get_scalar_api_reference(...)` for `/openapi.json`. `/openapi.json` itself is
  unchanged. It's the contract every client and generator reads.
- **Defaults overridden:**
  - `telemetry=False` (scalar-fastapi turns it on)
  - `agent=AgentScalarConfig(disabled=True)` (turns off the "Agent Scalar" AI feature)
  - `scalar_js_url="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0"`, because
    the default loads the latest version from jsdelivr. Step 27 pins the exact file and adds
    Subresource Integrity.
- The docs page loads Scalar's JS from the CDN, so viewing it needs internet access.
- Tests: the route-tag check skips routes hidden from the schema. A new test confirms `/docs`
  serves Scalar with telemetry and the agent off, and that `/redoc` is gone.

Verify: `pnpm test` (14 passed). In a browser, http://localhost:8000/docs showed
"donna API" → `health` → **Get Health**.

## 13. Architecture doc and README

Commit: `docs(repo): document the architecture and quickstart`

- `docs/architecture.md`: the one-backend, many-clients picture, the product surfaces
  ("For AI agents: Skill, MCP" / "For humans: CLI, API"), API conventions (versioning,
  operation IDs, problem details, request IDs, CORS, the auth plan), the web app's static
  export, the data and secrets plans, and a status table. Update the table as milestones
  land.
- `README.md`: app table, prerequisites, quickstart and root scripts.
- `CLAUDE.md`: points to the architecture doc and adds rules for working in each app.

## 14. Doppler for secrets, with a `.env` fallback

Commit: `chore(repo): load secrets from Doppler with a .env fallback`

Why: real secrets (cloud database URLs, later API keys) need one home that isn't a file in
the repo. Doppler injects them as environment variables. The template must still work for
someone without Doppler access.

- `doppler.yaml` (committed, names only): `doppler setup --no-interactive` from the repo
  root binds `apps/api` to project `donna-api` and `apps/web` to `donna-web`, both on config
  `dev`. It's one project per app: Doppler's environments (dev/stg/prd) model deploy stages,
  not apps, and separate projects keep trust boundaries apart as apps are added.
- `scripts/with-doppler.sh`: if `doppler` is installed **and**
  `doppler configure get project` is set for the current directory, it runs
  `doppler run -- <cmd>`. Otherwise it runs `<cmd>` unchanged, and pydantic-settings and
  Next.js read `.env` files instead. The project check is local, with no network call.
- The wrapper is applied per app, not to the root `pnpm dev`:
  - `apps/api`: `dev` and `start`
  - `apps/web`: `dev` and `build` (because `NEXT_PUBLIC_*` values are inlined at build time)
  - lint and test scripts stay unwrapped, since they need no secrets
- **Personal workplace only.** This Mac's Doppler CLI was logged in to an employer
  workplace at the default scope (`/`). Use a scoped login so it never applies to personal
  repos:

  ```bash
  doppler login --scope ~/Private --yes   # --yes: open the browser without a prompt
  doppler me                              # from inside the repo: must show the personal workplace
  ```

  Doppler picks the most specific matching scope for the current directory.

- Values that differ between local dev and the cloud follow one rule. Safe local defaults
  live in committed `.env.example` files and in code defaults. Cloud credentials live only
  in Doppler.

Verified: the fallback runs the command unchanged both with no Doppler setup and with
`doppler` off `PATH`, and `pnpm --filter web build` still works through the wrapper. The
Doppler path is verified once the personal workplace and projects exist.

## 15. Supabase CLI and project scaffold (generator output)

Commit: `chore(db): add the Supabase CLI and scaffold supabase/`

```bash
pnpm add -D -E -w supabase@2.122.0   # pinned at the root, so every machine runs the same CLI
pnpm exec supabase init              # writes supabase/config.toml and supabase/.gitignore
```

- The CLI is a root devDependency (Supabase's recommended install), not a Homebrew copy that
  differs per machine. Since 2.12x the npm package ships its binary through per-platform
  optional dependencies (`@supabase/cli-darwin-arm64`, ...) and has no install script, so
  it needs no `allowBuilds` entry.
- `supabase/` lives at the repo root. The database belongs to the whole backend, and the
  CLI finds `supabase/` by searching upward, so no `--workdir` is needed.
- `supabase init` output is committed as-is: `project_id = "donna"` (the folder name), local
  ports 54321–54329, Postgres 17, and a `.gitignore` covering `.branches`, `.temp` and
  dotenvx files. Step 16 customizes it.

## 16. Baseline migration and lock-down

Commit: `feat(db): add the app schema, the donna_api role and lock-down`

```bash
open -a Docker                    # the local stack runs in Docker
pnpm db:migration baseline        # supabase migration new → supabase/migrations/<ts>_baseline.sql
pnpm db:start                     # first run pulls images; applies migrations, then seed.sql
```

- Root scripts: `db:start`, `db:stop`, `db:status`, `db:reset` (re-applies migrations and
  the seed) and `db:migration <name>`.
- `supabase/config.toml` customizations (marked `# donna:`):
  - `[api] enabled = false`: no PostgREST locally, matching the cloud project where the Data
    API is turned off.
  - `auto_expose_new_tables = false`: explicit grants only.
  - Off because donna doesn't use them: realtime, storage, edge runtime, analytics (the
    heaviest container).
  - Still on: auth, local email (Mailpit) and Studio. Supabase Auth comes later.
- `supabase/migrations/<ts>_baseline.sql`:
  - schema `app` for donna's tables, never listed in `api.schemas`
  - login role `donna_api` with no superuser, createdb, createrole or bypassrls, and no
    password in the migration
  - `donna_api` gets usage on `app`, plus default privileges for select, insert, update and
    delete on tables, usage and select on sequences, and execute on functions created there
    by migrations
  - `public`, `anon` and `authenticated` get nothing on `app`, and default privileges in
    `public` are revoked from `anon` and `authenticated`
- **No RLS.** The research suggested RLS with no policies as an extra layer, but that would
  block `donna_api` itself: it's a non-owner role, and RLS with no policies denies everyone
  except the owner. The real layers are a disabled Data API, an unexposed schema, and no
  grants to `anon` or `authenticated`.
- `supabase/seed.sql` (local only; `db push` never runs it) sets `donna_api`'s local password
  to `donna_api`. In the cloud, the owner sets the password in the SQL editor and stores it
  only in Doppler.

Verified against the local stack with psql:

- `donna_api` logs in and has none of the elevated attributes.
- A table created by `postgres` in `app` grants donna_api select, insert, update and delete,
  and grants anon and authenticated nothing.
- `donna_api` gets "permission denied" creating tables in `app` or `public` and reading
  `auth`.
- No PostgREST container runs.
- `pnpm db:reset` replays cleanly, and `supabase db lint --local` reports no schema errors.

## 17. Connect the API to Postgres

Commit: `feat(api): connect to Postgres and report it in /health`

```bash
cd apps/api && uv add "sqlalchemy[asyncio]>=2.1.6" "asyncpg>=0.32.0" && cd ../..
```

- Driver and ORM: SQLAlchemy 2.1 async on asyncpg, the most common pairing in Supabase's
  and FastAPI's docs, with cp314 wheels for macOS arm64. Plain SQLAlchemy, not SQLModel.
  Typed `Mapped[...]` models arrive with the first real table and mirror its SQL migration.
  **Not Drizzle:** it's a TypeScript ORM and migration tool, and only the Python API touches
  the database. A second ORM plus a second migration system would drift.
- `settings.database_url` defaults to the local stack as `donna_api`:
  `postgresql+asyncpg://donna_api:donna_api@127.0.0.1:54322/postgres`. In production it's the
  **direct** connection (`db.<ref>.supabase.co:5432`, IPv6), because the API is a long-running
  server. Supavisor's transaction pooler (port 6543) is for serverless code, and would need
  prepared statements turned off. The cloud URL lives only in Doppler (`donna-api` → `prd`).
- `src/api/db.py`:
  - `create_engine()` uses `pool_pre_ping`, plus a 2-second connect timeout so `/health`
    stays fast when Postgres is down.
  - `database_ok()` runs `select 1`.
- `create_app()` creates the engine (connections open lazily) and disposes of it in the
  lifespan.
- `/health` returns a typed `Health` model. With the database reachable it's 200
  `{"status":"ok","db":"ok"}`; otherwise 503 `{"status":"degraded","db":"unavailable"}`. Both
  are documented in OpenAPI.
- Tests:
  - `tests/conftest.py` adds a `client` fixture that runs the lifespan and keeps one event
    loop, which pooled asyncpg connections need.
  - The database test **skips** with "start it with `pnpm db:start`" when the stack is down,
    unless `DONNA_REQUIRE_DB=1` (set in CI) makes that a failure.
  - A second health test checks the 503 path against an unreachable URL.
  - The CORS and request-ID tests now hit `/openapi.json`, so they don't need the database.
- ruff formats `except (A, B):` as `except A, B:`. That's valid in Python 3.14 (PEP 758).

Verify:

```bash
pnpm db:start
DONNA_REQUIRE_DB=1 pnpm test       # 15 passed
pnpm dev:api && curl localhost:8000/health   # {"status":"ok","db":"ok"}
```

## 18. Bound the health check with a timeout

Commit: `fix(api): stop /health hanging on an unresponsive database`

Found by testing step 17 in a browser with the database container paused
(`docker pause supabase_db_donna`): `/health` hung for more than 10 seconds. asyncpg's
connect `timeout` only bounds opening a **new** connection. The `pool_pre_ping` on a pooled
connection has no timeout, and a paused Postgres accepts TCP but never answers.

- `database_ok()` wraps the whole check in `asyncio.timeout(2)`. With the database paused,
  `/health` now returns 503 `degraded` in about 4 seconds: the 2-second timeout plus
  SQLAlchemy discarding the stuck connection.
- New test: a socket that accepts connections and never responds stands in for a hung
  database, and `/health` must return 503 within 5 seconds.
- Side note: when a request hangs, `fastapi dev`'s auto-reload waits for it to finish, so
  the server looks frozen until the database comes back.

## 19. Show the database status in the web app

Commit: `feat(web): show when the API is up but its database is not`

- `api-status.tsx` reads the `Health` body on both 200 and 503. It shows **ok**,
  **degraded (database unavailable)**, **error (HTTP n)** or **unreachable**, so "API down"
  and "database down" no longer look the same.

Verified in a browser against the local stack: ok, then **degraded (database unavailable)**
while the database container was paused, then ok again after unpausing.

## 20. Scaffold the CLI (generator output)

Commit: `chore(cli): scaffold apps/cli with uv init`

```bash
uv init apps/cli --app --name donna --python 3.14 --vcs none
```

Committed as-is, like step 4. The project and the command are both named `donna`. One CLI
package hosts three surfaces: the `donna` commands (CLI), the terminal UI, and `donna mcp`
(the MCP server). They share one HTTP client, and like every client they only talk to the
API.

## 21. `donna status`

Commit: `feat(cli): add donna status with JSON output`

```bash
cd apps/cli
echo "3.14+gil" > .python-version          # same free-threading gotcha as the API (step 5)
uv add "typer>=0.27.3" "httpx>=0.28.1"
uv add --dev pytest ruff
cd ../..
```

- `pyproject.toml`: description, `[project.scripts] donna = "donna.cli:app"`, and
  `[tool.uv] required-version = ">=0.12"`. `__init__.py` emptied.
- `src/donna/client.py`: the **one** HTTP client for every terminal surface. `fetch_health()`
  returns a `HealthReport` (`api_url`, `status` of ok, degraded, error or unreachable, and
  `db`). A 503 body counts as "degraded", and anything unexpected counts as "error".
- `src/donna/cli.py`: a Typer app.
  - The global `--api-url` option is resolved flag, then `DONNA_API_URL`, then the default.
  - `donna status` prints text by default and JSON with `--json`, and exits `0` only when
    healthy.
  - These conventions follow clig.dev, so scripts and AI agents can rely on them.
- Bare `donna` prints help for now. Step 22 opens the TUI instead when run in a terminal.
- `package.json` shim (`cli`): `postinstall: uv sync`, plus lint and test. There's no `dev`
  script, so `pnpm dev` doesn't start it.
- Root script `donna` (`uv run --project apps/cli donna`), so `pnpm donna status` works from
  the root.
- Tests: `test_client.py` uses `httpx.MockTransport` with no network to cover ok,
  degraded, error and unreachable. `test_status.py` uses Typer's `CliRunner` to cover
  output, exit codes, `--json`, and flag-over-env precedence. Async tests use anyio's pytest
  plugin, which comes with httpx.

Verify: `pnpm --filter cli test` (8 passed). Against the running API:

- `pnpm donna status` printed `API status: ok (database ok) · http://localhost:8000` and
  exited 0.
- `--api-url http://localhost:8999` printed `unreachable` and exited 1.

## 22. Terminal UI

Commit: `feat(cli): add the Textual terminal UI`

```bash
cd apps/cli && uv add "textual>=8.2.8" && cd ../..
```

- `src/donna/tui.py`: `DonnaApp` shows the same card as the web page, in the same order:
  title, **API status** (green ok, yellow degraded, red otherwise), the API URL, "Running in:
  Terminal", and a compact **Check again** button. `r` re-checks and `q` quits. It uses
  `donna.client`, just like `donna status`.
- A terminal can't render the web app's HTML, so the TUI is a second UI over the same API.
  It's kept visually close on purpose (no heavy border or full-width button) and holds no
  logic of its own.
- `cli.py`: bare `donna` opens the TUI only when stdin and stdout are a terminal, and prints
  help otherwise (scripts, pipes, agent shells). `donna tui` opens it explicitly. Textual is
  imported only when the UI runs.
- `tests/test_tui.py` drives the app headlessly with `run_test()`: the first check, `r`,
  then a click on **Check again**, each with a faked fetch. `tests/conftest.py` holds the
  shared `anyio_backend` fixture.

Verify: `pnpm --filter cli test` (9 passed). A headless screenshot against the live API
showed the card centered, with **API status: ok**.

## 23. MCP server

Commit: `feat(mcp): add donna mcp, a stdio MCP server`

```bash
cd apps/cli && uv add "fastmcp>=4.1.3" "mcp>=2.3.0" && cd ../..
```

- `src/donna/mcp_server.py`: `build_server(api_url)` returns a FastMCP 4 server with
  instructions and one **hand-written, task-oriented** tool, `get_status`. It's annotated
  `read_only_hint`, `open_world_hint=False`, and returns the same `HealthReport` as
  `donna status`.
  - Tools aren't auto-generated one-per-endpoint (`from_openapi`). Real MCP servers
    (Linear, Sentry, GitHub, Supabase) and the MCP guidance all favor task-shaped tools.
  - `mcp` is declared directly because the code imports `mcp.types.ToolAnnotations`.
    MCP SDK v2 renamed the hint fields to snake_case.
- `donna mcp` runs it over **stdio** with `show_banner=False`, because stdout carries the
  protocol. There's no auth: a stdio server inherits the user's local trust.
  - The remote Streamable HTTP endpoint (`/mcp` mounted in FastAPI, with OAuth 2.1 or bearer
    tokens) waits until the API has real auth and resources. HTTP+SSE is deprecated and won't
    be built.
  - Target spec: MCP 2025-11-25.
- The `Fetch` type moved to `donna.client`, so importing the MCP server doesn't load
  Textual.
- `.mcp.json` registers `donna` for Claude Code sessions opened in this repo
  (`uv run --project apps/cli donna mcp`). Claude Code asks before starting it.
- `tests/test_mcp.py` uses FastMCP's in-memory `Client` to call the tool and check the
  annotations.

Verify: `pnpm --filter cli test` (11 passed). End to end, an MCP client spawned
`uv run --project apps/cli donna mcp` over stdio, listed `['get_status']` and got
`{'api_url': 'http://localhost:8000', 'status': 'ok', 'db': 'ok'}` from the live API.

## 24. Agent Skill

Commit: `feat(skill): add the donna Agent Skill`

- `skills/donna/SKILL.md` follows the Agent Skills format (agentskills.io; used by Claude and
  other agents).
  - Frontmatter: `name: donna`, matching the folder, and a `description` saying what it does
    and when to use it.
  - The body is short. It says to run `donna status --json`, explains each field, shows how
    to point at another API, and gives the rules: always pass a subcommand (bare `donna`
    opens the interactive UI), read the JSON, run `--help` rather than invent commands, and
    use the MCP `get_status` as an alternative.
- The skill holds **no logic and no scripts**. Layering: Skill → CLI → API. It lives in
  `skills/` at the root, the product skill donna ships. `.claude/skills/` would be for skills
  that help contributors work on the repo.
- `skills/donna/evals/triggers.md` lists prompts that should and shouldn't load the skill,
  with the expected behavior. Run them by hand after changing the description.
- To use it: copy or symlink `skills/donna` into `~/.claude/skills/` (all projects) or a
  project's `.claude/skills/`. Packaging it as a Claude Code plugin waits until someone
  outside this repo needs it.

Verify:

```bash
uvx --from skills-ref==0.1.1 agentskills validate skills/donna   # "Valid skill"
uv run --project apps/cli donna status --json                    # the documented command
```

The second command printed `{"api_url": "http://localhost:8000", "status": "ok", "db": "ok"}`
and exited 0.

## 25. Keep CORS and request-ID headers on 500s

Commit: `fix(api): keep CORS and request-ID headers on 500 responses`

Found by the review of steps 1–13. FastAPI's `exception_handler(Exception)` runs in
Starlette's outermost `ServerErrorMiddleware`, **outside** everything added with
`add_middleware`. A 500 therefore had no CORS headers, so the browser couldn't read the
problem body, and no `X-Request-ID`.

- `UnhandledErrorMiddleware` (`src/api/problems.py`) is a small pure-ASGI middleware added
  **first**, so it sits innermost. It catches unhandled exceptions, logs them with the
  traceback through the `api` logger, and sends the 500 problem, which then passes out
  through CORS and request IDs. If a response had already started, it re-raises instead.
- `HTTPException` with a structured (non-string) `detail` now keeps it in a `context`
  extension. RFC 9457's `detail` is a string, and it used to be dropped silently.
- New tests:
  - a 500 carries `X-Request-ID` (matching the body) and CORS headers
  - the exception is logged
  - a structured `detail` is kept
  - lookalike origins are rejected (`http://localhost.evil.com`, `http://127.0.0.1.evil.com`,
    `http://localhost:3000.evil.com`, `https://localhost:3000`). This pins Starlette's
    full-match behavior for `allow_origin_regex`.

## 26. Make localhost CORS opt-in

Commit: `fix(api): make localhost CORS opt-in`

Found by the review of steps 1–13. `cors_allow_localhost` defaulted to `true`, so a
deployment that forgot `CORS_ALLOW_LOCALHOST=false` trusted any `http://localhost:<port>`
origin. That fails open.

- `cors_allow_localhost` now defaults to `false`. The packaged Tauri origins stay allowed by
  default.
- `apps/api` `dev` script: `CORS_ALLOW_LOCALHOST=true ../../scripts/with-doppler.sh uv run
fastapi dev`, so `pnpm dev` still serves the web dev server and `tauri dev`. The `start`
  script (production-style) leaves it off.
- `.env.example`, the API README and `docs/architecture.md` describe the new default.
  Boolean values must be `true` or `false`; an empty value fails at startup with a
  validation error.
- Tests: the defaults allow the Tauri origins but not localhost. With
  `cors_allow_localhost=True`, any localhost port is allowed. The tests that send a
  localhost `Origin` opt in explicitly.

Verified live: `pnpm dev:api` reflected `Origin: http://localhost:3000`; `uv run fastapi run`
sent no CORS header for it.

## 27. Subresource Integrity for the docs page

Commit: `fix(api): check the Scalar script with Subresource Integrity`

Found by the review of steps 1–13. The `/docs` page loaded Scalar's JS from jsdelivr with a
pinned version but no integrity check. A tampered CDN file, or a network attacker, could run
script on a page that can send requests to the API.

- `SCALAR_JS_URL` now points at the exact file,
  `https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0/dist/browser/standalone.js`
  (the package URL redirects to it). `SCALAR_JS_SRI` holds its sha384 hash.
- scalar-fastapi has no SRI option, so the `/docs` route adds
  `integrity="…" crossorigin="anonymous"` to the generated `<script>` tag.
- To bump the version, update the URL and recompute the hash:
  `curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A`.
- Self-hosting the 4.9 MB bundle was considered and rejected for now. SRI gives the same
  tamper protection without committing a large vendored file.

Verified in a browser: http://localhost:8000/docs renders with no integrity errors in the
console. Two separate downloads produced the same hash.

## 28. Widen the env-file deny list

Commit: `fix(repo): deny Claude Code reads of more env-file names`

Found by the review of steps 1–13. The deny list in `.claude/settings.json` enumerated
names, and missed common ones: dotenvx's `.env.keys` (which holds decryption keys) and
`.env.vault`, direnv's `.envrc`, `.env.ci`, `.env.preview`, `.env.stage`, `.env.dev` and
`.env.prod`. All are added, each as `Read(**/<name>)` so they match at any depth.

There's no wildcard such as `Read(**/.env*)`, because deny rules beat allow rules and a
wildcard would also block `.env.example`. A new env-file name needs a line here.

Verified with dummy files: `.env.keys`, `.envrc` and `nested/.env.preview` are denied;
`.env.example` is readable. The root `.gitignore` comment now notes that `apps/web`'s
generated `.gitignore` repeats the env rule.

## 29. Make steps 1–13 of this log reproducible

Commit: `docs(repo): make the setup log reproducible from scratch`

A clean-room rebuild that followed steps 1–13 exactly reproduced every command. It also
found places where a reader had to guess, so those steps now include the details: the
deny-rule patterns (step 1), the `APIRoute` filter in the tag test (step 5), the full
`apps/api/package.json` (step 6), the README sections (step 8), the CORS regex (step 9),
`problems.py`'s public names (step 10), the `test_problems.py` change (step 11) and the
exact Scalar URL (step 12). Each earlier entry also points to the later step that changed it.

## 30. Document the product surfaces

Commit: `docs(repo): add the product surfaces guide`

- `docs/surfaces.md` mirrors the docs nav. For AI agents: Skill (install, validate, evals)
  and MCP (tools table, `.mcp.json`, `claude mcp add`, Inspector). For humans: CLI
  (commands, TUI, install, URL precedence, exit codes) and API (`/docs`, `/openapi.json`,
  versioning, errors, request IDs, CORS, the auth plan). It ends with how the four stay in
  step as the API grows: API → shared client → CLI command → MCP tool → Skill → this page.
- `README.md` adds rows for `apps/cli`, `supabase/` and `skills/donna`, Docker as a
  prerequisite, `pnpm db:start` in the quickstart, and the `donna` and `db:*` scripts.
- `docs/architecture.md`'s status table marks the CLI, TUI, MCP server and Skill as done.

## 31. Scaffold the desktop app (generator output)

Commit: `chore(desktop): scaffold apps/desktop with tauri init`

```bash
mkdir -p apps/desktop
printf '{\n  "name": "desktop",\n  "private": true,\n  "scripts": {\n    "tauri": "tauri"\n  }\n}\n' > apps/desktop/package.json
pnpm --filter desktop add -D -E @tauri-apps/cli@2.12.4
cd apps/desktop
pnpm exec tauri init --ci --app-name donna --window-title donna \
  --frontend-dist ../../web/out \
  --before-dev-command "pnpm --filter web build" \
  --before-build-command "pnpm --filter web build"
cd ../..
```

Committed as-is. The desktop app is the web app's static export inside a native window.
Tauri 2 was chosen over Electron: about 30 MB against a 258 MB runtime, and the same
toolchain can later target iOS and Android.

- The flags are chosen to keep later changes small:
  - `--frontend-dist ../../web/out` (relative to `src-tauri/`)
  - both "before" commands build the export, so `tauri dev` and `tauri build` always load
    fresh files
  - no `--dev-url`, so `tauri dev` serves the export itself (from `http://127.0.0.1:1430`)
    instead of pointing at a Next dev server that might be on another port
- `package.json` has only a `tauri` script, not `dev`, so the root `pnpm dev` doesn't
  compile Rust or open a window every time.
- The generated output: `src-tauri/` (`Cargo.toml` with package `app` and author `you`,
  `src/main.rs` and `src/lib.rs` with the log plugin in debug builds, `capabilities/`,
  default icons and a `.gitignore` for `/target/` and `/gen/schemas`) and a
  `tauri.conf.json` with the placeholder identifier `com.tauri.dev` and `csp: null`. Step 32
  fixes the identifier and the names.

## 32. Wrap the web export in the desktop app

Commit: `feat(desktop): wrap the web export in a Tauri window`

- `tauri.conf.json`:
  - identifier `com.gokhulnath.donna`, replacing the placeholder `com.tauri.dev`, which Tauri
    rejects for bundles
  - a 900×600 window
  - a **Content-Security-Policy** replacing `csp: null`: `default-src 'self'`,
    `connect-src 'self' http://localhost:8000 http://127.0.0.1:8000`,
    `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'` and `font-src 'self'`. Tauri
    hashes the export's inline scripts at build time, so `script-src` needs no
    `unsafe-inline`.
  - A production build must add its API origin to `connect-src`, for example with
    `tauri build --config`.
- `Cargo.toml`:
  - package `donna-desktop` (was `app`), lib `donna_desktop_lib` (was `app_lib`)
  - a real description and author
  - `src/main.rs` calls `donna_desktop_lib::run()`
  - `Cargo.lock` is committed, as it should be for an app
- Root scripts: `dev:desktop` (`pnpm --filter desktop tauri dev`) and `build:desktop`
  (`pnpm --filter desktop tauri build`).
- `apps/desktop/README.md`: how to run it, which origins the API sees, the CSP, and
  per-environment builds.

Verified, with `pnpm dev:api` running:

- `pnpm dev:desktop` compiled the shell (347 crates, about 18 s incremental), opened the
  window, and the API logged its `GET /health`. That shows the export's JavaScript ran and
  `connect-src` allowed the call.
- `pnpm --filter desktop tauri build --debug --bundles app` produced `donna.app`. Opened, it
  also called `/health`, and the API returned `access-control-allow-origin: tauri://localhost`.

## 33. Prettier

Commit: `chore(repo): add Prettier for JS, JSON, CSS and Markdown`

```bash
pnpm add -D -E -w prettier@3.9.10
pnpm --filter web add -D -E eslint-config-prettier@10.1.8
```

- One formatter per language: **Prettier** for TS, JS, JSON, CSS, YAML and Markdown, and
  **ruff** for Python. Prettier's defaults (double quotes, semicolons, trailing commas, 80
  columns) already match what create-next-app generates, so `.prettierrc.json` is `{}`.
- `.prettierignore`:
  - Prettier reads only the **root** `.gitignore`, not nested ones, so the apps' build
    output is listed explicitly: `**/.next/`, `**/out/`, `apps/web/next-env.d.ts`,
    `apps/desktop/src-tauri/{target,gen}/`
  - `pnpm-lock.yaml`
  - `apps/web/AGENTS.md`, which `next dev` rewrites
- `apps/web/eslint.config.mjs` adds `eslint-config-prettier/flat` **last**, so ESLint only
  reports code problems and never argues with Prettier about formatting.
- Scripts:
  - root `lint` is now `prettier --check . && pnpm --recursive --if-present lint`
  - new root `format`: `prettier --write . && pnpm --recursive --if-present format`
  - `apps/api` and `apps/cli` gain `format` (`uv run ruff check --fix && uv run ruff format`)

Step 34 applies the formatting as a separate commit, so this one stays readable.

## 34. Apply Prettier

Commit: `style(repo): apply Prettier`

```bash
pnpm exec prettier --write .
```

This changes formatting only, mostly Markdown table alignment, in 8 files. It's a separate
commit so `git blame` and reviews can skip it, and `pnpm lint` now passes the
`prettier --check` step. Since `SKILL.md` was reformatted, the skill was re-validated.

## 35. Type checking

Commit: `chore(repo): type-check the web app with tsc and Python with pyright`

```bash
(cd apps/api && uv add --dev "pyright[nodejs]>=1.1.414")
(cd apps/cli && uv add --dev "pyright[nodejs]>=1.1.414")
```

- Web: `typecheck` runs `next typegen && tsc --noEmit`. `next typegen` writes
  `next-env.d.ts` and the route types, which are gitignored, so a fresh checkout or CI can
  type-check without a full build.
- Python: **pyright** in `standard` mode. The `[nodejs]` extra bundles Node through
  `nodejs-wheel-binaries`, so pyright never downloads anything at run time. Config is
  `[tool.pyright]` in each `pyproject.toml`: `venvPath`/`venv` point at the app's `.venv`,
  and `pythonVersion = "3.14"`. The research weighed mypy and ty; pyright is the most
  complete checker today, and ty isn't yet a safe sole checker.
- Root `typecheck` runs `pnpm --recursive --if-present typecheck`. Each Python app's
  `typecheck` is `uv run pyright`.
- What pyright found, and the fixes:
  - `problem(headers=…)` now takes `Mapping[str, str]`, which is what Starlette's
    `HTTPException.headers` is.
  - The MCP test asserts the tool annotations aren't `None` before reading them.
  - Tests used `Settings(_env_file=None)`. pydantic-settings adds that keyword at runtime,
    so pyright can't see it, and it only skipped the `.env` file, not environment variables.
    `tests/support.py` now defines `IsolatedSettings`, whose only source is the explicit
    arguments. pytest's `pythonpath = ["tests"]` and pyright's `extraPaths = ["tests"]` make
    it importable as `support`.

Verify: `pnpm typecheck` (0 errors in api and cli, web types generated and clean). Running
the API tests with `CORS_ORIGINS=https://evil.example CORS_ALLOW_LOCALHOST=true` still gives
20 passed, so the settings really are isolated.

## 36. Git hooks with Lefthook

Commit: `chore(repo): add Lefthook git hooks`

```bash
pnpm add -D -E -w lefthook@2.2.2
pnpm install        # the root "prepare" script runs `lefthook install`
```

- **Why Lefthook:** one fast hook manager for a polyglot repo. Husky + lint-staged is the
  JavaScript default, but it can't run Python tools cleanly. The pre-commit framework would
  duplicate tool versions that uv and pnpm already pin. For a JavaScript-only project,
  Husky is still the common choice.
- `lefthook.yml`:
  - **pre-commit** (parallel, staged files only):
    - `prettier --write --ignore-unknown`, with `stage_fixed`
    - `eslint` (check only) on `apps/web/` files
    - `ruff check --fix` + `ruff format` on `*.py`, with `stage_fixed`
    - only Prettier and ruff write files, and never the same file types, so parallel runs
      can't collide
  - **commit-msg**: `scripts/check-commit-msg.sh`
- `scripts/check-commit-msg.sh` enforces `type(scope): subject`:
  - types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
    `ci`, `revert`
  - an optional lowercase scope and an optional `!`, with at most 72 characters
  - `Merge`, `Revert`, `fixup!` and `squash!` subjects pass
- **pnpm 11 gotcha:** an unlisted dependency install script is an **error**
  (`ERR_PNPM_IGNORED_BUILDS`), and pnpm then writes the placeholder
  `lefthook: set this to true or false` into `pnpm-workspace.yaml`. The value is set to
  `false`, because hooks are installed by the root `prepare` script rather than
  lefthook's postinstall.

Verify:

- `pnpm exec lefthook validate` printed "All good".
- The message check passes `feat(api): …`, `fix: …`, `chore(repo)!: …` and merges, and
  rejects `updated stuff`, uppercase scopes and subjects over 72 characters.
- This commit ran both hooks.

## 37. VS Code workspace settings

Commit: `chore(repo): add VS Code workspace settings`

- `.vscode/extensions.json`: ESLint, Prettier, Tailwind CSS, Python (it includes Pylance,
  which uses the same engine as pyright), Ruff, rust-analyzer and the Tauri extension.
- `.vscode/settings.json`:
  - format on save, with Prettier by default, Ruff for Python (including fix-all and
    organize-imports on save) and rust-analyzer for Rust
  - the default interpreter is `apps/api/.venv`; for CLI work, pick `apps/cli/.venv` with
    "Python: Select Interpreter"
  - ESLint scoped to `apps/web`, and build output hidden from the file tree
- `.vscode/launch.json`:
  - **API (FastAPI)**: debugpy runs `uvicorn api.main:app --port 8000` in `apps/api` with
    the app's venv and `CORS_ALLOW_LOCALHOST=true`. It uses uvicorn without reload, so
    breakpoints hold.
  - **Web**: runs `pnpm dev:web` in a debug terminal.
  - **API + Web**: launches both.
- The root `.gitignore` (step 1) already un-ignores exactly these three files, and nothing
  else under `.vscode/`.

Verify: all three files are valid JSON, and the API launch command
(`CORS_ALLOW_LOCALHOST=true .venv/bin/python -m uvicorn api.main:app`) served `/health`.

## 38. Continuous integration

Commit: `ci: lint, type-check, build and test on every push and PR`

`.github/workflows/ci.yml` is one job on `ubuntu-24.04` that runs on pushes to `main` and on
pull requests:

1. `actions/checkout@v7`, then `pnpm/action-setup@v6` (pnpm version from
   `packageManager`), `actions/setup-node@v7` (Node 26, pnpm cache) and
   `astral-sh/setup-uv@v10` (uv cache)
2. `uv lock --check` for `apps/api` and `apps/cli`: a stale `uv.lock` fails instead of being
   rewritten by `uv sync`
3. `pnpm install --frozen-lockfile`, whose postinstalls `uv sync` the Python apps
4. `supabase db start`: Postgres only, without the rest of the stack. From scratch it
   initializes the schema and applies the migrations and `seed.sql`, so `donna_api` can log
   in.
5. `pnpm lint`, `pnpm typecheck`, `pnpm build`, then `pnpm test` with `DONNA_REQUIRE_DB=1`,
   so database tests fail rather than skip
6. `supabase db lint --local --fail-on warning`

Settings: `permissions: contents: read`, a concurrency group that cancels superseded runs,
and a 20-minute timeout.

- Deliberately left out for now:
  - path filters (the whole run takes a few minutes)
  - the Rust/Tauri build, which is slow and covered by `pnpm dev:desktop` locally (add
    `cargo check` when the desktop shell gains Rust code)
  - pushing migrations to the cloud project, which needs the Supabase secrets from the
    Doppler setup
- Action versions are the latest majors as of 2026-10-25. Renovate (step 39) keeps them
  current.

Verify: every step passed in a local dry run (31 tests against the fresh database). The
first GitHub run happens on the milestone push.

## 39. Dependency updates with Renovate

Commit: `chore(repo): add Renovate config`

- `renovate.json`:
  - `config:recommended`, with updates scheduled for Monday before 6am
  - lock-file maintenance on
  - one grouped PR for minor and patch updates of stable (1.0 and later) dependencies
  - `next` and `eslint-config-next` grouped together
  - Renovate detects the Conventional Commits history and titles its commits `chore(deps): …`,
    which pass the commit-msg hook
- Renovate over Dependabot: Renovate supports `uv.lock` (pep621 manager) as well as pnpm,
  Cargo and GitHub Actions in one config.
- Not covered: the Scalar script URL and its SRI hash in `apps/api/src/api/main.py`. They
  aren't a package manifest, so bump them by hand (see step 27).
- **Owner action:** install the Renovate GitHub App on `Gokhulnath/donna`. Until then the
  config does nothing.

Verify: `npx --yes --package renovate@44.181.10 renovate-config-validator`, run from the repo
root, printed "Config validated successfully". Renovate's engines field asks for Node
`^24.11`, so npm warns on Node 26 but the validator runs.

## 40. Pin setup-uv to an exact release

Commit: `fix(ci): pin astral-sh/setup-uv to an exact release`

The first CI run failed at "Set up job" with
`Unable to resolve action astral-sh/setup-uv@v10, unable to find version v10`. setup-uv
publishes only exact release tags, not a moving major tag. The other three actions do
publish major tags (checked with `gh api repos/<owner>/<repo>/git/ref/tags/<tag>`). The
workflow now uses `astral-sh/setup-uv@v10.3.2`, and Renovate bumps it.

## 41. Make the Python pin work on any machine

Commit: `fix(repo): install the GIL Python build before syncing`

The second CI run failed with
`No interpreter found for Python 3.14+gil in managed installations or search path`.

- uv (0.12.2 and 0.13.5 alike) lets a plain `3.14` request match its own **free-threaded**
  build. `3.14+gil` excludes that, but it only matches interpreters that are **already
  installed**, never a download (`uv python list 3.14+gil --only-downloads` is empty). On
  this Mac it had found Homebrew's 3.14. A CI runner, or anyone without a system 3.14, has
  nothing to match.
- `uv python install 3.14` downloads the standard (GIL) build, even when the free-threaded
  one is installed, and then `3.14+gil` resolves to it. So:
  - `apps/api` and `apps/cli` `postinstall`: `uv python install 3.14 --quiet && uv sync`. It
    does nothing once installed, and `pnpm install` now works on a machine with no Python.
  - CI runs `uv python install 3.14` before `uv lock --check`.
- Verified by simulating a fresh machine (`UV_PYTHON_INSTALL_DIR` set to an empty folder and
  `UV_PYTHON_PREFERENCE=only-managed`): `uv python install 3.14 && uv sync` gave
  `3.14.7 GIL enabled: True`.

## 42. Template guide and rename script

Commit: `docs(repo): add the template guide and rename script`

`scripts/rename-project.sh` was committed by mistake in step 41's commit (`27f921c`),
because that commit used `git add -A`. Rewriting pushed history would need a force-push,
so it stays there and this step documents it. Later commits stage explicit paths.

- `scripts/rename-project.sh <name>`:
  - reads the current name from `package.json`
  - moves `apps/cli/src/<name>` and `skills/<name>`
  - replaces the three forms (`donna`, `Donna`, `DONNA`) in every tracked text file,
    lockfiles included, except the history docs (`setup-log.md`, `template.md`)
  - runs Prettier on the changed files when it's installed, because a name of a different
    length misaligns Markdown tables
  - appends a provenance note to the new project's log
  - accepts only a single lowercase word, because the name becomes a Python package, a
    Postgres role, a Cargo crate and a command
- `docs/template.md`:
  - what you get
  - path A: clone `template-v1`, rename, `pnpm install`, `pnpm format`, then verify
  - the owner-specific values the script can't know: bundle identifier, authors, icons,
    GitHub, Doppler, Supabase, Renovate
  - path B: rebuild from this log with newer versions, re-checking the listed gotchas
  - freezing new snapshots, and the deliberately-left-out items with their triggers
- `README.md` links the guide.

Verified on a fresh clone with new history: `scripts/rename-project.sh acme`, then
`pnpm install && pnpm format`, gave

- a clean `pnpm lint`
- 0 type errors
- a static build
- 11 CLI tests passed, and 19 API tests passed with 1 skipped (no `acme` database running)
- the renamed CLI answering as `acme`
- `donna` left only in the two history docs

Bad names (`my-app`, `My-App`, the current name, an empty string) exit with code 2.

## 43. Bring CLAUDE.md and the status up to date

Commit: `docs(repo): update CLAUDE.md and status for the new tooling`

- `CLAUDE.md`:
  - lists `typecheck` and `format`, and says to run lint, typecheck and test (with the
    database up) before calling work done
  - explains the `3.14+gil` pin and why each postinstall runs `uv python install 3.14`
  - names the formatters, type checkers and hooks
  - says to stage explicit paths
- `docs/architecture.md`'s status table adds the quality tooling and the template as done.

## 44. Doppler: one project, dev and prd

Commit: `chore(repo): use one Doppler project with dev and prd configs`

The owner created a personal Doppler workplace (**Donna**) with a project named `donna`.
Decision: **one project for every app**, simpler for a solo developer than the per-app
projects step 14 assumed.

- **dev**: local development
- **prd**: production, what `main` deploys
- **stg**: left empty until a staging deploy is needed

```bash
doppler login --scope ~/Private --yes      # owner, once: personal workplace for ~/Private
doppler me                                  # from the repo: workplace "Donna", not the employer
doppler setup --no-interactive              # binds apps/api and apps/web to donna/dev
doppler secrets set --project donna --config dev CORS_ALLOW_LOCALHOST=true \
  DATABASE_URL='postgresql+asyncpg://donna_api:donna_api@127.0.0.1:54322/postgres' \
  NEXT_PUBLIC_API_URL='http://localhost:8000' SUPABASE_URL='http://127.0.0.1:54321'
doppler secrets set --project donna --config prd CORS_ALLOW_LOCALHOST=false \
  CORS_ORIGINS='tauri://localhost,http://tauri.localhost' \
  SUPABASE_URL='https://<project-ref>.supabase.co'
```

- Only values that aren't secret were set this way. The local stack's `donna_api`
  password is the well-known local default. The owner sets the real secrets (`prd`
  `DATABASE_URL`, and later the Supabase keys) in the dashboard or with
  `doppler secrets set` in their own terminal.
- `doppler.yaml` now points both folders at `donna/dev`. The docs and the rename script say
  "the Doppler project", not per-app projects.
- `docs/architecture.md` has a table of which key holds what in `dev` and `prd`.

Verified:

- Scopes: `~/Private` and `~/Private/donna` resolve to Donna; folders outside the scope,
  such as `/tmp`, still resolve to the default login's workplace.
- In `apps/api`, `scripts/with-doppler.sh` injects `DOPPLER_CONFIG=dev`,
  `CORS_ALLOW_LOCALHOST=true` and so on. `doppler run --config prd` gives the prd values.
  The unbound `apps/cli` falls back to a plain run.
- `pnpm dev:api` now runs as `doppler run -- uv run fastapi dev` and served
  `{"status":"ok","db":"ok"}`.
- `pnpm --filter web build` built through Doppler with `NEXT_PUBLIC_API_URL` inlined.

## 45. Cloud Supabase: link, lock down, migrate, connect

Commit: `docs(db): record the cloud Supabase setup`

These were operational steps against the cloud project (`<project-ref>`, us-east-1),
run after the owner's `supabase login`. Only this log entry is committed.

```bash
pnpm exec supabase link --project-ref <project-ref>    # no DB password needed
```

**Data API off.** `config push` sends all of `config.toml`, and the CLI fills undeclared
sections with its defaults. Pushing everything would have copied local-only auth settings
to production (`site_url` set to localhost, email confirmations off, MFA off). The fix is to
answer its per-resource prompts and accept **only** the API one:

```bash
pnpm exec supabase config diff                              # 14 differences; only api.enabled is wanted
printf 'y\nn\nn\n' | pnpm exec supabase config push         # prompt order: api, auth, storage
pnpm exec supabase config diff                              # api.enabled no longer differs
```

**Migration.** The CLI's temporary login role (created through the access token) means
neither command needs the `postgres` password:

```bash
pnpm exec supabase db push --linked --dry-run               # would apply 20261026053045_baseline.sql
pnpm exec supabase db push --linked --yes
```

Cloud checks with `supabase db query --linked`:

- `donna_api` can log in, with no superuser, createrole, createdb or bypassrls
- schema `app` exists
- `anon` and `authenticated` have no `USAGE` on `app`, and `donna_api` does
- the migration is recorded in `supabase_migrations.schema_migrations`

**The `donna_api` password** never appears anywhere outside Doppler:

1. Generate it straight into Doppler:
   `doppler secrets set --config prd DONNA_API_DB_PASSWORD="$(openssl rand -hex 24)"`
   (48 hex characters; output discarded).
2. Inside `doppler run --config prd`, a script computes a **SCRAM-SHA-256 verifier** and
   writes `alter role donna_api with password '<verifier>'` to a temp file with mode 0600.
   That runs with `supabase db query --linked -f`, and the file is deleted. Postgres accepts
   pre-hashed verifiers, so the plaintext never reaches the server or its statement logs.
3. Set `DATABASE_URL` in `prd` as a Doppler reference:
   `postgresql+asyncpg://donna_api:${DONNA_API_DB_PASSWORD}@db.<project-ref>.supabase.co:5432/postgres`.
   It's the direct connection, IPv6-only, which this Mac reaches.

Verified: under `doppler run --config prd`, asyncpg connected as `donna_api` (about 0.7 s,
`select 1` in about 170 ms), could see `app`, and couldn't create anything in it.

Nothing in the repo or Doppler needs the `postgres` password, because the CLI uses its
temporary login role.

## 46. Give /health enough time for a remote database

Commit: `fix(api): give /health enough time for a remote database`

Found while verifying step 45. Under `prd` the API's first `/health` reported the cloud
database as unavailable, even though a direct connection worked. A cold check (asyncpg
connect, plus SQLAlchemy's setup queries on first use, plus the pre-ping) took **2.15 s**
to us-east-1. The 2-second budget from step 18 only fits a local database. Warm checks take
about 0.5–0.7 s.

- `Settings.db_health_timeout` (env `DB_HEALTH_TIMEOUT`, default `5.0`) replaces the
  `HEALTH_CHECK_TIMEOUT` constant. It bounds both the asyncpg connect and the whole check.
- The lifespan warms the pool at startup with the same check, so the first request doesn't
  pay for the cold connection. If the database is down, it logs a warning and the API
  still starts; `/health` reports `degraded`.
- Tests set `db_health_timeout=1`, so the unreachable and silent-server cases stay fast. The
  hang test allows up to 4 s, covering the startup warm-up plus the request.

Verified: a fresh `doppler run --config prd -- uv run fastapi run --port 8014` answered its
first `/health` with `{"status":"ok","db":"ok"}` in 0.62 s. `DONNA_REQUIRE_DB=1 pnpm test`
gives 20 passed.

## 47. Run the ruff hook from each app's folder

Commit: `fix(repo): run the ruff pre-commit hook inside each Python app`

Found while committing step 46. The pre-commit hook ran
`uv run --project apps/api ruff … {staged_files}` from the repo root. From there ruff's
import sorter can't tell that `api` (or `donna`) is the app's own package, so it moved
`from api.main import …` into the third-party block, and `uv run ruff check` inside
`apps/api` then failed. `lefthook.yml` now has two jobs, `ruff-api` (`root: apps/api/`) and
`ruff-cli` (`root: apps/cli/`), which run ruff inside each app with paths relative to it.

Verified: `lefthook run pre-commit --file apps/api/tests/test_health.py` leaves the file
unchanged, and ruff in `apps/api` stays clean. The amended step-46 commit got the imports
sorted from inside the app.

## 48. PR-per-feature workflow and a protected main

Commit: `chore(repo): protect main and document the PR workflow`

From here on, every change reaches `main` through a PR (owner's decision, 2026-10-26).

```bash
gh api -X PATCH repos/Gokhulnath/donna -F allow_merge_commit=false \
  -F allow_squash_merge=false -F allow_rebase_merge=true -F delete_branch_on_merge=false
gh api -X POST repos/Gokhulnath/donna/rulesets --input .github/rulesets/main.json
gh api repos/Gokhulnath/donna/rules/branches/main          # check what's enforced
```

- **Rebase merges only.** Every commit already passes the Conventional Commits hook, so
  each one lands on `main` as-is, history stays linear, and release-please (next step) gets
  one entry per real change. Squash would lose the "generator output, then customize"
  commits, and merge commits add noise.
- **Branches are kept** after merging, by the owner's preference.
- **`.github/rulesets/main.json`**, the ruleset on the default branch:
  - required: deletion protection, no force-pushes and linear history
  - required: a PR, with 0 approvals (GitHub never lets authors approve their own PRs, so
    any number above 0 would deadlock a solo repo) and rebase as the only merge method
  - required: the status check `Lint, type-check, build and test` from GitHub Actions
    (integration 15368)
  - the bypass is repository admins in `pull_request` mode, so the owner can merge release
    PRs (whose CI doesn't run, see the next step) but can't push to `main` directly
  - GitHub reports `current_user_can_bypass: pull_requests_only`
  - rulesets on private repos need GitHub Pro, and creating this one succeeded
- **CI secret:** a read-only Doppler service token for `donna/prd`, piped straight into
  GitHub so it's never printed:
  `doppler configs tokens create github-actions-release --project donna --config prd --access read --plain | gh secret set DOPPLER_TOKEN_PRD --repo Gokhulnath/donna`.
- `.github/pull_request_template.md` has What, Why, Verified and Setup log sections.
- `CLAUDE.md` gains a "Branches and PRs" section, and `docs/template.md` lists the settings,
  ruleset and secret commands for new projects.

## 49–55. Fixes from the pre-template review

Commit: `docs(repo): fix the pre-template review findings in the docs`

An independent review of steps 14–43, with every finding re-checked by a skeptic, found
16 real issues before `template-v1` was tagged. The fixes are separate commits in one PR,
listed below. Their log entries arrived in this final docs commit rather than in each
commit, which bends the same-commit rule in `CLAUDE.md`.

- **49, `fix(repo): block shell reads of env files in Claude Code`.** The deny list covered
  only the Read tool. `.claude/hooks/block-env-reads.py`, a PreToolUse hook on Bash (wired in
  `.claude/settings.json`), blocks commands that **read** a real env file: `cat`, `grep`,
  `source`, `cp`, redirects and the like.
  - Allowed: `.env.example`; commands that don't read (`ls`, `rm`, `git check-ignore`); and
    heredoc bodies that merely mention env files.
  - 23 cases were tested, plus a live test in which Claude Code refused `cat` on a dummy
    `.env.local`.
  - It's a guardrail, not a sandbox.
- **50, `fix(repo): refuse Doppler secrets from the wrong workplace`.** The workplace slug
  `aa5ccdcacc63d357b501` is committed in `.doppler-workplace`. `with-doppler.sh` compares it
  with `doppler me --json`, then:
  - matching login: injects secrets
  - employer login: exits 1 before running anything, and says how to fix it
  - no Doppler: runs plainly
- **51, `ci: pin GitHub Actions to commit SHAs`.**
  - checkout `v7.0.1`, setup-node `v7.1.0`, pnpm/action-setup `v6.1.0` and setup-uv
    `v10.3.2` are each pinned by SHA, with the version in a comment
  - pnpm's moving `v6` tag pointed at a different commit than `v6.1.0`, so the exact release
    commit is used
  - Renovate extends `helpers:pinGitHubActionDigests`
- **52, `fix(repo): rename whole tokens only and require staged files`.**
  - The old name must not touch other letters or digits. `_`, `-`, `.` and `/` are
    boundaries, so `donna_api`, `DonnaApp` and `DONNA_API_URL` are renamed, while
    `Madonna`, `DONNAGLOBALCORP` and `donnas` are kept.
  - In a fresh `git init` with nothing staged, the script stops and asks for `git add -A`.
    Previously `git mv` failed at that point.
- **53, `test(api): honor TEST_DATABASE_URL and cover mid-stream errors`.**
  - The `client` fixture reads `TEST_DATABASE_URL`, a deliberately separate name so an
    exported production `DATABASE_URL` never reaches tests.
  - A new test covers `UnhandledErrorMiddleware` when the response has already started: the
    partial body goes out and the error is logged. The suite is now 21 tests.
- **54, considered and dropped: revoking `public` from `anon` and `authenticated`.** A
  migration revoking `USAGE` on schema `public` changed nothing, because the roles get it
  from the Postgres default grant to `PUBLIC` (`=U/pg_database_owner`). Revoking it from
  `PUBLIC` would also hit Supabase's internal roles. With the Data API off, `public` empty
  and default privileges revoked, it's left as is. The migration was never pushed, and the
  local database was reset.
- **55, docs:**
  - `architecture.md` no longer claims RLS is on (it's deliberately off, see step 16), and
    explains the `public` grant
  - the Renovate status notes that it needs its GitHub App
  - the README lists `typecheck` and `format`, links all four app READMEs, and describes
    this log as covering structural steps
  - step 29's title now says steps 1–13
  - `template.md` adds `git add -A` before the rename, the `.doppler-workplace` row, and how
    to run two template projects side by side (ports, `TEST_DATABASE_URL`)
  - `CLAUDE.md` mentions the hook and the workplace check
- Refuted by the skeptics, so not changed:
  - "the desktop CSP blocks Next.js's inline scripts": Tauri hashes them into the built
    binary, and both the dev and packaged apps loaded data
  - "connect-src is hardcoded": a documented limitation, handled by the release build's
    config override
- **56, `fix(repo): keep Supabase's link files out of Prettier`.** `supabase link` writes
  `supabase/.temp/` (ignored by `supabase/.gitignore`, which Prettier doesn't read), so
  local `pnpm lint` failed after linking. `.prettierignore` adds `supabase/.temp/` and
  `supabase/.branches/`.

## 57. Desktop installers for three platforms

Commit: `ci: build desktop installers for macOS, Windows and Linux`

`.github/workflows/desktop.yml` is a build matrix on GitHub-hosted runners:

- `macos-latest` builds `aarch64-apple-darwin` (`.dmg`)
- `windows-latest` builds `x86_64-pc-windows-msvc` (`.msi` and `.exe`)
- `ubuntu-22.04` builds `x86_64-unknown-linux-gnu` (`.AppImage`, `.deb`, `.rpm`)

All actions are pinned to SHAs.

- **Release mode** (called with a tag): reads `NEXT_PUBLIC_API_URL` from Doppler prd through
  the read-only `DOPPLER_TOKEN_PRD` secret.
  - If it's missing, it skips with a warning, so a release never ships an app pointing at
    localhost.
  - Otherwise it builds the web export with that URL, writes `tauri.ci.conf.json`
    (`beforeBuildCommand: null`, CSP `connect-src` set to the API's origin), and runs
    `tauri-apps/tauri-action` with `tagName`, which uploads the installers to the release.
- **Test mode** (PRs that touch `apps/desktop/` or the workflow, or a manual run): uses prd's
  URL if it's set, otherwise `http://localhost:8000`. The bundles are kept 7 days as
  workflow artifacts.
- The web export is built directly with `pnpm --filter web exec next build`. The app's
  `build` script goes through `with-doppler.sh`, a bash script that Windows' `cmd.exe` can't
  run.
- Verified locally first: a Tauri build with the CI override skipped the before-command,
  bundled `donna.app`, and the app fetched `/health` under the overridden CSP. actionlint
  passes on all workflows. This PR itself runs the matrix, because it touches
  `desktop.yml`.

## 58. Versioned releases with release-please

Commit: `ci: cut versioned releases with release-please`

- `release-please-config.json`:
  - a single `.` package, `release-type: simple`, tags `vX.Y.Z`
  - `bump-minor-pre-major` keeps breaking changes at minor below 1.0
  - changelog sections: Features, Bug Fixes, Performance and Reverts; everything else hidden
  - `extra-files` carry the one version to `tauri.conf.json` and `apps/web/package.json`
    (json), `Cargo.toml` and both `pyproject.toml` files (toml), and `apps/api/src/api/main.py`
    (generic, on the line marked `# x-release-please-version`)
- `.release-please-manifest.json` is seeded at `0.0.0`. The first release is v0.1.0, which
  matches the versions already in the files, once step 60 sets `initial-version`.
- `.github/workflows/release.yml`, on push to `main`:
  - release-please (`googleapis/release-please-action` v5.0.0)
  - a `lockfiles` job that runs `uv lock` for both Python apps and
    `cargo update --workspace` on the release PR, then commits
  - a `desktop` job (`always()` plus `release_created`, or a manual run with a tag) that
    calls `desktop.yml` with the tag
  - permissions `contents: write` and `pull-requests: write`, with no concurrent releases
- **Repo setting:** "Allow GitHub Actions to create and approve pull requests" is on, which
  release-please needs:
  `gh api -X PUT repos/Gokhulnath/donna/actions/permissions/workflow --input - <<<'{"default_workflow_permissions":"read","can_approve_pull_request_reviews":true}'`.
  The `-F` form silently left it false.
- PRs opened with `GITHUB_TOKEN` don't trigger workflows, so the release PR never gets the
  required CI check. The owner merges it with the admin bypass (`gh pr merge --rebase --admin`),
  which the ruleset allows for PRs only.
- `docs/releasing.md` explains:
  - the flow and version rules
  - how to merge the release PR
  - the production-API gate and re-running for a tag
  - installing unsigned builds on each OS
  - runner costs
  - what's deferred: signing and notarization, the updater, Intel Macs

## 59. Desktop builds only for releases

Commit: `ci(desktop): build installers only for releases and manual runs`

- Dropped the `pull_request` trigger from `.github/workflows/desktop.yml`. The matrix now
  runs only when the Release workflow calls it with a tag, or by hand
  (`gh workflow run desktop.yml --ref <branch>`, kept 7 days as workflow artifacts).
- Why: CI minutes. On a private repo macOS counts 10× and Windows 2×. PR #5's run of all
  three platforms used about 65 included minutes with cold caches: macOS 3 min (×10),
  Windows 13 min (×2) and Linux 9 min.
- Desktop changes are tested locally on their PR (`pnpm dev:desktop` with `pnpm dev:api`, or
  `pnpm build:desktop` for an installer for your own OS). `docs/releasing.md` and
  `CLAUDE.md` say so.

## 60. Start the first release at 0.1.0

Commit: `ci: start the first release at 0.1.0, not 1.0.0`

- The first Release run opened `chore(main): release 1.0.0`. release-please looked for a
  `v0.0.0` release, found none, and treated the repo as never released. A first release
  ignores the manifest's version and uses `initial-version`, which defaults to `1.0.0`.
- Set `"initial-version": "0.1.0"` in `release-please-config.json`. On the next push to
  `main`, release-please rewrites its open release PR to 0.1.0.
- Checked before merging with a dry run against this branch:
  `npx -y release-please@17.6.0 release-pr --dry-run --repo-url Gokhulnath/donna --target-branch <branch> --token "$(gh auth token)"`.

## 61. A separate template repo: app-template-2026

Commits: `ci: skip releases in template repositories` and
`docs(repo): start new projects from the app-template-2026 repo`

- New private GitHub template repository `Gokhulnath/app-template-2026`, copied once from
  this repo at tag `template-v2` and renamed with `scripts/rename-project.sh myapp`. `myapp`
  appears nowhere else in the repo, and it's as long as `donna`, so Markdown tables stay
  aligned. From here on the template is maintained on its own, through PRs, because donna
  will grow product code the template shouldn't get.
- `release.yml`: the release-please job also requires
  `!github.event.repository.is_template`, so the template never opens release PRs. Projects
  created from it aren't template repositories, so theirs run.
- `docs/architecture.md` shows prd `SUPABASE_URL` as `https://<project-ref>.supabase.co`, so
  the copy carries no donna cloud value outside the setup log.
- `scripts/rename-project.sh` now appends "Renamed from `<old>` to `<new>`". The old heading,
  "Created from the `<old>` template", would have read "the myapp template" in every app.
- `docs/template.md`: path A creates the repo from the template, then renames it:
  `gh repo create <owner>/<name> --private --template <owner>/app-template-2026 --clone`.
  "Changing the template" replaces "Freezing a new snapshot".

---

## Renamed from donna to myapp

`scripts/rename-project.sh myapp` renamed every `donna` / `Donna` / `DONNA` to
`myapp` / `Myapp` / `MYAPP`, and moved `apps/cli/src/donna` and `skills/donna`.
The steps above are the template's history and still use its earlier names.

## Public, under the MIT license

Commit: `docs(repo): license the template under MIT`

- `LICENSE`: MIT, copyright Gokhulnath Thirumaran. The README says so, and
  `docs/template.md` tells new projects to delete or replace it for a private product.
- The first commit copied donna with this log's donna-only details made generic: its
  Supabase project ref and database host, and notes about the owner's local machine.
- Made public once the history had been checked for secrets and private details:
  `gh repo edit Gokhulnath/app-template-2026 --visibility public --accept-visibility-change-consequences`.

## `pnpm verify`, the local pre-merge check

Commit: `build(repo): add pnpm verify, the local pre-merge check`

Ported from donna (its step 64). PRs don't build the desktop apps in CI, so the owner
checks the builds locally before merging, and CI minutes go to releases.

- `scripts/verify.sh` (`pnpm verify`, or `pnpm verify --no-desktop`):
  - lint and type-check
  - tests with `MYAPP_REQUIRE_DB=1`, starting the local database if it's down
  - the web build
  - on a Mac, `pnpm build:desktop --bundles app` and the Linux bundles in Docker; on Linux,
    the native build
  - a summary of every step. Windows is left to the release workflow, because a Mac can't
    practically build it.
- `apps/desktop/linux.Dockerfile` and `scripts/build-desktop-linux.sh`
  (`pnpm build:desktop:linux`, or `--amd64` for x86_64 under emulation):
  - the image: `node:26-bookworm-slim`, Tauri's Linux prerequisites, Rust stable via
    rustup, and the repo's pnpm (read from `packageManager`)
  - the working tree goes in as a tar (`git ls-files --cached --others --exclude-standard`),
    not a bind mount. The Mac's `node_modules`, `.venv` and `target` never reach Linux, and
    the build never writes into the checkout.
  - named volumes keep the Rust `target`, the cargo registry, the pnpm store and Tauri's
    tool downloads between runs
  - a throwaway `git init` in the container, because the root `prepare` script installs the
    Lefthook hooks
  - no extra container privileges: Tauri runs linuxdeploy without FUSE for the AppImage, and
    writes `.deb` and `.rpm` itself
- Measured on the owner's Apple Silicon Mac (18 cores):
  - the first Linux build took 52 s once the image existed (Rust compile 31 s)
  - a full `pnpm verify` took about a minute: lint 2 s, type-check 2 s, tests 3 s, build 3 s,
    macOS app 26 s, Linux bundles 23 s
  - arm64 bundles: `.deb` 3.2 MB, `.rpm` 3.2 MB, `.AppImage` 90 MB
- Docs:
  - `CLAUDE.md`: run `pnpm verify` before merging, and a new "Keep the template current"
    section
  - the PR template's Verified hint, the README's scripts table, and `docs/releasing.md`

## The database password keys in the Doppler table

Commit: `docs(db): list the database password keys in the Doppler table`

Ported from donna (its step 63). `docs/architecture.md`'s key table lists
`MYAPP_API_DB_PASSWORD` (the API role's cloud password, which `DATABASE_URL` references)
and `SUPABASE_POSTGRES_PASSWORD` (the cloud `postgres` password, kept in Doppler `prd` for
the owner; no code reads it). Reset it in the Supabase dashboard (Project Settings →
Database → Reset database password) and paste the new one straight into Doppler.

## Release packages: the CLI, the MCP bundle and the Agent Skill

Commits: `feat(cli): default to the API a release was built for` and
`feat(repo): ship the CLI, MCP bundle and Agent Skill in every release`

Ported from donna (its step 65). Releases attached only the desktop installers. Now every
release also carries:

- the CLI with its terminal UI and MCP server, as a wheel and sdist
- the MCP server as a Claude Desktop extension (`.mcpb`)
- the Agent Skill as a zip
- `SHA256SUMS`, plus install steps added to the release notes

What changed:

- `scripts/build-packages.sh` (`pnpm build:packages`, and a step of `pnpm verify`) builds
  them into `dist/release/`:
  - `uv build --project apps/cli`: a pure-Python `py3-none-any` wheel. pydantic-core and the
    other native dependencies come from PyPI at install time.
  - the skill zip has the `myapp/` folder at its root (what Claude's skill upload expects),
    without the dev-only `evals/`
  - the `.mcpb` is packed with `npx @anthropic-ai/mcpb@2.1.2 pack` from
    `apps/cli/mcpb/manifest.json`: manifest 0.4, server type `uv`. It carries source,
    `pyproject.toml` and `uv.lock`, not wheels, so one build serves every OS. Claude Desktop
    runs `uv run --directory ${__dirname} --no-dev --frozen myapp mcp`.
    `UV_PYTHON_PREFERENCE=only-managed` keeps it on uv's own Python builds, and the API URL
    is a `user_config` setting. The repo's `.python-version` (`3.14+gil`) stays out, because
    `+gil` never downloads.
  - `--api-url <url>` writes `apps/cli/src/myapp/release_api_url.txt` (gitignored, removed
    afterwards) and the bundle setting's default. `myapp.client.DEFAULT_API_URL` reads that
    file when it's there, so the order is `--api-url`, then `MYAPP_API_URL`, then the
    release's API, then `http://localhost:8000`.
- `.github/workflows/packages.yml`, called by `release.yml` like `desktop.yml`:
  - one Ubuntu job that reads prd's `NEXT_PUBLIC_API_URL` through `DOPPLER_TOKEN_PRD`, or
    defaults to localhost until it exists
  - runs the script, uploads with `gh release upload --clobber`
  - appends `.github/release-install.md` to the notes once (marker
    `<!-- install-steps -->`)
  - a manual Release run with a tag rebuilds the packages too
- `release-please-config.json` bumps `apps/cli/mcpb/manifest.json`'s version with the rest.
- Verified locally:
  - the wheel installed into an isolated `uv tool` dir and ran on Python 3.14.7 (GIL). With
    `--api-url https://api.example.test` it defaulted to that URL, and `MYAPP_API_URL`
    overrode it.
  - the `.mcpb`, unzipped and started by its manifest's own command, on a simulated fresh
    machine (empty `UV_PYTHON_INSTALL_DIR` and `UV_CACHE_DIR`). uv downloaded CPython 3.14.7
    (GIL) and 76 packages, and the server started in 5 s cold and 1 s warm. An MCP client
    listed `get_status` and called it against the local API: `ok`, database `ok`. No dev
    tools landed in the bundle's environment.
  - the skill zip holds only `myapp/SKILL.md`
- Not verified: installing the `.mcpb` in Claude Desktop itself (a GUI step), and whether
  Claude Desktop provides `uv` or needs it installed. The install steps say to install it.

## Keep the release PR Prettier-clean

Commit: `ci: format the files release-please writes on the release PR`

- Ported from donna (its step 66), where it was found before the first release. Its release
  PR rewrote `apps/cli/mcpb/manifest.json` with every array expanded, and wrote
  `CHANGELOG.md` with `*` bullets and double blank lines. `prettier --check` failed on both,
  and on `.release-please-manifest.json`, so merging the PR would have turned `main`'s CI
  red.
- `release.yml`: the `lockfiles` job is now `tidy` ("Tidy the release PR"). After the
  lockfile refresh, it runs the repo's own Prettier version (read from `package.json`) on
  `CHANGELOG.md`, `.release-please-manifest.json` and every JSON file in
  `release-please-config.json`'s `extra-files`, then commits everything as
  `chore(main): refresh lockfiles and formatting for the release`.
- Verified on donna's release PR branch: the step reformatted those three files, left
  `tauri.conf.json` and `apps/web/package.json` unchanged, and `prettier --check` passed on
  all five.

## Tidy the release PR even when release-please leaves it unchanged

Commits: `ci: tidy the release PR even when release-please leaves it unchanged` and
`docs(repo): say that CI on the release PR waits for approval`

- Ported from donna (its step 67). The tidy job ran only when release-please created or
  updated its PR. In donna, the push that added it was a `ci:` commit, which changes nothing
  in the release PR, so the job was skipped and the release PR stayed unformatted.
- `release.yml`: a small `release-pr` job runs on every push to `main` that didn't just cut a
  release. It finds the open PR labelled `autorelease: pending`, and passes its branch on
  unless the head commit is already the tidy commit. `tidy` runs only when it gets a branch.
  A push to `main` with an already tidy release PR costs one short job.
- Correction: GitHub does run CI on release-please's PRs, but holds each run ("action
  required") until the owner approves it. `docs/releasing.md` and `CLAUDE.md` now say so. The
  tidy commit, pushed with `GITHUB_TOKEN`, starts no run, so the release PR still merges with
  `--admin`.

## Keep tests from piling up

Commit: `build(repo): measure coverage and gate new tests`

Models add a test per small change, and the pile costs more than it catches: OpenClaw
deleted about 400k lines of its own tests with little change in coverage, using a
test-audit skill (Peter Steinberger, 2026-09-24). Ported from donna (its step 69); the
three layers against that:

- **A gate in `CLAUDE.md`** ("Tests"): a new test names the behavior it protects, a
  realistic bug that breaks it, and why existing tests miss that bug. Each behavior has one
  owner at the strongest boundary (the API contract in `apps/api/tests` against the real
  database; each client tests its own job against a fake API). No implementation-detail
  tests, and one regression test per bug.
- **A repo skill, `.claude/skills/test-audit/SKILL.md`**: what to cut, what to keep, and how
  to audit an app in batches with coverage before and after. It's written for this repo
  and inspired by OpenClaw's (MIT); nothing is copied. Validated with
  `uvx --from skills-ref==0.1.1 agentskills validate .claude/skills/test-audit`.
- **Coverage on every run**:
  - `uv add --dev "pytest-cov>=7"` in `apps/api` and `apps/cli`
  - each `pyproject.toml` gets `[tool.pytest.ini_options] addopts = ["--cov", "--cov-report=term-missing:skip-covered"]`
  - `[tool.coverage.run]` is `source` = the app's package, with `branch = true`
  - `[tool.coverage.report] fail_under` sits just under today's numbers (API 99.3% → 98, CLI
    94.6% → 94), so pruning can't quietly drop what tests protect
  - `.coverage` and `htmlcov/` are gitignored

## Ignore Claude Code's agent worktrees

Commit: `chore(repo): ignore Claude Code's agent worktrees`

Ported from donna (its step 70). Agents working in parallel get their own git worktrees
under `.claude/worktrees/`, each a full copy of the repo. `.gitignore` now lists the folder,
so a stray `git add` can't pick it up, and Prettier's `--check .` skips the copies.

## Add the design system: tokens, components and Storybook

Commits: `feat(tokens): add the design tokens package` through
`build(ui): lint the design system and run its stories in CI`, then
`fix(desktop): install web's workspace packages for desktop builds`

Ported from donna (its step 71). Every UI now draws from one set of tokens and one
component library, so the web app, the desktop app and the terminal UI can't drift apart.
See `docs/design-system.md`.

- **Tokens** (`packages/tokens`): `pnpm-workspace.yaml` lists `packages/*` beside `apps/*`.
  - `pnpm --filter @myapp/tokens add -D -E style-dictionary@5.6.1`
  - `src/*.json` in the DTCG format: a palette, semantic light and dark colors, type, space
    and shape. `build.mjs` writes `dist/tokens.css`, `dist/theme.css` (a Tailwind v4
    `@theme` that clears Tailwind's own colors, fonts, sizes, radii and shadows),
    `dist/tokens.ts` and the TUI's `apps/cli/src/myapp/theme.json`. Style Dictionary 5.6
    doesn't format DTCG durations for CSS, so `build.mjs` registers a `duration/css`
    transform.
  - The package's `lint` script is `node build.mjs --check`, so `pnpm lint` fails when a
    generated file is out of date. `pnpm tokens:build` regenerates them.
- **Components** (`packages/ui`):
  - `pnpm --filter @myapp/ui add -E @base-ui/react@1.9.0 class-variance-authority@0.7.1 clsx@2.1.1 tailwind-merge@3.7.0 "@myapp/tokens@workspace:*"`
  - `pnpm --filter @myapp/ui add -D -E storybook@10.6.1 @storybook/react-vite@10.6.1 @storybook/addon-docs@10.6.1 @storybook/addon-a11y@10.6.1 @storybook/addon-themes@10.6.1 @storybook/addon-vitest@10.6.1 vitest@5.0.3 @vitest/browser-playwright@5.0.3 playwright@1.64.0 vite@8.3.4 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 geist@1.7.2 typescript@5.9.3 react@19.3.0 react-dom@19.3.0 @types/react@19.3.0 @types/react-dom@19.3.0`
  - `pnpm --filter @myapp/ui add -D -E eslint@9.39.5 @eslint/js@9.39.5 typescript-eslint@8.72.0 eslint-plugin-react-hooks@7.1.1 eslint-plugin-storybook@10.6.1 eslint-config-prettier@10.1.8`
    (the versions `apps/web` already resolves)
  - `pnpm --filter @myapp/ui exec playwright install chromium`, for the Storybook tests
  - `pnpm-workspace.yaml`: `allowBuilds.esbuild: true`, since Vite and Vitest need
    esbuild's platform binary.
  - The Geist variable fonts and their OFL license are copied from the `geist` package into
    `src/fonts/`, so `styles.css` serves them and no page loads fonts from another origin.
  - The package ships TypeScript source; `apps/web/next.config.ts` lists it and
    `@myapp/tokens` in `transpilePackages`.
- **Web app**: `pnpm --filter web add "@myapp/ui@workspace:*"`. `globals.css` imports
  `@myapp/ui/styles.css`, `next/font` is gone, and the page is built from the components.
  Behavior and every `data-testid` are unchanged.
- **Terminal UI**: `pnpm tokens:build` writes `apps/cli/src/myapp/theme.json`; `tui.py`
  registers it as the `myapp-dark` and `myapp-light` Textual themes and colors the status
  line with the theme's success, warning and error instead of fixed names.
- **Root scripts**: `storybook`, `build:storybook`, `tokens:build`.
- **CI**: a step runs `pnpm --filter @myapp/ui exec playwright install --with-deps chromium`
  before `pnpm test`, which now runs every story in Chromium with an axe check.
- **Desktop builds**: `desktop.yml` and `scripts/build-desktop-linux.sh` installed only
  `web` and `desktop` (`--filter web --filter desktop`), so the web build couldn't find
  `@myapp/ui`'s dependencies. They now use `--filter "web..."`, which adds the workspace
  packages `web` depends on.
- Example content in a couple of `packages/ui` stories (a status card, a labeled field) was
  reworded generically: the template ships no feature those examples were demoing.

## Set the database connection pool explicitly

Commit: `fix(api): set the connection pool explicitly`

Ported from donna's fix (its step 72), adapted to this template's API, which has no routes
under `/v1` yet (only `/health`) and no long-lived listener connection:

- `DB_POOL_SIZE` (5), `DB_MAX_OVERFLOW` (5) and `DB_POOL_TIMEOUT` (5 s) are now settings,
  passed to SQLAlchemy's pool, so each API process uses at most `DB_POOL_SIZE +
DB_MAX_OVERFLOW` = 10 connections instead of SQLAlchemy's own defaults (5 + 10 = 15,
  undocumented). `docs/architecture.md` ("Connections") has the budget across replicas and
  says what a future per-request route should do with SQLAlchemy's own pool-timeout error.
- Donna's matching fix also turned an unhandled `PoolTimeout` into a `503` with
  `Retry-After: 1` inside a `get_connection` FastAPI dependency used by its `/v1/tasks`
  routes. This template has no such dependency yet (no resource depends on the database
  per-request beyond `/health`, which already treats `PoolTimeout` as "unavailable" through
  its existing broad exception handling), so that conversion isn't shipped as code here —
  only documented, for the first route that adds it.
- `tests/support.py` gains `database_settings()` and `require_database()`, which
  `conftest.py` and the new regression test share.
- Regression test (`tests/test_db_pool.py`): a one-connection, no-overflow pool with a
  0.2 s timeout, held by the test, makes a second `engine.connect()` raise
  `sqlalchemy.exc.TimeoutError` within 2 seconds. Without `pool_size`/`max_overflow`/
  `pool_timeout` wired into `create_async_engine`, the pool defaults to 5 + 10 connections,
  so the same test fails immediately ("DID NOT RAISE") instead of timing out slowly.
  Verified by temporarily reverting `create_engine` and running the test, then restoring it.

## Serve myapp's tool over MCP at /mcp

Commit: `feat(api): serve myapp's tool over MCP at /mcp`

Ported from donna (its step 73), adapted to this template's API, which has only one tool
(`get_status`) and no task feature, so donna's db-function-sharing refactor doesn't apply
here:

- `cd apps/api && uv add "fastmcp>=4.1.3"`, matching the version `apps/cli` already pinned
  (resolved to `4.1.3` in both lockfiles).
- `cd apps/api && uv add --dev "httpx2>=2.16.0"`: `tests/test_mcp.py` imports fastmcp's HTTP
  client library directly, so it's declared rather than relied on through fastmcp.
- `apps/api/src/api/mcp.py`: a `FastMCP` server named `"myapp"` with one tool,
  `get_status`, calling `api.db.database_ok` directly -- it IS the API now, so it checks
  the database itself rather than going through the REST route over HTTP. `api_url` comes
  from the inbound HTTP request when there is one, and is `null` for a direct
  `fastmcp.Client` call or a stdio call through the CLI's proxy.
- `apps/api/src/api/main.py`: `create_app` mounts the MCP app at `/mcp`, built with
  `path="/"` and `stateless_http=True` -- mounted at `/mcp` rather than built with
  `path="/mcp"` and mounted at `/`, because a mount at `/` is a catch-all that would have
  shadowed any route added to `app` after `create_app()` returns (`tests/test_problems.py`
  does exactly that). Stateless HTTP means a tool call is one request/response with no
  session held open, verified by `tests/test_mcp.py`'s HTTP-mount test, which runs the real
  ASGI lifespan protocol (`fastmcp.utilities.asgi_transport.run_asgi_lifespan`). The app's
  own lifespan and FastMCP's are combined with an `AsyncExitStack`, the pattern FastMCP's
  ASGI integration docs give for a host app that already has a lifespan of its own.
- `apps/cli/src/myapp/mcp_server.py`: now one function, `build_server`, wrapping
  `fastmcp.server.create_proxy`, pointed at `f"{api_url}/mcp"` with
  `provider_error_strategy="raise"`. `"raise"` (not the default `"warn"`) is what turns an
  unreachable API into a clear error instead of a silently empty tool list, since the API
  is the proxy's only provider. `apps/cli/mcpb/manifest.json`'s description is updated to
  match; its tool list is unchanged (still just `get_status`).
- `.mcp.json` now registers the HTTP server directly
  (`{"type": "http", "url": "http://localhost:8000/mcp"}`) instead of running the stdio
  proxy for this repo's own Claude Code sessions.
- Tests moved with the tool: the tool contract (list, status, database down, the mounted
  `/mcp` endpoint) is `apps/api/tests/test_mcp.py`, against the real database, using
  `fastmcp.Client` against the server object and once against the mounted `/mcp` endpoint
  over HTTP. `apps/cli/tests/test_mcp.py` now tests only the CLI's own job (forwarding
  tools from an upstream, reporting an unreachable one clearly) against an in-process fake
  upstream (`fastmcp.utilities.tests.run_server_async`).

# supabase

Local and cloud Postgres for the whole backend: CLI config, the one schema migration,
the local seed, and the `myapp_api` role. Nothing here is a client — it defines what the
API may touch (`docs/architecture.md`, "Data (Supabase)").

**Hard boundaries**

- `supabase/migrations/*.sql` is the only migration mechanism — no Alembic.
- `app` is never in `[api] schemas` (`config.toml`) and never reachable through the
  disabled Data API (`[api] enabled = false`). Don't re-enable it or add `app` to
  `schemas`.
- RLS is deliberately **off** on `app.*` tables: with no policies it would block
  `myapp_api` itself, which is a non-owner role connecting directly, not through
  Supabase Auth (`docs/architecture.md` "Data (Supabase)"). Don't add RLS here before
  there's a Supabase-Auth-authenticated caller to write policies for.
- The baseline migration grants `myapp_api` CRUD on everything created in `app` via
  `alter default privileges`, and revokes all of `app` from `public`/`anon`/
  `authenticated`. A new table in `app` inherits that automatically; a table meant to
  stay off-limits to `myapp_api` needs its own explicit `revoke`.

**Commands (run from the repo root)**

- `pnpm db:start` — `supabase start`. Needs Docker running.
- `pnpm db:stop` / `pnpm db:status` — `supabase stop` / `supabase status`.
- `pnpm db:reset` — `supabase db reset` (migrations, then `seed.sql`).
- `pnpm db:migration <name>` — `supabase migration new <name>`.

**Files**

- `config.toml` — hand-edited from `supabase init`'s default; every deviation from it is
  marked `# myapp:` inline (Data API off, `auto_expose_new_tables = false`, Storage and
  Realtime off, `[auth] enabled = true` though nothing reads it yet — see
  `docs/architecture.md`'s "Status" table).
- `migrations/20261026053045_baseline.sql` — the `app` schema, the `myapp_api` role, and
  the Data-API lock-down above. Applied in filename order; never edit it once shipped,
  add a new migration instead.
- `seed.sql` — local only (`supabase db push` never runs it); sets `myapp_api`'s local
  password to match `apps/api/src/api/settings.py`'s default `DATABASE_URL`. Cloud
  passwords live only in Doppler.

**Tests:** owns none directly. `apps/api/tests` is where a new table's access rules get
proven, against the real local database (root `CLAUDE.md`, "Tests").

**Read first:** `docs/architecture.md` "Data (Supabase)" and its "Secrets"/"Status"
tables, `docs/template.md` ("What you get", the Supabase cloud-project row).

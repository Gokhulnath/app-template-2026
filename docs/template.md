---
title: Using this monorepo as a template
description: This monorepo doubles as a starter for new products with the same shape.
---

donna doubles as a starter for new products with the same shape: one FastAPI backend that
owns all logic and data, with thin clients for the web, desktop, CLI, MCP and an Agent
Skill.

The starter is its own repo,
**[`Gokhulnath/app-template-2026`](https://github.com/Gokhulnath/app-template-2026)**: a
public, MIT-licensed GitHub template repository holding donna's code with the project
renamed to `myapp`. The template is now maintained on its own, through PRs (see
[Changing the template](#changing-the-template)).

There are two ways to start a new project:

- **A. Create it from the template repo.** This is fast, and you get exactly what the
  template contains.
- **B. Rebuild from the log.** This is slower, but you get the newest versions. Follow
  [`setup-log.md`](./setup-log.md) step by step.

## What you get

| Piece           | What                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `apps/api`      | FastAPI: `/health` with a DB check, `/v1` convention, RFC 9457 errors, request IDs, Scalar docs, CORS |
| `apps/web`      | Next.js static export; data fetched from the API in the browser                                       |
| `apps/desktop`  | Tauri 2 wrapping the web export, with a CSP                                                           |
| `apps/cli`      | `<name>` CLI (Typer), terminal UI (Textual), stdio MCP server (FastMCP)                               |
| `skills/<name>` | Agent Skill that drives the CLI                                                                       |
| `apps/docs`     | Docs site (Fumadocs): use/build/reference, generated from the code, `llms.txt`                        |
| `supabase/`     | Supabase CLI config, a locked-down `app` schema and a least-privilege API role                        |
| Tooling         | pnpm + uv, Prettier/ESLint/ruff, tsc/pyright, Lefthook, CI, Renovate, Doppler wrapper                 |

## A. Create it from the template repo

```bash
NEW=acme                                   # one lowercase word: letters and digits
cd ~/Private
gh repo create Gokhulnath/$NEW --private --template Gokhulnath/app-template-2026 --clone
cd $NEW
scripts/rename-project.sh $NEW             # see below
pnpm install                               # JS deps, Python 3.14 (GIL build), git hooks
pnpm format                                # re-aligns Markdown tables the rename shifted
pnpm db:start
pnpm lint && pnpm typecheck && pnpm build && pnpm test
git add -A && git commit -m "chore(repo): start $NEW from app-template-2026"
git push
```

The new repo starts with one "Initial commit" holding the template as-is, then your rename
commit. GitHub copies files only, not settings, secrets or rulesets; the table below covers
those.

### What `scripts/rename-project.sh` does

The project name appears in several forms. In the template it's `myapp` (package names, the
CLI command, the `myapp_api` database role, the Doppler project, the Supabase `project_id`,
the bundle identifier), `Myapp` (`MyappApp`) and `MYAPP` (`MYAPP_API_URL`,
`MYAPP_REQUIRE_DB`). The script:

1. reads the current name from the root `package.json`, so it works on donna, on the
   template and on any project made from either
2. moves `apps/cli/src/<name>/` and `skills/<name>/`
3. replaces all three forms in every tracked text file, lockfiles included. It skips binary
   files (icons) and the two history docs, `setup-log.md` and this file, which keep the
   names they were written with.
4. appends a "Renamed from `<old>` to `<new>`" entry to the setup log

The name must be a single lowercase word, such as `acme`, because it becomes a Python
package, a Postgres role, a Cargo crate and a shell command. A hyphen breaks all four.
Tested against a clone: renaming to `acme` left `donna` only in the setup log, and bad names
(`my-app`, `My-App`, the current name, an empty string) exit with code 2.

### After renaming: values the script can't know

| What                                    | Where                                                                                                                                                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bundle identifier owner (`com.<owner>`) | `apps/desktop/src-tauri/tauri.conf.json`                                                                                                                                                                                                                                                   |
| Authors                                 | `apps/api/pyproject.toml`, `apps/cli/pyproject.toml`, `apps/desktop/src-tauri/Cargo.toml`                                                                                                                                                                                                  |
| Logo and icons                          | `apps/desktop/src-tauri/icons/` (`pnpm --filter desktop tauri icon <png>`)                                                                                                                                                                                                                 |
| GitHub repo                             | already made by `gh repo create --template`; for a copy made another way, `gh repo create <owner>/$NEW --private --source . --remote origin --push`                                                                                                                                        |
| Doppler workplace                       | `.doppler-workplace` holds the owner's personal workplace slug, which suits every personal project; anyone else puts theirs there (`doppler me --json`, `workplace.slug`). `scripts/with-doppler.sh` refuses any other                                                                     |
| Doppler                                 | `doppler login --scope <projects folder>`, then create project `$NEW` (configs `dev` and `prd`), then `doppler setup --no-interactive`                                                                                                                                                     |
| Supabase cloud project                  | create it, then `pnpm exec supabase link --project-ref <ref>`, then `pnpm exec supabase db push`; set Doppler prd `SUPABASE_URL` to `https://<ref>.supabase.co`                                                                                                                            |
| Merge settings and the `main` ruleset   | `gh api -X PATCH repos/<owner>/$NEW -F allow_merge_commit=false -F allow_squash_merge=false -F allow_rebase_merge=true -F delete_branch_on_merge=false`, then `gh api -X POST repos/<owner>/$NEW/rulesets --input .github/rulesets/main.json` (rulesets on a private repo need GitHub Pro) |
| CI secret for release builds            | `doppler configs tokens create github-actions-release --project $NEW --config prd --access read --plain \| gh secret set DOPPLER_TOKEN_PRD --repo <owner>/$NEW`                                                                                                                            |
| Releases                                | allow Actions to open PRs: `gh api -X PUT repos/<owner>/$NEW/actions/permissions/workflow --input - <<<'{"default_workflow_permissions":"read","can_approve_pull_request_reviews":true}'`; the first release PR collects the whole history                                                 |
| Renovate                                | install the GitHub App on the new repo                                                                                                                                                                                                                                                     |
| License                                 | the template is MIT (`LICENSE`). For a private product, delete `LICENSE` or put your own terms in it                                                                                                                                                                                       |

### Running two projects from the template side by side

Both default to the same local ports, so the second project needs its own. In its
`supabase/config.toml`, change the enabled host ports: `[api] port`, `[db] port`,
`[db] shadow_port`, `[studio] port` and `[local_smtp] port` (for example 54421–54424). Then
change the default `database_url` port in `apps/api/src/api/settings.py`. Run the database
tests against a different Postgres with
`TEST_DATABASE_URL=postgresql+asyncpg://<name>_api:<name>_api@127.0.0.1:<port>/postgres`.
The web dev server already moves to the next free port, and the API takes `--port`.

## B. Rebuild from the log

Follow [`setup-log.md`](./setup-log.md) from step 1, with `donna` replaced by your name. To
pick up newer releases:

- Replace the pinned generator versions (`create-next-app@16.4.3`, `@tauri-apps/cli@2.12.4`,
  `supabase@2.122.0`) with `@latest`. Run each tool's `--help` first, because flags change.
- Replace exact pins such as `"fastapi[standard]==0.162.0"` with unpinned requests. uv
  records what it resolves in `uv.lock`.
- Re-check each gotcha the log calls out, since any of them can change:
  - create-next-app's nested `pnpm-workspace.yaml` (step 2)
  - Cache Components vs `output: "export"` (step 8)
  - uv's free-threaded Python choice and the `+gil` download gap (steps 5 and 41)
  - pnpm 11's `ERR_PNPM_IGNORED_BUILDS` (step 36)
  - setup-uv's lack of a moving major tag (step 40)

Record whatever differed in the new project's own setup log.

## Changing the template

`app-template-2026` was copied once from donna (tag `template-v2`, then
`scripts/rename-project.sh myapp`). From then on it's its own repo and the source of truth
for new projects: donna will grow product code that the template shouldn't get, so the
template isn't re-copied from donna.

Change it like donna, through PRs:

```bash
git clone git@github.com:Gokhulnath/app-template-2026.git ~/Private/app-template-2026
cd ~/Private/app-template-2026
pnpm install
git switch -c <type>/<short-slug>
# ...change, then pnpm lint && pnpm typecheck && pnpm build && pnpm test
git push -u origin HEAD && gh pr create --fill
gh pr merge --rebase                       # once CI passes; keep the branch
```

- It has the same `main` ruleset as donna, and structural changes go in its setup log.
- Its Release workflow skips itself (`github.event.repository.is_template`), so the template
  never cuts releases. Projects made from it aren't template repositories, so theirs run.
- An improvement to tooling or conventions made in an app (donna included) is ported by
  hand, as a PR to the template with `myapp` names. A commit that doesn't touch the project
  name can be cherry-picked from a `donna` remote:

  ```bash
  git remote add donna git@github.com:Gokhulnath/donna.git
  git fetch donna && git cherry-pick <sha>
  ```

- The template is public. Before porting a change, check that it carries no secrets, cloud
  identifiers or private notes. donna's own setup log has some, which the copy made
  generic.
- Projects already created from the template don't receive its later changes. Port the
  ones you want the same way.

## Deliberately left out

Each of these is worth doing once its trigger happens, not before:

| Item                                                                      | Trigger                                                        |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Auth: Supabase Auth with JWKS checks in FastAPI, API keys for CLI and MCP | the first user-facing feature                                  |
| Generated API clients (TypeScript, Python)                                | 3–5 real endpoints                                             |
| Remote MCP (Streamable HTTP at `/mcp`, OAuth)                             | real auth, plus agents that can't run the CLI locally          |
| Turborepo                                                                 | a shared JS package worth caching, or slow CI                  |
| CI path filters; a Rust check in CI; cloud migration pushes               | slow CI; Rust code in the shell; Supabase secrets in Doppler   |
| Pagination, rate limiting                                                 | the first list endpoint; the first external caller             |
| mise/asdf, devcontainers                                                  | several Node/Python versions per machine; a second contributor |
| CODEOWNERS                                                                | a second contributor                                           |

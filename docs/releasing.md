# Releasing

myapp ships as one product with one version (`vX.Y.Z`). The API, web, desktop and CLI
release together, because the desktop app bundles the web build and every client targets
the same API.

## How it works

1. Every feature PR merges into `main` as Conventional Commits.
2. On each push to `main`, **release-please** (`.github/workflows/release.yml`) keeps one
   PR open, titled `chore(main): release X.Y.Z`. It bumps the version in every app and
   updates `CHANGELOG.md`. A follow-up job, "Tidy the release PR", refreshes `uv.lock` and
   `Cargo.lock` (they record the apps' own versions) and runs the repo's Prettier on the
   files release-please writes, so `main`'s CI stays green once the PR merges.
3. **You decide when to release** by merging that PR, once `main` has enough features and
   is stable. Merging it:
   - tags `vX.Y.Z` and publishes a GitHub Release with the notes
   - builds the desktop installers (`.github/workflows/desktop.yml`) and attaches them to
     the release: `.dmg` for macOS (Apple Silicon), `.msi` and `.exe` for Windows, and
     `.AppImage`, `.deb` and `.rpm` for Linux
   - builds the other packages (`.github/workflows/packages.yml`, one Ubuntu job), attaches
     them, and adds the install steps to the release notes (see below)

## What a release contains

| File                                                      | What                                                      | Install                                                        |
| --------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `.dmg`, `.msi`, `-setup.exe`, `.AppImage`, `.deb`, `.rpm` | the desktop app, once the production API is deployed      | open the installer for your OS                                 |
| `myapp-X.Y.Z-py3-none-any.whl` (and `.tar.gz`)            | the CLI, its terminal UI and the MCP server (`myapp mcp`) | `uv tool install --force ./myapp-X.Y.Z-py3-none-any.whl`       |
| `myapp-X.Y.Z.mcpb`                                        | the MCP server as a one-click Claude Desktop extension    | open it in Claude Desktop (needs uv)                           |
| `myapp-skill-X.Y.Z.zip`                                   | the Agent Skill, which drives the CLI                     | unzip into `~/.claude/skills/`, or upload in Claude's settings |
| `SHA256SUMS`                                              | checksums of the files above                              | `sha256sum --check --ignore-missing SHA256SUMS`                |

The install steps added to every release's notes come from `.github/release-install.md`.
Because the repo is private, downloads need an account with access to it
(`gh release download <tag> --repo Gokhulnath/myapp --pattern <file>`).

- **Which API the packages use:** `scripts/build-packages.sh --api-url` bakes Doppler prd's
  `NEXT_PUBLIC_API_URL` in as the default, into `myapp/release_api_url.txt` in the wheel and
  the bundle's settings. Until prd has one, they default to `http://localhost:8000`.
  `--api-url` and `MYAPP_API_URL` override it, and in Claude Desktop the extension's API URL
  setting does.
- **The MCP bundle** is the `uv` server type: it carries source and `uv.lock`, not
  compiled packages. Claude Desktop runs
  `uv run --directory ${__dirname} --no-dev --frozen myapp mcp`, and uv installs the
  dependencies (pydantic-core among them) for the user's OS, plus Python 3.14 if it's
  missing. `UV_PYTHON_PREFERENCE=only-managed` keeps it on uv's own Python builds.
- `pnpm build:packages` builds all of it into `dist/release/`, and `pnpm verify` runs it, so
  packaging problems show up before a release.

### Version numbers (while below 1.0)

| Commit                                                      | Bump            | Example               |
| ----------------------------------------------------------- | --------------- | --------------------- |
| `fix: …`                                                    | patch           | 0.2.0 → 0.2.1         |
| `feat: …`                                                   | minor           | 0.2.1 → 0.3.0         |
| `feat!: …` or `BREAKING CHANGE:`                            | minor (pre-1.0) | 0.3.0 → 0.4.0         |
| `chore`, `docs`, `ci`, `test`, `style`, `refactor`, `build` | none            | hidden from the notes |

The notes list Features, Bug Fixes, Performance and Reverts. Version 1.0.0 is a deliberate
choice: add `Release-As: 1.0.0` to a commit body when it's time.

## Merging the release PR

release-please opens its PR with the built-in `GITHUB_TOKEN`, and GitHub doesn't run
workflows for those, so the required CI check never appears on it. The PR only changes
version numbers, the changelog and lockfiles. Merge it with your admin bypass:

```bash
gh pr merge <release-pr-number> --repo Gokhulnath/myapp --rebase --admin
```

The merge is a push by you, so CI and the release run as normal.

## Desktop builds need a production API

The web build that gets bundled inlines `NEXT_PUBLIC_API_URL`. A release build reads it from
Doppler **prd** (through the read-only `DOPPLER_TOKEN_PRD` secret) and limits the app's CSP
`connect-src` to that origin.

- **If prd has no `NEXT_PUBLIC_API_URL`** (true until the API is deployed), the release
  still gets its tag, notes and the other packages (which default to localhost), but the
  desktop jobs skip with a warning instead of shipping an app that points at localhost.
- Once the URL is set, add the installers to an existing release, and rebuild its packages
  against the production API:
  `gh workflow run release.yml --repo Gokhulnath/myapp -f tag=vX.Y.Z`.

## Testing desktop changes before a release

PRs don't build installers, to save CI minutes. Check a PR locally before merging it:

- `pnpm verify` runs the CI checks plus the desktop builds CI skips: the macOS app and the
  Linux bundles (`.deb`, `.rpm`, `.AppImage`), built in Docker. On an Apple Silicon Mac
  those are arm64 builds. They prove the app compiles and bundles on Linux; the x86_64
  files people download come from the release workflow.
- `pnpm build:desktop:linux --amd64` builds x86_64 Linux bundles under emulation (slower;
  turn on Docker Desktop's "Use Rosetta for x86_64/amd64 emulation" setting first).
- `pnpm dev:desktop` runs the app; start the API alongside it with `pnpm dev:api`.

Windows has no local build. The release builds it, and if a change needs checking on
Windows before then, run the Desktop workflow by hand on its branch:
`gh workflow run desktop.yml --repo Gokhulnath/myapp --ref <branch>`. It builds against
localhost while prd has no URL, keeps the bundles 7 days as downloadable workflow artifacts
and never attaches them to a release.

## Installing an unsigned build

The apps aren't code-signed yet. Apple's Developer Program ($99/year, plus notarization)
and a Windows certificate are deferred until people outside the team install them. Until
then:

- **macOS:** opening the `.dmg` app shows "can't be opened". Go to System Settings →
  Privacy & Security, click **Open Anyway** for myapp, or right-click the app and choose
  Open.
- **Windows:** SmartScreen shows "Windows protected your PC". Click **More info → Run
  anyway**.
- **Linux:** `chmod +x myapp_*.AppImage` and run it, or install the `.deb` or `.rpm`.

## Costs

The desktop matrix runs on GitHub-hosted runners. On a private repo, macOS minutes count
about 10× and Windows about 2× against the monthly allowance, so one run of all three
platforms uses about 65 included minutes with cold caches. Builds run only on releases
and manual runs, never on PRs.

## Not yet

- **Code signing and notarization**: add when outside users install the apps.
- **Auto-update (`tauri-plugin-updater`)**: add when there's an install base. Its signing
  key can't be removed once used, so it isn't added speculatively.
- **Intel Mac builds**: add when an Intel tester shows up.

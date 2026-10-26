# Releasing

donna ships as one product with one version (`vX.Y.Z`). The API, web, desktop and CLI
release together, because the desktop app bundles the web build and every client targets
the same API.

## How it works

1. Every feature PR merges into `main` as Conventional Commits.
2. On each push to `main`, **release-please** (`.github/workflows/release.yml`) keeps one
   PR open, titled `chore(main): release X.Y.Z`. It bumps the version in every app and
   updates `CHANGELOG.md`. A follow-up job refreshes `uv.lock` and `Cargo.lock` on that PR,
   because they record the apps' own versions.
3. **You decide when to release** by merging that PR, once `main` has enough features and
   is stable. Merging it:
   - tags `vX.Y.Z` and publishes a GitHub Release with the notes
   - builds the desktop installers (`.github/workflows/desktop.yml`) and attaches them to
     the release: `.dmg` for macOS (Apple Silicon), `.msi` and `.exe` for Windows, and
     `.AppImage`, `.deb` and `.rpm` for Linux

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
gh pr merge <release-pr-number> --repo Gokhulnath/donna --rebase --admin
```

The merge is a push by you, so CI and the release run as normal.

## Desktop builds need a production API

The web build that gets bundled inlines `NEXT_PUBLIC_API_URL`. A release build reads it from
Doppler **prd** (through the read-only `DOPPLER_TOKEN_PRD` secret) and limits the app's CSP
`connect-src` to that origin.

- **If prd has no `NEXT_PUBLIC_API_URL`** (true until the API is deployed), the release
  still gets its tag and notes, but the desktop jobs skip with a warning instead of shipping
  an app that points at localhost.
- Once the URL is set, add the installers to an existing release:
  `gh workflow run release.yml --repo Gokhulnath/donna -f tag=vX.Y.Z`.

## Testing desktop changes before a release

PRs don't build installers, to save CI minutes. Test a desktop change locally on its PR:

- `pnpm dev:desktop` runs the app; start the API alongside it with `pnpm dev:api`.
- `pnpm build:desktop` builds an installer for your own OS.

If a change needs checking on all three platforms before a release, run the Desktop
workflow by hand on its branch:
`gh workflow run desktop.yml --repo Gokhulnath/donna --ref <branch>`. It builds against
localhost while prd has no URL, keeps the bundles 7 days as downloadable workflow artifacts
and never attaches them to a release.

## Installing an unsigned build

The apps aren't code-signed yet. Apple's Developer Program ($99/year, plus notarization)
and a Windows certificate are deferred until people outside the team install them. Until
then:

- **macOS:** opening the `.dmg` app shows "can't be opened". Go to System Settings →
  Privacy & Security, click **Open Anyway** for donna, or right-click the app and choose
  Open.
- **Windows:** SmartScreen shows "Windows protected your PC". Click **More info → Run
  anyway**.
- **Linux:** `chmod +x donna_*.AppImage` and run it, or install the `.deb` or `.rpm`.

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

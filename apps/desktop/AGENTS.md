# apps/desktop

The myapp desktop app: Tauri 2, wrapping `apps/web`'s static export
(`frontendDist: ../../web/out`) in a native window. It has no UI code and no business
logic of its own — everything renders from the web build, and all data comes from the
API through that build's own `src/lib/api.ts`. A visual change belongs in `apps/web`, a
data/logic change in `apps/api`. The only code that lives in this directory is the Rust
shell (`src-tauri/src/`) that opens the window and loads the export.

## Commands (run from the repo root)

- `pnpm dev:desktop` — builds the web export, compiles the Rust shell, opens a window.
  Run `pnpm dev:api` alongside it; the webview sends an `Origin` the API must allow.
- `pnpm build:desktop` — release bundle in `src-tauri/target/release/bundle/` (macOS:
  `.app` and `.dmg`).
- `pnpm build:desktop:linux` (`scripts/build-desktop-linux.sh`) — `.deb`/`.rpm`/
  `.AppImage` built in Docker; needs Docker running. `--amd64`/`--arm64` pick the arch.
- No database — this app never touches Postgres, so there's no `MYAPP_REQUIRE_DB` here.
- `pnpm verify` builds this app for real (the macOS app plus Linux Docker bundles on a
  Mac) rather than unit-testing it; `pnpm verify --no-desktop` skips that for a change
  that can't affect the desktop app. CI builds installers only for a release or a manual
  `workflow_dispatch`, never on a PR — test desktop changes locally instead.

## Files an agent most needs

- `src-tauri/tauri.conf.json` — `frontendDist`, the window, the identifier
  (`com.gokhulnath.myapp`), the bundle targets, and the **CSP** (`app.security.csp`).
  This is almost always the file to edit.
- `README.md` — the CSP's `connect-src` rationale and the dev-vs-packaged origins
  (`http://127.0.0.1:1430` in `tauri dev` vs. `tauri://localhost` / `http://tauri.localhost`
  once packaged).
- `src-tauri/src/lib.rs` — the only Rust logic: a debug-only log plugin. `main.rs` just
  calls `run()`.
- `src-tauri/Cargo.toml` — package `myapp-desktop`, lib `myapp_desktop_lib`, pinned
  `rust-version = "1.90"`.

## Gotchas proven by the code and docs

- **The CSP's `connect-src` is what breaks.** Today it only lists the local API
  (`http://localhost:8000`, `http://127.0.0.1:8000`); a production build needs the
  production API origin added, via `tauri build --config` (`README.md`).
- **Versions are release-please's job.** `tauri.conf.json`'s `version` and
  `Cargo.toml`'s `version` are bumped only by the release PR; never hand-edit them.

## Tests

This app owns no behavior worth a test: no business logic, no data access, nothing a
fake API would exercise. Its real check is that it builds and bundles, which
`pnpm verify`'s desktop steps already do — don't add a test suite here.

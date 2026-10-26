# desktop

The myapp desktop app: Tauri 2 wrapping the web app's static export (`apps/web/out`) in a
native window. It holds no UI code and no logic of its own. Everything comes from the web
build, and all data comes from the API.

## Run

From the repo root (needs Rust; `rustc --version` should be 1.90 or newer):

```bash
pnpm dev:api        # the API, with localhost CORS on
pnpm dev:desktop    # builds the web export, compiles the Rust shell, opens a window
pnpm build:desktop  # release bundle in src-tauri/target/release/bundle/ (macOS: .app and .dmg)
```

`tauri dev` serves the export from its own server at `http://127.0.0.1:1430` (the next free
port if taken), and the API sees that as the `Origin`. A packaged app uses
`tauri://localhost` (macOS/Linux) or `http://tauri.localhost` (Windows). The API allows
both by default.

## Config

- `src-tauri/tauri.conf.json`:
  - identifier `com.gokhulnath.myapp`
  - `frontendDist` set to `../../web/out`
  - both "before" commands run `pnpm --filter web build`
- **Content-Security-Policy** (`app.security.csp`): only the app's own files, plus `fetch` to
  the API at `http://localhost:8000`. Tauri adds hashes for the export's inline scripts at
  build time.
- **For a production build, add the production API origin to `connect-src`**, for example:
  `pnpm --filter desktop tauri build --config '{"app":{"security":{"csp":{...}}}}'`.
- The web build inlines `NEXT_PUBLIC_API_URL`, so build each environment separately with
  the matching value.

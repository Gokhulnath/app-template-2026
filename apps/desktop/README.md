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

## Window chrome (macOS)

- `src-tauri/tauri.macos.conf.json` is a Tauri platform-specific config file -- Tauri
  merges it over `tauri.conf.json` automatically on a macOS build/dev run, nothing wires
  it up by hand. On macOS only: `titleBarStyle: "Overlay"` + `trafficLightPosition:
{x: 16, y: 16}` insets the native traffic lights into the app's own chrome instead of
  a separate native title bar strip, `hiddenTitle: true` drops the native window-title
  text, and `acceptFirstMouse: true` means a click on an unfocused window reaches the
  page instead of only focusing it.
  - **Tauri's config merge replaces arrays wholesale (RFC 7396 JSON Merge Patch), it
    does not merge them element by element.** `tauri.macos.conf.json`'s `app.windows`
    entry is therefore a full copy of the base window object plus the macOS-only
    fields, not just the fields that differ -- changing `width`/`height`/`title`/
    `minWidth`/`minHeight` in `tauri.conf.json` means updating the copy here too, or the
    macOS build silently loses those fields back to their Rust-side defaults.
  - Windows and Linux keep native window decorations (no `tauri.windows.conf.json` /
    `tauri.linux.conf.json`): a frameless Windows window needs its own custom control
    buttons this app has no design for.
- `apps/web`'s `TitleBar` (`packages/ui/src/components/title-bar.tsx`) reads
  `useIsMacDesktopShell()` (`packages/ui/src/lib/platform.ts`) to reserve an 80px
  leading gutter for those traffic lights and to make itself the window's drag region
  (`data-tauri-drag-region="deep"`) -- true only inside this Tauri build on macOS, so
  web, Windows/Linux and phones render unchanged (`TitleBar` renders nothing there at
  all). Double-clicking the empty bar zooms the window, for free, via Tauri 2's own
  drag-region handling (no extra code). This template ships no top bar of its own, so
  `TitleBar` mounts standalone in `apps/web/src/app/layout.tsx`; a real product built
  from this template should fold this same gutter and drag attribute into its own top
  bar instead of stacking a second one (see `title-bar.tsx`'s own doc comment).
- `tauri.conf.json`'s window starts `"visible": false`. `tauri-plugin-window-state`
  (`src-tauri/src/lib.rs`) restores the saved size/position/maximized state (written to
  `.window-state.json` in the app's config dir) and only then shows the window, so it
  never flashes at the configured 900x600 default first. `minWidth`/`minHeight`
  (480x320) are a generic usable floor, not derived from app-specific layout tokens --
  this template ships no sidebar or top-bar size token to derive them from the way a
  real product's `packages/tokens` eventually will; replace them once it does.
- `lib.rs`'s `setup` also sets the window's background color from the OS theme
  (`packages/tokens`' `color.bg`: light `#ffffff`, dark `#09090b`) before the webview
  has painted anything, so there's no flash of the wrong color while the window is
  hidden and restoring its geometry.

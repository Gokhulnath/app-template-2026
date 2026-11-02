# packages/ui

The design system's component library: React components on Base UI, styled only with
token utilities (`packages/tokens`). `apps/web` (and `apps/desktop` through it) composes
these instead of styling its own elements. The package ships TypeScript source directly,
no build step — `apps/web/next.config.ts` lists it in `transpilePackages` because it's
consumed as source.

## Hard boundary

- Never add a color, font size, radius, or shadow that isn't a token utility. Tailwind's
  own scales are cleared repo-wide (`packages/tokens`'s generated theme), so writing one
  either does nothing or (inside this package) reintroduces the drift the clearing
  exists to prevent.
- A new need (variant or component) is built here, with a story, before any app uses it
  (`docs/design-system.md`, "The rules").

## Commands (run from the repo root)

- `pnpm --filter @myapp/ui test` — vitest; no local database needed.
- `pnpm --filter @myapp/ui lint` / `typecheck`
- `pnpm storybook` (root script) — dev server at `:6006`; `pnpm build:storybook` for the
  static build.
- One-time per machine: `pnpm --filter @myapp/ui exec playwright install chromium` (CI
  runs `playwright install --with-deps chromium` in its own step).
- If you touched `packages/tokens/src/`, run `pnpm tokens:build` first and commit the
  regenerated files with your change (this package only consumes `@myapp/tokens`'s
  `dist/`, via its own `.` export pointing at `dist/tokens.ts`).

## Map

- `src/index.ts` — the public export list; add new components here.
- `src/components/<name>.tsx` + `<name>.stories.tsx` — always a pair (today: `button`,
  `icon-button`, `text-field`, `checkbox`, `card`, `badge`, `alert`, `stack`, `text`,
  `heading`); see any existing component for the shape (variants via `cva`, a Base UI
  primitive underneath).
- `src/lib/cn.ts` — `tailwind-merge` extended with `@myapp/tokens`'s own keys, so
  `bg-surface`/`text-text`/`rounded-xl` are seen as rival classes; a new token needs no
  change here.
- `.storybook/preview.ts` — `a11y.test: "error"`: a real axe violation fails
  `pnpm test`, not just the Storybook panel.
- `src/fonts/` — Geist and Geist Mono, bundled (SIL Open Font License), never fetched
  from another origin.

## Tests: stories are the tests

`pnpm --filter @myapp/ui test` renders every `*.stories.tsx` in real headless Chromium
via Storybook's vitest addon, and fails on: a story that doesn't render, an axe
violation, or a failed `play` function (for example `button.stories.tsx`'s `Loading`
story, which proves a loading button stays focusable but ignores clicks, and
`checkbox.stories.tsx`'s `Toggles` story). Per the root `CLAUDE.md` Tests section, this
package owns each component's rendering, variant states, and interaction behavior — test
it here with a story, not by re-asserting it from `apps/web`'s own tests.

## Gotchas proven by the code and docs

- `border-strong` carries WCAG 1.4.11's 3:1 control-outline contrast
  (`packages/tokens/src/color.light.json`'s own description) — axe doesn't check this
  ratio itself; keep the number documented there if you touch that token.
- `apps/web` imports `@myapp/ui/styles.css` once (`apps/web/src/app/globals.css`) and
  components from `"@myapp/ui"` throughout the app — a behavior change here reaches that
  client at once.

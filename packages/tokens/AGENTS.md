# packages/tokens

The design system's single source of truth for color, type, spacing, radius, shadow and
motion. Every client (`apps/web`, `apps/docs`, `packages/ui`, the CLI's Textual TUI)
reads its generated output; none may hardcode a color, size or radius of its own. See
`docs/design-system.md` for the token table before changing a value here.

## Build and lint

`pnpm tokens:build` (`pnpm --filter @myapp/tokens build`) runs `build.mjs`, which writes
`dist/tokens.css`, `dist/theme.css`, `dist/tokens.ts` and `apps/cli/src/myapp/theme.json`.
`pnpm lint` (`node build.mjs --check`) fails if any of those four is stale relative to
`src/*.json` — all four are committed, not gitignored, so commit them with the `src/`
edit that produced them. No local database is involved; this package has no `test`/
`typecheck` script either.

## File map

- `src/palette.json` — raw color steps. Never exposed as a CSS var (`isPublic` in
  `build.mjs` drops `path[0] === "palette"`) and referenced only from `src/color.*.json`.
- `src/color.light.json`, `src/color.dark.json` — the semantic colors components
  actually use (`bg`, `surface`, `text`, `accent`, `danger`, ...). Add new colors here,
  described, not as one-off palette references in a client.
- `src/typography.json`, `src/space.json`, `src/size.json`, `src/shape.json` — type, the
  spacing scale, content/layout widths, and radius/shadow/motion.
- `build.mjs` — turns `src/*.json` into every output above. Read it before adding a
  token category; it is not generic DTCG-to-CSS plumbing.

## Who consumes the output, and how

`packages/ui` is the only package that imports `@myapp/tokens` directly as source
(`styles.css` imports `tokens.css`/`theme.css`; `src/lib/cn.ts` imports `dist/tokens.ts`).
`apps/web` only imports `@myapp/ui/styles.css`, yet still lists `@myapp/tokens` in
`next.config.ts`'s `transpilePackages`, since it reaches this package transitively.
`apps/docs` imports `dist/tokens.css` directly, bypassing `@myapp/ui`. `apps/cli`'s
`tui.py` reads `theme.json` via `importlib.resources`. Renaming a `package.json` export
breaks more than one of these.

## Gotchas proven by the code

- `textual()` in `build.mjs` reads nine Textual theme fields from eight semantic colors
  by exact name (`accent`, `text-muted`, `text`, `bg`, `surface`, `surface-muted`,
  `success`, `warning`, `danger`) with no fallback — drop or rename one in
  `color.*.json` without updating `textual()` and the build throws.
- Style Dictionary 5.6 doesn't format the DTCG `duration` type for CSS, so `build.mjs`
  registers its own `duration/css` transform. Keep it when touching `shape.json`'s motion.
- A new token category that should become a Tailwind utility also needs an entry in
  `build.mjs`'s `CLEARED`/`tailwind` arrays — a token only in `src/` produces no utility.

## Tests

No test suite here; `pnpm lint` (above) is this package's only check. Contrast assertions
for these colors (`border-strong` against WCAG 1.4.11) live in `packages/ui`'s Storybook
a11y stories, not here.

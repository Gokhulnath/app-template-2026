# Design system

Every myapp screen draws from one set of decisions: the same colors, fonts, sizes, spacing,
corner radii, shadows and components. A change made here reaches every client, and a client
can't drift from it.

```text
  packages/tokens/src/*.json          the decisions, in the W3C design tokens format (DTCG)
            │  pnpm tokens:build (Style Dictionary)
            ├──▶ dist/tokens.css      CSS custom properties, light and dark  ─┐
            ├──▶ dist/theme.css       Tailwind v4 theme: only token utilities ├─▶ packages/ui
            ├──▶ dist/tokens.ts       the same values for TypeScript         ─┘   (components,
            └──▶ apps/cli/.../theme.json   the terminal UI's Textual themes        Storybook)
                                                                                    │
                                                       apps/web, and through it ◀───┘
                                                       the desktop app
```

## Tokens: `packages/tokens`

| File                                      | Holds                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/palette.json`                        | the raw color steps (neutral, blue, green, amber, red). Never used directly                       |
| `src/color.light.json`, `color.dark.json` | semantic colors, by job: `bg`, `surface`, `text`, `text-muted`, `border`, `accent`, `danger`, ... |
| `src/typography.json`                     | Geist and Geist Mono, weights, sizes (rem) with line heights, tracking                            |
| `src/space.json`                          | the spacing scale, steps of 0.25rem                                                               |
| `src/size.json`                           | content widths (`max-w-md` is 28rem)                                                              |
| `src/shape.json`                          | radius, shadows, motion durations and easing                                                      |

- **Components use semantic colors only.** `text-muted` says what it's for; `neutral-500`
  doesn't, and has no utility class at all.
- **Dark mode** swaps the semantic colors. It follows the system setting, and
  `data-theme="light"` or `"dark"` on `<html>` overrides it.
- **To change a token**, edit `src/`, run `pnpm tokens:build`, and commit the generated files
  with it. `pnpm lint` fails when a generated file is out of date.

## Components: `packages/ui`

React components on [Base UI](https://base-ui.com), which supplies the behavior and
accessibility (focus, keyboard, ARIA, disabled states). Styling is Tailwind classes built
from the token utilities, with variants defined by `cva`.

| Component                           | For                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `Button`                            | actions: `primary`, `secondary`, `ghost`, `danger`; `sm`, `md`; `loading` |
| `IconButton`                        | icon-only actions; `aria-label` is required                               |
| `TextField`                         | a labeled input, with a description or an error                           |
| `Checkbox`                          | on/off, with a visible label or an `aria-label`                           |
| `Card` + `Header`/`Title`/`Content` | a section of a screen                                                     |
| `Badge`                             | a small status label (`tone`, optional `dot`)                             |
| `Alert`                             | a message for a section, with an optional action                          |
| `Stack`                             | layout: every gap between elements comes from here                        |
| `Text`, `Heading`                   | body copy and headings                                                    |

Apps import the components and one stylesheet:

```css
/* apps/web/src/app/globals.css */
@import "@myapp/ui/styles.css";
```

```tsx
import { Button, Stack } from "@myapp/ui";
```

## The rules

- **Apps compose components; they don't style elements.** No colors, font sizes, radii or
  shadows of an app's own. Tailwind's own colors, fonts, weights, sizes, line heights,
  tracking, radii, shadows, blurs, content widths and easings are cleared, so `bg-zinc-500`,
  `font-bold` or `max-w-7xl` generates no CSS; only token utilities (`bg-surface`,
  `font-semibold`, `max-w-md`) do. Spacing uses the token unit, and a bare
  `transition-colors` uses the motion tokens. Breakpoints (`sm:`), animations
  (`animate-spin`) and aspect ratios stay Tailwind's.
- **Something new goes into `packages/ui` first**: a variant or a component, with a story,
  and then the app uses it.
- **Layout uses `Stack`.** An app may still size and place things (`w-full`, `max-w-md`,
  `flex-1`, page padding).
- **One focus style** everywhere: a 2px `focus` ring, for keyboard focus only.
- **Motion respects the system setting**: anything that moves on its own (the loading
  spinner) stops under `prefers-reduced-motion`.
- **Fonts are bundled** (Geist, under the SIL Open Font License), so no page fetches from
  another origin and the desktop app's content security policy (`font-src 'self'`) holds.

## Storybook

```bash
pnpm storybook          # http://localhost:6006
pnpm build:storybook    # static build in packages/ui/storybook-static/
```

Each component has a story for each state worth seeing. The toolbar switches between light
and dark, and the Accessibility panel shows axe's results. **Foundations/Tokens** shows
every color, the type scale, spacing, radii and shadows, read from `@myapp/tokens`.

## Tests

The stories are the tests. `pnpm test` (in `packages/ui`: `vitest run`) renders every story
in a headless Chromium and fails on:

- a story that doesn't render
- an accessibility violation axe finds (`a11y.test: "error"` in `.storybook/preview.ts`)
- a failed `play` function. These cover behavior, for example that a checkbox toggles, a
  loading button ignores clicks, or a field with an error is marked invalid.

Install the browser once per machine with
`pnpm --filter @myapp/ui exec playwright install chromium`. CI installs it in its own step.

axe checks text contrast but not the outline of a control, which WCAG 1.4.11 wants at 3:1
or better. The `border-strong` token holds that line for checkboxes and text fields: 4.8:1
against `surface` in light, 3.7:1 in dark. Keep it there when changing colors.

## Other clients

- **Desktop** bundles the web export, so it gets everything above.
- **Terminal UI**: `pnpm tokens:build` writes `apps/cli/src/myapp/theme.json`, which the TUI
  registers as the `myapp-dark` and `myapp-light` Textual themes.
- **Mobile** (later) can take `dist/tokens.ts` as is, or a new Style Dictionary platform
  (Swift, Kotlin) in `build.mjs`.

## Why these choices

- **DTCG tokens and Style Dictionary**: one source of truth, in the W3C format other tools
  read, built for every platform from one script.
- **Base UI**: unstyled, accessible components, so the visual design is fully ours and the
  hard parts (focus, keyboard, ARIA) aren't reimplemented.
- **Tailwind with its theme cleared**: utilities are quick to write, and they can only be
  token values.
- **Storybook stories as tests**: one file shows a state and checks it, so the catalog
  can't go stale.

# packages/api-types

`@myapp/api-types`: TypeScript types generated from the API's committed OpenAPI contract
(`apps/api/openapi.json`) by openapi-typescript. Every TypeScript client of the REST API
(today, just `apps/web`) imports its request and response shapes from here instead of
hand-writing them. The pydantic models in `apps/api/src/api` are the source of truth;
this package only mirrors them.

## Commands (run from the repo root)

- `pnpm contract:generate` — after any change to an API route or model: re-exports
  `apps/api/openapi.json` and regenerates `src/schema.d.ts`. Commit both with the API
  change.
- `pnpm contract:check` — fails when either generated file is stale. It runs in
  `pnpm lint` (so in CI) and in lefthook whenever `apps/api/src/**/*.py` is staged.
- `pnpm --filter @myapp/api-types typecheck` / `lint`. There's no build or test: the
  package exports TypeScript source (`"exports": "./src/index.ts"`) and has no runtime
  code.

## Files to read first

- `src/index.ts` — the only hand-written file: re-exports `paths` and `components`, and
  defines `Schema<Name>` (`Schema<"Health">` is apps/api's `Health` model).
- `scripts/contract-generate.mjs` and `scripts/contract-check.mjs` at the repo root — the
  ordered generation steps, and how a new generated artifact joins them.
- `docs/architecture.md`, "One backend, many thin clients" — why the contract is committed.

## Rules

- Never edit `src/schema.d.ts` by hand (`.claude/settings.json` denies reading it, since
  it's machine-generated and grows with the API). Look a type up through `Schema<"Name">`,
  or read the pydantic model in `apps/api/src/api`.
- A client-side type that disagrees with the generated one is a bug to fix in the API's
  model, not an override here.
- `apps/web` lists this package under `devDependencies` (type-only imports, erased by
  `tsc`/Next's build); a future client that needs the shapes at runtime would list it
  under `dependencies` instead.

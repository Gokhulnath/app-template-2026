"""Write the API's OpenAPI schema to apps/api/openapi.json -- the committed, checked
contract that packages/api-types' generated TypeScript types and apps/docs's reference
pages are both built from (docs/architecture.md, "The committed OpenAPI schema is the
contract"). Run it with `pnpm --filter api run export-openapi`, or indirectly through
`pnpm contract:generate`/`pnpm contract:check` from the repo root; never hand-edit the
output file.

Builds the FastAPI app directly rather than starting a server: create_app() never opens a
database connection (it connects lazily), so this needs neither a running API nor a
database, including in CI.

Deterministic on purpose (sorted keys, 2-space indent, trailing newline) so a real
contract change -- a new route, a changed field -- is the only thing that ever shows up
in `git diff`, and what lets `contract:check` (scripts/contract-check.mjs) detect drift
by regenerating and comparing.
"""

import json
from pathlib import Path

from api.main import create_app

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "openapi.json"


def export_schema() -> str:
    schema = create_app().openapi()
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def main() -> None:
    OUTPUT_PATH.write_text(export_schema())


if __name__ == "__main__":
    main()

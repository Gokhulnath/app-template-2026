"""Print the API's OpenAPI schema as JSON, for apps/docs's reference generator
(scripts/generate-openapi.mts). Builds the FastAPI app directly rather than starting a
server: create_app() never opens a database connection (it connects lazily), so this needs
neither a running API nor a database, including in CI.
"""

import json
import sys

from api.main import create_app


def main() -> None:
    schema = create_app().openapi()
    json.dump(schema, sys.stdout)


if __name__ == "__main__":
    main()

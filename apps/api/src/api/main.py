import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.routing import APIRoute
from pydantic import BaseModel
from scalar_fastapi import AgentScalarConfig, get_scalar_api_reference

from api.db import create_engine, database_ok
from api.problems import UnhandledErrorMiddleware, add_problem_handlers
from api.settings import Settings

logger = logging.getLogger("api")

LOCALHOST_ORIGINS = r"http://(localhost|127\.0\.0\.1)(:\d+)?"
# The docs page's script, pinned to an exact file and checked with Subresource Integrity,
# so a changed or tampered CDN file is refused by the browser. When bumping, recompute:
#   curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A
SCALAR_JS_URL = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0/dist/browser/standalone.js"
SCALAR_JS_SRI = (
    "sha384-oH1C0RwqcwbVXkC+r8A+4qRoyEUQdtxAzOwumkxZtQBBcsy61FOoPt7B50OVJYYQ"
)


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    db: Literal["ok", "unavailable"]


def operation_id(route: APIRoute) -> str:
    # "health-get_health" rather than FastAPI's default "get_health_health_get", so
    # clients generated from the OpenAPI schema get readable, stable method names.
    return f"{route.tags[0]}-{route.name}" if route.tags else route.name


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = create_engine(settings.database_url, settings.db_health_timeout)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # Warm the pool so the first /health doesn't pay for the cold connection. A down
        # database doesn't stop the API from starting; /health reports it instead.
        if not await database_ok(engine, settings.db_health_timeout):
            logger.warning("Database unreachable at startup; /health reports degraded.")
        yield
        await engine.dispose()

    app = FastAPI(
        title="myapp API",
        version="0.1.0",  # x-release-please-version
        lifespan=lifespan,
        generate_unique_id_function=operation_id,
        # Scalar replaces Swagger UI and ReDoc as the one interactive reference at /docs.
        docs_url=None,
        redoc_url=None,
    )

    # Middleware added later wraps middleware added earlier. Innermost first: unhandled
    # errors become a 500 problem *inside* CORS and request IDs, so it carries their headers.
    app.add_middleware(UnhandledErrorMiddleware)
    # Browser-based clients (the web app, the Tauri webview) need CORS. Native clients such
    # as the CLI, the MCP server and mobile apps send no Origin header, so it never applies
    # to them.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=LOCALHOST_ORIGINS if settings.cors_allow_localhost else None,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    # Outermost: every response, including 500s, carries X-Request-ID (a valid incoming one
    # is reused), so a client-side error can be matched to server logs.
    app.add_middleware(CorrelationIdMiddleware)
    add_problem_handlers(app)

    # Versioned resources live under /v1 (see docs/architecture.md); /health stays
    # unversioned so monitors and clients can always reach it.

    @app.get("/docs", include_in_schema=False)
    def docs() -> HTMLResponse:
        page = get_scalar_api_reference(
            openapi_url=app.openapi_url,
            title=f"{app.title} reference",
            scalar_js_url=SCALAR_JS_URL,
            telemetry=False,
            agent=AgentScalarConfig(disabled=True),
        )
        # scalar-fastapi has no SRI option, so add the attributes to its script tag.
        html = (
            bytes(page.body)
            .decode()
            .replace(
                f'<script src="{SCALAR_JS_URL}">',
                f'<script src="{SCALAR_JS_URL}" integrity="{SCALAR_JS_SRI}" '
                'crossorigin="anonymous">',
            )
        )
        return HTMLResponse(html)

    @app.get(
        "/health",
        tags=["health"],
        responses={
            503: {"model": Health, "description": "The database is unreachable."}
        },
    )
    async def get_health(response: Response) -> Health:
        if await database_ok(engine, settings.db_health_timeout):
            return Health(status="ok", db="ok")
        response.status_code = 503
        return Health(status="degraded", db="unavailable")

    return app


app = create_app()

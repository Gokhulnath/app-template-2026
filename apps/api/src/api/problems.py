"""RFC 9457 problem details: every error response is application/problem+json."""

import logging
from collections.abc import Mapping
from http import HTTPStatus
from typing import Any

from asgi_correlation_id import correlation_id
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

PROBLEM_JSON = "application/problem+json"

logger = logging.getLogger("api")


def problem(
    status: int,
    detail: str | None = None,
    headers: Mapping[str, str] | None = None,
    **extensions: Any,
) -> JSONResponse:
    title = HTTPStatus(status).phrase
    body: dict[str, Any] = {"type": "about:blank", "title": title, "status": status}
    if detail and detail != title:
        body["detail"] = detail
    if request_id := correlation_id.get():
        body["request_id"] = request_id
    body.update(extensions)
    return JSONResponse(
        body, status_code=status, headers=headers, media_type=PROBLEM_JSON
    )


def add_problem_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        if isinstance(exc.detail, str):
            return problem(exc.status_code, exc.detail, headers=exc.headers)
        # RFC 9457's "detail" is a string; structured details go in an extension.
        return problem(
            exc.status_code, headers=exc.headers, context=jsonable_encoder(exc.detail)
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return problem(
            422, "Request validation failed.", errors=jsonable_encoder(exc.errors())
        )


class UnhandledErrorMiddleware:
    """Turns an unhandled exception into a generic 500 problem.

    Add it before (inside) the CORS and request-ID middleware so the 500 still gets their
    headers. FastAPI's exception_handler(Exception) can't do this: it runs in Starlette's
    outermost error middleware, outside everything added with add_middleware.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def send_and_track(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_and_track)
        except Exception:
            # Logged here with its traceback; the client only sees a generic 500.
            logger.exception("Unhandled error")
            if response_started:
                raise
            await problem(500)(scope, receive, send)

from collections.abc import Iterator

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient
from support import IsolatedSettings

from api.main import create_app
from api.problems import PROBLEM_JSON


def app_with_test_routes() -> FastAPI:
    app = create_app(IsolatedSettings(cors_allow_localhost=True))

    @app.get("/items/{item_id}", tags=["test"])
    def get_item(item_id: int) -> dict[str, int]:
        return {"id": item_id}

    @app.get("/boom", tags=["test"])
    def boom() -> None:
        raise RuntimeError("secret internals")

    @app.get("/stream-then-fail", tags=["test"])
    def stream_then_fail() -> StreamingResponse:
        def chunks() -> Iterator[bytes]:
            yield b"first chunk"
            raise RuntimeError("failed mid-stream")

        return StreamingResponse(chunks())

    @app.get("/conflict", tags=["test"])
    def conflict() -> None:
        raise HTTPException(409, detail={"field": "name", "reason": "taken"})

    return app


client = TestClient(app_with_test_routes(), raise_server_exceptions=False)


def test_not_found_is_a_problem() -> None:
    response = client.get("/nope")
    assert response.status_code == 404
    assert response.headers["content-type"] == PROBLEM_JSON
    body = response.json()
    assert {k: body[k] for k in ("type", "title", "status")} == {
        "type": "about:blank",
        "title": "Not Found",
        "status": 404,
    }


def test_validation_error_lists_errors() -> None:
    response = client.get("/items/abc")
    body = response.json()
    assert response.status_code == 422
    assert response.headers["content-type"] == PROBLEM_JSON
    assert body["title"] == "Unprocessable Content"
    assert body["errors"][0]["loc"] == ["path", "item_id"]


def test_unhandled_error_hides_internals(caplog: pytest.LogCaptureFixture) -> None:
    response = client.get("/boom")
    assert "secret internals" in caplog.text  # logged server-side with its traceback
    assert response.status_code == 500
    assert response.headers["content-type"] == PROBLEM_JSON
    assert "secret internals" not in response.text
    assert response.json()["request_id"]


def test_unhandled_error_keeps_request_id_and_cors_headers() -> None:
    response = client.get("/boom", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 500
    assert response.headers["x-request-id"] == response.json()["request_id"]
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_structured_http_exception_detail_is_kept() -> None:
    response = client.get("/conflict")
    assert response.status_code == 409
    assert response.json()["context"] == {"field": "name", "reason": "taken"}


def test_error_after_the_response_started_is_logged_not_rewritten(
    caplog: pytest.LogCaptureFixture,
) -> None:
    # Headers are already sent, so the middleware can't switch to a 500 problem; it logs
    # and re-raises, and the client gets the partial body.
    response = client.get("/stream-then-fail")
    assert response.status_code == 200
    assert response.content == b"first chunk"
    assert "failed mid-stream" in caplog.text

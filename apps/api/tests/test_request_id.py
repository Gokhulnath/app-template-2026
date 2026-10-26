import re
from uuid import uuid4

from fastapi.testclient import TestClient
from support import IsolatedSettings

from api.main import create_app

client = TestClient(create_app(IsolatedSettings(cors_allow_localhost=True)))


def test_every_response_gets_a_request_id() -> None:
    response = client.get("/openapi.json")
    assert re.fullmatch(r"[0-9a-f]{32}", response.headers["x-request-id"])


def test_a_valid_incoming_request_id_is_reused() -> None:
    request_id = uuid4().hex
    response = client.get("/openapi.json", headers={"X-Request-ID": request_id})
    assert response.headers["x-request-id"] == request_id


def test_problems_carry_the_request_id() -> None:
    response = client.get("/nope")
    assert response.json()["request_id"] == response.headers["x-request-id"]


def test_browsers_may_read_the_request_id() -> None:
    response = client.get("/openapi.json", headers={"Origin": "http://localhost:3000"})
    assert response.headers["access-control-expose-headers"] == "X-Request-ID"

"""
Test configuration and fixtures.
"""

import os
import pytest
from fastapi.testclient import TestClient

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = ""
os.environ["SQLITE_DB_PATH"] = ":memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only"
os.environ["DEBUG"] = "true"


@pytest.fixture(scope="session")
def app():
    """Create test FastAPI application."""
    from main import app as fastapi_app

    return fastapi_app


@pytest.fixture(scope="session")
def client(app):
    """Create test HTTP client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth_token(client):
    """Create a test user and return auth token."""
    r = client.post(
        "/api/auth/signup",
        json={"name": "Fixture User", "email": "fixture@nutrisync.dev", "password": "FixturePass123!"},
    )
    if r.status_code == 200:
        return r.json()["access_token"]
    # Try login if already exists
    r = client.post("/api/auth/login", json={"email": "fixture@nutrisync.dev", "password": "FixturePass123!"})
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    """Return auth headers for test requests."""
    return {"Authorization": f"Bearer {auth_token}"}

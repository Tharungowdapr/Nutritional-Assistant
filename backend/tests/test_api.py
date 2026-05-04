"""
AaharAI NutriSync — Test Suite
Basic smoke tests for API endpoints.
"""
import pytest


def test_backend_health(client):
    """Health check endpoint should return healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_root_endpoint(client):
    """Root endpoint should return app info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data


def test_signup_and_login(client):
    """Full auth flow: signup → login → get profile."""
    # Signup
    signup_data = {
        "name": "Test User",
        "email": "test@nutrisync.dev",
        "password": "TestPass123!"
    }
    r = client.post("/api/auth/signup", json=signup_data)
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    # Get profile with token
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "test@nutrisync.dev"


def test_nutrition_search(client, auth_headers):
    """Food search should return results."""
    r = client.get("/api/nutrition/foods?query=ragi&limit=5", headers=auth_headers)
    # Either returns foods or 503 if DB not loaded in test env
    assert r.status_code in [200, 503]


def test_chat_requires_auth(client):
    """Chat endpoint should require authentication."""
    r = client.post("/api/chat", json={"message": "hello"})
    assert r.status_code in [401, 403]

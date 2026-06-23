"""
Authentication flow tests — signup, login, profile, token validation.
"""

import pytest

VALID_USER = {
    "name": "Auth Test User",
    "email": "authtest@nutrisync.dev",
    "password": "AuthTest123!",
}


class TestSignup:
    def test_signup_success(self, client):
        """Valid signup should return access_token."""
        r = client.post("/api/auth/signup", json=VALID_USER)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_signup_duplicate_email(self, client):
        """Signing up with an existing email should fail."""
        client.post("/api/auth/signup", json=VALID_USER)  # first signup
        r = client.post("/api/auth/signup", json=VALID_USER)  # duplicate
        assert r.status_code in [400, 409]

    def test_signup_missing_fields(self, client):
        """Signup without required fields should return 422."""
        r = client.post("/api/auth/signup", json={"email": "incomplete@test.com"})
        assert r.status_code == 422

    def test_signup_weak_password(self, client):
        """Signup with a too-short password should fail validation."""
        r = client.post(
            "/api/auth/signup",
            json={"name": "Test", "email": "weak@test.com", "password": "123"},
        )
        assert r.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        """Valid credentials should return a JWT token."""
        client.post("/api/auth/signup", json=VALID_USER)
        r = client.post(
            "/api/auth/login",
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_wrong_password(self, client):
        """Wrong password should return 401."""
        r = client.post(
            "/api/auth/login",
            json={"email": VALID_USER["email"], "password": "wrongpassword"},
        )
        assert r.status_code == 401

    def test_login_nonexistent_user(self, client):
        """Login with unknown email should return 401."""
        r = client.post(
            "/api/auth/login",
            json={"email": "nobody@nowhere.com", "password": "anything"},
        )
        assert r.status_code == 401


class TestProfile:
    def test_get_profile_with_token(self, client, auth_headers):
        """Authenticated user should retrieve their profile."""
        r = client.get("/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "email" in data
        assert "name" in data

    def test_get_profile_without_token(self, client):
        """Unauthenticated request should be rejected."""
        r = client.get("/api/auth/me")
        assert r.status_code in [401, 403]

    def test_get_profile_invalid_token(self, client):
        """Invalid Bearer token should be rejected."""
        r = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken123"})
        assert r.status_code == 401

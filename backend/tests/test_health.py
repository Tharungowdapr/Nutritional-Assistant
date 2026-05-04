"""
Health check tests — verify all critical API system endpoints.
"""
import pytest


class TestHealthEndpoints:
    def test_health_returns_200(self, client):
        """Health endpoint must always return 200 while server is running."""
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_health_schema(self, client):
        """Health response must include all required fields."""
        r = client.get("/api/health")
        data = r.json()
        assert "status" in data
        assert "database_loaded" in data
        assert "ollama_available" in data
        assert "groq_available" in data

    def test_health_status_is_healthy(self, client):
        """Status value should be 'healthy'."""
        r = client.get("/api/health")
        assert r.json()["status"] == "healthy"

    def test_root_returns_app_info(self, client):
        """Root endpoint should return app name and version."""
        r = client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "AaharAI NutriSync"
        assert "version" in data
        assert "docs" in data

    def test_docs_endpoint(self, client):
        """Swagger UI should be accessible."""
        r = client.get("/docs")
        assert r.status_code == 200

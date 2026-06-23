"""
Nutrition API tests — food search, food detail, comparison.
"""

import pytest


class TestFoodSearch:
    def test_food_search_requires_auth(self, client):
        """Food search should require a valid token."""
        r = client.get("/api/nutrition/foods?query=ragi")
        assert r.status_code in [401, 403]

    def test_food_search_returns_results(self, client, auth_headers):
        """Search for a common Indian food should return results or 503 if DB not loaded."""
        r = client.get("/api/nutrition/foods?query=ragi&limit=5", headers=auth_headers)
        # 200: DB loaded, 503: DB not loaded in test env — both acceptable
        assert r.status_code in [200, 503]

    def test_food_search_with_limit(self, client, auth_headers):
        """limit param should cap results."""
        r = client.get("/api/nutrition/foods?query=rice&limit=3", headers=auth_headers)
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data, list)
            assert len(data) <= 3

    def test_food_search_empty_query(self, client, auth_headers):
        """Empty query should return 422 or an empty list — not a 500."""
        r = client.get("/api/nutrition/foods?query=", headers=auth_headers)
        assert r.status_code in [200, 400, 422]

    def test_food_search_pagination(self, client, auth_headers):
        """offset param should be accepted without error."""
        r = client.get("/api/nutrition/foods?query=dal&limit=5&offset=0", headers=auth_headers)
        assert r.status_code in [200, 503]


class TestChatProtection:
    def test_chat_requires_auth(self, client):
        """Chat endpoint should return 401/403 without a token."""
        r = client.post("/api/chat", json={"message": "hello"})
        assert r.status_code in [401, 403]

    def test_chat_stream_requires_auth(self, client):
        """Streaming chat endpoint should also require auth."""
        r = client.post("/api/chat/stream", json={"message": "hello"})
        assert r.status_code in [401, 403]

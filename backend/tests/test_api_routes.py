"""
API Route Tests for Instagram Agent.
Tests FastAPI endpoints: /api/config, /api/health, /api/integrations, /api/ai/generate, /api/google-drive/media.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config.settings import settings


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["mode"] == "live"


@pytest.mark.asyncio
async def test_config_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/config")
        assert response.status_code == 200
        data = response.json()
        assert data["demo_mode"] is False
        assert data["app_mode"] == "live"


@pytest.mark.asyncio
async def test_integrations_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/integrations")
        assert response.status_code == 200
        data = response.json()
        assert data["demo_mode"] is False
        assert data["app_mode"] == "live"
        services = [item["service"] for item in data["integrations"]]
        assert "openai" in services
        assert "instagram" in services
        assert "google_drive" in services
        assert "google_sheets" in services

        for item in data["integrations"]:
            # Ensure none have status == "demo"
            assert item["status"] in ["connected", "not_configured", "error"]
            assert item.get("is_demo") is False


@pytest.mark.asyncio
async def test_ai_generate_missing_key_returns_400():
    original_key = settings.openai_api_key
    try:
        settings.openai_api_key = ""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post("/api/ai/generate", json={
                "topic": "Coffee mornings",
                "tone": "friendly",
                "language": "English"
            })
            assert response.status_code == 400
            assert "not configured" in response.json()["detail"].lower()
    finally:
        settings.openai_api_key = original_key


@pytest.mark.asyncio
async def test_google_drive_media_unconfigured_returns_no_fake_files():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/google-drive/media")
        assert response.status_code == 200
        data = response.json()
        if not settings.is_google_configured:
            assert data["connected"] is False
            assert len(data["files"]) == 0

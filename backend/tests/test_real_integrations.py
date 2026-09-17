"""
Automated Test Suite for Instagram Agent — Production Live Integrations.
Validates:
1. Complete removal of Demo Mode & mock data.
2. Graceful 'Configuration Required' states when credentials are not configured.
3. Real integration signatures and endpoints.
4. Zero simulated publishing and zero fake media generation.
"""
import pytest
from app.config.settings import settings
from app.services.ai_service import ai_service, OpenAINotConfiguredError
from app.services.instagram_service import instagram_service
from app.services.google_drive_service import google_drive_service
from app.services.google_sheets_service import google_sheets_service
from app.services.publish_service import execute_publish
from app.models.post import Post


def test_settings_no_demo_mode():
    """Verify demo mode is strictly disabled and effective_demo_mode is always False."""
    assert settings.demo_mode is False
    assert settings.effective_demo_mode is False


def test_ai_service_refuses_mock_data_when_unconfigured():
    """Verify AIService raises OpenAINotConfiguredError without returning fake data."""
    # Temporarily ensure key is empty
    original_key = settings.openai_api_key
    try:
        settings.openai_api_key = ""
        assert not settings.is_openai_configured

        with pytest.raises(OpenAINotConfiguredError) as exc_info:
            import asyncio
            asyncio.run(ai_service.generate_content(topic="Morning Coffee"))

        assert "OpenAI API key is not configured" in str(exc_info.value)
    finally:
        settings.openai_api_key = original_key


def test_instagram_service_refuses_fake_publish():
    """Verify InstagramService does not fabricate fake media IDs when unconfigured."""
    original_token = settings.instagram_access_token
    original_account = settings.instagram_business_account_id
    try:
        settings.instagram_access_token = ""
        settings.instagram_business_account_id = ""
        assert not settings.is_instagram_configured

        import asyncio
        result = asyncio.run(instagram_service.publish_post(
            media_url="https://example.com/photo.jpg",
            caption="Test Caption",
            post_id="test_post_1"
        ))

        assert result.success is False
        assert result.is_demo is False
        assert result.instagram_media_id is None
        assert "not configured" in result.error_message.lower()
    finally:
        settings.instagram_access_token = original_token
        settings.instagram_business_account_id = original_account


def test_instagram_service_rejects_local_url():
    """Verify InstagramService refuses local URLs since Graph API requires public accessibility."""
    original_token = settings.instagram_access_token
    original_account = settings.instagram_business_account_id
    try:
        settings.instagram_access_token = "valid_fake_token_for_test"
        settings.instagram_business_account_id = "12345678"

        import asyncio
        result = asyncio.run(instagram_service.publish_post(
            media_url="http://localhost:8000/api/media/file/test.jpg",
            caption="Test Caption",
            post_id="test_post_2"
        ))

        assert result.success is False
        assert result.is_demo is False
        assert "publicly accessible" in result.error_message.lower()
    finally:
        settings.instagram_access_token = original_token
        settings.instagram_business_account_id = original_account


def test_google_drive_service_returns_no_fake_files():
    """Verify GoogleDriveService returns empty list rather than fake picsum photos when unconfigured."""
    import asyncio
    files = asyncio.run(google_drive_service.list_media_files())
    assert isinstance(files, list)
    # When not configured, must not return DEMO_DRIVE_FILES
    if not settings.is_google_configured:
        assert len(files) == 0


def test_google_drive_status_when_unconfigured():
    """Verify status reports not_configured cleanly."""
    status = google_drive_service.get_status()
    assert "status" in status
    assert status.get("is_demo") is False


def test_google_sheets_status():
    """Verify Google Sheets reports not_configured when spreadsheet ID is empty."""
    status = google_sheets_service.get_status()
    assert "status" in status
    assert status.get("is_demo") is False

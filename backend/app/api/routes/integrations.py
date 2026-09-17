from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app.config.settings import settings
from app.services.instagram_service import instagram_service
from app.services.google_drive_service import google_drive_service
from app.services.google_sheets_service import google_sheets_service
from app.services.ai_service import ai_service, OpenAINotConfiguredError
import logging

router = APIRouter(prefix="/integrations", tags=["Integrations"])
logger = logging.getLogger(__name__)


def _get_integration_status() -> list:
    """Build real integration status list from settings and credentials."""
    gdrive_stat = google_drive_service.get_status()
    gsheets_stat = google_sheets_service.get_status()

    return [
        {
            "service": "openai",
            "display_name": "OpenAI (GPT-4o)",
            "description": "AI caption, hashtag, and CTA generation",
            "status": "connected" if settings.is_openai_configured else "not_configured",
            "is_demo": False,
            "configured": settings.is_openai_configured,
            "icon": "brain",
            "setup_guide": "Add OPENAI_API_KEY in backend/.env to enable real GPT-4o content generation.",
        },
        {
            "service": "instagram",
            "display_name": "Instagram Graph API",
            "description": "Direct publishing to your Instagram Business account",
            "status": "connected" if settings.is_instagram_configured else "not_configured",
            "is_demo": False,
            "configured": settings.is_instagram_configured,
            "icon": "instagram",
            "setup_guide": "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in backend/.env.",
        },
        {
            "service": "google_drive",
            "display_name": "Google Drive",
            "description": "Import image and video assets directly from Google Drive",
            "status": gdrive_stat.get("status", "not_configured"),
            "is_demo": False,
            "configured": gdrive_stat.get("configured", False),
            "icon": "hard-drive",
            "setup_guide": "Configure GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET or GOOGLE_SERVICE_ACCOUNT_JSON in backend/.env.",
        },
        {
            "service": "google_sheets",
            "display_name": "Google Sheets",
            "description": "Automatically append published post logs to a Google Sheet",
            "status": gsheets_stat.get("status", "not_configured"),
            "is_demo": False,
            "configured": gsheets_stat.get("configured", False),
            "icon": "table",
            "setup_guide": "Set GOOGLE_SHEETS_SPREADSHEET_ID and Google credentials in backend/.env.",
        },
    ]


@router.get("")
async def list_integrations():
    """Get status of all external integrations. Live mode only."""
    return {
        "integrations": _get_integration_status(),
        "demo_mode": False,
        "app_mode": "live",
    }


@router.post("/{service}/test")
async def test_integration(service: str, db: AsyncSession = Depends(get_db)):
    """Test a specific external integration connection."""
    if service == "instagram":
        return await instagram_service.validate_connection()

    elif service == "google_drive":
        return google_drive_service.get_status()

    elif service == "google_sheets":
        return google_sheets_service.get_status()

    elif service == "openai":
        if not settings.is_openai_configured:
            return {
                "connected": False,
                "status": "not_configured",
                "message": "OpenAI API key is not configured in .env.",
                "configured": False,
            }
        try:
            result = await ai_service.generate_content(
                topic="test connection",
                tone="friendly",
                language="English"
            )
            return {
                "connected": True,
                "status": "connected",
                "message": "OpenAI connection successful.",
                "configured": True,
            }
        except OpenAINotConfiguredError as e:
            return {
                "connected": False,
                "status": "not_configured",
                "message": str(e),
                "configured": False,
            }
        except Exception as e:
            return {
                "connected": False,
                "status": "error",
                "message": f"OpenAI error: {str(e)}",
                "configured": True,
            }
    else:
        return {"error": f"Unknown service: {service}"}

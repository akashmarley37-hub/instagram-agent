from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app.services.instagram_service import instagram_service
from app.services.activity_service import log_activity
from app.config.settings import settings

router = APIRouter(prefix="/instagram", tags=["Instagram"])


@router.get("/status")
async def get_instagram_status():
    """Get Instagram integration status."""
    status = instagram_service.get_status()
    return {
        **status,
        "is_demo": False,
        "configured": settings.is_instagram_configured,
        "account_id": settings.instagram_business_account_id if settings.is_instagram_configured else None,
    }


@router.post("/test")
async def test_instagram_connection(db: AsyncSession = Depends(get_db)):
    """Test the Instagram Graph API connection."""
    result = await instagram_service.validate_connection()

    await log_activity(
        db=db,
        action="instagram_connection_tested",
        description=f"Instagram connection test: {result.get('status', 'unknown')}",
        status="success" if result.get("connected") else "warning",
        metadata={
            "status": result.get("status"),
            "connected": result.get("connected"),
            "account_id": result.get("account_id")
        }
    )
    return result

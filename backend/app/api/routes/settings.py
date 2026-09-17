from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.db import get_db
from app.models.settings import UserSettings
from app.schemas.schemas import UserSettingsSchema, UserSettingsUpdate
import logging

router = APIRouter(prefix="/settings", tags=["Settings"])
logger = logging.getLogger(__name__)


async def _get_or_create_settings(db: AsyncSession) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.id == "default"))
    settings_obj = result.scalar_one_or_none()
    if not settings_obj:
        settings_obj = UserSettings(
            id="default",
            default_tone="friendly",
            default_language="English",
            default_hashtags=[],
            timezone="Asia/Kolkata",
            brand_instructions="",
            post_length="medium",
        )
        db.add(settings_obj)
        await db.commit()
        await db.refresh(settings_obj)
    return settings_obj


@router.get("", response_model=UserSettingsSchema)
async def get_user_settings(db: AsyncSession = Depends(get_db)):
    """Retrieve application settings."""
    settings_obj = await _get_or_create_settings(db)
    return settings_obj


@router.put("", response_model=UserSettingsSchema)
async def update_user_settings(
    body: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update application settings."""
    settings_obj = await _get_or_create_settings(db)
    update_data = body.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(settings_obj, field, val)

    await db.commit()
    await db.refresh(settings_obj)
    logger.info("Updated application settings successfully")
    return settings_obj

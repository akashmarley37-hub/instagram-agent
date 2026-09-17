"""
Activity Logger — Records all user-visible events.
Wraps DB inserts with a clean interface.
"""
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.activity import ActivityLog

logger = logging.getLogger(__name__)


async def log_activity(
    db: AsyncSession,
    action: str,
    description: str,
    status: str = "info",
    post_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> ActivityLog:
    """Create an activity log entry."""
    entry = ActivityLog(
        post_id=post_id,
        action=action,
        description=description,
        status=status,
        metadata_json=metadata or {},
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info(f"[ACTIVITY] [{status.upper()}] {action}: {description[:80]}")
    return entry


async def get_recent_activity(db: AsyncSession, limit: int = 50, post_id: Optional[str] = None) -> list:
    """Fetch recent activity log entries."""
    query = select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(limit)
    if post_id:
        query = query.where(ActivityLog.post_id == post_id)
    result = await db.execute(query)
    return list(result.scalars().all())

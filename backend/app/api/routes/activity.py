from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app.services.activity_service import get_recent_activity

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("")
async def list_activity(
    limit: int = Query(default=50, ge=1, le=200),
    post_id: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get recent activity log."""
    logs = await get_recent_activity(db, limit=limit, post_id=post_id)
    return {
        "items": [
            {
                "id": log.id,
                "post_id": log.post_id,
                "action": log.action,
                "description": log.description,
                "status": log.status,
                "metadata": log.metadata_json,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": len(logs)
    }

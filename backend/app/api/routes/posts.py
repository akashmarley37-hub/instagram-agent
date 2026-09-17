import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.database.db import get_db
from app.models.post import Post, PublishingAttempt
from app.models.media import Media
from app.schemas.schemas import (
    PostCreate, PostUpdate, PostResponse, SchedulePostRequest,
    PublishRequest, PaginatedResponse, SuccessResponse
)
from app.services.activity_service import log_activity
from app.services.publish_service import execute_publish
from app.services.scheduler_service import schedule_post, cancel_scheduled_post
import logging

router = APIRouter(prefix="/posts", tags=["Posts"])
logger = logging.getLogger(__name__)


def _post_to_dict(post: Post, media: Media = None) -> dict:
    return {
        "id": post.id,
        "media_id": post.media_id,
        "caption": post.caption,
        "hashtags": post.hashtags or [],
        "call_to_action": post.call_to_action,
        "topic": post.topic,
        "tone": post.tone,
        "language": post.language,
        "status": post.status,
        "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
        "published_at": post.published_at.isoformat() if post.published_at else None,
        "instagram_media_id": post.instagram_media_id,
        "is_demo": post.is_demo,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat(),
        "media": {
            "id": media.id,
            "filename": media.filename,
            "original_name": media.original_name,
            "file_type": media.file_type,
            "mime_type": media.mime_type,
            "file_size": media.file_size,
            "url": f"/api/media/file/{media.filename}",
            "width": media.width,
            "height": media.height,
            "created_at": media.created_at.isoformat(),
        } if media else None,
        "publishing_attempts": [
            {
                "id": a.id,
                "attempted_at": a.attempted_at.isoformat(),
                "status": a.status,
                "response_code": a.response_code,
                "error_message": a.error_message,
                "is_demo": a.is_demo,
            }
            for a in (post.publishing_attempts or [])
        ]
    }


@router.post("", status_code=201)
async def create_post(body: PostCreate, db: AsyncSession = Depends(get_db)):
    """Create a new post or draft."""
    from app.config.settings import settings
    post = Post(
        media_id=body.media_id,
        caption=body.caption,
        hashtags=body.hashtags or [],
        call_to_action=body.call_to_action,
        topic=body.topic,
        tone=body.tone or "friendly",
        language=body.language or "English",
        status=body.status or "draft",
        is_demo=False,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    await log_activity(
        db=db,
        action="post_created",
        description=f"New post created as '{post.status}'",
        status="info",
        post_id=post.id,
        metadata={"status": post.status}
    )

    media = None
    if post.media_id:
        m = await db.execute(select(Media).where(Media.id == post.media_id))
        media = m.scalar_one_or_none()

    return _post_to_dict(post, media)


@router.get("")
async def list_posts(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=50),
    status: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """List posts with optional status filter."""
    query = select(Post).order_by(desc(Post.updated_at))
    if status:
        query = query.where(Post.status == status)

    count_query = select(func.count()).select_from(Post)
    if status:
        count_query = count_query.where(Post.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    posts = result.scalars().all()

    items = []
    for post in posts:
        media = None
        if post.media_id:
            m = await db.execute(select(Media).where(Media.id == post.media_id))
            media = m.scalar_one_or_none()
        # Load publishing attempts
        pa = await db.execute(
            select(PublishingAttempt).where(PublishingAttempt.post_id == post.id).order_by(desc(PublishingAttempt.attempted_at))
        )
        post.publishing_attempts = pa.scalars().all()
        items.append(_post_to_dict(post, media))

    pages = math.ceil(total / per_page) if total > 0 else 1
    return {"items": items, "total": total, "page": page, "per_page": per_page, "pages": pages}


@router.get("/{post_id}")
async def get_post(post_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single post by ID."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    media = None
    if post.media_id:
        m = await db.execute(select(Media).where(Media.id == post.media_id))
        media = m.scalar_one_or_none()

    pa = await db.execute(
        select(PublishingAttempt).where(PublishingAttempt.post_id == post.id).order_by(desc(PublishingAttempt.attempted_at))
    )
    post.publishing_attempts = pa.scalars().all()

    return _post_to_dict(post, media)


@router.put("/{post_id}")
async def update_post(post_id: str, body: PostUpdate, db: AsyncSession = Depends(get_db)):
    """Update a post."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(post, field, value)

    await db.commit()
    await db.refresh(post)

    await log_activity(
        db=db, action="post_updated",
        description="Post content updated",
        status="info", post_id=post.id
    )

    media = None
    if post.media_id:
        m = await db.execute(select(Media).where(Media.id == post.media_id))
        media = m.scalar_one_or_none()

    pa = await db.execute(
        select(PublishingAttempt).where(PublishingAttempt.post_id == post.id)
    )
    post.publishing_attempts = pa.scalars().all()
    return _post_to_dict(post, media)


@router.delete("/{post_id}")
async def delete_post(post_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a post."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Cancel scheduler job if any
    if post.scheduler_job_id:
        cancel_scheduled_post(post.scheduler_job_id)

    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(PublishingAttempt).where(PublishingAttempt.post_id == post_id))
    await db.execute(sql_delete(Post).where(Post.id == post_id))
    await db.commit()

    return {"success": True, "message": "Post deleted"}


@router.post("/{post_id}/publish")
async def publish_post(
    post_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Publish a post immediately."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.status == "published":
        raise HTTPException(status_code=400, detail="Post is already published")

    try:
        pub_result = await execute_publish(post_id, db)
        return pub_result
    except Exception as e:
        logger.error(f"Publish route error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{post_id}/schedule")
async def schedule_post_route(
    post_id: str,
    body: SchedulePostRequest,
    db: AsyncSession = Depends(get_db),
):
    """Schedule a post for future publishing."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Schedule the job
    job_id = await schedule_post(post_id, body.scheduled_at, body.timezone)

    # Update post
    post.status = "scheduled"
    post.scheduled_at = body.scheduled_at
    post.scheduler_job_id = job_id
    await db.commit()

    await log_activity(
        db=db,
        action="post_scheduled",
        description=f"Post scheduled for {body.scheduled_at.isoformat()}",
        status="info",
        post_id=post_id,
        metadata={"scheduled_at": body.scheduled_at.isoformat(), "timezone": body.timezone}
    )

    return {
        "success": True,
        "message": f"Post scheduled for {body.scheduled_at.isoformat()}",
        "job_id": job_id,
        "scheduled_at": body.scheduled_at.isoformat(),
    }


@router.post("/{post_id}/retry")
async def retry_post(post_id: str, db: AsyncSession = Depends(get_db)):
    """Retry publishing a failed post."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.status not in ["failed", "draft", "scheduled"]:
        raise HTTPException(status_code=400, detail=f"Cannot retry a post with status '{post.status}'")

    await log_activity(
        db=db, action="post_retry_initiated",
        description="Publishing retry initiated",
        status="info", post_id=post_id
    )

    try:
        pub_result = await execute_publish(post_id, db)
        return pub_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

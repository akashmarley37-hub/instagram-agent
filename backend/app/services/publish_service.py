"""
Publish Service — Core publishing workflow.
Orchestrates: Media URL verification → Instagram Graph API → DB update → Activity log → Google Sheets sync.
Production implementation: Zero mock publishing, zero fake media IDs.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.post import Post, PublishingAttempt
from app.models.media import Media
from app.services.instagram_service import instagram_service
from app.services.google_sheets_service import google_sheets_service
from app.services.activity_service import log_activity
from app.config.settings import settings

logger = logging.getLogger(__name__)


async def execute_publish(post_id: str, db: AsyncSession) -> dict:
    """
    Core publish workflow.
    Executes real Instagram Graph API publication.
    Called directly (Publish Now) or by scheduler (scheduled posts).
    """
    # Load post
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise ValueError(f"Post {post_id} not found")

    # Load media
    media = None
    is_video = False
    if post.media_id:
        media_result = await db.execute(select(Media).where(Media.id == post.media_id))
        media = media_result.scalar_one_or_none()
        if media:
            is_video = (
                media.file_type == "video"
                or (media.mime_type and media.mime_type.startswith("video/"))
            )

    # Update post status to publishing
    post.status = "publishing"
    await db.commit()

    # Build public media URL for Instagram Graph API
    media_url = ""
    if media:
        base_url = settings.public_base_url.rstrip("/") if settings.public_base_url else "http://localhost:8000"
        media_url = f"{base_url}/api/media/file/{media.filename}"

    # Build caption with hashtags
    caption_parts = []
    if post.caption:
        caption_parts.append(post.caption)
    if post.call_to_action:
        caption_parts.append(f"\n{post.call_to_action}")
    if post.hashtags:
        caption_parts.append("\n\n" + " ".join(post.hashtags))
    full_caption = "\n".join(caption_parts)

    # Execute real Instagram publishing
    pub_result = await instagram_service.publish_post(
        media_url=media_url,
        caption=full_caption,
        post_id=post_id,
        is_video=is_video,
    )

    # Create publishing attempt record
    attempt = PublishingAttempt(
        post_id=post_id,
        status="success" if pub_result.success else "failed",
        response_code=pub_result.response_code,
        error_message=pub_result.error_message,
        response_payload=pub_result.response_payload,
        is_demo=pub_result.is_demo,
    )
    db.add(attempt)

    # Update post status
    if pub_result.success:
        post.status = "published"
        post.published_at = datetime.now(timezone.utc)
        post.instagram_media_id = pub_result.instagram_media_id
        post.is_demo = pub_result.is_demo

        log_desc = (
            "[DEMO] Post simulated and published in Demo Mode (no real Instagram post created)."
            if pub_result.is_demo
            else "Post published successfully to Instagram."
        )
        await log_activity(
            db=db,
            action="post_published",
            description=log_desc,
            status="success",
            post_id=post_id,
            metadata={
                "instagram_media_id": pub_result.instagram_media_id,
                "is_demo": pub_result.is_demo,
            }
        )
        logger.info(f"Post {post_id} published successfully ({'Demo' if pub_result.is_demo else 'Live'} Media ID: {pub_result.instagram_media_id})")

        # Sync to Google Sheets if configured
        try:
            await google_sheets_service.log_post_to_sheet(
                post_id=post_id,
                status="published",
                caption=post.caption or "",
                hashtags=post.hashtags,
                instagram_media_id=pub_result.instagram_media_id,
                media_url=media_url,
            )
        except Exception as e:
            logger.error(f"Google Sheets sync error: {e}")

    else:
        post.status = "failed"
        await log_activity(
            db=db,
            action="post_publish_failed",
            description=f"Instagram publishing failed: {pub_result.error_message or 'Unknown error'}",
            status="error",
            post_id=post_id,
            metadata={"error": pub_result.error_message}
        )
        logger.error(f"Post {post_id} publishing failed: {pub_result.error_message}")

    await db.commit()
    await db.refresh(post)

    return {
        "success": pub_result.success,
        "is_demo": pub_result.is_demo,
        "instagram_media_id": pub_result.instagram_media_id,
        "error_message": pub_result.error_message,
        "status": post.status,
    }

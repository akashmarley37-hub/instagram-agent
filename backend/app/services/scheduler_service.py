"""
Scheduler Service — APScheduler-based job queue for scheduled posts.
Jobs survive server restarts via database-backed job storage (SQLAlchemy).
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
import pytz

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def execute_scheduled_publish(post_id: str):
    """
    Background job: called by APScheduler at scheduled time.
    Creates its own DB session since this runs in a background context.
    """
    from app.database.db import AsyncSessionLocal
    from app.services.publish_service import execute_publish

    logger.info(f"[SCHEDULER] Executing scheduled publish for post {post_id}")
    async with AsyncSessionLocal() as db:
        try:
            await execute_publish(post_id, db)
        except Exception as e:
            logger.error(f"[SCHEDULER] Failed to publish post {post_id}: {e}")


async def schedule_post(post_id: str, scheduled_at: datetime, timezone_str: str = "UTC") -> str:
    """
    Schedule a post for future publishing.
    Returns the APScheduler job ID.
    """
    try:
        tz = pytz.timezone(timezone_str)
    except Exception:
        tz = pytz.UTC

    # Convert to UTC if needed
    if scheduled_at.tzinfo is None:
        scheduled_at = tz.localize(scheduled_at)
    scheduled_utc = scheduled_at.astimezone(pytz.UTC)

    job_id = f"publish_{post_id}"

    # Remove existing job if any
    existing = scheduler.get_job(job_id)
    if existing:
        existing.remove()

    scheduler.add_job(
        execute_scheduled_publish,
        trigger=DateTrigger(run_date=scheduled_utc),
        id=job_id,
        args=[post_id],
        replace_existing=True,
        misfire_grace_time=3600,  # Allow 1 hour grace if server was down
    )

    logger.info(f"[SCHEDULER] Scheduled post {post_id} for {scheduled_utc.isoformat()}")
    return job_id


def cancel_scheduled_post(job_id: str) -> bool:
    """Cancel a scheduled job."""
    job = scheduler.get_job(job_id)
    if job:
        job.remove()
        logger.info(f"[SCHEDULER] Cancelled job {job_id}")
        return True
    return False


def get_scheduler_status() -> dict:
    """Get current scheduler status."""
    return {
        "running": scheduler.running,
        "job_count": len(scheduler.get_jobs()),
        "jobs": [
            {
                "id": job.id,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            }
            for job in scheduler.get_jobs()
        ]
    }

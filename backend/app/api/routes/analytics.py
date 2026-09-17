from datetime import datetime, timedelta, timezone
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database.db import get_db
from app.models.post import Post
from app.schemas.schemas import AnalyticsOverviewResponse
import logging

router = APIRouter(prefix="/analytics", tags=["Analytics"])
logger = logging.getLogger(__name__)


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    """Get high-level analytics and breakdown for all posts."""
    # Fetch all posts
    result = await db.execute(select(Post))
    posts = result.scalars().all()

    total = len(posts)
    published = sum(1 for p in posts if p.status == "published")
    scheduled = sum(1 for p in posts if p.status == "scheduled")
    drafts = sum(1 for p in posts if p.status == "draft")
    failed = sum(1 for p in posts if p.status == "failed")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    one_week_ago = now - timedelta(days=7)
    one_month_ago = now - timedelta(days=30)

    pub_week = sum(
        1 for p in posts
        if p.status == "published" and p.published_at and p.published_at >= one_week_ago
    )
    pub_month = sum(
        1 for p in posts
        if p.status == "published" and p.published_at and p.published_at >= one_month_ago
    )

    attempted_total = published + failed
    success_rate = round((published / attempted_total * 100), 1) if attempted_total > 0 else 100.0

    # Hashtags aggregation
    all_hashtags = []
    tone_counts = Counter()
    for p in posts:
        if p.hashtags and isinstance(p.hashtags, list):
            all_hashtags.extend([h.lower() for h in p.hashtags if isinstance(h, str)])
        if p.tone:
            tone_counts[p.tone.lower()] += 1

    top_hashtags_counter = Counter(all_hashtags).most_common(10)
    top_hashtags = [{"tag": tag, "count": count} for tag, count in top_hashtags_counter]

    return {
        "total_posts": total,
        "published_count": published,
        "scheduled_count": scheduled,
        "draft_count": drafts,
        "failed_count": failed,
        "published_this_week": pub_week,
        "published_this_month": pub_month,
        "success_rate": success_rate,
        "top_hashtags": top_hashtags,
        "tone_breakdown": dict(tone_counts),
    }


@router.get("/timeseries")
async def get_analytics_timeseries(days: int = 14, db: AsyncSession = Depends(get_db)):
    """Get day-by-day created and published counts for the past N days."""
    result = await db.execute(select(Post))
    posts = result.scalars().all()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    data = []
    for i in range(days - 1, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_str = day_date.strftime("%b %d")

        published_day = sum(
            1 for p in posts
            if p.status == "published" and p.published_at and p.published_at.date() == day_date
        )
        created_day = sum(
            1 for p in posts
            if p.created_at and p.created_at.date() == day_date
        )
        data.append({
            "date": day_str,
            "created": created_day,
            "published": published_day,
        })

    return {"timeseries": data}

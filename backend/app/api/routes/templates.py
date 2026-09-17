from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database.db import get_db
from app.models.template import ContentTemplate
from app.schemas.schemas import TemplateCreate, TemplateResponse
import logging

router = APIRouter(prefix="/templates", tags=["Templates"])
logger = logging.getLogger(__name__)

DEFAULT_STARTER_TEMPLATES = [
    {
        "name": "🚀 Product Launch",
        "topic": "Announcing our brand new product line with excitement, features, and early-bird discount offer.",
        "tone": "promotional",
        "language": "English",
        "default_hashtags": ["#productlaunch", "#newdrop", "#innovation", "#exclusive", "#limitedtime"],
        "prompt_hint": "Highlight 2-3 key product benefits, availability date, and clear call-to-action to buy.",
    },
    {
        "name": "🎬 Behind the Scenes",
        "topic": "A candid look into our creative process, team workspace, and daily workflow.",
        "tone": "friendly",
        "language": "English",
        "default_hashtags": ["#behindthescenes", "#bts", "#creativelife", "#teamwork", "#workinprogress"],
        "prompt_hint": "Focus on authenticity, craftsmanship, and human connection.",
    },
    {
        "name": "💡 Quick Tip & Tutorial",
        "topic": "Sharing 3 actionable and quick tips that our audience can use immediately.",
        "tone": "professional",
        "language": "English",
        "default_hashtags": ["#protips", "#howto", "#learning", "#tutorial", "#growthmindset"],
        "prompt_hint": "Format with numbered points or bullet lists for easy skimming.",
    },
    {
        "name": "✨ Inspirational / Quote",
        "topic": "A motivational quote or mindset reflection designed to inspire and uplift.",
        "tone": "inspirational",
        "language": "English",
        "default_hashtags": ["#motivation", "#inspiration", "#dailywisdom", "#mindset", "#positivity"],
        "prompt_hint": "Keep it punchy, emotionally resonant, and ask a question at the end.",
    },
]


async def _seed_default_templates_if_empty(db: AsyncSession):
    result = await db.execute(select(ContentTemplate).limit(1))
    if not result.scalar_one_or_none():
        for t in DEFAULT_STARTER_TEMPLATES:
            item = ContentTemplate(
                name=t["name"],
                topic=t["topic"],
                tone=t["tone"],
                language=t["language"],
                default_hashtags=t["default_hashtags"],
                prompt_hint=t["prompt_hint"],
            )
            db.add(item)
        await db.commit()


@router.get("", response_model=list[TemplateResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):
    """List all available templates."""
    await _seed_default_templates_if_empty(db)
    result = await db.execute(select(ContentTemplate).order_by(desc(ContentTemplate.created_at)))
    templates = result.scalars().all()
    return templates


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(body: TemplateCreate, db: AsyncSession = Depends(get_db)):
    """Create a new custom template."""
    template = ContentTemplate(
        name=body.name,
        topic=body.topic,
        tone=body.tone or "friendly",
        language=body.language or "English",
        default_hashtags=body.default_hashtags or [],
        prompt_hint=body.prompt_hint,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}")
async def delete_template(template_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a template."""
    result = await db.execute(select(ContentTemplate).where(ContentTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)
    await db.commit()
    return {"success": True, "message": "Template deleted successfully"}

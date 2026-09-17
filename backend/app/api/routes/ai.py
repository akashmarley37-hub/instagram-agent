from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app.schemas.schemas import GenerateContentRequest, GenerateContentResponse, RegenerateRequest
from app.services.ai_service import ai_service, OpenAINotConfiguredError
from app.services.activity_service import log_activity
import logging

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=GenerateContentResponse)
async def generate_content(
    request: GenerateContentRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate AI caption and hashtags for a post using OpenAI."""
    try:
        result = await ai_service.generate_content(
            topic=request.topic,
            tone=request.tone,
            language=request.language,
            media_context=request.media_context,
            brand_instructions=request.brand_instructions,
        )
        await log_activity(
            db=db,
            action="ai_content_generated",
            description=f"AI generated content for topic: '{request.topic[:50]}'",
            status="success",
            metadata={"topic": request.topic, "tone": request.tone}
        )
        return GenerateContentResponse(**result)
    except OpenAINotConfiguredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"AI generation route error: {e}")
        raise HTTPException(
            status_code=500,
            detail="AI generation failed. Please check your API configuration and try again."
        )


@router.post("/regenerate", response_model=GenerateContentResponse)
async def regenerate_content(
    request: RegenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Regenerate or adjust existing AI content."""
    try:
        result = await ai_service.regenerate_content(
            caption=request.caption,
            hashtags=request.hashtags,
            adjustment=request.adjustment,
            topic=request.topic,
            tone=request.tone,
        )
        await log_activity(
            db=db,
            action="ai_content_regenerated",
            description=f"AI content adjusted: {request.adjustment}",
            status="success",
            metadata={"adjustment": request.adjustment}
        )
        return GenerateContentResponse(**result)
    except OpenAINotConfiguredError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Regeneration route error: {e}")
        raise HTTPException(status_code=500, detail="Regeneration failed. Please try again.")

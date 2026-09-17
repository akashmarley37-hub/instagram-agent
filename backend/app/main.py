"""
Instagram Agent — FastAPI Application Entry Point.
Production setup: Real integrations, zero demo mode.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path

from app.config.settings import settings
from app.database.db import init_db
from app.services.scheduler_service import scheduler
from app.api.routes import ai, media, posts, instagram, activity, integrations, google_drive

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup and shutdown."""
    logger.info("🚀 Instagram Agent starting up (Live Mode)...")
    logger.info(f"   OpenAI: {'✓ configured' if settings.is_openai_configured else '✗ not configured'}")
    logger.info(f"   Instagram: {'✓ configured' if settings.is_instagram_configured else '✗ not configured'}")
    logger.info(f"   Google: {'✓ configured' if settings.is_google_configured else '✗ not configured'}")
    logger.info(f"   Google Sheets: {'✓ configured' if settings.is_google_sheets_configured else '✗ not configured'}")

    # Initialize database
    await init_db()
    logger.info("✓ Database initialized")

    # Start scheduler
    if not scheduler.running:
        scheduler.start()
    logger.info("✓ Scheduler started")

    # Ensure upload dir exists
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

    yield

    # Shutdown
    if scheduler.running:
        scheduler.shutdown()
    logger.info("Instagram Agent shutting down.")


app = FastAPI(
    title="Instagram Agent API",
    description="AI-Powered Instagram Content Automation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
allow_wildcard = "*" in settings.allowed_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=not allow_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {type(exc).__name__}: {str(exc)[:200]}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "An unexpected error occurred. Please try again."}
    )


# Register routes
app.include_router(ai.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(instagram.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")
app.include_router(google_drive.router, prefix="/api")


# Health check
@app.get("/api/health")
async def health_check():
    from app.services.scheduler_service import get_scheduler_status
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "mode": "live",
        "scheduler": get_scheduler_status(),
    }


# App info
@app.get("/api/config")
async def get_app_config():
    """Get public app configuration (no secrets)."""
    return {
        "demo_mode": False,
        "app_mode": "live",
        "openai_configured": settings.is_openai_configured,
        "instagram_configured": settings.is_instagram_configured,
        "google_configured": settings.is_google_configured,
        "google_sheets_configured": settings.is_google_sheets_configured,
        "openai_model": settings.openai_model if settings.is_openai_configured else None,
    }

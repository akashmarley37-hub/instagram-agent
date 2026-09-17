from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app.models.media import Media
from app.services.google_drive_service import google_drive_service
from app.config.settings import settings
import os
import uuid
import logging

router = APIRouter(prefix="/google-drive", tags=["Google Drive"])
logger = logging.getLogger(__name__)


@router.get("/status")
async def get_drive_status():
    """Get real Google Drive connection status."""
    return google_drive_service.get_status()


@router.get("/media")
async def list_drive_media(query: str = Query(default=None)):
    """List real media files from Google Drive. Never returns mock files."""
    status = google_drive_service.get_status()
    if not status.get("connected"):
        return {
            "files": [],
            "connected": False,
            "configured": status.get("configured", False),
            "message": status.get("message", "Google Drive is not connected."),
            "total": 0,
        }

    files = await google_drive_service.list_media_files(query=query)
    return {
        "files": files,
        "connected": True,
        "configured": True,
        "total": len(files),
    }


@router.get("/auth-url")
async def get_auth_url(state: str = Query(default=None)):
    """Get Google OAuth2 authorization URL."""
    url = google_drive_service.get_auth_url(state=state)
    if not url:
        return {
            "url": None,
            "message": "Google OAuth credentials not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.",
        }
    return {"url": url}


@router.get("/callback", response_class=HTMLResponse)
async def google_oauth_callback(code: str = Query(default=None), error: str = Query(default=None)):
    """Handle Google OAuth2 callback and persist tokens."""
    if error:
        return HTMLResponse(
            f"<html><body style='font-family:sans-serif;padding:40px;text-align:center;background:#0f172a;color:#fff;'>"
            f"<h2 style='color:#ef4444;'>Google Authentication Error</h2>"
            f"<p>{error}</p>"
            f"<p><a href='http://localhost:5173/connections' style='color:#38bdf8;'>Return to Connections</a></p>"
            f"</body></html>"
        )

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code.")

    success = google_drive_service.exchange_code(code)
    if success:
        return HTMLResponse(
            "<html><body style='font-family:sans-serif;padding:40px;text-align:center;background:#0f172a;color:#fff;'>"
            "<h2 style='color:#22c55e;'>Google Account Connected!</h2>"
            "<p>Your Google Drive and Sheets integration is now active.</p>"
            "<p><a href='http://localhost:5173/connections' style='color:#38bdf8;text-decoration:none;font-weight:bold;'>Return to Instagram Agent</a></p>"
            "<script>setTimeout(function(){ window.location.href = 'http://localhost:5173/connections'; }, 2000);</script>"
            "</body></html>"
        )
    else:
        return HTMLResponse(
            "<html><body style='font-family:sans-serif;padding:40px;text-align:center;background:#0f172a;color:#fff;'>"
            "<h2 style='color:#ef4444;'>Token Exchange Failed</h2>"
            "<p>Unable to exchange code for tokens. Check backend logs.</p>"
            "<p><a href='http://localhost:5173/connections' style='color:#38bdf8;'>Return to Connections</a></p>"
            "</body></html>"
        )


@router.post("/import")
async def import_from_drive(
    file_id: str = Query(...),
    filename: str = Query(...),
    mime_type: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Download a file from Google Drive and import it into local media library."""
    status = google_drive_service.get_status()
    if not status.get("connected"):
        raise HTTPException(status_code=400, detail="Google Drive is not connected.")

    # Generate unique filename locally
    ext = os.path.splitext(filename)[1] or (".mp4" if "video" in mime_type else ".jpg")
    local_filename = f"gdrive_{uuid.uuid4().hex[:10]}{ext}"
    os.makedirs(settings.upload_dir, exist_ok=True)
    local_path = os.path.join(settings.upload_dir, local_filename)

    success = await google_drive_service.download_file(file_id, local_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to download file from Google Drive.")

    file_size = os.path.getsize(local_path)
    file_type = "video" if "video" in mime_type else "image"

    media = Media(
        filename=local_filename,
        original_name=filename,
        file_type=file_type,
        mime_type=mime_type,
        file_size=file_size,
        drive_file_id=file_id,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)

    return {
        "success": True,
        "media": {
            "id": media.id,
            "filename": media.filename,
            "original_name": media.original_name,
            "file_type": media.file_type,
            "mime_type": media.mime_type,
            "file_size": media.file_size,
        }
    }

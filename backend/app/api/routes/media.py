import math
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app.schemas.schemas import MediaResponse, PaginatedResponse
from app.services import media_service
import logging

router = APIRouter(prefix="/media", tags=["Media"])
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=MediaResponse)
async def upload_media(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a media file (image or video)."""
    try:
        media = await media_service.save_upload(file, db)
        return MediaResponse(
            id=media.id,
            filename=media.filename,
            original_name=media.original_name,
            file_type=media.file_type,
            mime_type=media.mime_type,
            file_size=media.file_size,
            width=media.width,
            height=media.height,
            created_at=media.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Media upload error: {e}")
        raise HTTPException(status_code=500, detail="Media upload failed. Please try again.")


@router.get("", response_model=PaginatedResponse)
async def list_media(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    file_type: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """List all media files (paginated)."""
    items, total = await media_service.get_all_media(db, file_type=file_type, page=page, per_page=per_page)
    pages = math.ceil(total / per_page) if total > 0 else 1

    return PaginatedResponse(
        items=[
            {
                "id": m.id,
                "filename": m.filename,
                "original_name": m.original_name,
                "file_type": m.file_type,
                "mime_type": m.mime_type,
                "file_size": m.file_size,
                "width": m.width,
                "height": m.height,
                "url": f"/api/media/file/{m.filename}",
                "created_at": m.created_at.isoformat(),
            }
            for m in items
        ],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.get("/file/{filename}")
async def serve_media_file(filename: str):
    """Serve a media file by filename."""
    file_path = Path(media_service.UPLOAD_DIR) / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@router.delete("/{media_id}")
async def delete_media(media_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a media file."""
    deleted = await media_service.delete_media(media_id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"success": True, "message": "Media deleted successfully"}

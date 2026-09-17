"""
Media Service — File upload, validation, management.
Handles local file storage with metadata stored in DB.
"""
import os
import uuid
import aiofiles
import logging
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.media import Media
from app.config.settings import settings

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_file_type(mime_type: str) -> str:
    if mime_type.startswith("image/"):
        return "image"
    elif mime_type.startswith("video/"):
        return "video"
    return "unknown"


def validate_file(filename: str, content_type: str, size: int) -> None:
    """Validate file type and size. Raises HTTPException on failure."""
    allowed = settings.allowed_image_types_list + settings.allowed_video_types_list
    if content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{content_type}' is not allowed. Allowed: {', '.join(allowed)}"
        )
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum of {settings.max_file_size_mb}MB"
        )


async def get_image_dimensions(file_path: Path) -> Tuple[Optional[int], Optional[int]]:
    """Get image dimensions using Pillow."""
    try:
        from PIL import Image
        with Image.open(file_path) as img:
            return img.size  # (width, height)
    except Exception:
        return None, None


async def save_upload(file: UploadFile, db: AsyncSession) -> Media:
    """Save uploaded file and create Media record."""
    content_type = file.content_type or "application/octet-stream"
    file_type = get_file_type(content_type)

    # Read file content to get size
    content = await file.read()
    file_size = len(content)

    validate_file(file.filename or "upload", content_type, file_size)

    # Generate unique filename
    ext = Path(file.filename or "upload").suffix or ".bin"
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / unique_name

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Get image dimensions
    width, height = None, None
    if file_type == "image":
        width, height = await get_image_dimensions(file_path)

    # Create DB record
    media = Media(
        filename=unique_name,
        original_name=file.filename or "upload",
        file_type=file_type,
        mime_type=content_type,
        file_size=file_size,
        file_path=str(file_path),
        width=width,
        height=height,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)

    logger.info(f"Media uploaded: {media.id} ({unique_name}, {file_size} bytes)")
    return media


async def get_all_media(db: AsyncSession, file_type: Optional[str] = None, page: int = 1, per_page: int = 20) -> Tuple[list, int]:
    """Get paginated media list."""
    query = select(Media).order_by(Media.created_at.desc())
    if file_type:
        query = query.where(Media.file_type == file_type)

    # Count
    from sqlalchemy import func
    count_query = select(func.count()).select_from(Media)
    if file_type:
        count_query = count_query.where(Media.file_type == file_type)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    items = result.scalars().all()

    return list(items), total


async def delete_media(media_id: str, db: AsyncSession) -> bool:
    """Delete media file and DB record."""
    result = await db.execute(select(Media).where(Media.id == media_id))
    media = result.scalar_one_or_none()
    if not media:
        return False

    # Delete file
    file_path = Path(media.file_path)
    if file_path.exists():
        file_path.unlink()

    await db.execute(delete(Media).where(Media.id == media_id))
    await db.commit()
    logger.info(f"Media deleted: {media_id}")
    return True


def get_media_url(filename: str) -> str:
    """Get URL for a media file served by the backend."""
    return f"/api/media/file/{filename}"

from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

ALLOWED_DIRS = {"thumbnails", "clips"}


@router.get("/{directory}/{filename}")
def serve_file(directory: str, filename: str):
    if directory not in ALLOWED_DIRS:
        raise HTTPException(403, "Access denied")

    # Prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid filename")

    from app.core.config import settings
    file_path = settings.storage_base / directory / filename
    resolved = file_path.resolve()
    base = (settings.storage_base / directory).resolve()

    if not str(resolved).startswith(str(base)):
        raise HTTPException(403, "Access denied")

    if not resolved.exists():
        raise HTTPException(404, "File not found")

    ext = resolved.suffix.lower()
    media_types = {
        ".mp4": "video/mp4",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    return FileResponse(
        path=str(resolved),
        media_type=media_types.get(ext, "application/octet-stream"),
    )

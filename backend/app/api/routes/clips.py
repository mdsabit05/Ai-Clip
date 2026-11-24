from __future__ import annotations
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.clip import Clip
from app.schemas.clip import ClipResponse, ClipUpdate, RenderRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{clip_id}", response_model=ClipResponse)
def get_clip(clip_id: str, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(404, "Clip not found")
    return ClipResponse.model_validate(clip)


@router.patch("/{clip_id}", response_model=ClipResponse)
def update_clip(clip_id: str, body: ClipUpdate, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(404, "Clip not found")
    if body.title is not None:
        clip.title = body.title
    if body.description is not None:
        clip.description = body.description
    db.commit()
    db.refresh(clip)
    return ClipResponse.model_validate(clip)


@router.post("/{clip_id}/render")
def render_clip(clip_id: str, body: RenderRequest, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(404, "Clip not found")

    try:
        from app.workers.tasks import render_single_clip
        task = render_single_clip.delay(clip_id, body.model_dump())
        clip.status = "rendering"
        db.commit()
        return {"job_id": task.id, "status": "started"}
    except Exception as exc:
        logger.error("Failed to start render: %s", exc)
        raise HTTPException(503, f"Worker unavailable: {exc}")


@router.get("/{clip_id}/preview")
def preview_clip(clip_id: str, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip or not clip.video_path:
        raise HTTPException(404, "Clip video not found")

    path = Path(clip.video_path)
    if not path.exists():
        raise HTTPException(404, "Clip file not found on disk")

    return FileResponse(
        path=str(path),
        media_type="video/mp4",
        filename=f"{clip.title or clip.id}.mp4",
    )


@router.get("/{clip_id}/download")
def download_clip(clip_id: str, db: Session = Depends(get_db)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(404, "Clip not found")
    if clip.status != "completed":
        raise HTTPException(400, f"Clip is not ready (status: {clip.status})")
    if not clip.video_path:
        raise HTTPException(404, "Clip file not found")

    path = Path(clip.video_path)
    if not path.exists():
        raise HTTPException(404, "Clip file not found on disk")

    safe_title = "".join(c for c in (clip.title or clip.id) if c.isalnum() or c in " -_")
    filename = f"{safe_title[:60]}.mp4"

    return FileResponse(
        path=str(path),
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

from __future__ import annotations
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.project import Project
from app.schemas.project import ProjectResponse, ParseInstructionRequest, ParseInstructionResponse
from app.agents.instruction_parser import InstructionParserAgent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    youtube_url: str = Form(...),
    instruction: str = Form(...),
    streamer_video: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    # Validate YouTube URL format
    import re
    if not re.search(
        r"(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)", youtube_url
    ):
        raise HTTPException(400, "Invalid YouTube URL")

    project = Project(
        youtube_url=youtube_url,
        instruction=instruction,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Save streamer video if uploaded
    if streamer_video and streamer_video.filename:
        streamer_dir = settings.storage_base / "streamer"
        streamer_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(streamer_video.filename).suffix or ".mp4"
        dest = streamer_dir / f"{project.id}{ext}"
        content = await streamer_video.read()
        dest.write_bytes(content)
        project.streamer_video_path = str(dest)
        db.commit()
        db.refresh(project)

    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.get("/{project_id}/status", response_model=ProjectResponse)
def get_project_status(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.post("/{project_id}/analyze")
def start_analysis(
    project_id: str,
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    if project.status not in ("created", "failed"):
        raise HTTPException(400, f"Cannot analyze project in status '{project.status}'")

    # Kick off async Celery task
    try:
        from app.workers.tasks import run_full_pipeline
        task = run_full_pipeline.delay(project_id)
        project.status = "downloading"
        project.progress = 1
        project.progress_message = "Pipeline started…"
        db.commit()
        return {"job_id": task.id, "status": "started"}
    except Exception as exc:
        logger.error("Failed to start pipeline: %s", exc)
        raise HTTPException(503, f"Worker unavailable: {exc}")


@router.post("/parse-instruction", response_model=ParseInstructionResponse)
def parse_instruction(body: ParseInstructionRequest):
    agent = InstructionParserAgent()
    parsed = agent.parse(body.instruction)
    return ParseInstructionResponse(parsed=parsed, raw_instruction=body.instruction)


@router.get("/{project_id}/clips")
def get_project_clips(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    from app.schemas.clip import ClipResponse
    return [ClipResponse.model_validate(c) for c in project.clips]


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()

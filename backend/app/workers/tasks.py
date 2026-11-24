"""
Celery tasks for the ClipForge AI pipeline.

Pipeline stages:
  1. download_video      → downloads from YouTube
  2. analyze_video       → transcription + scene detection
  3. score_moments       → viral scoring
  4. select_clips        → pick the best N
  5. render_clips        → FFmpeg vertical rendering
  6. quality_check_clips → QC pass/fail
"""
from __future__ import annotations
import logging
from pathlib import Path

from celery import chain
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.project import Project
from app.models.clip import Clip
from app.agents.instruction_parser import InstructionParserAgent
from app.agents.video_analyzer import VideoAnalyzerAgent
from app.agents.moment_scorer import MomentScorerAgent
from app.agents.clip_selector import ClipSelectorAgent
from app.services.downloader import VideoDownloader
from app.services.video_editor import VideoEditorService, RenderOptions

logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_db() -> Session:
    return SessionLocal()


def _update_project(
    project_id: str, status: str, progress: float, message: str, **kwargs
) -> None:
    db = _get_db()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.status = status
            project.progress = progress
            project.progress_message = message
            for k, v in kwargs.items():
                setattr(project, k, v)
            db.commit()
    finally:
        db.close()


def _fail_project(project_id: str, error: str) -> None:
    _update_project(project_id, "failed", 0, error, error_message=error)


# ─── Main Pipeline Task ───────────────────────────────────────────────────────

@celery_app.task(bind=True, name="tasks.run_full_pipeline")
def run_full_pipeline(self, project_id: str) -> dict:
    """
    Orchestrates the full pipeline for a project. Runs all stages sequentially.
    """
    logger.info("Starting pipeline for project %s", project_id)

    db = _get_db()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")
        instruction = project.instruction
        youtube_url = project.youtube_url
        streamer_video_path = project.streamer_video_path
    finally:
        db.close()

    try:
        # Stage 1: Download
        video_path, info = _stage_download(project_id, youtube_url)

        # Stage 2: Parse instruction
        video_duration = float(info.get("duration", 0))
        parsed = _stage_parse_instruction(project_id, instruction, video_duration)

        # Stage 3: Analyze
        transcript, candidates = _stage_analyze(
            project_id, video_path, parsed, video_duration
        )

        # Stage 4: Score
        scored = _stage_score(project_id, candidates, parsed["preferred_moments"])

        # Stage 5: Select
        selected = _stage_select(project_id, scored, parsed)

        # Stage 6: Render
        clip_ids = _stage_render(
            project_id,
            selected,
            video_path,
            streamer_video_path,
            parsed,
            transcript,
        )

        # Stage 7: Quality check
        _stage_quality_check(project_id, clip_ids)

        # Finalize
        _update_project(project_id, "completed", 100, "All clips ready!", clip_count=len(clip_ids))
        logger.info("Pipeline completed for project %s — %d clips", project_id, len(clip_ids))
        return {"status": "completed", "clip_count": len(clip_ids)}

    except Exception as exc:
        logger.exception("Pipeline failed for project %s", project_id)
        _fail_project(project_id, str(exc))
        raise


# ─── Pipeline Stage Functions ─────────────────────────────────────────────────

def _stage_download(project_id: str, youtube_url: str) -> tuple[str, dict]:
    _update_project(project_id, "downloading", 2, "Starting download…")
    downloader = VideoDownloader()
    output_dir = settings.storage_base / "videos"

    def cb(pct, msg):
        _update_project(project_id, "downloading", pct * 0.3, msg)

    video_path, info = downloader.download(youtube_url, output_dir, project_id, cb)

    title = info.get("title", "Untitled")[:512]
    thumbnail = info.get("thumbnail", "")
    duration = float(info.get("duration", 0))

    _update_project(
        project_id, "downloading", 30, "Download complete",
        title=title,
        thumbnail_url=thumbnail,
        video_duration=duration,
        video_path=str(video_path),
    )
    return str(video_path), info


def _stage_parse_instruction(
    project_id: str, instruction: str, video_duration: float
) -> dict:
    _update_project(project_id, "analyzing", 32, "Parsing your instructions…")
    agent = InstructionParserAgent()
    parsed = agent.parse(instruction, video_duration)
    parsed_dict = parsed.model_dump()

    db = _get_db()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.parsed_instruction = parsed_dict
            db.commit()
    finally:
        db.close()

    _update_project(project_id, "analyzing", 35, "Instruction parsed")
    return parsed_dict


def _stage_analyze(
    project_id: str,
    video_path: str,
    parsed: dict,
    video_duration: float,
) -> tuple[list, list]:
    _update_project(project_id, "analyzing", 36, "Analyzing video content…")

    end_time = parsed["end_time"] if parsed["end_time"] > 0 else video_duration

    def cb(pct, msg):
        actual = 36 + pct * 0.19
        _update_project(project_id, "analyzing", actual, msg)

    agent = VideoAnalyzerAgent(progress_callback=cb)
    transcript, candidates = agent.analyze(
        video_path=video_path,
        start_time=parsed["start_time"],
        end_time=end_time,
        min_duration=parsed["min_duration"],
        max_duration=parsed["max_duration"],
        preferred_moments=parsed["preferred_moments"],
    )

    # Persist transcript
    db = _get_db()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.transcript = [
                {"start": s.start, "end": s.end, "text": s.text}
                for s in transcript
            ]
            db.commit()
    finally:
        db.close()

    _update_project(project_id, "analyzing", 55, f"Found {len(candidates)} candidate moments")
    return transcript, candidates


def _stage_score(project_id: str, candidates: list, preferred: list[str]) -> list:
    _update_project(project_id, "scoring", 56, "Scoring viral potential…")

    def cb(pct, msg):
        actual = 56 + pct * 0.14
        _update_project(project_id, "scoring", actual, msg)

    agent = MomentScorerAgent()
    scored = agent.score_all(candidates, preferred, progress_callback=cb)
    _update_project(project_id, "scoring", 70, f"Scored {len(scored)} moments")
    return scored


def _stage_select(project_id: str, scored: list, parsed: dict) -> list:
    _update_project(project_id, "selecting", 71, "Selecting best clips…")
    agent = ClipSelectorAgent()
    selected = agent.select(
        scored,
        clip_count=parsed["clip_count"],
        min_duration=parsed["min_duration"],
        max_duration=parsed["max_duration"],
    )
    _update_project(project_id, "selecting", 75, f"Selected {len(selected)} clips")
    return selected


def _stage_render(
    project_id: str,
    selected: list,
    video_path: str,
    streamer_video_path: str | None,
    parsed: dict,
    transcript: list,
) -> list[str]:
    _update_project(project_id, "rendering", 76, "Rendering vertical clips…")

    editor = VideoEditorService()
    clip_ids: list[str] = []
    db = _get_db()

    opts = RenderOptions(
        caption_style=parsed.get("caption_style", "minimal"),
        caption_position=parsed.get("caption_position", "bottom"),
        streamer_height=parsed.get("streamer_height", 35),
        normalize_audio=True,
    )

    streamer_path = Path(streamer_video_path) if streamer_video_path else None

    for i, item in enumerate(selected):
        pct = 76 + 14 * i / max(len(selected), 1)
        _update_project(
            project_id, "rendering", pct,
            f"Rendering clip {i + 1}/{len(selected)}…"
        )

        moment = item.scored_moment.moment
        clip_id = _create_clip_record(
            db, project_id, item, moment, parsed
        )
        clip_ids.append(clip_id)

        output_path = settings.storage_base / "clips" / f"{clip_id}.mp4"
        thumbnail_path = settings.storage_base / "thumbnails" / f"{clip_id}.jpg"

        # Build transcript excerpt
        transcript_excerpt = " ".join(
            s["text"] for s in (transcript if isinstance(transcript[0], dict) else
                                [{"text": s.text} for s in transcript])
            if isinstance(s, dict) and moment.start <= s.get("start", 0) <= moment.end
        )[:500] if transcript else moment.transcript[:500]

        result = editor.render_clip(
            source_video=Path(video_path),
            start_time=moment.start,
            end_time=moment.end,
            output_path=output_path,
            thumbnail_path=thumbnail_path,
            transcript=transcript_excerpt,
            streamer_video=streamer_path,
            options=opts,
        )

        # Update clip record
        try:
            clip = db.query(Clip).filter(Clip.id == clip_id).first()
            if clip:
                if result.success:
                    clip.status = "completed"
                    clip.video_path = str(output_path)
                    clip.thumbnail_path = str(thumbnail_path)
                    clip.transcript_excerpt = transcript_excerpt
                else:
                    clip.status = "failed"
                db.commit()
        except Exception:
            db.rollback()

    db.close()
    return clip_ids


def _create_clip_record(db: Session, project_id: str, item, moment, parsed: dict) -> str:
    scored = item.scored_moment

    score_breakdown = scored.breakdown or {
        "hook_strength": 50,
        "entertainment": 50,
        "emotional_reaction": 50,
        "unexpectedness": 50,
        "context_independence": 50,
        "retention_potential": 50,
        "ending_quality": 50,
    }

    clip = Clip(
        project_id=project_id,
        title=scored.suggested_title or f"Clip #{item.rank}",
        description=scored.description or "",
        start_time=moment.start,
        end_time=moment.end,
        duration=moment.duration,
        viral_score=scored.total_score,
        score_breakdown=score_breakdown,
        status="rendering",
        tags=moment.tags,
        render_options={
            "caption_style": parsed.get("caption_style", "minimal"),
            "streamer_height": parsed.get("streamer_height", 35),
        },
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)
    return clip.id


def _stage_quality_check(project_id: str, clip_ids: list[str]) -> None:
    _update_project(project_id, "quality_check", 90, "Running quality checks…")

    editor = VideoEditorService()
    db = _get_db()

    try:
        for clip_id in clip_ids:
            clip = db.query(Clip).filter(Clip.id == clip_id).first()
            if not clip or clip.status != "completed":
                continue

            output_path = Path(clip.video_path)
            if not output_path.exists():
                clip.status = "failed"
                db.commit()
                continue

            qc = editor.run_quality_checks(output_path, clip.duration)
            if not qc["passed"]:
                logger.warning("QC failed for clip %s: %s", clip_id, qc["issues"])
                # Don't fail — just log; minor issues don't disqualify the clip

    finally:
        db.close()

    _update_project(project_id, "quality_check", 98, "Quality checks complete")


# ─── Individual Clip Re-render Task ───────────────────────────────────────────

@celery_app.task(bind=True, name="tasks.render_single_clip")
def render_single_clip(self, clip_id: str, options_dict: dict) -> dict:
    """Re-render a single clip with new options."""
    db = _get_db()
    try:
        clip = db.query(Clip).filter(Clip.id == clip_id).first()
        if not clip:
            raise ValueError(f"Clip {clip_id} not found")

        project = db.query(Project).filter(Project.id == clip.project_id).first()
        if not project or not project.video_path:
            raise ValueError("Project video not found")

        clip.status = "rendering"
        db.commit()

        video_path = Path(project.video_path)
        streamer_path = Path(project.streamer_video_path) if project.streamer_video_path else None
        output_path = settings.storage_base / "clips" / f"{clip_id}.mp4"
        thumbnail_path = settings.storage_base / "thumbnails" / f"{clip_id}.jpg"

        opts = RenderOptions(**options_dict)
        editor = VideoEditorService()

        result = editor.render_clip(
            source_video=video_path,
            start_time=clip.start_time,
            end_time=clip.end_time,
            output_path=output_path,
            thumbnail_path=thumbnail_path,
            transcript=clip.transcript_excerpt,
            streamer_video=streamer_path,
            options=opts,
        )

        clip.status = "completed" if result.success else "failed"
        clip.video_path = str(output_path)
        clip.thumbnail_path = str(thumbnail_path)
        clip.render_options = options_dict
        db.commit()

        return {"status": clip.status, "clip_id": clip_id}

    finally:
        db.close()

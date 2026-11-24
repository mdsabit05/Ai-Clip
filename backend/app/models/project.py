from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, Float, Integer, JSON, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.clip import Clip

ProjectStatus = SAEnum(
    "created",
    "downloading",
    "analyzing",
    "scoring",
    "selecting",
    "rendering",
    "quality_check",
    "completed",
    "failed",
    name="project_status",
)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(512), default="")
    youtube_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="created", index=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    progress_message: Mapped[str] = mapped_column(Text, default="")
    video_duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    clip_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    parsed_instruction: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # File paths
    video_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    streamer_video_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    transcript: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    clips: Mapped[list[Clip]] = relationship("Clip", back_populates="project", cascade="all, delete-orphan")

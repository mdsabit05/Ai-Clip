from __future__ import annotations
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Literal


class ParsedInstruction(BaseModel):
    clip_count: int = 4
    start_time: float = 0.0
    end_time: float = 0.0  # 0 means end of video
    preferred_moments: list[str] = []
    min_duration: float = 30.0
    max_duration: float = 60.0
    aspect_ratio: str = "9:16"
    streamer_height: int = 35
    original_video_height: int = 65
    caption_style: Literal["minimal", "bold", "neon", "none"] = "minimal"
    caption_position: Literal["bottom", "center", "top"] = "bottom"


class ProjectCreate(BaseModel):
    youtube_url: str
    instruction: str


class ProjectResponse(BaseModel):
    id: str
    title: str
    youtube_url: str
    instruction: str
    status: str
    progress: float
    progress_message: str
    video_duration: float | None
    thumbnail_url: str | None
    clip_count: int
    created_at: datetime
    updated_at: datetime
    error_message: str | None = None
    parsed_instruction: dict | None = None

    model_config = {"from_attributes": True}


class ParseInstructionRequest(BaseModel):
    instruction: str
    youtube_url: str = ""


class ParseInstructionResponse(BaseModel):
    parsed: ParsedInstruction
    raw_instruction: str

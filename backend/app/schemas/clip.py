from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class ScoreBreakdown(BaseModel):
    hook_strength: int = 0
    entertainment: int = 0
    emotional_reaction: int = 0
    unexpectedness: int = 0
    context_independence: int = 0
    retention_potential: int = 0
    ending_quality: int = 0


class ClipResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: str
    start_time: float
    end_time: float
    duration: float
    viral_score: int
    score_breakdown: dict
    status: str
    thumbnail_url: str | None
    preview_url: str | None
    download_url: str | None
    transcript_excerpt: str
    tags: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ClipUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class RenderRequest(BaseModel):
    caption_style: Literal["minimal", "bold", "neon", "none"] = "minimal"
    caption_position: Literal["bottom", "center", "top"] = "bottom"
    streamer_height: int = 35
    add_zoom_effects: bool = False
    normalize_audio: bool = True
    transition_style: Literal["cut", "fade", "none"] = "cut"

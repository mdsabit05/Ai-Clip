"""
Instruction Parser Agent — converts natural-language clip requests into structured JSON.
"""
from __future__ import annotations
import json
import re
import logging
from typing import Any

import anthropic

from app.core.config import settings
from app.schemas.project import ParsedInstruction

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a video clip instruction parser for ClipForge AI.

Your job is to convert natural-language clip requests into precise structured JSON.

TIMESTAMP RULES:
- "9:15" → 555 seconds
- "1:10:15" → 4215 seconds
- "45:00" → 2700 seconds
- If no start time given, use 0
- If no end time given, use 0 (means end of video)

OUTPUT: Return ONLY valid JSON matching this schema exactly, no markdown, no explanation:
{
  "clip_count": <integer, default 4>,
  "start_time": <float seconds>,
  "end_time": <float seconds, 0=end of video>,
  "preferred_moments": <array of strings like ["funny", "unexpected", "emotional"]>,
  "min_duration": <float seconds, default 30>,
  "max_duration": <float seconds, default 60>,
  "aspect_ratio": "9:16",
  "streamer_height": <integer percent, default 35>,
  "original_video_height": <integer percent, default 65>,
  "caption_style": <"minimal"|"bold"|"neon"|"none">,
  "caption_position": <"bottom"|"center"|"top">
}"""


def _parse_timestamp(ts: str) -> float:
    """Parse timestamp strings like '1:10:15' or '9:15' into seconds."""
    parts = ts.strip().split(":")
    try:
        nums = [float(p) for p in parts]
        if len(nums) == 3:
            return nums[0] * 3600 + nums[1] * 60 + nums[2]
        if len(nums) == 2:
            return nums[0] * 60 + nums[1]
        return nums[0]
    except ValueError:
        return 0.0


def _fallback_parse(instruction: str) -> dict[str, Any]:
    """Rule-based fallback parser when AI is unavailable."""
    result: dict[str, Any] = {
        "clip_count": 4,
        "start_time": 0.0,
        "end_time": 0.0,
        "preferred_moments": [],
        "min_duration": 30.0,
        "max_duration": 60.0,
        "aspect_ratio": "9:16",
        "streamer_height": 35,
        "original_video_height": 65,
        "caption_style": "minimal",
        "caption_position": "bottom",
    }

    text = instruction.lower()

    # Clip count
    count_match = re.search(r"\b(\d+)\s*(?:clips?|moments?|highlights?|segments?)\b", text)
    if count_match:
        result["clip_count"] = int(count_match.group(1))

    # Timestamps "between X and Y"
    ts_match = re.search(
        r"between\s+([\d:]+)\s+and\s+([\d:]+)", text
    )
    if ts_match:
        result["start_time"] = _parse_timestamp(ts_match.group(1))
        result["end_time"] = _parse_timestamp(ts_match.group(2))

    # Duration range "30-60 seconds" or "30 to 60 seconds"
    dur_match = re.search(r"(\d+)\s*[-–to]+\s*(\d+)\s*sec", text)
    if dur_match:
        result["min_duration"] = float(dur_match.group(1))
        result["max_duration"] = float(dur_match.group(2))

    # Around N seconds
    around_match = re.search(r"around\s+(\d+)\s*sec", text)
    if around_match:
        n = float(around_match.group(1))
        result["min_duration"] = max(10.0, n * 0.75)
        result["max_duration"] = n * 1.25

    # Content categories
    categories = {
        "funny": "funny",
        "humor": "funny",
        "laugh": "funny",
        "unexpected": "unexpected",
        "surprising": "unexpected",
        "emotional": "emotional",
        "reaction": "reaction",
        "punchline": "punchline",
        "highlight": "highlight",
        "exciting": "exciting",
        "intense": "intense",
    }
    result["preferred_moments"] = [
        v for k, v in categories.items() if k in text
    ]

    # Caption style
    if "no caption" in text or "no sub" in text:
        result["caption_style"] = "none"
    elif "bold" in text:
        result["caption_style"] = "bold"
    elif "neon" in text:
        result["caption_style"] = "neon"

    return result


class InstructionParserAgent:
    """Converts natural-language clip requests to structured ParsedInstruction."""

    def __init__(self) -> None:
        self._client: anthropic.Anthropic | None = None
        if settings.anthropic_api_key:
            self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def parse(self, instruction: str, video_duration: float = 0.0) -> ParsedInstruction:
        logger.info("Parsing instruction: %s", instruction[:120])

        raw: dict[str, Any] | None = None

        if self._client:
            try:
                raw = self._ai_parse(instruction, video_duration)
            except Exception as exc:
                logger.warning("AI parse failed (%s), falling back to regex", exc)

        if raw is None:
            raw = _fallback_parse(instruction)

        # Clamp and validate
        raw["clip_count"] = max(1, min(20, int(raw.get("clip_count", 4))))
        raw["min_duration"] = max(5.0, float(raw.get("min_duration", 30)))
        raw["max_duration"] = max(raw["min_duration"] + 5, float(raw.get("max_duration", 60)))
        raw["streamer_height"] = max(20, min(50, int(raw.get("streamer_height", 35))))
        raw["original_video_height"] = 100 - raw["streamer_height"]

        if video_duration > 0:
            raw["end_time"] = min(float(raw.get("end_time", 0) or video_duration), video_duration)
            if raw["end_time"] == 0:
                raw["end_time"] = video_duration

        return ParsedInstruction(**raw)

    def _ai_parse(self, instruction: str, video_duration: float) -> dict[str, Any]:
        assert self._client is not None
        context = f"\nVideo duration: {video_duration:.0f} seconds." if video_duration else ""
        message = self._client.messages.create(
            model=settings.ai_model,
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Parse this instruction:{context}\n\n{instruction}",
                }
            ],
        )
        text = message.content[0].text.strip()
        # Strip markdown code fences if present
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)

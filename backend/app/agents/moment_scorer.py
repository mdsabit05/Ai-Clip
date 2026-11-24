"""
Viral Moment Scoring Agent — scores candidate clips 0–100 for engagement potential.
"""
from __future__ import annotations
import json
import logging
import re
from dataclasses import dataclass

import anthropic

from app.core.config import settings
from app.agents.video_analyzer import CandidateMoment

logger = logging.getLogger(__name__)


@dataclass
class ScoredMoment:
    moment: CandidateMoment
    total_score: int
    breakdown: dict[str, int]
    description: str
    suggested_title: str


SCORING_SYSTEM_PROMPT = """You are a viral content scoring expert for ClipForge AI.

Score each video clip moment based on its potential for social media virality.

SCORING CRITERIA (each 0-100):
- hook_strength: How compelling is the opening? Will viewers stop scrolling?
- entertainment: Overall entertainment and watchability
- emotional_reaction: Emotional impact — laugh, surprise, awe, empathy
- unexpectedness: Surprising or subverts expectations
- context_independence: Can a new viewer understand and enjoy it without prior context?
- retention_potential: Will viewers watch to the end?
- ending_quality: Does it end satisfyingly or on a punchline/reaction?

Return ONLY valid JSON (no markdown):
{
  "total_score": <0-100 weighted average>,
  "breakdown": {
    "hook_strength": <0-100>,
    "entertainment": <0-100>,
    "emotional_reaction": <0-100>,
    "unexpectedness": <0-100>,
    "context_independence": <0-100>,
    "retention_potential": <0-100>,
    "ending_quality": <0-100>
  },
  "suggested_title": "<catchy 5-10 word title for this clip>",
  "description": "<2 sentence explanation of why this moment scores well>"
}

IMPORTANT: These scores represent ESTIMATED engagement potential only.
They are NOT predictions of actual virality."""


def _score_heuristic(moment: CandidateMoment) -> ScoredMoment:
    """Fast rule-based scoring when AI is unavailable."""
    text = (moment.transcript + " " + " ".join(moment.tags)).lower()

    # Base score from scene activity
    base = min(50, int(moment.scene_change_density * 20) + 30)

    keyword_boosts = {
        "hook_strength": ["wait", "look", "watch", "here", "this"],
        "entertainment": ["haha", "laugh", "funny", "joke", "hilarious", "lol"],
        "emotional_reaction": ["wow", "oh my", "amazing", "incredible", "no way", "seriously"],
        "unexpectedness": ["unexpected", "surprise", "what", "wait", "actually"],
        "context_independence": [],  # neutral
        "retention_potential": ["but", "actually", "wait for it", "and then"],
        "ending_quality": ["yes", "let's go", "got it", "perfect", "done"],
    }

    breakdown: dict[str, int] = {}
    for criterion, keywords in keyword_boosts.items():
        boost = sum(10 for kw in keywords if kw in text)
        breakdown[criterion] = min(100, base + boost)

    # Tag-based boosts
    if "funny" in moment.tags:
        breakdown["entertainment"] = min(100, breakdown["entertainment"] + 20)
        breakdown["emotional_reaction"] = min(100, breakdown["emotional_reaction"] + 15)
    if "unexpected" in moment.tags:
        breakdown["unexpectedness"] = min(100, breakdown["unexpectedness"] + 25)
    if "emotional" in moment.tags:
        breakdown["emotional_reaction"] = min(100, breakdown["emotional_reaction"] + 20)

    # Duration bonus (sweet spot 30-60s)
    dur = moment.duration
    if 30 <= dur <= 60:
        for k in breakdown:
            breakdown[k] = min(100, breakdown[k] + 5)

    total = int(sum(breakdown.values()) / len(breakdown))
    tags_str = ", ".join(moment.tags) if moment.tags else "highlight"
    title = f"Clip at {_fmt_time(moment.start)} — {tags_str}"
    desc = f"This moment spans {moment.duration:.0f}s with {len(moment.tags)} interest signals detected."

    return ScoredMoment(
        moment=moment,
        total_score=total,
        breakdown=breakdown,
        description=desc,
        suggested_title=title,
    )


def _fmt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


class MomentScorerAgent:
    """Scores candidate moments for viral potential."""

    def __init__(self) -> None:
        self._client: anthropic.Anthropic | None = None
        if settings.anthropic_api_key:
            self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def score_all(
        self,
        candidates: list[CandidateMoment],
        preferred_moments: list[str],
        progress_callback=None,
    ) -> list[ScoredMoment]:
        cb = progress_callback or (lambda pct, msg: None)
        scored: list[ScoredMoment] = []

        for i, cand in enumerate(candidates):
            pct = int(10 + 80 * i / max(len(candidates), 1))
            cb(pct, f"Scoring moment {i + 1}/{len(candidates)}…")
            scored.append(self._score_one(cand, preferred_moments))

        cb(90, "Sorting by viral score…")
        scored.sort(key=lambda s: s.total_score, reverse=True)
        return scored

    def _score_one(
        self, moment: CandidateMoment, preferred: list[str]
    ) -> ScoredMoment:
        if not self._client:
            return _score_heuristic(moment)

        try:
            return self._ai_score(moment, preferred)
        except Exception as exc:
            logger.warning("AI scoring failed (%s), using heuristic", exc)
            return _score_heuristic(moment)

    def _ai_score(self, moment: CandidateMoment, preferred: list[str]) -> ScoredMoment:
        assert self._client is not None

        preferred_str = ", ".join(preferred) if preferred else "general entertainment"
        prompt = (
            f"Score this video clip moment for viral potential.\n\n"
            f"Timestamp: {_fmt_time(moment.start)} – {_fmt_time(moment.end)} ({moment.duration:.0f}s)\n"
            f"Transcript: {moment.transcript[:800]}\n"
            f"Context before: {moment.context_before[:200]}\n"
            f"Context after: {moment.context_after[:200]}\n"
            f"Scene change density: {moment.scene_change_density:.2f}/s\n"
            f"Detected tags: {', '.join(moment.tags) or 'none'}\n"
            f"User prefers: {preferred_str}"
        )

        message = self._client.messages.create(
            model=settings.ai_model,
            max_tokens=512,
            system=SCORING_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)

        return ScoredMoment(
            moment=moment,
            total_score=max(0, min(100, int(data.get("total_score", 50)))),
            breakdown=data.get("breakdown", {}),
            description=data.get("description", ""),
            suggested_title=data.get("suggested_title", f"Clip at {_fmt_time(moment.start)}"),
        )

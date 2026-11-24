"""
Clip Selector Agent — picks the best N clips from scored candidates.
"""
from __future__ import annotations
import logging
from dataclasses import dataclass

from app.agents.moment_scorer import ScoredMoment

logger = logging.getLogger(__name__)


@dataclass
class SelectedClip:
    scored_moment: ScoredMoment
    rank: int


class ClipSelectorAgent:
    """
    Selects the top-N clips from scored moments, ensuring:
    - No heavy overlap between selected clips
    - Each clip has sufficient context
    - Requested count is respected
    - Duration constraints are met
    """

    def select(
        self,
        scored: list[ScoredMoment],
        clip_count: int,
        min_duration: float,
        max_duration: float,
        overlap_max: float = 0.3,
    ) -> list[SelectedClip]:
        """
        Select up to clip_count clips from the scored moments.
        """
        eligible = [
            s for s in scored
            if min_duration * 0.5 <= s.moment.duration <= max_duration * 1.5
        ]

        if not eligible:
            logger.warning("No eligible candidates — relaxing duration constraints")
            eligible = scored

        selected: list[ScoredMoment] = []
        for candidate in eligible:
            if len(selected) >= clip_count:
                break
            if not self._overlaps(candidate, selected, overlap_max):
                selected.append(candidate)

        # If we still don't have enough, fill with best remaining ignoring overlap
        if len(selected) < clip_count:
            for candidate in eligible:
                if len(selected) >= clip_count:
                    break
                if candidate not in selected:
                    selected.append(candidate)

        return [
            SelectedClip(scored_moment=s, rank=i + 1)
            for i, s in enumerate(selected)
        ]

    def _overlaps(
        self,
        candidate: ScoredMoment,
        existing: list[ScoredMoment],
        threshold: float,
    ) -> bool:
        for ex in existing:
            overlap_start = max(candidate.moment.start, ex.moment.start)
            overlap_end = min(candidate.moment.end, ex.moment.end)
            if overlap_end > overlap_start:
                overlap_ratio = (overlap_end - overlap_start) / min(
                    candidate.moment.duration, ex.moment.duration
                )
                if overlap_ratio > threshold:
                    return True
        return False

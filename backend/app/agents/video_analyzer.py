"""
Video Analyzer Agent — extracts transcript, detects scenes, identifies candidate moments.
"""
from __future__ import annotations
import json
import logging
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str
    confidence: float = 1.0


@dataclass
class CandidateMoment:
    start: float
    end: float
    duration: float
    transcript: str
    context_before: str = ""
    context_after: str = ""
    scene_change_density: float = 0.0
    audio_energy: float = 0.0
    tags: list[str] = field(default_factory=list)


class VideoAnalyzerAgent:
    """
    Analyzes a video file to extract transcript segments and identify
    candidate clip moments within the specified time range.
    """

    def __init__(self, progress_callback=None) -> None:
        self.progress_callback = progress_callback or (lambda pct, msg: None)

    def analyze(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        min_duration: float,
        max_duration: float,
        preferred_moments: list[str],
    ) -> tuple[list[TranscriptSegment], list[CandidateMoment]]:
        """
        Returns (transcript_segments, candidate_moments) for the given time range.
        """
        path = Path(video_path)
        if not path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        self.progress_callback(10, "Extracting audio for transcription…")
        transcript = self._transcribe(path, start_time, end_time)

        self.progress_callback(50, "Detecting scene changes and energy peaks…")
        scenes = self._detect_scenes(path, start_time, end_time)

        self.progress_callback(80, "Identifying candidate clip moments…")
        candidates = self._find_candidates(
            transcript, scenes, start_time, end_time, min_duration, max_duration, preferred_moments
        )

        return transcript, candidates

    # ─── Transcription ────────────────────────────────────────────────────────

    def _transcribe(self, path: Path, start: float, end: float) -> list[TranscriptSegment]:
        """
        Attempt to transcribe using whisper.cpp (if available) or fall back to
        a word-gap based segmentation using FFmpeg audio analysis.
        """
        try:
            return self._whisper_transcribe(path, start, end)
        except Exception as exc:
            logger.warning("Whisper unavailable (%s), using audio-based segmentation", exc)
            return self._audio_segment_fallback(path, start, end)

    def _whisper_transcribe(self, path: Path, start: float, end: float) -> list[TranscriptSegment]:
        """Use openai-whisper Python package if installed."""
        import whisper  # type: ignore
        model = whisper.load_model("base")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            duration = end - start if end > start else None
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(start),
                *([] if not duration else ["-t", str(duration)]),
                "-i", str(path),
                "-ar", "16000", "-ac", "1",
                tmp_path,
            ]
            subprocess.run(cmd, capture_output=True, check=True)

            result = model.transcribe(tmp_path, word_timestamps=True)
            segments: list[TranscriptSegment] = []
            for seg in result.get("segments", []):
                segments.append(
                    TranscriptSegment(
                        start=seg["start"] + start,
                        end=seg["end"] + start,
                        text=seg["text"].strip(),
                        confidence=float(seg.get("avg_logprob", 0) + 1),
                    )
                )
            return segments
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def _audio_segment_fallback(self, path: Path, start: float, end: float) -> list[TranscriptSegment]:
        """
        Fallback: creates synthetic transcript segments based on audio silence detection.
        Returns segments marked as [Audio segment N] since we can't transcribe without Whisper.
        """
        duration = max(end - start, 0) if end > start else None
        cmd = [
            "ffmpeg",
            "-ss", str(start),
            *([] if not duration else ["-t", str(duration)]),
            "-i", str(path),
            "-af", "silencedetect=noise=-30dB:d=0.5",
            "-f", "null", "-",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stderr

        # Parse silence intervals
        silence_starts = [float(m) for m in _findall_float(r"silence_start: ([\d.]+)", output)]
        silence_ends = [float(m) for m in _findall_float(r"silence_end: ([\d.]+)", output)]

        segments: list[TranscriptSegment] = []
        speech_start = start
        for s_start, s_end in zip(silence_starts, silence_ends):
            absolute_s_start = s_start + start
            absolute_s_end = s_end + start
            if absolute_s_start > speech_start + 0.5:
                segments.append(
                    TranscriptSegment(
                        start=speech_start,
                        end=absolute_s_start,
                        text=f"[Speech segment {len(segments) + 1}]",
                        confidence=0.5,
                    )
                )
            speech_start = absolute_s_end

        actual_end = (start + duration) if duration else end
        if actual_end > speech_start + 0.5:
            segments.append(
                TranscriptSegment(
                    start=speech_start,
                    end=actual_end,
                    text=f"[Speech segment {len(segments) + 1}]",
                    confidence=0.5,
                )
            )

        return segments or [
            TranscriptSegment(start=start, end=end if end > start else start + 60, text="[Full segment]")
        ]

    # ─── Scene Detection ──────────────────────────────────────────────────────

    def _detect_scenes(self, path: Path, start: float, end: float) -> list[float]:
        """Return timestamps (absolute) of detected scene changes."""
        duration = end - start if end > start else None
        cmd = [
            "ffmpeg",
            "-ss", str(start),
            *([] if not duration else ["-t", str(duration)]),
            "-i", str(path),
            "-vf", "select='gt(scene,0.3)',showinfo",
            "-f", "null", "-",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stderr

        timestamps: list[float] = []
        for m in _findall_float(r"pts_time:([\d.]+)", output):
            timestamps.append(float(m) + start)
        return timestamps

    # ─── Candidate Moments ───────────────────────────────────────────────────

    def _find_candidates(
        self,
        transcript: list[TranscriptSegment],
        scenes: list[float],
        range_start: float,
        range_end: float,
        min_dur: float,
        max_dur: float,
        preferred: list[str],
    ) -> list[CandidateMoment]:
        """
        Slide a window over transcript segments to generate candidate clips.
        """
        if not transcript:
            # No transcript: generate evenly-spaced candidates
            return self._generate_uniform_candidates(
                range_start, range_end, min_dur, max_dur
            )

        candidates: list[CandidateMoment] = []
        n = len(transcript)

        for i in range(n):
            seg = transcript[i]
            if seg.start < range_start or seg.end > range_end:
                continue

            # Try to build a clip of target duration from this starting segment
            clip_start = seg.start
            clip_end = seg.end
            clip_texts = [seg.text]
            j = i + 1

            while j < n and (clip_end - clip_start) < min_dur:
                next_seg = transcript[j]
                if next_seg.end > range_end:
                    break
                clip_end = next_seg.end
                clip_texts.append(next_seg.text)
                j += 1

            duration = clip_end - clip_start
            if duration < min_dur * 0.5 or duration > max_dur * 1.5:
                continue

            # Count scene changes in this window
            sc_count = sum(1 for t in scenes if clip_start <= t <= clip_end)

            # Context
            context_before = transcript[i - 1].text if i > 0 else ""
            context_after = transcript[j].text if j < n else ""

            tags = _infer_tags(" ".join(clip_texts), preferred)

            candidates.append(
                CandidateMoment(
                    start=clip_start,
                    end=clip_end,
                    duration=duration,
                    transcript=" ".join(clip_texts),
                    context_before=context_before,
                    context_after=context_after,
                    scene_change_density=sc_count / max(duration, 1),
                    tags=tags,
                )
            )

        # Deduplicate heavily overlapping candidates (keep highest scene density)
        return _deduplicate_candidates(candidates, overlap_threshold=0.5)

    def _generate_uniform_candidates(
        self,
        start: float,
        end: float,
        min_dur: float,
        max_dur: float,
    ) -> list[CandidateMoment]:
        """When no transcript is available, generate uniform windows."""
        target_dur = (min_dur + max_dur) / 2
        step = target_dur * 0.5
        candidates: list[CandidateMoment] = []
        t = start
        while t + min_dur <= end:
            clip_end = min(t + target_dur, end)
            candidates.append(
                CandidateMoment(
                    start=t,
                    end=clip_end,
                    duration=clip_end - t,
                    transcript="",
                    tags=["highlight"],
                )
            )
            t += step
        return candidates


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _findall_float(pattern: str, text: str) -> list[str]:
    import re
    return re.findall(pattern, text)


def _infer_tags(text: str, preferred: list[str]) -> list[str]:
    text_lower = text.lower()
    keyword_map = {
        "funny": ["haha", "lol", "laugh", "hilarious", "funny", "joke", "comedy"],
        "unexpected": ["wait", "what", "no way", "seriously", "unexpected", "surprise"],
        "emotional": ["oh my", "wow", "amazing", "incredible", "tears", "cry", "happy"],
        "reaction": ["look at", "watch this", "check", "see"],
        "intense": ["yes", "let's go", "incredible", "insane", "crazy"],
    }
    tags = []
    for tag, kws in keyword_map.items():
        if any(kw in text_lower for kw in kws):
            tags.append(tag)
    # Add preferred tags if any match
    for pref in preferred:
        if pref not in tags and pref in text_lower:
            tags.append(pref)
    return tags


def _deduplicate_candidates(
    candidates: list[CandidateMoment], overlap_threshold: float
) -> list[CandidateMoment]:
    """Remove heavily overlapping candidates, keeping the richer ones."""
    result: list[CandidateMoment] = []
    for cand in candidates:
        overlapping = False
        for existing in result:
            overlap_start = max(cand.start, existing.start)
            overlap_end = min(cand.end, existing.end)
            if overlap_end > overlap_start:
                overlap_ratio = (overlap_end - overlap_start) / min(cand.duration, existing.duration)
                if overlap_ratio > overlap_threshold:
                    overlapping = True
                    break
        if not overlapping:
            result.append(cand)
    return result

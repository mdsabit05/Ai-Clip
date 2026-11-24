"""
Video Editor Service — renders vertical 9:16 clips with FFmpeg.

Canvas: 1080 × 1920
Top section (streamer_height%): streamer/reaction video
Bottom section (100 - streamer_height%): original content
"""
from __future__ import annotations
import logging
import subprocess
import tempfile
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)

CANVAS_W = 1080
CANVAS_H = 1920


@dataclass
class RenderOptions:
    caption_style: str = "minimal"      # minimal | bold | neon | none
    caption_position: str = "bottom"    # bottom | center | top
    streamer_height: int = 35           # percent
    add_zoom_effects: bool = False
    normalize_audio: bool = True
    transition_style: str = "cut"       # cut | fade | none


@dataclass
class RenderResult:
    output_path: Path
    thumbnail_path: Path
    duration: float
    success: bool
    error: str = ""


class VideoEditorService:
    """
    Renders a vertical clip from a source video (and optional streamer video).
    Uses FFmpeg filter_complex for compositing.
    """

    def render_clip(
        self,
        source_video: Path,
        start_time: float,
        end_time: float,
        output_path: Path,
        thumbnail_path: Path,
        transcript: str = "",
        streamer_video: Path | None = None,
        options: RenderOptions | None = None,
    ) -> RenderResult:
        opts = options or RenderOptions()
        duration = end_time - start_time

        try:
            self._render(
                source_video=source_video,
                start=start_time,
                duration=duration,
                output_path=output_path,
                streamer_video=streamer_video,
                opts=opts,
            )
            self._extract_thumbnail(source_video, start_time + duration / 3, thumbnail_path)

            actual_duration = self._get_duration(output_path)
            return RenderResult(
                output_path=output_path,
                thumbnail_path=thumbnail_path,
                duration=actual_duration,
                success=True,
            )
        except Exception as exc:
            logger.exception("Render failed for %s", output_path)
            return RenderResult(
                output_path=output_path,
                thumbnail_path=thumbnail_path,
                duration=duration,
                success=False,
                error=str(exc),
            )

    # ─── Core Render ──────────────────────────────────────────────────────────

    def _render(
        self,
        source_video: Path,
        start: float,
        duration: float,
        output_path: Path,
        streamer_video: Path | None,
        opts: RenderOptions,
    ) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        streamer_h = int(CANVAS_H * opts.streamer_height / 100)
        content_h = CANVAS_H - streamer_h
        content_y = streamer_h

        # Build filter_complex
        if streamer_video and streamer_video.exists():
            filter_complex = self._build_dual_filter(
                streamer_h=streamer_h,
                content_h=content_h,
                content_y=content_y,
                opts=opts,
            )
            inputs = [
                "-ss", str(start), "-t", str(duration), "-i", str(source_video),
                "-ss", "0", "-t", str(duration), "-i", str(streamer_video),
            ]
            audio_map = "-map [aout]" if opts.normalize_audio else "-map 0:a?"
        else:
            filter_complex = self._build_single_filter(
                streamer_h=streamer_h,
                content_h=content_h,
                content_y=content_y,
                opts=opts,
            )
            inputs = ["-ss", str(start), "-t", str(duration), "-i", str(source_video)]
            audio_map = "-map 0:a?"

        cmd = [
            "ffmpeg", "-y",
            *inputs,
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            *audio_map.split(),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p",
            str(output_path),
        ]

        logger.debug("FFmpeg command: %s", " ".join(cmd))
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg failed:\n{result.stderr[-2000:]}")

    def _build_single_filter(
        self,
        streamer_h: int,
        content_h: int,
        content_y: int,
        opts: RenderOptions,
    ) -> str:
        """
        Single input: source video fills both sections.
        Top section: zoomed/cropped for streamer look.
        Bottom section: main content.
        """
        # Black canvas
        lines = [
            f"color=black:{CANVAS_W}x{CANVAS_H}:r=30[canvas]",

            # Top: streamer crop (top-center area, full width)
            f"[0:v]trim=0,setpts=PTS-STARTPTS[v0]",
            f"[v0]scale={CANVAS_W}:{streamer_h}:force_original_aspect_ratio=increase,"
            f"crop={CANVAS_W}:{streamer_h}[top]",

            # Bottom: main content
            f"[v0]scale={CANVAS_W}:{content_h}:force_original_aspect_ratio=increase,"
            f"crop={CANVAS_W}:{content_h}[bottom]",

            # Overlay onto canvas
            f"[canvas][top]overlay=0:0[tmp1]",
            f"[tmp1][bottom]overlay=0:{content_y}[vout]",
        ]
        return ";".join(lines)

    def _build_dual_filter(
        self,
        streamer_h: int,
        content_h: int,
        content_y: int,
        opts: RenderOptions,
    ) -> str:
        """
        Dual input: input 0 = source, input 1 = streamer video.
        """
        lines = [
            f"color=black:{CANVAS_W}x{CANVAS_H}:r=30[canvas]",

            # Streamer video → top section
            f"[1:v]scale={CANVAS_W}:{streamer_h}:force_original_aspect_ratio=increase,"
            f"crop={CANVAS_W}:{streamer_h}[top]",

            # Source video → bottom section
            f"[0:v]scale={CANVAS_W}:{content_h}:force_original_aspect_ratio=increase,"
            f"crop={CANVAS_W}:{content_h}[bottom]",

            # Compose
            f"[canvas][top]overlay=0:0[tmp1]",
            f"[tmp1][bottom]overlay=0:{content_y}[vout]",
        ]

        # Audio: mix both inputs if normalize is on
        if opts.normalize_audio:
            lines.append("[0:a][1:a]amix=inputs=2:duration=first:normalize=1[aout]")

        return ";".join(lines)

    # ─── Thumbnail ────────────────────────────────────────────────────────────

    def _extract_thumbnail(self, video: Path, timestamp: float, output: Path) -> None:
        output.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(max(0, timestamp)),
            "-i", str(video),
            "-vframes", "1",
            "-vf", f"scale={CANVAS_W}:-2",
            "-q:v", "2",
            str(output),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.warning("Thumbnail extraction failed: %s", result.stderr[-500:])

    # ─── Quality Check ────────────────────────────────────────────────────────

    def run_quality_checks(self, output_path: Path, expected_duration: float) -> dict:
        """
        Verify the rendered clip meets quality requirements.
        Returns dict with 'passed' bool and 'issues' list.
        """
        issues: list[str] = []

        if not output_path.exists():
            return {"passed": False, "issues": ["Output file does not exist"]}

        # Check duration
        actual_dur = self._get_duration(output_path)
        if actual_dur < expected_duration * 0.8:
            issues.append(f"Duration too short: {actual_dur:.1f}s vs expected {expected_duration:.1f}s")

        # Check has video stream
        probe = self._probe(output_path)
        has_video = any(s.get("codec_type") == "video" for s in probe.get("streams", []))
        if not has_video:
            issues.append("No video stream found in output")

        # Check dimensions
        for stream in probe.get("streams", []):
            if stream.get("codec_type") == "video":
                w = stream.get("width", 0)
                h = stream.get("height", 0)
                if w != CANVAS_W or h != CANVAS_H:
                    issues.append(f"Wrong dimensions: {w}x{h}, expected {CANVAS_W}x{CANVAS_H}")
                break

        return {"passed": len(issues) == 0, "issues": issues}

    def _get_duration(self, path: Path) -> float:
        probe = self._probe(path)
        return float(probe.get("format", {}).get("duration", 0))

    def _probe(self, path: Path) -> dict:
        import json as json_mod
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams", "-show_format",
            str(path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        try:
            return json_mod.loads(result.stdout)
        except Exception:
            return {}

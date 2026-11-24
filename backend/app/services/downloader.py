"""
Video download service using yt-dlp.
"""
from __future__ import annotations
import logging
import subprocess
from pathlib import Path

import yt_dlp

from app.core.config import settings

logger = logging.getLogger(__name__)


class VideoDownloader:
    """Downloads YouTube videos using yt-dlp."""

    def download(
        self,
        url: str,
        output_dir: Path,
        project_id: str,
        progress_callback=None,
    ) -> tuple[Path, dict]:
        """
        Downloads the video and returns (video_path, info_dict).
        info_dict contains 'duration', 'title', 'thumbnail', etc.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        output_template = str(output_dir / f"{project_id}.%(ext)s")

        cb = progress_callback or (lambda pct, msg: None)
        cb(5, "Starting video download…")

        def yt_progress_hook(d: dict) -> None:
            if d["status"] == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 1
                downloaded = d.get("downloaded_bytes", 0)
                pct = max(5, min(85, int(5 + 80 * downloaded / total)))
                speed = d.get("_speed_str", "")
                cb(pct, f"Downloading… {speed}")
            elif d["status"] == "finished":
                cb(90, "Download complete, processing…")

        ydl_opts = {
            "format": "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "outtmpl": output_template,
            "merge_output_format": "mp4",
            "progress_hooks": [yt_progress_hook],
            "quiet": True,
            "no_warnings": False,
            "noplaylist": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        # Find the actual file
        video_path = self._find_downloaded_file(output_dir, project_id)
        cb(100, "Download complete")
        return video_path, info or {}

    def get_info(self, url: str) -> dict:
        """Fetch video metadata without downloading."""
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "skip_download": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        return info or {}

    def _find_downloaded_file(self, directory: Path, prefix: str) -> Path:
        """Find the video file that was downloaded."""
        for ext in ["mp4", "mkv", "webm", "avi"]:
            candidate = directory / f"{prefix}.{ext}"
            if candidate.exists():
                return candidate
        # Fallback: find any video file starting with prefix
        matches = sorted(directory.glob(f"{prefix}.*"))
        if matches:
            return matches[0]
        raise FileNotFoundError(f"Downloaded video not found in {directory}")

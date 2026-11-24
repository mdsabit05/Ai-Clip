from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    # App
    app_name: str = "ClipForge AI"
    debug: bool = False
    secret_key: str = "changeme-in-production-use-random-32-bytes"

    # Database
    database_url: str = "sqlite:///./clipforge.db"

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # Storage
    storage_base: Path = Path("./storage")
    max_video_size_mb: int = 2000

    # AI
    anthropic_api_key: str = ""
    ai_model: str = "claude-opus-4-6"

    # Processing
    max_concurrent_jobs: int = 2

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def model_post_init(self, __context) -> None:  # noqa: ANN001
        self.storage_base.mkdir(parents=True, exist_ok=True)
        (self.storage_base / "videos").mkdir(exist_ok=True)
        (self.storage_base / "clips").mkdir(exist_ok=True)
        (self.storage_base / "streamer").mkdir(exist_ok=True)
        (self.storage_base / "thumbnails").mkdir(exist_ok=True)


settings = Settings()

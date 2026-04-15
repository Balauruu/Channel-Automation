"""Configuration for channel_assistant pipeline.

All tunables, paths, and thresholds in one place.
"""
import os
from pathlib import Path


class Config:
    """Pipeline configuration. All paths relative to project_root."""

    SCRAPE_FRESHNESS_HOURS: int = 24
    STALENESS_DAYS: int = 14
    AGING_DAYS: int = 10

    WATCH_LIST_MAX_VIDEOS: int | None = None
    LANDSCAPE_MAX_VIDEOS: int = 20

    CLUSTER_MIN_K: int = 3
    CLUSTER_MAX_K: int = 25
    OUTLIER_MULTIPLIER: float = 2.0

    CONVERGENCE_WINDOW_DAYS: int = 30
    CONVERGENCE_MIN_CHANNELS: int = 3
    SATURATION_DECAY_LAMBDA: float = 0.01

    def __init__(self, project_root: str | Path) -> None:
        self.root = Path(project_root).resolve()

    @property
    def DB_PATH(self) -> Path:
        return self.root / "data" / "channel_assistant.db"

    @property
    def DASHBOARD_PATH(self) -> Path:
        return self.root / "channel" / "strategy" / "dashboard.html"

    @property
    def TOPICS_PATH(self) -> Path:
        return self.root / "channel" / "strategy" / "topics.md"

    @property
    def PAST_TOPICS_PATH(self) -> Path:
        return self.root / "channel" / "past_topics.md"

    @property
    def FONT_DIR(self) -> Path:
        return self.root / "docs" / "pizzint-design" / "fonts"

    @property
    def youtube_api_key(self) -> str | None:
        return os.environ.get("YOUTUBE_API_KEY")

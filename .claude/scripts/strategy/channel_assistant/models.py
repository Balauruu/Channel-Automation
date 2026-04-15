"""Data models for channel_assistant pipeline."""
from dataclasses import dataclass


@dataclass
class Channel:
    name: str
    youtube_id: str
    tier: str = "landscape"
    handle: str | None = None
    url: str | None = None
    subscribers: int | None = None
    total_views: int | None = None
    description: str | None = None
    added_at: str | None = None
    last_scraped_at: str | None = None


@dataclass
class Video:
    video_id: str
    channel_id: str
    title: str
    url: str | None = None
    views: int | None = None
    likes: int | None = None
    comment_count: int | None = None
    upload_date: str | None = None
    description: str | None = None
    duration: int | None = None
    thumbnail_url: str | None = None
    scraped_at: str | None = None


@dataclass
class Cluster:
    cluster_id: int
    label: str
    keywords: str
    video_count: int
    avg_views: float
    saturation_score: float
    status: str
    computed_at: str


@dataclass
class TrendSignal:
    cluster_id: int
    signal_type: str
    slope: float
    confidence: float
    window_days: int
    detected_at: str
    details: str | None = None


@dataclass
class PipelineRun:
    stage: str
    started_at: str
    status: str
    input_hash: str | None = None
    completed_at: str | None = None
    summary: str | None = None


@dataclass
class TopicBrief:
    title: str
    scores: str
    total_score: int
    pillar_primary: str
    generated_at: str
    pillar_secondary: str | None = None
    source_clusters: str | None = None
    hook: str | None = None
    duplicate_of: str | None = None
    status: str = "candidate"
    selected_at: str | None = None

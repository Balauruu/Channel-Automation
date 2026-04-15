"""Tests for data model dataclasses."""
from channel_assistant.models import (
    Channel, Video, Cluster, TrendSignal, PipelineRun, TopicBrief,
)


def test_channel_with_tier():
    ch = Channel(name="Test", youtube_id="UC123", tier="watch_list")
    assert ch.tier == "watch_list"
    assert ch.handle is None


def test_channel_defaults_to_landscape():
    ch = Channel(name="Test", youtube_id="UC123")
    assert ch.tier == "landscape"


def test_video_required_fields():
    v = Video(video_id="abc", channel_id="UC123", title="Test Video")
    assert v.views is None
    assert v.comment_count is None
    assert v.thumbnail_url is None


def test_cluster_creation():
    c = Cluster(
        cluster_id=1, label="cults", keywords="cult,leader,recruitment",
        video_count=15, avg_views=500000.0, saturation_score=0.3,
        status="competitive", computed_at="2026-04-16T00:00:00Z",
    )
    assert c.status == "competitive"
    assert c.saturation_score == 0.3


def test_trend_signal_creation():
    t = TrendSignal(
        cluster_id=1, signal_type="emerging", slope=0.05,
        confidence=0.82, window_days=30, detected_at="2026-04-16T00:00:00Z",
    )
    assert t.signal_type == "emerging"
    assert t.details is None


def test_pipeline_run_creation():
    r = PipelineRun(
        stage="analyze", started_at="2026-04-16T00:00:00Z",
        status="success", input_hash="abc123",
    )
    assert r.completed_at is None
    assert r.summary is None


def test_topic_brief_creation():
    b = TopicBrief(
        title="Duplessis Orphans",
        scores='{"obscurity":5,"complexity":4,"shock_factor":5,"verifiability":4,"pillar_fit":5}',
        total_score=23,
        pillar_primary="Institutional Corruption",
        generated_at="2026-04-16T00:00:00Z",
    )
    assert b.status == "candidate"
    assert b.selected_at is None

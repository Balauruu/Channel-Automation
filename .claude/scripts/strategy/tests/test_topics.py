"""Tests for topic generation context formatting."""
import pytest
from pathlib import Path
from channel_assistant.topics import TopicEngine


@pytest.fixture
def topics_engine(db, tmp_config):
    # Create past_topics.md with one entry
    tmp_config.PAST_TOPICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_config.PAST_TOPICS_PATH.write_text(
        "# Past Topics\n\n"
        "- **The Duplessis Orphans** | 2026-04-11 | Institutional corruption\n",
        encoding="utf-8",
    )
    return TopicEngine(db, tmp_config)


class TestContextFormatting:
    def test_format_context_includes_clusters(self, topics_engine, db):
        db.save_clusters([
            {"label": "cults", "keywords": "cult,leader", "video_count": 10,
             "avg_views": 500000, "saturation_score": 0.3, "status": "competitive"},
        ])
        ctx = topics_engine.format_context()
        assert "cults" in ctx
        assert "competitive" in ctx

    def test_format_context_includes_keywords(self, topics_engine, db):
        db.save_keywords([
            {"keyword": "cold war", "source": "title", "frequency": 7,
             "channels_count": 2, "avg_views": 800000},
        ])
        ctx = topics_engine.format_context()
        assert "cold war" in ctx

    def test_format_context_includes_trends(self, topics_engine, db):
        db.save_clusters([
            {"label": "test", "keywords": "test", "video_count": 1,
             "avg_views": 0, "saturation_score": 0, "status": "underserved"},
        ])
        db.save_trend_signals([
            {"cluster_id": 1, "signal_type": "emerging", "slope": 0.05,
             "confidence": 0.8, "window_days": 30},
        ])
        ctx = topics_engine.format_context()
        assert "emerging" in ctx.lower()


class TestDuplicateCheck:
    def test_detects_near_duplicate(self, topics_engine):
        result = topics_engine.check_duplicate("The Duplessis Orphans Scandal")
        assert result is not None
        assert "Duplessis" in result

    def test_no_duplicate_for_different_topic(self, topics_engine):
        result = topics_engine.check_duplicate("The Zodiac Killer")
        assert result is None


class TestBriefWriting:
    def test_write_briefs_saves_to_db(self, topics_engine, db):
        briefs = [
            {"title": "Topic A", "scores": '{"obscurity":5}', "total_score": 20,
             "pillar_primary": "Cults", "hook": "A dark hook"},
            {"title": "Topic B", "scores": '{"obscurity":3}', "total_score": 15,
             "pillar_primary": "Dark Web", "hook": "Another hook"},
        ]
        topics_engine.write_briefs(briefs)
        saved = db.get_topic_briefs()
        assert len(saved) == 2

    def test_write_briefs_saves_to_file(self, topics_engine, tmp_config):
        briefs = [
            {"title": "Topic A", "scores": '{"obscurity":5}', "total_score": 20,
             "pillar_primary": "Cults", "hook": "A dark hook"},
        ]
        topics_engine.write_briefs(briefs)
        assert tmp_config.TOPICS_PATH.exists()
        content = tmp_config.TOPICS_PATH.read_text(encoding="utf-8")
        assert "Topic A" in content

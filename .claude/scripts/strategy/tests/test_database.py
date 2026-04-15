"""Tests for database schema, migration, and CRUD operations."""
import sqlite3
import pytest
from channel_assistant.database import Database


class TestSchema:
    def test_init_creates_all_tables(self, db):
        conn = db.connect()
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [
            row[0] for row in cursor.fetchall()
            if not row[0].startswith("sqlite_")
        ]
        conn.close()
        expected = [
            "channel_stats_history", "channels", "keywords",
            "pipeline_runs", "scrape_log", "topic_briefs",
            "topic_clusters", "trend_signals", "video_clusters",
            "video_tags", "videos",
        ]
        assert tables == expected

    def test_wal_mode_enabled(self, db):
        conn = db.connect()
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        conn.close()
        assert mode == "wal"

    def test_foreign_keys_enabled(self, db):
        conn = db.connect()
        fk = conn.execute("PRAGMA foreign_keys").fetchone()[0]
        conn.close()
        assert fk == 1

    def test_schema_version_tracked(self, db):
        assert db.get_schema_version() == 2


class TestChannelCRUD:
    def test_upsert_channel(self, db, sample_channel):
        db.upsert_channel(sample_channel)
        ch = db.get_channel("UC_test_123")
        assert ch["name"] == "Test Channel"
        assert ch["tier"] == "watch_list"

    def test_upsert_channel_updates_existing(self, db, sample_channel):
        db.upsert_channel(sample_channel)
        sample_channel["subscribers"] = 200000
        db.upsert_channel(sample_channel)
        ch = db.get_channel("UC_test_123")
        assert ch["subscribers"] == 200000

    def test_list_channels_by_tier(self, db, sample_channel):
        db.upsert_channel(sample_channel)
        sample_channel["youtube_id"] = "UC_land_456"
        sample_channel["name"] = "Landscape Channel"
        sample_channel["tier"] = "landscape"
        db.upsert_channel(sample_channel)

        watch = db.get_channels_by_tier("watch_list")
        land = db.get_channels_by_tier("landscape")
        assert len(watch) == 1
        assert len(land) == 1

    def test_remove_channel_cascades(self, db, sample_channel, sample_video):
        db.upsert_channel(sample_channel)
        db.upsert_videos([sample_video])
        db.remove_channel("UC_test_123")
        assert db.get_channel("UC_test_123") is None
        videos = db.get_videos_by_channel("UC_test_123")
        assert len(videos) == 0

    def test_update_tier(self, db, sample_channel):
        db.upsert_channel(sample_channel)
        db.update_channel_tier("UC_test_123", "landscape")
        ch = db.get_channel("UC_test_123")
        assert ch["tier"] == "landscape"


class TestVideoCRUD:
    def test_upsert_videos_batch(self, db, sample_channel, sample_video):
        db.upsert_channel(sample_channel)
        videos = [sample_video.copy() for _ in range(3)]
        for i, v in enumerate(videos):
            v["video_id"] = f"vid_{i:03d}"
            v["title"] = f"Test Video {i}"
        db.upsert_videos(videos)
        result = db.get_videos_by_channel("UC_test_123")
        assert len(result) == 3

    def test_upsert_videos_with_tags(self, db, sample_channel, sample_video):
        db.upsert_channel(sample_channel)
        sample_video["tags"] = ["true crime", "documentary", "mystery"]
        db.upsert_videos([sample_video])
        tags = db.get_video_tags("vid_001")
        assert set(tags) == {"true crime", "documentary", "mystery"}


class TestPipelineRuns:
    def test_record_pipeline_run(self, db):
        run_id = db.start_pipeline_run("scrape", "abc123")
        db.complete_pipeline_run(run_id, "success", "Scraped 3 channels")
        run = db.get_latest_pipeline_run("scrape")
        assert run["status"] == "success"
        assert run["input_hash"] == "abc123"
        assert run["completed_at"] is not None

    def test_latest_run_returns_most_recent(self, db):
        id1 = db.start_pipeline_run("analyze", "hash1")
        db.complete_pipeline_run(id1, "success", "Run 1")
        id2 = db.start_pipeline_run("analyze", "hash2")
        db.complete_pipeline_run(id2, "success", "Run 2")
        run = db.get_latest_pipeline_run("analyze")
        assert run["input_hash"] == "hash2"


class TestStatsHistory:
    def test_record_stats_snapshot(self, db, sample_channel):
        db.upsert_channel(sample_channel)
        db.record_stats_snapshot("UC_test_123", 100000, 5000000, 50)
        history = db.get_stats_history("UC_test_123")
        assert len(history) == 1
        assert history[0]["subscribers"] == 100000


class TestClusterCRUD:
    def test_save_and_retrieve_clusters(self, db):
        clusters = [
            {"label": "cults", "keywords": "cult,leader", "video_count": 10,
             "avg_views": 500000, "saturation_score": 0.3, "status": "competitive"},
            {"label": "cold war", "keywords": "cold war,cia", "video_count": 5,
             "avg_views": 800000, "saturation_score": 0.1, "status": "underserved"},
        ]
        db.save_clusters(clusters)
        result = db.get_clusters()
        assert len(result) == 2
        labels = {r["label"] for r in result}
        assert labels == {"cults", "cold war"}

    def test_save_clusters_replaces_previous(self, db):
        db.save_clusters([{"label": "old", "keywords": "x", "video_count": 1,
                           "avg_views": 0, "saturation_score": 0, "status": "saturated"}])
        db.save_clusters([{"label": "new", "keywords": "y", "video_count": 2,
                           "avg_views": 0, "saturation_score": 0, "status": "underserved"}])
        result = db.get_clusters()
        assert len(result) == 1
        assert result[0]["label"] == "new"


class TestKeywords:
    def test_save_and_retrieve_keywords(self, db):
        keywords = [
            {"keyword": "cult leader", "source": "title", "frequency": 34,
             "channels_count": 8, "avg_views": 1200000},
            {"keyword": "cold war", "source": "title", "frequency": 7,
             "channels_count": 2, "avg_views": 2100000},
        ]
        db.save_keywords(keywords)
        result = db.get_keywords(limit=10)
        assert len(result) == 2


class TestTrendSignals:
    def test_save_and_retrieve_signals(self, db):
        db.save_clusters([
            {"label": "test", "keywords": "test", "video_count": 1,
             "avg_views": 0, "saturation_score": 0, "status": "underserved"},
        ])
        clusters = db.get_clusters()
        cluster_id = clusters[0]["cluster_id"]
        db.save_trend_signals([
            {"cluster_id": cluster_id, "signal_type": "emerging", "slope": 0.05,
             "confidence": 0.8, "window_days": 30},
        ])
        signals = db.get_trend_signals()
        assert len(signals) == 1
        assert signals[0]["signal_type"] == "emerging"


class TestTopicBriefs:
    def test_save_and_retrieve_briefs(self, db):
        briefs = [
            {"title": "Topic A", "scores": '{"obscurity":5}', "total_score": 20,
             "pillar_primary": "Cults"},
        ]
        db.save_topic_briefs(briefs)
        result = db.get_topic_briefs()
        assert len(result) == 1
        assert result[0]["title"] == "Topic A"
        assert result[0]["status"] == "candidate"

    def test_select_topic(self, db):
        db.save_topic_briefs([
            {"title": "Topic A", "scores": '{"obscurity":5}', "total_score": 20,
             "pillar_primary": "Cults"},
        ])
        briefs = db.get_topic_briefs()
        brief_id = briefs[0]["id"]
        db.select_topic(brief_id)
        updated = db.get_topic_briefs()
        assert updated[0]["status"] == "selected"
        assert updated[0]["selected_at"] is not None


class TestGetAllChannels:
    def test_get_all_channels(self, db, sample_channel):
        db.upsert_channel(sample_channel)
        sample_channel["youtube_id"] = "UC_other"
        sample_channel["name"] = "Other"
        sample_channel["tier"] = "landscape"
        db.upsert_channel(sample_channel)
        all_ch = db.get_all_channels()
        assert len(all_ch) == 2

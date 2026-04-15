"""Tests for cache-aware pipeline orchestration."""
import hashlib
import pytest
from unittest.mock import MagicMock, patch
from channel_assistant.pipeline import Pipeline


@pytest.fixture
def pipeline(db, tmp_config):
    return Pipeline(db, tmp_config)


class TestFreshness:
    def test_no_prior_run_is_stale(self, pipeline):
        status = pipeline.check_freshness("scrape")
        assert status["state"] == "stale"
        assert status["age_days"] is None

    def test_recent_run_is_fresh(self, pipeline, db):
        run_id = db.start_pipeline_run("scrape", "hash1")
        db.complete_pipeline_run(run_id, "success", "ok")
        status = pipeline.check_freshness("scrape")
        assert status["state"] == "fresh"

    def test_old_run_is_stale(self, pipeline, db):
        """A run from 15 days ago should be stale (threshold=14 days)."""
        conn = db.connect()
        conn.execute(
            "INSERT INTO pipeline_runs (stage, started_at, completed_at, input_hash, status, summary) "
            "VALUES (?, datetime('now', '-15 days'), datetime('now', '-15 days'), ?, 'success', 'old')",
            ("analyze", "oldhash"),
        )
        conn.commit()
        conn.close()
        status = pipeline.check_freshness("analyze")
        assert status["state"] == "stale"


class TestInputHash:
    def test_scrape_hash_changes_with_channels(self, pipeline, db, sample_channel):
        hash1 = pipeline.compute_input_hash("scrape")
        db.upsert_channel(sample_channel)
        hash2 = pipeline.compute_input_hash("scrape")
        assert hash1 != hash2

    def test_analyze_hash_changes_with_new_videos(self, pipeline, db, sample_channel, sample_video):
        db.upsert_channel(sample_channel)
        hash1 = pipeline.compute_input_hash("analyze")
        db.upsert_videos([sample_video])
        hash2 = pipeline.compute_input_hash("analyze")
        assert hash1 != hash2


class TestShouldRun:
    def test_should_run_when_no_prior(self, pipeline):
        assert pipeline.should_run("scrape") is True

    def test_should_skip_when_fresh_and_same_hash(self, pipeline, db):
        current_hash = pipeline.compute_input_hash("scrape")
        run_id = db.start_pipeline_run("scrape", current_hash)
        db.complete_pipeline_run(run_id, "success", "ok")
        assert pipeline.should_run("scrape") is False

    def test_should_run_when_hash_changed(self, pipeline, db, sample_channel):
        run_id = db.start_pipeline_run("scrape", "old_hash")
        db.complete_pipeline_run(run_id, "success", "ok")
        db.upsert_channel(sample_channel)  # changes the hash
        assert pipeline.should_run("scrape") is True

    def test_force_overrides_cache(self, pipeline, db):
        current_hash = pipeline.compute_input_hash("scrape")
        run_id = db.start_pipeline_run("scrape", current_hash)
        db.complete_pipeline_run(run_id, "success", "ok")
        assert pipeline.should_run("scrape", force=True) is True


class TestStatus:
    def test_get_status_all_stages(self, pipeline):
        status = pipeline.get_status()
        assert "scrape" in status
        assert "analyze" in status
        assert "dashboard" in status
        for stage_info in status.values():
            assert "state" in stage_info


class TestMarkStale:
    def test_mark_stale_forces_rerun(self, pipeline, db):
        current_hash = pipeline.compute_input_hash("scrape")
        run_id = db.start_pipeline_run("scrape", current_hash)
        db.complete_pipeline_run(run_id, "success", "ok")
        assert pipeline.should_run("scrape") is False
        pipeline.mark_stale("scrape")
        assert pipeline.should_run("scrape") is True

    def test_mark_stale_no_op_when_no_success_run(self, pipeline):
        # should not raise even with nothing to invalidate
        pipeline.mark_stale("scrape")

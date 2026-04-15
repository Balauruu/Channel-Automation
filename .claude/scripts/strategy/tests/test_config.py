"""Tests for config module."""
import os
import pytest
from channel_assistant.config import Config


def test_config_default_paths():
    cfg = Config(project_root=".")
    assert cfg.DB_PATH.name == "channel_assistant.db"
    assert cfg.DASHBOARD_PATH.name == "dashboard.html"
    assert cfg.TOPICS_PATH.name == "topics.md"
    assert cfg.PAST_TOPICS_PATH.name == "past_topics.md"


def test_config_staleness_thresholds():
    cfg = Config(project_root=".")
    assert cfg.STALENESS_DAYS == 14
    assert cfg.AGING_DAYS == 10
    assert cfg.SCRAPE_FRESHNESS_HOURS == 24


def test_config_analysis_params():
    cfg = Config(project_root=".")
    assert cfg.CLUSTER_MIN_K == 3
    assert cfg.CLUSTER_MAX_K == 25
    assert cfg.OUTLIER_MULTIPLIER == 2.0
    assert cfg.CONVERGENCE_WINDOW_DAYS == 30
    assert cfg.CONVERGENCE_MIN_CHANNELS == 3
    assert cfg.SATURATION_DECAY_LAMBDA == pytest.approx(0.01)


def test_config_tier_limits():
    cfg = Config(project_root=".")
    assert cfg.WATCH_LIST_MAX_VIDEOS is None
    assert cfg.LANDSCAPE_MAX_VIDEOS == 20


def test_config_api_key_from_env(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "test-key-123")
    cfg = Config(project_root=".")
    assert cfg.youtube_api_key == "test-key-123"


def test_config_api_key_missing(monkeypatch):
    monkeypatch.delenv("YOUTUBE_API_KEY", raising=False)
    cfg = Config(project_root=".")
    assert cfg.youtube_api_key is None

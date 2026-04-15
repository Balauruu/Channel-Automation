"""Shared pytest fixtures for channel_assistant tests."""
import sqlite3
import pytest
from pathlib import Path
from channel_assistant.config import Config
from channel_assistant.database import Database


@pytest.fixture
def tmp_config(tmp_path):
    """Config pointing to a temp directory."""
    (tmp_path / "data").mkdir()
    (tmp_path / "channel" / "strategy").mkdir(parents=True)
    return Config(project_root=tmp_path)


@pytest.fixture
def db(tmp_config):
    """Initialized database in temp directory."""
    database = Database(tmp_config.DB_PATH)
    database.init_db()
    return database


@pytest.fixture
def sample_channel():
    """Sample channel dict for insertion."""
    return {
        "youtube_id": "UC_test_123",
        "name": "Test Channel",
        "handle": "@TestChannel",
        "url": "https://www.youtube.com/@TestChannel",
        "subscribers": 100000,
        "total_views": 5000000,
        "description": "A test channel",
        "tier": "watch_list",
    }


@pytest.fixture
def sample_video():
    """Sample video dict for insertion."""
    return {
        "video_id": "vid_001",
        "channel_id": "UC_test_123",
        "title": "The Dark History of Test Cases",
        "url": "https://www.youtube.com/watch?v=vid_001",
        "views": 250000,
        "likes": 12000,
        "comment_count": 800,
        "upload_date": "2026-03-15",
        "description": "A deep dive into test-driven development gone wrong.",
        "duration": 1800,
        "thumbnail_url": "https://i.ytimg.com/vi/vid_001/hqdefault.jpg",
    }

# Strategy Agent Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the strategy agent from a data-collection shell into a cache-aware intelligence platform with YouTube Data API, NLP analytics, and an interactive pizzint-themed dashboard.

**Architecture:** Hybrid DB-centric platform. SQLite stores raw data, computed metrics, and pipeline state. Python modules form a pipeline (collect → analyze → dashboard). Plotly charts embedded in a custom HTML template with pizzint design tokens. Cache-aware orchestrator skips stages whose inputs haven't changed.

**Tech Stack:** Python 3.10+, SQLite (WAL mode), google-api-python-client, plotly, pandas, scikit-learn, yake, pytest

**Spec:** `docs/superpowers/specs/2026-04-16-strategy-agent-rework-design.md`

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `.claude/scripts/strategy/channel_assistant/config.py` | All tunables: paths, thresholds, API key loading |
| `.claude/scripts/strategy/channel_assistant/collector.py` | YouTube Data API v3 client: channel details, video lists, search |
| `.claude/scripts/strategy/channel_assistant/dashboard.py` | Plotly chart generation + pizzint HTML template composition |
| `.claude/scripts/strategy/channel_assistant/pipeline.py` | Cache-aware stage orchestration via pipeline_runs table |
| `.claude/scripts/strategy/tests/__init__.py` | Test package init |
| `.claude/scripts/strategy/tests/conftest.py` | Shared pytest fixtures (in-memory DB, sample data) |
| `.claude/scripts/strategy/tests/test_config.py` | Config loading tests |
| `.claude/scripts/strategy/tests/test_database.py` | Schema, migration, CRUD, query tests |
| `.claude/scripts/strategy/tests/test_models.py` | Dataclass construction tests |
| `.claude/scripts/strategy/tests/test_collector.py` | YouTube API client tests (mocked) |
| `.claude/scripts/strategy/tests/test_analyzer.py` | Stats, NLP clustering, trend detection tests |
| `.claude/scripts/strategy/tests/test_dashboard.py` | Dashboard HTML generation tests |
| `.claude/scripts/strategy/tests/test_pipeline.py` | Cache logic, freshness, hash computation tests |
| `.claude/scripts/strategy/tests/test_topics.py` | Topic context formatting tests |
| `.claude/scripts/strategy/tests/test_project_init.py` | Init + package tests |
| `.claude/scripts/strategy/tests/test_cli.py` | CLI subcommand integration tests |

### Modified files

| File | Changes |
|------|---------|
| `.claude/scripts/strategy/channel_assistant/database.py` | Full rewrite: 11-table schema, migrations, expanded query helpers |
| `.claude/scripts/strategy/channel_assistant/models.py` | Expand with Cluster, TrendSignal, PipelineRun, TopicBrief dataclasses |
| `.claude/scripts/strategy/channel_assistant/analyzer.py` | Full rewrite: 3-pass analysis (stats, NLP, trends) |
| `.claude/scripts/strategy/channel_assistant/topics.py` | Rewrite: query DB for computed data, format Claude context |
| `.claude/scripts/strategy/channel_assistant/project_init.py` | Simplify init, add package() function |
| `.claude/scripts/strategy/channel_assistant/cli.py` | Rewrite: new subcommands, pipeline integration |
| `.claude/scripts/strategy/channel_assistant/__init__.py` | No change |
| `.claude/scripts/strategy/channel_assistant/__main__.py` | No change |
| `.claude/agents/strategy.md` | Full rewrite: new agent definition |
| `.claude/agents/researcher.md` | Update metadata.json reference (was metadata.md) |

### Deleted files

| File | Reason |
|------|--------|
| `.claude/scripts/strategy/channel_assistant/scraper.py` | Replaced by collector.py |
| `.claude/scripts/strategy/channel_assistant/registry.py` | Channel CRUD moves to database.py |
| `.claude/scripts/strategy/channel_assistant/trend_scanner.py` | Trend logic moves to analyzer.py |

---

## Task 1: Foundation — config.py + models.py

**Files:**
- Create: `.claude/scripts/strategy/channel_assistant/config.py`
- Modify: `.claude/scripts/strategy/channel_assistant/models.py`
- Create: `.claude/scripts/strategy/tests/__init__.py`
- Create: `.claude/scripts/strategy/tests/test_config.py`
- Create: `.claude/scripts/strategy/tests/test_models.py`

- [ ] **Step 1: Create test package init**

Create `.claude/scripts/strategy/tests/__init__.py` as an empty file.

- [ ] **Step 2: Write config tests**

```python
# .claude/scripts/strategy/tests/test_config.py
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
    assert cfg.WATCH_LIST_MAX_VIDEOS is None  # fetch all
    assert cfg.LANDSCAPE_MAX_VIDEOS == 20


def test_config_api_key_from_env(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "test-key-123")
    cfg = Config(project_root=".")
    assert cfg.youtube_api_key == "test-key-123"


def test_config_api_key_missing(monkeypatch):
    monkeypatch.delenv("YOUTUBE_API_KEY", raising=False)
    cfg = Config(project_root=".")
    assert cfg.youtube_api_key is None
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'channel_assistant.config'`

- [ ] **Step 4: Implement config.py**

```python
# .claude/scripts/strategy/channel_assistant/config.py
"""Configuration for channel_assistant pipeline.

All tunables, paths, and thresholds in one place.
"""
import os
from pathlib import Path


class Config:
    """Pipeline configuration. All paths relative to project_root."""

    # --- Freshness ---
    SCRAPE_FRESHNESS_HOURS: int = 24
    STALENESS_DAYS: int = 14
    AGING_DAYS: int = 10

    # --- Tier limits ---
    WATCH_LIST_MAX_VIDEOS: int | None = None  # fetch all
    LANDSCAPE_MAX_VIDEOS: int = 20

    # --- NLP analysis ---
    CLUSTER_MIN_K: int = 3
    CLUSTER_MAX_K: int = 25
    OUTLIER_MULTIPLIER: float = 2.0

    # --- Trend detection ---
    CONVERGENCE_WINDOW_DAYS: int = 30
    CONVERGENCE_MIN_CHANNELS: int = 3
    SATURATION_DECAY_LAMBDA: float = 0.01  # half-life ~70 days

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
```

- [ ] **Step 5: Run config tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_config.py -v`
Expected: All 6 tests PASS.

- [ ] **Step 6: Write models tests**

```python
# .claude/scripts/strategy/tests/test_models.py
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
```

- [ ] **Step 7: Run model tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_models.py -v`
Expected: FAIL — `ImportError: cannot import name 'Cluster'`

- [ ] **Step 8: Rewrite models.py**

```python
# .claude/scripts/strategy/channel_assistant/models.py
"""Data models for channel_assistant pipeline."""
from dataclasses import dataclass, field


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
    scores: str  # JSON string
    total_score: int
    pillar_primary: str
    generated_at: str
    pillar_secondary: str | None = None
    source_clusters: str | None = None  # JSON array
    hook: str | None = None
    duplicate_of: str | None = None
    status: str = "candidate"
    selected_at: str | None = None
```

- [ ] **Step 9: Run all foundation tests**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_config.py tests/test_models.py -v`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/config.py \
       .claude/scripts/strategy/channel_assistant/models.py \
       .claude/scripts/strategy/tests/
git commit -m "feat(strategy): add config module and expand models with new dataclasses"
```

---

## Task 2: Database — Schema, Migration, CRUD

**Files:**
- Modify: `.claude/scripts/strategy/channel_assistant/database.py`
- Create: `.claude/scripts/strategy/tests/conftest.py`
- Create: `.claude/scripts/strategy/tests/test_database.py`

**Context:** Read the current `database.py` (234 lines, 2 tables). This is a full rewrite to 11 tables with migration support. The `Database` class pattern (init with path, connect method, Row factory) is preserved.

- [ ] **Step 1: Write shared test fixtures**

```python
# .claude/scripts/strategy/tests/conftest.py
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
```

- [ ] **Step 2: Write database tests**

```python
# .claude/scripts/strategy/tests/test_database.py
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
        tables = [row[0] for row in cursor.fetchall()]
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
        assert db.get_schema_version() >= 1


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
```

- [ ] **Step 3: Run database tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_database.py -v`
Expected: FAIL — `ImportError` or `AttributeError` (new methods don't exist yet)

- [ ] **Step 4: Implement database.py — schema and migrations**

Full rewrite of `.claude/scripts/strategy/channel_assistant/database.py`. The implementing agent should:

1. Keep the `Database` class pattern (init with path, `connect()` method with Row factory + WAL + FK)
2. Add `SCHEMA_VERSION = 2` constant (v1 was the old 2-table schema)
3. `init_db()` creates all 11 tables with proper FK constraints, indexes, and composite PKs as defined in the spec Section 1
4. Add `get_schema_version()` / `_set_schema_version()` using `PRAGMA user_version`
5. Add migration logic: if `user_version < SCHEMA_VERSION`, run ALTER TABLE for existing tables (add `tier`, `added_at`, `last_scraped_at` to channels; add `comment_count`, `thumbnail_url` to videos) and CREATE TABLE for new tables
6. Implement all CRUD methods tested above:
   - `upsert_channel(data)`, `get_channel(youtube_id)`, `get_channels_by_tier(tier)`, `get_all_channels()`, `remove_channel(youtube_id)`, `update_channel_tier(youtube_id, tier)`
   - `upsert_videos(video_list)` — batch insert with tags extraction. If a video dict has a `tags` key (list of strings), insert into `video_tags` table. Use INSERT OR REPLACE.
   - `get_videos_by_channel(channel_id)`, `get_video_tags(video_id)`
   - `start_pipeline_run(stage, input_hash)` → returns run id, `complete_pipeline_run(run_id, status, summary)`, `get_latest_pipeline_run(stage)`
   - `record_stats_snapshot(channel_id, subscribers, total_views, video_count)`
   - `get_stats_history(channel_id, limit=50)`
   - `save_clusters(cluster_list)` — DELETE all existing, then INSERT new (analysis replaces previous results). Set `computed_at` to current UTC ISO timestamp.
   - `get_clusters()` — returns all clusters ordered by saturation_score ASC
   - `save_keywords(keyword_list)`, `get_keywords(limit=50)`
   - `save_trend_signals(signal_list)`, `get_trend_signals()`
   - `save_topic_briefs(brief_list)`, `get_topic_briefs()`, `select_topic(brief_id)`
7. All write operations use transactions (single `conn` with `conn.commit()` at end)
8. All read operations return list of `sqlite3.Row` objects (or None for single-item lookups)

- [ ] **Step 5: Run database tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_database.py -v`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/database.py \
       .claude/scripts/strategy/tests/conftest.py \
       .claude/scripts/strategy/tests/test_database.py
git commit -m "feat(strategy): rewrite database with 11-table schema and migration support"
```

---

## Task 3: Collector — YouTube Data API Client

**Files:**
- Create: `.claude/scripts/strategy/channel_assistant/collector.py`
- Create: `.claude/scripts/strategy/tests/test_collector.py`

**Context:** This replaces `scraper.py` (yt-dlp). Uses `google-api-python-client` to call YouTube Data API v3. Requires `YOUTUBE_API_KEY` env var. Must handle pagination, quota awareness, and tier-based fetch limits.

- [ ] **Step 1: Write collector tests**

```python
# .claude/scripts/strategy/tests/test_collector.py
"""Tests for YouTube Data API collector (mocked)."""
import pytest
from unittest.mock import MagicMock, patch
from channel_assistant.collector import Collector, resolve_channel_id


class TestResolveChannelId:
    @patch("channel_assistant.collector._build_youtube_client")
    def test_resolve_handle_url(self, mock_build):
        """@Handle URL resolves to channel ID via search."""
        mock_yt = MagicMock()
        mock_build.return_value = mock_yt
        mock_yt.search().list().execute.return_value = {
            "items": [{"snippet": {"channelId": "UCabc123"}}]
        }
        result = resolve_channel_id("https://www.youtube.com/@TestChannel", "fake-key")
        assert result == "UCabc123"

    @patch("channel_assistant.collector._build_youtube_client")
    def test_resolve_channel_url(self, mock_build):
        """Direct /channel/UC... URL extracts ID from path."""
        result = resolve_channel_id(
            "https://www.youtube.com/channel/UCabc123", "fake-key"
        )
        assert result == "UCabc123"


class TestCollector:
    @pytest.fixture
    def collector(self, db, tmp_config, monkeypatch):
        monkeypatch.setenv("YOUTUBE_API_KEY", "fake-key")
        with patch("channel_assistant.collector._build_youtube_client") as mock_build:
            mock_yt = MagicMock()
            mock_build.return_value = mock_yt
            c = Collector(db, tmp_config)
            c._yt = mock_yt
            yield c, mock_yt

    def test_fetch_channel_details(self, collector):
        c, mock_yt = collector
        mock_yt.channels().list().execute.return_value = {
            "items": [{
                "id": "UCabc123",
                "snippet": {
                    "title": "Test Channel",
                    "customUrl": "@TestChannel",
                    "description": "A channel",
                },
                "statistics": {
                    "subscriberCount": "100000",
                    "viewCount": "5000000",
                    "videoCount": "50",
                },
            }]
        }
        ch = c.fetch_channel_details("UCabc123")
        assert ch["name"] == "Test Channel"
        assert ch["subscribers"] == 100000

    def test_fetch_channel_videos_respects_tier_limit(self, collector):
        c, mock_yt = collector
        # Mock returns 5 videos
        mock_yt.search().list().execute.return_value = {
            "items": [
                {"id": {"videoId": f"v{i}"}, "snippet": {"title": f"Video {i}",
                 "publishedAt": "2026-03-01T00:00:00Z"}}
                for i in range(5)
            ]
        }
        mock_yt.videos().list().execute.return_value = {
            "items": [
                {"id": f"v{i}", "snippet": {"title": f"Video {i}", "description": "",
                 "publishedAt": "2026-03-01T00:00:00Z", "tags": ["test"]},
                 "statistics": {"viewCount": "1000", "likeCount": "50", "commentCount": "10"},
                 "contentDetails": {"duration": "PT30M"}}
                for i in range(5)
            ]
        }
        videos = c.fetch_channel_videos("UCabc123", max_results=20)
        assert len(videos) == 5
        assert videos[0]["views"] == 1000

    def test_scrape_all_records_to_db(self, collector, sample_channel):
        c, mock_yt = collector
        c.db.upsert_channel(sample_channel)
        # Mock channel details
        mock_yt.channels().list().execute.return_value = {
            "items": [{
                "id": "UC_test_123",
                "snippet": {"title": "Test Channel", "customUrl": "@TestChannel", "description": ""},
                "statistics": {"subscriberCount": "100000", "viewCount": "5000000", "videoCount": "50"},
            }]
        }
        # Mock empty video list
        mock_yt.search().list().execute.return_value = {"items": []}
        mock_yt.videos().list().execute.return_value = {"items": []}
        
        result = c.scrape_all()
        assert result["channels_scraped"] == 1
        # Stats history should have a new snapshot
        history = c.db.get_stats_history("UC_test_123")
        assert len(history) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_collector.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'channel_assistant.collector'`

- [ ] **Step 3: Implement collector.py**

The implementing agent should create `.claude/scripts/strategy/channel_assistant/collector.py` with:

1. `_build_youtube_client(api_key)` — builds `googleapiclient.discovery.build("youtube", "v3", developerKey=api_key)`
2. `resolve_channel_id(url, api_key)` — parses URL to extract channel ID. If URL contains `/channel/UC...`, extract directly. If URL contains `/@handle`, use search API to resolve to channel ID.
3. `_parse_duration(iso_duration)` — converts ISO 8601 duration (PT30M, PT1H20M5S) to seconds using regex.
4. `Collector(db, config)` class:
   - `__init__` stores db and config, validates API key is set, builds YouTube client
   - `fetch_channel_details(channel_id)` → dict with keys matching channel schema
   - `fetch_channel_videos(channel_id, max_results=None)` → list of video dicts. Uses `search.list(channelId=..., type="video", order="date")` to get video IDs, then `videos.list(id=..., part="snippet,statistics,contentDetails")` for full details. Handles pagination via `nextPageToken`. Extracts tags from snippet, parses duration, converts string counts to int.
   - `scrape_channel(channel_id, tier)` → fetches details + videos (respecting tier limit), upserts to DB, records stats snapshot, logs to scrape_log. Returns summary dict.
   - `scrape_all()` → iterates all channels from DB, calls `scrape_channel` for each. Uses tier-appropriate max_results. Returns aggregate summary.
   - `add_channel(url, tier="landscape")` → resolves URL to channel ID, fetches details, upserts channel with tier, does initial video scrape. Returns channel dict.

Error handling: catch `googleapiclient.errors.HttpError` for quota exceeded (403) and rate limits. On quota exceeded, stop scraping and return partial results. Log warnings for individual channel failures but continue to next channel.

- [ ] **Step 4: Run collector tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_collector.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/collector.py \
       .claude/scripts/strategy/tests/test_collector.py
git commit -m "feat(strategy): add YouTube Data API collector replacing yt-dlp scraper"
```

---

## Task 4: Analyzer — Stats, NLP, and Trends

**Files:**
- Modify: `.claude/scripts/strategy/channel_assistant/analyzer.py`
- Create: `.claude/scripts/strategy/tests/test_analyzer.py`

**Context:** Full rewrite of `analyzer.py` (currently 186 lines, basic stats only). New version runs 3 passes: stats, NLP (TF-IDF + YAKE), trends. All results written to DB tables. Dependencies: `scikit-learn`, `yake`, `numpy`.

- [ ] **Step 1: Write analyzer tests**

```python
# .claude/scripts/strategy/tests/test_analyzer.py
"""Tests for the 3-pass analysis engine."""
import pytest
from channel_assistant.analyzer import Analyzer


@pytest.fixture
def populated_db(db, sample_channel, sample_video):
    """DB with enough data to run analysis."""
    db.upsert_channel(sample_channel)
    videos = []
    titles = [
        "The Dark History of Cults in America",
        "Unsolved Mystery: The Missing Children of Springfield",
        "Government Cover-Up: Cold War Experiments on Citizens",
        "Inside the Most Dangerous Cult You Never Heard Of",
        "The Disappearance That Baffled Investigators for Decades",
        "How the CIA Funded Secret Mind Control Programs",
        "The Cult Leader Who Fooled an Entire Nation",
        "Cold War Secrets: Underground Bunkers and Hidden Experiments",
        "Missing Persons: 5 Cases That Were Never Solved",
        "Institutional Corruption: When Governments Silence Victims",
    ]
    for i, title in enumerate(titles):
        v = sample_video.copy()
        v["video_id"] = f"vid_{i:03d}"
        v["title"] = title
        v["views"] = 100000 + i * 50000
        v["likes"] = 5000 + i * 1000
        v["comment_count"] = 200 + i * 50
        v["upload_date"] = f"2026-{(i % 3) + 1:02d}-{(i % 28) + 1:02d}"
        videos.append(v)
    db.upsert_videos(videos)
    return db


class TestStatsPass:
    def test_compute_channel_stats(self, populated_db):
        analyzer = Analyzer(populated_db)
        stats = analyzer.compute_channel_stats("UC_test_123")
        assert stats["total_videos"] == 10
        assert stats["avg_views"] > 0
        assert stats["median_views"] > 0
        assert "upload_frequency_days" in stats

    def test_detect_outliers(self, populated_db):
        analyzer = Analyzer(populated_db, outlier_multiplier=1.5)
        outliers = analyzer.detect_outliers("UC_test_123")
        # The last video has highest views (550K vs median ~325K)
        assert len(outliers) >= 1
        assert outliers[0]["multiplier"] > 1.5


class TestNLPPass:
    def test_cluster_titles(self, populated_db):
        analyzer = Analyzer(populated_db, cluster_min_k=2, cluster_max_k=5)
        clusters = analyzer.cluster_titles()
        assert len(clusters) >= 2
        for c in clusters:
            assert "label" in c
            assert "keywords" in c
            assert "video_count" in c
            assert c["video_count"] > 0

    def test_extract_keywords(self, populated_db):
        analyzer = Analyzer(populated_db)
        keywords = analyzer.extract_keywords(max_keywords=10)
        assert len(keywords) > 0
        assert len(keywords) <= 10
        for kw in keywords:
            assert "keyword" in kw
            assert "frequency" in kw
            assert "channels_count" in kw

    def test_classify_title_patterns(self, populated_db):
        analyzer = Analyzer(populated_db)
        patterns = analyzer.classify_title_patterns()
        assert "question" in patterns or "declarative" in patterns
        total = sum(patterns.values())
        assert total == 10  # 10 videos


class TestTrendsPass:
    def test_compute_saturation_scores(self, populated_db):
        analyzer = Analyzer(populated_db, cluster_min_k=2, cluster_max_k=5)
        # Must cluster first
        analyzer.cluster_titles()
        scores = analyzer.compute_saturation_scores()
        assert len(scores) > 0
        for s in scores:
            assert 0.0 <= s["saturation_score"] <= 1.0

    def test_detect_convergence(self, populated_db):
        analyzer = Analyzer(populated_db)
        # With only 1 channel, no convergence should be detected
        signals = analyzer.detect_convergence(window_days=30, min_channels=3)
        assert len(signals) == 0


class TestFullAnalysis:
    def test_run_all_writes_to_db(self, populated_db):
        analyzer = Analyzer(populated_db, cluster_min_k=2, cluster_max_k=5)
        result = analyzer.run_all()
        assert "stats" in result
        assert "clusters" in result
        assert "keywords" in result
        # Verify DB has clusters
        clusters = populated_db.get_clusters()
        assert len(clusters) >= 2
        # Verify DB has keywords
        keywords = populated_db.get_keywords()
        assert len(keywords) > 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_analyzer.py -v`
Expected: FAIL — old analyzer.py doesn't have `Analyzer` class

- [ ] **Step 3: Implement analyzer.py**

Full rewrite of `.claude/scripts/strategy/channel_assistant/analyzer.py`. The implementing agent should:

1. `Analyzer(db, outlier_multiplier=2.0, cluster_min_k=3, cluster_max_k=25, convergence_window_days=30, convergence_min_channels=3, saturation_decay_lambda=0.01)` — stores db and config params.

2. **Stats pass methods:**
   - `compute_channel_stats(channel_id)` → dict with total_videos, avg_views, median_views, upload_frequency_days, engagement_rate (sum of likes+comments / sum of views), most_recent_upload. Uses `statistics.median()`.
   - `detect_outliers(channel_id)` → list of dicts `{video_id, title, views, multiplier, upload_date}` where multiplier = views / median. Filter to multiplier > self.outlier_multiplier. Sort descending.
   - `compute_all_stats()` → runs stats + outliers for all channels, returns summary dict.

3. **NLP pass methods:**
   - `cluster_titles()` → Fetches all video titles from DB. Uses `TfidfVectorizer(max_features=500, stop_words='english')` to vectorize. Tries K from cluster_min_k to cluster_max_k, picks K with highest `silhouette_score`. Runs `KMeans(n_clusters=best_k)`. For each cluster: extracts top 5 TF-IDF terms as label (most distinctive term) and keywords (comma-joined). Counts videos per cluster, computes avg views. Returns list of cluster dicts. Saves to DB via `db.save_clusters()`. Also saves video-cluster assignments via `db.save_video_clusters()`.
   - `extract_keywords(max_keywords=30)` → Uses YAKE (`yake.KeywordExtractor(lan="en", n=2, top=max_keywords)`) on concatenated titles. For each keyword, counts frequency across titles, counts distinct channels. Computes avg views of videos containing keyword. Returns list of keyword dicts. Saves to DB.
   - `classify_title_patterns()` → For each video title, classify as: `question` (contains `?` or starts with who/what/why/how/where/when), `number` (contains a digit like "5 Cases"), `list` (starts with digit), `emotional` (contains words from a banned/emotional word set), `declarative` (default). Returns dict of pattern → count.

4. **Trends pass methods:**
   - `compute_saturation_scores()` → For each cluster from DB: get all video upload_dates in that cluster. Compute saturation = sum(exp(-lambda * days_since_upload)) normalized to 0-1 across all clusters. Classify: <0.3 = underserved, 0.3-0.7 = competitive, >0.7 = saturated. Updates `topic_clusters.saturation_score` and `status` in DB. Returns list of score dicts.
   - `detect_convergence(window_days, min_channels)` → For each cluster: find videos uploaded within last `window_days`. Count distinct channels. If count >= min_channels, create a trend_signal with signal_type="convergence". Also detect emerging/declining by computing linear regression slope of upload frequency over 90-day windows per cluster. Save to DB via `db.save_trend_signals()`. Returns list of signal dicts.

5. **Orchestrator:**
   - `run_all()` → Runs stats pass, then NLP pass, then trends pass. Returns aggregate summary dict with keys `stats`, `clusters`, `keywords`, `trends`.

- [ ] **Step 4: Run analyzer tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_analyzer.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/analyzer.py \
       .claude/scripts/strategy/tests/test_analyzer.py
git commit -m "feat(strategy): rewrite analyzer with 3-pass engine (stats, NLP, trends)"
```

---

## Task 5: Pipeline — Cache-Aware Orchestration

**Files:**
- Create: `.claude/scripts/strategy/channel_assistant/pipeline.py`
- Create: `.claude/scripts/strategy/tests/test_pipeline.py`

**Context:** Orchestrates the collect → analyze → dashboard flow. Checks `pipeline_runs` table before each stage. Computes input hashes to detect whether underlying data has changed.

- [ ] **Step 1: Write pipeline tests**

```python
# .claude/scripts/strategy/tests/test_pipeline.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_pipeline.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement pipeline.py**

```python
# .claude/scripts/strategy/channel_assistant/pipeline.py
"""Cache-aware pipeline orchestration.

Checks pipeline_runs table before each stage. Computes input hashes
to detect whether underlying data has changed since last run.
"""
import hashlib
from datetime import datetime, timezone, timedelta

from .config import Config
from .database import Database


class Pipeline:
    """Orchestrates pipeline stages with cache awareness."""

    STAGES = ("scrape", "analyze", "dashboard")

    def __init__(self, db: Database, config: Config) -> None:
        self.db = db
        self.config = config

    def compute_input_hash(self, stage: str) -> str:
        """Compute MD5 hash of the inputs for a given stage."""
        conn = self.db.connect()
        try:
            if stage == "scrape":
                rows = conn.execute(
                    "SELECT youtube_id FROM channels ORDER BY youtube_id"
                ).fetchall()
                data = ",".join(r[0] for r in rows)
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                data += f"|{today}"
            elif stage == "analyze":
                row = conn.execute(
                    "SELECT COUNT(*) as cnt, MAX(scraped_at) as latest FROM videos"
                ).fetchone()
                data = f"{row['cnt']}|{row['latest']}"
            elif stage == "dashboard":
                row = conn.execute(
                    "SELECT MAX(completed_at) as latest FROM pipeline_runs "
                    "WHERE stage='analyze' AND status='success'"
                ).fetchone()
                data = str(row["latest"]) if row["latest"] else "none"
            else:
                data = stage
            return hashlib.md5(data.encode()).hexdigest()
        finally:
            conn.close()

    def check_freshness(self, stage: str) -> dict:
        """Check how fresh a stage's last run is.

        Returns dict with keys: state (fresh/aging/stale), age_days, last_run.
        """
        run = self.db.get_latest_pipeline_run(stage)
        if run is None or run["completed_at"] is None:
            return {"state": "stale", "age_days": None, "last_run": None}

        completed = datetime.fromisoformat(run["completed_at"])
        if completed.tzinfo is None:
            completed = completed.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        age = now - completed
        age_days = age.total_seconds() / 86400

        if age_days > self.config.STALENESS_DAYS:
            state = "stale"
        elif age_days > self.config.AGING_DAYS:
            state = "aging"
        else:
            state = "fresh"

        return {"state": state, "age_days": round(age_days, 1), "last_run": run}

    def should_run(self, stage: str, force: bool = False) -> bool:
        """Determine whether a stage needs to run."""
        if force:
            return True
        freshness = self.check_freshness(stage)
        if freshness["state"] == "stale":
            return True
        if freshness["last_run"] is None:
            return True
        current_hash = self.compute_input_hash(stage)
        return current_hash != freshness["last_run"]["input_hash"]

    def get_status(self) -> dict:
        """Get freshness status for all stages."""
        return {stage: self.check_freshness(stage) for stage in self.STAGES}

    def mark_stale(self, stage: str) -> None:
        """Force a stage to be considered stale on next check.

        Done by recording a pipeline_run with status='invalidated'.
        Downstream stages check this.
        """
        conn = self.db.connect()
        try:
            conn.execute(
                "UPDATE pipeline_runs SET status='invalidated' "
                "WHERE stage=? AND status='success' "
                "AND id=(SELECT MAX(id) FROM pipeline_runs WHERE stage=?)",
                (stage, stage),
            )
            conn.commit()
        finally:
            conn.close()
```

- [ ] **Step 4: Run pipeline tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_pipeline.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/pipeline.py \
       .claude/scripts/strategy/tests/test_pipeline.py
git commit -m "feat(strategy): add cache-aware pipeline orchestrator"
```

---

## Task 6: Dashboard — Plotly + Pizzint HTML

**Files:**
- Create: `.claude/scripts/strategy/channel_assistant/dashboard.py`
- Create: `.claude/scripts/strategy/tests/test_dashboard.py`

**Context:** Generates a single self-contained HTML file at `channel/strategy/dashboard.html`. Uses Plotly for interactive charts, custom HTML for KPI cards and alerts. Follows pizzint design tokens. Fonts embedded as base64 data URIs from `docs/pizzint-design/fonts/`. Ref: spec Section 3.

- [ ] **Step 1: Write dashboard tests**

```python
# .claude/scripts/strategy/tests/test_dashboard.py
"""Tests for dashboard HTML generation."""
import pytest
from pathlib import Path
from channel_assistant.dashboard import DashboardGenerator


@pytest.fixture
def populated_analysis_db(db, sample_channel, sample_video):
    """DB with channels, videos, clusters, and keywords for dashboard."""
    db.upsert_channel(sample_channel)
    videos = []
    for i in range(10):
        v = sample_video.copy()
        v["video_id"] = f"vid_{i:03d}"
        v["title"] = f"Test Video {i}"
        v["views"] = 100000 + i * 50000
        v["upload_date"] = f"2026-03-{(i % 28) + 1:02d}"
        videos.append(v)
    db.upsert_videos(videos)
    db.save_clusters([
        {"label": "cults", "keywords": "cult,leader", "video_count": 5,
         "avg_views": 300000, "saturation_score": 0.6, "status": "competitive"},
        {"label": "cold war", "keywords": "cold war,cia", "video_count": 3,
         "avg_views": 500000, "saturation_score": 0.15, "status": "underserved"},
    ])
    db.save_keywords([
        {"keyword": "cult leader", "source": "title", "frequency": 5,
         "channels_count": 3, "avg_views": 300000},
        {"keyword": "cold war", "source": "title", "frequency": 3,
         "channels_count": 1, "avg_views": 500000},
    ])
    return db


class TestDashboardGeneration:
    def test_generate_produces_html_file(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        output_path = gen.generate()
        assert output_path.exists()
        assert output_path.suffix == ".html"

    def test_html_contains_pizzint_colors(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        gen.generate()
        html = tmp_config.DASHBOARD_PATH.read_text(encoding="utf-8")
        assert "#1a202c" in html  # background
        assert "#1e2939" in html  # surface
        assert "#00b7d7" in html  # accent

    def test_html_contains_plotly_charts(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        gen.generate()
        html = tmp_config.DASHBOARD_PATH.read_text(encoding="utf-8")
        assert "plotly" in html.lower()

    def test_html_contains_kpi_data(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        gen.generate()
        html = tmp_config.DASHBOARD_PATH.read_text(encoding="utf-8")
        # Should contain the channel count and video count
        assert "1" in html  # 1 channel
        assert "10" in html  # 10 videos

    def test_html_is_self_contained(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        gen.generate()
        html = tmp_config.DASHBOARD_PATH.read_text(encoding="utf-8")
        # Should not have external script/link refs (except fonts if CDN fallback)
        assert "<!DOCTYPE html>" in html or "<html" in html

    def test_generate_with_no_data(self, db, tmp_config):
        """Dashboard should still generate with empty DB (shows zeros)."""
        gen = DashboardGenerator(db, tmp_config)
        output_path = gen.generate()
        assert output_path.exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_dashboard.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement dashboard.py**

The implementing agent should create `.claude/scripts/strategy/channel_assistant/dashboard.py` with:

1. `DashboardGenerator(db, config)` class.

2. **Font embedding:** `_load_font_base64(font_name)` — reads TTF from `config.FONT_DIR / font_name`, returns base64-encoded string. If font file doesn't exist, return None (charts still work, just without custom font). Load: `VT323-Regular.ttf`, `Geist-Regular.ttf`, `GeistMono-Regular.ttf`.

3. **Plotly theme:** Create a `plotly.graph_objects.layout.Template` with:
   - `paper_bgcolor="#1a202c"`, `plot_bgcolor="#1e2939"`
   - `font=dict(family="Geist, sans-serif", color="#ffffff")`
   - `xaxis=dict(gridcolor="rgba(255,255,255,0.1)")`, same for yaxis
   - `colorway=["#00b7d7", "#00c758", "#edb200", "#fb2c36", "#3b82f6"]`

4. **Chart generators** (each returns a Plotly figure HTML div string via `fig.to_html(full_html=False, include_plotlyjs=False)`):
   - `_chart_competitor_bars()` — Horizontal bar chart of watch list channels by median views
   - `_chart_upload_trends()` — Line chart of upload frequency (30-day rolling per channel). Query `videos` table, group by channel + month, compute rolling count.
   - `_chart_cluster_bubbles()` — Scatter/bubble chart from `topic_clusters` table. X=avg_views, Y=1-saturation_score (opportunity), size=video_count, color by status (green/yellow/red).
   - `_chart_pillar_gaps()` — returns HTML (not Plotly) for progress bar visualization of pillar gap scores. Compute from cluster data: for each pillar, find clusters that map to it, average their inverse saturation.

5. **HTML builders** (return raw HTML strings):
   - `_build_kpi_cards()` — 5 stat cards querying DB for counts and freshness
   - `_build_keyword_table()` — sortable table from `keywords` table, highlight rows where channels_count < 3 AND avg_views > 200000 with green
   - `_build_convergence_alerts()` — alert cards from `trend_signals` where signal_type="convergence"

6. **Compositor:**
   - `generate()` → Composes full HTML document:
     - `<!DOCTYPE html>` + `<html>` + `<head>` with `<style>` block containing pizzint CSS tokens and `@font-face` declarations with base64 data URIs
     - Single `<script src="https://cdn.plot.ly/plotly-2.35.0.min.js">` (Plotly JS from CDN — this is the one external dependency; charts won't be interactive without it, but the page still renders)
     - `<body>` with 4-row grid layout, each section populated by the chart/HTML builders above
   - Writes to `config.DASHBOARD_PATH`
   - Returns the path

- [ ] **Step 4: Run dashboard tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_dashboard.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/dashboard.py \
       .claude/scripts/strategy/tests/test_dashboard.py
git commit -m "feat(strategy): add pizzint-themed Plotly dashboard generator"
```

---

## Task 7: Topics — DB-Driven Context Formatting

**Files:**
- Modify: `.claude/scripts/strategy/channel_assistant/topics.py`
- Create: `.claude/scripts/strategy/tests/test_topics.py`

**Context:** Rewrite of `topics.py` (currently 270 lines of file I/O helpers). New version queries DB for computed data and formats it as structured context for Claude to reason over. Also handles `check_duplicates()` against past_topics.md and `write_topic_briefs()` to both DB and topics.md file.

- [ ] **Step 1: Write topics tests**

```python
# .claude/scripts/strategy/tests/test_topics.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_topics.py -v`
Expected: FAIL — `ImportError: cannot import name 'TopicEngine'`

- [ ] **Step 3: Implement topics.py**

Full rewrite of `.claude/scripts/strategy/channel_assistant/topics.py`. The implementing agent should:

1. `TopicEngine(db, config)` class.

2. `format_context()` → Queries DB for clusters, keywords, trend signals, and channel stats. Formats as structured markdown sections that Claude can reason over:
   - "## Topic Clusters" — table of cluster label, video_count, avg_views, saturation_score, status
   - "## Underserved Clusters" — filtered to status="underserved", with keywords listed
   - "## Top Keywords" — table of keyword, frequency, channels_count, avg_views (top 20)
   - "## Opportunity Keywords" — keywords where channels_count < 3 AND avg_views > median
   - "## Trend Signals" — list of emerging/convergence signals with details
   - "## Past Topics" — reads past_topics.md content for dedup awareness
   - Returns the full formatted string.

3. `check_duplicate(title)` → Reads `config.PAST_TOPICS_PATH`, extracts topic titles via regex `\*\*([^*]+)\*\*`. Uses `difflib.SequenceMatcher` ratio >= 0.75 to detect near-duplicates. Returns the matching past topic title or None.

4. `write_briefs(briefs_list)` → Saves briefs to both DB (`db.save_topic_briefs()`) and file (`config.TOPICS_PATH` as markdown). Markdown format: numbered list with title, scores, pillar, hook, duplicate warning if applicable.

5. `format_chat_cards(briefs)` → Returns formatted markdown for terminal display with ASCII score bars (same pattern as current implementation).

- [ ] **Step 4: Run topics tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_topics.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/topics.py \
       .claude/scripts/strategy/tests/test_topics.py
git commit -m "feat(strategy): rewrite topics engine with DB-driven context formatting"
```

---

## Task 8: Project Init — Simplified Init + Package

**Files:**
- Modify: `.claude/scripts/strategy/channel_assistant/project_init.py`
- Create: `.claude/scripts/strategy/tests/test_project_init.py`

**Context:** Simplify the init phase (no title variants, no YouTube description). Add `package()` function for post-script title/description generation. Keep scaffolding logic.

- [ ] **Step 1: Write project init tests**

```python
# .claude/scripts/strategy/tests/test_project_init.py
"""Tests for project initialization and packaging."""
import json
import pytest
from pathlib import Path
from channel_assistant.project_init import ProjectInit


@pytest.fixture
def project_init(db, tmp_config):
    (tmp_config.root / "projects").mkdir(exist_ok=True)
    tmp_config.PAST_TOPICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_config.PAST_TOPICS_PATH.write_text("# Past Topics\n\n", encoding="utf-8")
    return ProjectInit(db, tmp_config)


class TestInit:
    def test_creates_project_directory(self, project_init, tmp_config):
        path = project_init.init(
            title="The Duplessis Orphans",
            scores={"obscurity": 5, "complexity": 4, "shock_factor": 5,
                    "verifiability": 4, "pillar_fit": 5},
            pillar_primary="Institutional Corruption",
            runtime_estimate=35,
        )
        assert path.exists()
        assert (path / "research").is_dir()
        assert (path / "script").is_dir()
        assert (path / "visuals").is_dir()
        assert (path / "assets").is_dir()

    def test_creates_metadata_json(self, project_init, tmp_config):
        path = project_init.init(
            title="The Duplessis Orphans",
            scores={"obscurity": 5, "complexity": 4, "shock_factor": 5,
                    "verifiability": 4, "pillar_fit": 5},
            pillar_primary="Institutional Corruption",
            runtime_estimate=35,
        )
        meta = json.loads((path / "metadata.json").read_text(encoding="utf-8"))
        assert meta["title"] == "The Duplessis Orphans"
        assert meta["scores"]["total"] == 23
        assert "youtube" not in meta  # no titles at init

    def test_appends_to_past_topics(self, project_init, tmp_config):
        project_init.init(
            title="Test Topic",
            scores={"obscurity": 3, "complexity": 3, "shock_factor": 3,
                    "verifiability": 3, "pillar_fit": 3},
            pillar_primary="Cults",
            runtime_estimate=25,
        )
        content = tmp_config.PAST_TOPICS_PATH.read_text(encoding="utf-8")
        assert "Test Topic" in content

    def test_slug_is_lowercase_hyphenated(self, project_init):
        path = project_init.init(
            title="The Dark History of Something",
            scores={"obscurity": 3, "complexity": 3, "shock_factor": 3,
                    "verifiability": 3, "pillar_fit": 3},
            pillar_primary="Cults",
            runtime_estimate=25,
        )
        assert " " not in path.name
        assert path.name == path.name.lower() or path.name[0].isdigit()


class TestPackage:
    def test_package_adds_youtube_to_metadata(self, project_init, tmp_config):
        # First init a project
        path = project_init.init(
            title="Test Topic",
            scores={"obscurity": 3, "complexity": 3, "shock_factor": 3,
                    "verifiability": 3, "pillar_fit": 3},
            pillar_primary="Cults",
            runtime_estimate=25,
        )
        # Create a mock script
        (path / "script" / "Script.md").write_text(
            "# Test Topic\n\nA script about cults.\n", encoding="utf-8",
        )
        # Package it
        title_variants = [
            {"title": "Title A", "hook_type": "question", "recommended": False},
            {"title": "Title B", "hook_type": "statement", "recommended": True,
             "recommendation_reason": "Best pattern match"},
        ]
        description = "A deep dive into test topic."
        project_init.package(path, title_variants, description)

        meta = json.loads((path / "metadata.json").read_text(encoding="utf-8"))
        assert "youtube" in meta
        assert len(meta["youtube"]["title_variants"]) == 2
        assert meta["youtube"]["description"] == description
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_project_init.py -v`
Expected: FAIL — `ImportError: cannot import name 'ProjectInit'`

- [ ] **Step 3: Implement project_init.py**

Rewrite `.claude/scripts/strategy/channel_assistant/project_init.py`. The implementing agent should:

1. `ProjectInit(db, config)` class.

2. `init(title, scores, pillar_primary, runtime_estimate, pillar_secondary=None, source_clusters=None)`:
   - Slugify title: lowercase, replace spaces with hyphens, remove non-alphanumeric except hyphens
   - Create `projects/<slug>/` with subdirs: `research/`, `script/`, `visuals/`, `assets/`
   - Write `metadata.json` with: title, slug, date_selected (today), scores (with computed total), pillars, source_clusters, production.estimated_runtime_min
   - NO youtube section at this stage
   - Append to `past_topics.md`: `- **{title}** | {date} | {pillar_primary}`
   - Return the project path

3. `package(project_path, title_variants, description)`:
   - Read existing `metadata.json` from project_path
   - Add `youtube` key with `title_variants` list and `description` string
   - Write back to `metadata.json`
   - Return updated metadata dict

- [ ] **Step 4: Run project init tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_project_init.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/project_init.py \
       .claude/scripts/strategy/tests/test_project_init.py
git commit -m "feat(strategy): simplify project init, add post-script package phase"
```

---

## Task 9: CLI — New Subcommands and Pipeline Integration

**Files:**
- Modify: `.claude/scripts/strategy/channel_assistant/cli.py`
- Create: `.claude/scripts/strategy/tests/test_cli.py`

**Context:** Full rewrite of `cli.py` (currently 548 lines). New version has 11 subcommands, integrates pipeline cache logic, and prints structured status reports. Uses argparse.

- [ ] **Step 1: Write CLI integration tests**

```python
# .claude/scripts/strategy/tests/test_cli.py
"""Integration tests for CLI subcommands."""
import json
import pytest
from unittest.mock import patch, MagicMock
from channel_assistant.cli import main, find_project_root


class TestProjectRoot:
    def test_find_project_root_from_subdir(self, tmp_config):
        # CLAUDE.md exists at project root
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        found = find_project_root(str(tmp_config.root / "data"))
        assert found == tmp_config.root


class TestStatusCommand:
    def test_status_shows_all_stages(self, tmp_config, capsys):
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            main(["status"])
        output = capsys.readouterr().out
        assert "scrape" in output.lower()
        assert "analyze" in output.lower()
        assert "dashboard" in output.lower()


class TestAddCommand:
    @patch("channel_assistant.collector.Collector")
    def test_add_registers_channel(self, mock_collector_cls, tmp_config, capsys):
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        mock_collector = MagicMock()
        mock_collector.add_channel.return_value = {
            "youtube_id": "UCabc", "name": "Test", "tier": "landscape"
        }
        mock_collector_cls.return_value = mock_collector

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            main(["add", "https://youtube.com/@Test"])
        mock_collector.add_channel.assert_called_once()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_cli.py -v`
Expected: FAIL — old cli.py incompatible with new interface

- [ ] **Step 3: Implement cli.py**

Full rewrite of `.claude/scripts/strategy/channel_assistant/cli.py`. The implementing agent should:

1. `find_project_root(start_dir=None)` — walks up from start_dir looking for `CLAUDE.md`. Returns Path or raises SystemExit.

2. `main(argv=None)` — argparse-based CLI with subcommands:
   - `add <url> [--tier watch_list|landscape]` → instantiate Collector, call `add_channel()`, print result
   - `remove <name>` → find channel by name in DB, remove, mark analysis stale
   - `promote <name>` → update tier to watch_list, mark analysis stale
   - `demote <name>` → update tier to landscape, mark analysis stale
   - `scrape [--force]` → check pipeline.should_run("scrape"), run if needed, print summary
   - `analyze [--force]` → check pipeline.should_run("analyze"), run Analyzer.run_all() if needed, print cluster summary, record pipeline run
   - `dashboard` → check pipeline.should_run("dashboard"), run DashboardGenerator.generate() if needed, print path
   - `topics` → run TopicEngine.format_context(), print to stdout for Claude
   - `init <topic_num>` → load brief from DB by number, run ProjectInit.init(), print path
   - `package <project>` → print instructions for Claude to generate titles (title variants and description are Claude-generated, not programmatic)
   - `status` → run Pipeline.get_status(), format and print table

3. Each subcommand: instantiates only the modules it needs (lazy initialization).

4. Error handling: catch exceptions, print to stderr, sys.exit(1). If YOUTUBE_API_KEY missing for commands that need it (add, scrape), print clear error message.

5. Pipeline integration: after `add`/`remove`/`promote`/`demote`, call `pipeline.mark_stale()` on downstream stages.

- [ ] **Step 4: Run CLI tests to verify they pass**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_cli.py -v`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/strategy/channel_assistant/cli.py \
       .claude/scripts/strategy/tests/test_cli.py
git commit -m "feat(strategy): rewrite CLI with new subcommands and pipeline integration"
```

---

## Task 10: Cleanup — Remove Old Modules

**Files:**
- Delete: `.claude/scripts/strategy/channel_assistant/scraper.py`
- Delete: `.claude/scripts/strategy/channel_assistant/registry.py`
- Delete: `.claude/scripts/strategy/channel_assistant/trend_scanner.py`

- [ ] **Step 1: Verify no imports of old modules remain**

Run: `cd .claude/scripts/strategy && grep -r "from.*scraper\|from.*registry\|from.*trend_scanner\|import.*scraper\|import.*registry\|import.*trend_scanner" channel_assistant/ --include="*.py"`
Expected: No matches (if matches found, fix the imports first).

- [ ] **Step 2: Run full test suite to confirm nothing depends on old modules**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/ -v`
Expected: All tests PASS.

- [ ] **Step 3: Delete old modules**

```bash
git rm .claude/scripts/strategy/channel_assistant/scraper.py \
      .claude/scripts/strategy/channel_assistant/registry.py \
      .claude/scripts/strategy/channel_assistant/trend_scanner.py
```

- [ ] **Step 4: Run full test suite again**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/ -v`
Expected: All tests still PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(strategy): remove replaced modules (scraper, registry, trend_scanner)"
```

---

## Task 11: Agent Definitions — Strategy + Researcher Update

**Files:**
- Modify: `.claude/agents/strategy.md`
- Modify: `.claude/agents/researcher.md`

- [ ] **Step 1: Rewrite strategy.md agent definition**

Full rewrite of `.claude/agents/strategy.md` following the spec Section 4. The implementing agent should read the current `strategy.md` and the spec, then write the new version with:

- Updated frontmatter (add `pizzint-design` to skills list)
- New identity section reflecting the intelligence platform
- Two-tier competitor system documentation
- All CLI subcommands with invocation syntax
- Cache-aware pipeline behavior description
- Scoring rubric (1-5 scale, max 25)
- Updated file conventions (no more competitors.json, analysis.md, competitor_data.md)
- Two-phase project init documentation (init + package)
- Task classification section (DETERMINISTIC vs HEURISTIC)
- Environment requirement: `YOUTUBE_API_KEY`

- [ ] **Step 2: Update researcher.md metadata reference**

In `.claude/agents/researcher.md`, find the reference to `metadata.md` and change it to `metadata.json`. This is a targeted edit — search for `metadata.md` in the file and replace with `metadata.json`.

- [ ] **Step 3: Verify agent definitions are well-formed**

Run the existing smoke test:
```bash
node .claude/tests/smoke-test-agents.js
```
Expected: All agents pass validation.

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/strategy.md .claude/agents/researcher.md
git commit -m "feat(strategy): rewrite agent definition for intelligence platform"
```

---

## Task 12: Integration Test — Full Pipeline Smoke Test

**Files:**
- Create: `.claude/scripts/strategy/tests/test_integration.py`

- [ ] **Step 1: Write integration test**

```python
# .claude/scripts/strategy/tests/test_integration.py
"""End-to-end integration test for the strategy pipeline.

Uses mocked YouTube API to test the full flow:
scrape → analyze → dashboard → topics → init.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path

from channel_assistant.config import Config
from channel_assistant.database import Database
from channel_assistant.collector import Collector
from channel_assistant.analyzer import Analyzer
from channel_assistant.dashboard import DashboardGenerator
from channel_assistant.pipeline import Pipeline
from channel_assistant.topics import TopicEngine
from channel_assistant.project_init import ProjectInit


@pytest.fixture
def full_setup(tmp_path, monkeypatch):
    """Full pipeline setup with mocked API."""
    monkeypatch.setenv("YOUTUBE_API_KEY", "fake-key")

    # Create directory structure
    (tmp_path / "data").mkdir()
    (tmp_path / "channel" / "strategy").mkdir(parents=True)
    (tmp_path / "projects").mkdir()
    (tmp_path / "channel" / "past_topics.md").write_text(
        "# Past Topics\n\n", encoding="utf-8",
    )
    (tmp_path / "docs" / "pizzint-design" / "fonts").mkdir(parents=True)

    config = Config(project_root=tmp_path)
    db = Database(config.DB_PATH)
    db.init_db()
    return config, db


def _mock_youtube_data():
    """Build mock YouTube API responses."""
    channel_response = {
        "items": [{
            "id": "UCtest1",
            "snippet": {"title": "Mystery Channel", "customUrl": "@mystery", "description": "Mysteries"},
            "statistics": {"subscriberCount": "50000", "viewCount": "2000000", "videoCount": "30"},
        }]
    }
    video_titles = [
        "The Unsolved Case of the Missing Hiker",
        "Dark History: The Cult That Controlled a Town",
        "Cold War Secrets the Government Hid for Decades",
        "Inside the Most Bizarre Disappearance in History",
        "The Cult Leader Who Built an Empire of Fear",
        "Government Experiments: What They Never Told You",
    ]
    search_response = {
        "items": [{"id": {"videoId": f"v{i}"}, "snippet": {"title": t, "publishedAt": f"2026-0{i+1}-15T00:00:00Z"}}
                  for i, t in enumerate(video_titles)]
    }
    videos_response = {
        "items": [{
            "id": f"v{i}",
            "snippet": {"title": t, "description": f"A video about {t.lower()}", "publishedAt": f"2026-0{i+1}-15T00:00:00Z", "tags": ["mystery", "documentary"]},
            "statistics": {"viewCount": str(100000 + i * 80000), "likeCount": str(5000 + i * 2000), "commentCount": str(200 + i * 100)},
            "contentDetails": {"duration": "PT35M"},
        } for i, t in enumerate(video_titles)]
    }
    return channel_response, search_response, videos_response


class TestFullPipeline:
    @patch("channel_assistant.collector._build_youtube_client")
    def test_scrape_analyze_dashboard_topics_init(self, mock_build, full_setup):
        config, db = full_setup
        mock_yt = MagicMock()
        mock_build.return_value = mock_yt

        ch_resp, search_resp, vid_resp = _mock_youtube_data()
        mock_yt.channels().list().execute.return_value = ch_resp
        mock_yt.search().list().execute.return_value = search_resp
        mock_yt.videos().list().execute.return_value = vid_resp

        # 1. Add a channel
        collector = Collector(db, config)
        collector._yt = mock_yt
        result = collector.add_channel("https://youtube.com/@mystery", tier="watch_list")
        assert result["name"] == "Mystery Channel"

        # 2. Verify DB has data
        channels = db.get_all_channels()
        assert len(channels) == 1
        videos = db.get_videos_by_channel("UCtest1")
        assert len(videos) == 6

        # 3. Run analysis
        analyzer = Analyzer(db, cluster_min_k=2, cluster_max_k=4)
        analysis_result = analyzer.run_all()
        assert len(analysis_result["clusters"]) >= 2

        # 4. Check pipeline state
        pipeline = Pipeline(db, config)
        run_id = db.start_pipeline_run("analyze", pipeline.compute_input_hash("analyze"))
        db.complete_pipeline_run(run_id, "success", "6 videos analyzed")
        assert pipeline.should_run("analyze") is False  # just ran

        # 5. Generate dashboard
        dashboard = DashboardGenerator(db, config)
        dash_path = dashboard.generate()
        assert dash_path.exists()
        html = dash_path.read_text(encoding="utf-8")
        assert "#1a202c" in html  # pizzint background

        # 6. Format topic context
        topics = TopicEngine(db, config)
        ctx = topics.format_context()
        assert len(ctx) > 100  # should have substantial content

        # 7. Init a project
        init = ProjectInit(db, config)
        proj_path = init.init(
            title="Cold War Mind Control",
            scores={"obscurity": 5, "complexity": 4, "shock_factor": 4,
                    "verifiability": 4, "pillar_fit": 4},
            pillar_primary="Institutional Corruption",
            runtime_estimate=35,
        )
        assert (proj_path / "metadata.json").exists()
        meta = json.loads((proj_path / "metadata.json").read_text(encoding="utf-8"))
        assert meta["scores"]["total"] == 21
        assert "youtube" not in meta  # not packaged yet

        # 8. Package after script
        (proj_path / "script" / "Script.md").write_text("# Script\n\nContent.", encoding="utf-8")
        init.package(
            proj_path,
            title_variants=[{"title": "Test Title", "hook_type": "statement", "recommended": True,
                             "recommendation_reason": "test"}],
            description="A test description.",
        )
        meta = json.loads((proj_path / "metadata.json").read_text(encoding="utf-8"))
        assert "youtube" in meta
        assert len(meta["youtube"]["title_variants"]) == 1
```

- [ ] **Step 2: Run integration test**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/test_integration.py -v`
Expected: PASS — full pipeline runs end-to-end with mocked API.

- [ ] **Step 3: Run full test suite**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/ -v --tb=short`
Expected: All tests PASS across all test files.

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/strategy/tests/test_integration.py
git commit -m "test(strategy): add full pipeline integration test"
```

---

## Task 13: Environment Setup + CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Install dependencies**

Run: `pip install google-api-python-client plotly pandas scikit-learn yake`
Expected: All packages install successfully.

- [ ] **Step 2: Verify imports work**

Run: `python -c "from googleapiclient.discovery import build; import plotly; import pandas; import sklearn; import yake; print('All imports OK')"`
Expected: "All imports OK"

- [ ] **Step 3: Update CLAUDE.md agent reference table**

Update the strategy agent description in the `## Agent Reference` table in `CLAUDE.md` to reflect the new capabilities:

```markdown
| @strategy | Strategy | Competitive intelligence, NLP analysis, dashboard, topic generation |
```

- [ ] **Step 4: Run final full test suite**

Run: `cd .claude/scripts/strategy && PYTHONPATH=. python -m pytest tests/ -v --tb=short`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new strategy agent capabilities"
```

"""SQLite database layer for channel assistant.

Provides schema creation (11 tables), migration support,
and CRUD operations for the strategy pipeline.
"""

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

SCHEMA_VERSION = 2

_CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS channels (
    youtube_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT,
    url TEXT,
    subscribers INTEGER,
    total_views INTEGER,
    description TEXT,
    tier TEXT NOT NULL DEFAULT 'landscape',
    added_at TEXT NOT NULL,
    last_scraped_at TEXT
);

CREATE TABLE IF NOT EXISTS videos (
    video_id TEXT PRIMARY KEY,
    channel_id TEXT,
    title TEXT NOT NULL,
    url TEXT,
    views INTEGER,
    likes INTEGER,
    comment_count INTEGER,
    upload_date TEXT,
    description TEXT,
    duration INTEGER,
    thumbnail_url TEXT,
    scraped_at TEXT,
    FOREIGN KEY (channel_id) REFERENCES channels(youtube_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_tags (
    video_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (video_id, tag),
    FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scrape_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT,
    scraped_at TEXT NOT NULL,
    video_count INTEGER,
    new_videos INTEGER,
    status TEXT NOT NULL,
    error_message TEXT,
    FOREIGN KEY (channel_id) REFERENCES channels(youtube_id)
);

CREATE TABLE IF NOT EXISTS channel_stats_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT,
    recorded_at TEXT NOT NULL,
    subscribers INTEGER,
    total_views INTEGER,
    video_count INTEGER,
    FOREIGN KEY (channel_id) REFERENCES channels(youtube_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topic_clusters (
    cluster_id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    keywords TEXT,
    video_count INTEGER,
    avg_views REAL,
    saturation_score REAL,
    status TEXT,
    computed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS video_clusters (
    video_id TEXT NOT NULL,
    cluster_id INTEGER NOT NULL,
    similarity REAL,
    PRIMARY KEY (video_id, cluster_id),
    FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE,
    FOREIGN KEY (cluster_id) REFERENCES topic_clusters(cluster_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    source TEXT NOT NULL,
    frequency INTEGER,
    channels_count INTEGER,
    avg_views REAL,
    computed_at TEXT NOT NULL,
    UNIQUE (keyword, source)
);

CREATE TABLE IF NOT EXISTS trend_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cluster_id INTEGER,
    signal_type TEXT NOT NULL,
    slope REAL,
    confidence REAL,
    window_days INTEGER,
    details TEXT,
    detected_at TEXT NOT NULL,
    FOREIGN KEY (cluster_id) REFERENCES topic_clusters(cluster_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    input_hash TEXT,
    status TEXT NOT NULL,
    summary TEXT
);

CREATE TABLE IF NOT EXISTS topic_briefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    scores TEXT NOT NULL,
    total_score INTEGER,
    pillar_primary TEXT,
    pillar_secondary TEXT,
    source_clusters TEXT,
    hook TEXT,
    duplicate_of TEXT,
    status TEXT NOT NULL DEFAULT 'candidate',
    generated_at TEXT NOT NULL,
    selected_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_video_tags_tag ON video_tags(tag);
CREATE INDEX IF NOT EXISTS idx_stats_history_channel
    ON channel_stats_history(channel_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword_source ON keywords(keyword, source);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_stage
    ON pipeline_runs(stage, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_upload_date ON videos(upload_date DESC);
"""


def _utcnow() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


class Database:
    """SQLite database for storing channel, video, and pipeline metadata."""

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def connect(self) -> sqlite3.Connection:
        """Return a connection with Row factory and WAL mode."""
        conn = sqlite3.connect(str(self.path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    # ------------------------------------------------------------------
    # Schema & migration
    # ------------------------------------------------------------------

    def init_db(self) -> None:
        """Create all tables and indexes. Run migrations if needed."""
        conn = self.connect()
        try:
            current_version = self._get_schema_version_conn(conn)

            if current_version < SCHEMA_VERSION:
                self._migrate(conn, current_version)

            conn.executescript(_CREATE_TABLES_SQL)
            self._set_schema_version_conn(conn, SCHEMA_VERSION)
            conn.commit()
        finally:
            conn.close()

    def get_schema_version(self) -> int:
        """Return current schema version from PRAGMA user_version."""
        conn = self.connect()
        try:
            return self._get_schema_version_conn(conn)
        finally:
            conn.close()

    @staticmethod
    def _get_schema_version_conn(conn: sqlite3.Connection) -> int:
        row = conn.execute("PRAGMA user_version").fetchone()
        return row[0] if row else 0

    @staticmethod
    def _set_schema_version_conn(conn: sqlite3.Connection, version: int) -> None:
        conn.execute(f"PRAGMA user_version = {version}")

    def _migrate(self, conn: sqlite3.Connection, from_version: int) -> None:
        """Run incremental migrations from from_version to SCHEMA_VERSION."""
        if from_version < 1:
            # Fresh database or pre-versioned schema -- tables will be
            # created by _CREATE_TABLES_SQL in init_db.
            pass

        if from_version == 1:
            # Migrating from the old 2-table schema (channels + videos).
            # Add new columns to channels if they don't exist.
            existing_cols = {
                row[1]
                for row in conn.execute("PRAGMA table_info(channels)").fetchall()
            }
            if "tier" not in existing_cols:
                conn.execute(
                    "ALTER TABLE channels ADD COLUMN tier TEXT NOT NULL DEFAULT 'landscape'"
                )
            if "added_at" not in existing_cols:
                conn.execute("ALTER TABLE channels ADD COLUMN added_at TEXT")
                conn.execute(
                    "UPDATE channels SET added_at = scraped_at WHERE added_at IS NULL"
                )
            if "last_scraped_at" not in existing_cols:
                conn.execute("ALTER TABLE channels ADD COLUMN last_scraped_at TEXT")
                conn.execute(
                    "UPDATE channels SET last_scraped_at = scraped_at "
                    "WHERE last_scraped_at IS NULL"
                )

            # Add new columns to videos if they don't exist.
            vid_cols = {
                row[1]
                for row in conn.execute("PRAGMA table_info(videos)").fetchall()
            }
            if "comment_count" not in vid_cols:
                conn.execute("ALTER TABLE videos ADD COLUMN comment_count INTEGER")
            if "thumbnail_url" not in vid_cols:
                conn.execute("ALTER TABLE videos ADD COLUMN thumbnail_url TEXT")

            # New tables are created by _CREATE_TABLES_SQL.

    # ------------------------------------------------------------------
    # Channel CRUD
    # ------------------------------------------------------------------

    def upsert_channel(self, data: dict) -> None:
        """Insert or update a channel record from a dict."""
        now = _utcnow()
        conn = self.connect()
        try:
            conn.execute(
                """
                INSERT INTO channels
                    (youtube_id, name, handle, url, subscribers, total_views,
                     description, tier, added_at, last_scraped_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(youtube_id) DO UPDATE SET
                    name = excluded.name,
                    handle = excluded.handle,
                    url = excluded.url,
                    subscribers = excluded.subscribers,
                    total_views = excluded.total_views,
                    description = excluded.description,
                    tier = excluded.tier,
                    last_scraped_at = excluded.last_scraped_at
                """,
                (
                    data["youtube_id"],
                    data["name"],
                    data.get("handle"),
                    data.get("url"),
                    data.get("subscribers"),
                    data.get("total_views"),
                    data.get("description"),
                    data.get("tier", "landscape"),
                    data.get("added_at", now),
                    data.get("last_scraped_at"),
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def get_channel(self, youtube_id: str) -> Optional[sqlite3.Row]:
        """Return a single channel by youtube_id, or None."""
        conn = self.connect()
        try:
            row = conn.execute(
                "SELECT * FROM channels WHERE youtube_id = ?", (youtube_id,)
            ).fetchone()
            return row
        finally:
            conn.close()

    def get_channels_by_tier(self, tier: str) -> list[sqlite3.Row]:
        """Return all channels with the given tier."""
        conn = self.connect()
        try:
            return conn.execute(
                "SELECT * FROM channels WHERE tier = ?", (tier,)
            ).fetchall()
        finally:
            conn.close()

    def get_all_channels(self) -> list[sqlite3.Row]:
        """Return all channels."""
        conn = self.connect()
        try:
            return conn.execute("SELECT * FROM channels").fetchall()
        finally:
            conn.close()

    def remove_channel(self, youtube_id: str) -> None:
        """Delete a channel and cascade to related rows."""
        conn = self.connect()
        try:
            conn.execute(
                "DELETE FROM channels WHERE youtube_id = ?", (youtube_id,)
            )
            conn.commit()
        finally:
            conn.close()

    def update_channel_tier(self, youtube_id: str, tier: str) -> None:
        """Update the tier of a channel."""
        conn = self.connect()
        try:
            conn.execute(
                "UPDATE channels SET tier = ? WHERE youtube_id = ?",
                (tier, youtube_id),
            )
            conn.commit()
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Video CRUD
    # ------------------------------------------------------------------

    def upsert_videos(self, video_list: list[dict]) -> None:
        """Batch upsert videos from a list of dicts.

        If a video dict contains a 'tags' key (list of strings),
        those tags are inserted into the video_tags table.
        """
        now = _utcnow()
        conn = self.connect()
        try:
            for v in video_list:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO videos
                        (video_id, channel_id, title, url, views, likes,
                         comment_count, upload_date, description, duration,
                         thumbnail_url, scraped_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        v["video_id"],
                        v.get("channel_id"),
                        v["title"],
                        v.get("url"),
                        v.get("views"),
                        v.get("likes"),
                        v.get("comment_count"),
                        v.get("upload_date"),
                        v.get("description"),
                        v.get("duration"),
                        v.get("thumbnail_url"),
                        v.get("scraped_at", now),
                    ),
                )
                # Handle tags
                tags = v.get("tags")
                if tags:
                    # Clear existing tags for this video
                    conn.execute(
                        "DELETE FROM video_tags WHERE video_id = ?",
                        (v["video_id"],),
                    )
                    conn.executemany(
                        "INSERT OR REPLACE INTO video_tags (video_id, tag) VALUES (?, ?)",
                        [(v["video_id"], tag) for tag in tags],
                    )
            conn.commit()
        finally:
            conn.close()

    def get_videos_by_channel(self, channel_id: str) -> list[sqlite3.Row]:
        """Return all videos for a given channel_id."""
        conn = self.connect()
        try:
            return conn.execute(
                "SELECT * FROM videos WHERE channel_id = ?", (channel_id,)
            ).fetchall()
        finally:
            conn.close()

    def get_video_tags(self, video_id: str) -> list[str]:
        """Return all tags for a video as a list of strings."""
        conn = self.connect()
        try:
            rows = conn.execute(
                "SELECT tag FROM video_tags WHERE video_id = ?", (video_id,)
            ).fetchall()
            return [row["tag"] for row in rows]
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Pipeline runs
    # ------------------------------------------------------------------

    def start_pipeline_run(self, stage: str, input_hash: str) -> int:
        """Record the start of a pipeline run. Returns the run id."""
        now = _utcnow()
        conn = self.connect()
        try:
            cursor = conn.execute(
                """
                INSERT INTO pipeline_runs (stage, started_at, input_hash, status)
                VALUES (?, ?, ?, 'running')
                """,
                (stage, now, input_hash),
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def complete_pipeline_run(
        self, run_id: int, status: str, summary: str
    ) -> None:
        """Mark a pipeline run as completed."""
        now = _utcnow()
        conn = self.connect()
        try:
            conn.execute(
                """
                UPDATE pipeline_runs
                SET completed_at = ?, status = ?, summary = ?
                WHERE id = ?
                """,
                (now, status, summary, run_id),
            )
            conn.commit()
        finally:
            conn.close()

    def get_latest_pipeline_run(self, stage: str) -> Optional[sqlite3.Row]:
        """Return the most recent pipeline run for a stage, or None."""
        conn = self.connect()
        try:
            return conn.execute(
                """
                SELECT * FROM pipeline_runs
                WHERE stage = ?
                ORDER BY started_at DESC
                LIMIT 1
                """,
                (stage,),
            ).fetchone()
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Stats history
    # ------------------------------------------------------------------

    def record_stats_snapshot(
        self,
        channel_id: str,
        subscribers: int,
        total_views: int,
        video_count: int,
    ) -> None:
        """Record a point-in-time stats snapshot for a channel."""
        now = _utcnow()
        conn = self.connect()
        try:
            conn.execute(
                """
                INSERT INTO channel_stats_history
                    (channel_id, recorded_at, subscribers, total_views, video_count)
                VALUES (?, ?, ?, ?, ?)
                """,
                (channel_id, now, subscribers, total_views, video_count),
            )
            conn.commit()
        finally:
            conn.close()

    def get_stats_history(
        self, channel_id: str, limit: int = 50
    ) -> list[sqlite3.Row]:
        """Return stats history for a channel, most recent first."""
        conn = self.connect()
        try:
            return conn.execute(
                """
                SELECT * FROM channel_stats_history
                WHERE channel_id = ?
                ORDER BY recorded_at DESC
                LIMIT ?
                """,
                (channel_id, limit),
            ).fetchall()
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Clusters
    # ------------------------------------------------------------------

    def save_clusters(self, cluster_list: list[dict]) -> None:
        """Replace all clusters with the given list."""
        now = _utcnow()
        conn = self.connect()
        try:
            # Clear dependent tables first (FK constraints)
            conn.execute("DELETE FROM video_clusters")
            conn.execute("DELETE FROM trend_signals")
            conn.execute("DELETE FROM topic_clusters")
            for c in cluster_list:
                conn.execute(
                    """
                    INSERT INTO topic_clusters
                        (label, keywords, video_count, avg_views,
                         saturation_score, status, computed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        c["label"],
                        c.get("keywords"),
                        c.get("video_count"),
                        c.get("avg_views"),
                        c.get("saturation_score"),
                        c.get("status"),
                        now,
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    def get_clusters(self) -> list[sqlite3.Row]:
        """Return all clusters ordered by saturation_score ascending."""
        conn = self.connect()
        try:
            return conn.execute(
                "SELECT * FROM topic_clusters ORDER BY saturation_score ASC"
            ).fetchall()
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Keywords
    # ------------------------------------------------------------------

    def save_keywords(self, keyword_list: list[dict]) -> None:
        """Insert or replace keywords."""
        now = _utcnow()
        conn = self.connect()
        try:
            for kw in keyword_list:
                conn.execute(
                    """
                    INSERT INTO keywords
                        (keyword, source, frequency, channels_count, avg_views, computed_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(keyword, source) DO UPDATE SET
                        frequency = excluded.frequency,
                        channels_count = excluded.channels_count,
                        avg_views = excluded.avg_views,
                        computed_at = excluded.computed_at
                    """,
                    (
                        kw["keyword"],
                        kw["source"],
                        kw.get("frequency"),
                        kw.get("channels_count"),
                        kw.get("avg_views"),
                        now,
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    def get_keywords(self, limit: int = 50) -> list[sqlite3.Row]:
        """Return keywords ordered by frequency descending."""
        conn = self.connect()
        try:
            return conn.execute(
                "SELECT * FROM keywords ORDER BY frequency DESC LIMIT ?",
                (limit,),
            ).fetchall()
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Trend signals
    # ------------------------------------------------------------------

    def save_trend_signals(self, signal_list: list[dict]) -> None:
        """Insert trend signals."""
        now = _utcnow()
        conn = self.connect()
        try:
            for s in signal_list:
                conn.execute(
                    """
                    INSERT INTO trend_signals
                        (cluster_id, signal_type, slope, confidence,
                         window_days, details, detected_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        s["cluster_id"],
                        s["signal_type"],
                        s.get("slope"),
                        s.get("confidence"),
                        s.get("window_days"),
                        s.get("details"),
                        now,
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    def get_trend_signals(self) -> list[sqlite3.Row]:
        """Return all trend signals."""
        conn = self.connect()
        try:
            return conn.execute(
                "SELECT * FROM trend_signals ORDER BY detected_at DESC"
            ).fetchall()
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Topic briefs
    # ------------------------------------------------------------------

    def save_topic_briefs(self, brief_list: list[dict]) -> None:
        """Insert topic briefs."""
        now = _utcnow()
        conn = self.connect()
        try:
            for b in brief_list:
                conn.execute(
                    """
                    INSERT INTO topic_briefs
                        (title, scores, total_score, pillar_primary,
                         pillar_secondary, source_clusters, hook,
                         duplicate_of, status, generated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        b["title"],
                        b["scores"],
                        b.get("total_score"),
                        b.get("pillar_primary"),
                        b.get("pillar_secondary"),
                        b.get("source_clusters"),
                        b.get("hook"),
                        b.get("duplicate_of"),
                        b.get("status", "candidate"),
                        now,
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    def get_topic_briefs(self) -> list[sqlite3.Row]:
        """Return all topic briefs ordered by total_score descending."""
        conn = self.connect()
        try:
            return conn.execute(
                "SELECT * FROM topic_briefs ORDER BY total_score DESC"
            ).fetchall()
        finally:
            conn.close()

    def select_topic(self, brief_id: int) -> None:
        """Mark a topic brief as selected."""
        now = _utcnow()
        conn = self.connect()
        try:
            conn.execute(
                "UPDATE topic_briefs SET status = 'selected', selected_at = ? WHERE id = ?",
                (now, brief_id),
            )
            conn.commit()
        finally:
            conn.close()

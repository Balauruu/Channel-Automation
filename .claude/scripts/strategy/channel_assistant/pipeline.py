"""Cache-aware pipeline orchestration.

Checks pipeline_runs table before each stage. Computes input hashes
to detect whether underlying data has changed since last run.
"""
import hashlib
from datetime import datetime, timezone

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
                "AND id=(SELECT MAX(id) FROM pipeline_runs WHERE stage=? AND status='success')",
                (stage, stage),
            )
            conn.commit()
        finally:
            conn.close()

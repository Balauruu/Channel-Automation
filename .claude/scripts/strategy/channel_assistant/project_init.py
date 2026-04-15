"""Project initialization and packaging for the channel assistant pipeline.

Deterministic functions only — no LLM calls.
LLM reasoning (title variant generation, description writing) is performed
externally by Claude. This module handles: directory scaffold, metadata.json
write, past_topics.md append, and post-script package phase.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from channel_assistant.config import Config
from channel_assistant.database import Database


class ProjectInit:
    """Create and package project directories for documentary production.

    Args:
        db: Initialized Database instance (reserved for future use).
        config: Config instance providing path properties.
    """

    def __init__(self, db: Database, config: Config) -> None:
        self._db = db
        self._config = config

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def init(
        self,
        title: str,
        scores: dict[str, int],
        pillar_primary: str,
        runtime_estimate: int,
        pillar_secondary: str | None = None,
        source_clusters: list[str] | None = None,
    ) -> Path:
        """Create project directory scaffold and write metadata.json.

        Steps:
        1. Slugify *title* (lowercase, hyphens, alphanumeric only).
        2. Create ``projects/<slug>/`` with subdirs:
           ``research/``, ``script/``, ``visuals/``, ``assets/``.
        3. Write ``metadata.json`` with title, slug, date_selected, scores
           (including computed total), pillars, source_clusters, and
           production.estimated_runtime_min. No ``youtube`` key at this stage.
        4. Append the topic to ``past_topics.md``.

        Args:
            title: Topic title.
            scores: Dict of score dimensions (obscurity, complexity,
                shock_factor, verifiability, pillar_fit). Total is computed.
            pillar_primary: Primary content pillar.
            runtime_estimate: Estimated runtime in minutes.
            pillar_secondary: Optional secondary content pillar.
            source_clusters: Optional list of source cluster labels.

        Returns:
            The created project directory as a ``pathlib.Path``.
        """
        slug = _slugify(title)
        if not slug:
            raise ValueError(f"Title {title!r} produced an empty slug.")
        projects_dir = self._config.root / "projects"
        project_dir = projects_dir / slug
        project_dir.mkdir(parents=True, exist_ok=True)

        for subdir in ("research", "script", "visuals", "assets"):
            (project_dir / subdir).mkdir(exist_ok=True)

        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        total = sum(scores.values())
        metadata: dict = {
            "title": title,
            "slug": slug,
            "date_selected": date_str,
            "scores": {**scores, "total": total},
            "pillars": {
                "primary": pillar_primary,
                "secondary": pillar_secondary,
            },
            "source_clusters": source_clusters or [],
            "production": {
                "estimated_runtime_min": runtime_estimate,
            },
        }
        (project_dir / "metadata.json").write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        _append_past_topic(self._config.PAST_TOPICS_PATH, title, pillar_primary, date_str)

        return project_dir

    def package(
        self,
        project_path: Path,
        title_variants: list[dict],
        description: str,
    ) -> dict:
        """Add YouTube metadata to an existing project after script completion.

        Reads ``metadata.json`` from *project_path*, adds a ``youtube`` key
        containing *title_variants* and *description*, then writes the file back.

        Args:
            project_path: Path to the project directory (returned by ``init``).
            title_variants: List of title variant dicts. Each dict should have
                at minimum: ``title`` (str), ``hook_type`` (str),
                ``recommended`` (bool). Optional: ``recommendation_reason`` (str).
            description: YouTube video description string.

        Returns:
            The updated metadata dict.
        """
        metadata_path = project_path / "metadata.json"
        if not metadata_path.exists():
            raise FileNotFoundError(
                f"metadata.json not found in {project_path}. "
                "Call init() before package()."
            )
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        metadata["youtube"] = {
            "title_variants": title_variants,
            "description": description,
        }
        metadata_path.write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return metadata


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------


def _slugify(title: str) -> str:
    """Convert a title to a URL/filesystem-safe slug.

    Lowercases the string, replaces spaces with hyphens, and strips
    all characters that are not alphanumeric or hyphens.
    """
    slug = title.lower()
    slug = slug.replace(" ", "-")
    slug = re.sub(r"[^a-z0-9\-]", "", slug)
    # Collapse consecutive hyphens
    slug = re.sub(r"-{2,}", "-", slug)
    return slug.strip("-")


def _append_past_topic(path: Path, title: str, pillar: str, date_str: str) -> None:
    """Append a new entry to *path* in the canonical past_topics.md format.

    Format: ``- **Title** | YYYY-MM-DD | pillar``

    Creates the file (and parent directories) if they do not exist.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    line = f"- **{title}** | {date_str} | {pillar}\n"
    with path.open("a", encoding="utf-8") as fh:
        fh.write(line)

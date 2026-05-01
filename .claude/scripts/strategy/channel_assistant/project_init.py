"""Deterministic functions for project directory creation and metadata writing.

All functions use stdlib only (pathlib, re, json, datetime).
LLM reasoning (title variant generation, description writing) is performed
externally by Claude. This module handles: directory scaffold,
metadata.json write, and past_topics.md dedup loop closure.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


_PROJECT_SUBDIRS = ("research", "script", "visuals", "assets")


def _slugify(title: str) -> str:
    """Lowercase, hyphenated slug safe for directory names on Windows.

    Drops non-alphanumeric characters except hyphens, collapses runs of
    whitespace and punctuation into single hyphens.
    """
    lowered = title.lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", lowered)
    return cleaned.strip("-")


def _create_scaffold(project_dir: Path) -> None:
    """Create the four standard subdirectories inside *project_dir*."""
    for subdir in _PROJECT_SUBDIRS:
        (project_dir / subdir).mkdir(parents=True, exist_ok=True)


def _append_past_topic(
    path: Path,
    title: str,
    pillar: str,
    project_dir: str,
) -> None:
    """Append a row to the past_topics.md table.

    Canonical table format::

        | Topic | Primary Pillar | Selected | Project |
        |-------|----------------|----------|---------|
        | <title> | <pillar> | YYYY-MM-DD | projects/<slug>/ |

    Creates the file (with header) if it does not exist.
    """
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    row = f"| {title} | {pillar} | {date_str} | {project_dir} |\n"

    if not path.exists() or not path.read_text(encoding="utf-8").strip():
        path.parent.mkdir(parents=True, exist_ok=True)
        header = (
            "# Past Topics\n\n"
            "Topics that have been selected for production. Used by the "
            "strategy agent for near-duplicate detection during future "
            "topic generation runs.\n\n"
            "## Selected Topics\n\n"
            "| Topic | Primary Pillar | Selected | Project |\n"
            "|-------|----------------|----------|---------|\n"
        )
        path.write_text(header + row, encoding="utf-8")
        return

    with path.open("a", encoding="utf-8") as f:
        f.write(row)


def _write_metadata(path: Path, payload: dict) -> None:
    """Write *payload* to *path* as pretty-printed JSON (UTF-8, LF)."""
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def init_project(
    root: Path,
    *,
    title: str,
    slug: str | None = None,
    primary_pillar: str,
    secondary_pillar: str | None,
    scores: dict,
    estimated_runtime_min: int,
    title_variants: list[dict],
    description: str,
) -> Path:
    """Create the project directory and write metadata.json.

    Steps:
    1. Derive *slug* from *title* if not supplied.
    2. Create ``projects/<slug>/`` plus ``research/``, ``script/``,
       ``visuals/``, ``assets/`` subdirectories.
    3. Write ``metadata.json`` per the schema in the strategy agent body.
    4. Append the selected topic to ``channel/past_topics.md``.

    Args:
        root: Project root (directory containing ``CLAUDE.md``).
        title: Selected topic title.
        slug: Optional pre-computed slug. Derived from *title* if absent.
        primary_pillar: Primary content pillar name.
        secondary_pillar: Optional secondary pillar name.
        scores: Dict with keys ``obscurity``, ``complexity``,
            ``shock_factor``, ``verifiability``, ``pillar_fit`` (each
            int 1-10). ``total`` is computed.
        estimated_runtime_min: Estimated runtime in minutes.
        title_variants: List of variant dicts with keys ``title``,
            ``hook_type``, ``recommended`` (bool), and optionally
            ``recommendation_reason``.
        description: 2-3 sentence YouTube description.

    Returns:
        The created project directory.
    """
    for v in title_variants:
        if len(v.get("title", "")) > 70:
            print(
                f"Warning: title variant exceeds 70 chars "
                f"({len(v['title'])} chars): {v['title']!r}",
                file=sys.stderr,
            )

    project_slug = slug or _slugify(title)
    if not project_slug:
        raise ValueError(f"Could not derive non-empty slug from title: {title!r}")

    project_dir = root / "projects" / project_slug
    _create_scaffold(project_dir)

    total = sum(int(scores.get(k, 0)) for k in (
        "obscurity", "complexity", "shock_factor", "verifiability", "pillar_fit"
    ))
    payload = {
        "title": title,
        "slug": project_slug,
        "date_selected": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "scores": {
            "obscurity": int(scores.get("obscurity", 0)),
            "complexity": int(scores.get("complexity", 0)),
            "shock_factor": int(scores.get("shock_factor", 0)),
            "verifiability": int(scores.get("verifiability", 0)),
            "pillar_fit": int(scores.get("pillar_fit", 0)),
            "total": total,
        },
        "pillars": {
            "primary": primary_pillar,
            "secondary": secondary_pillar,
        },
        "production": {
            "estimated_runtime_min": int(estimated_runtime_min),
        },
        "youtube": {
            "title_variants": title_variants,
            "description": description,
        },
    }
    _write_metadata(project_dir / "metadata.json", payload)

    past_topics_path = root / "channel" / "past_topics.md"
    _append_past_topic(
        past_topics_path,
        title=title,
        pillar=primary_pillar,
        project_dir=f"projects/{project_slug}/",
    )

    return project_dir


def load_project_inputs(root: Path, topic_number: int) -> dict:
    """Load context needed for project initialization.

    Reads the selected topic brief from ``channel/strategy/topics.md``
    and extracts the Title Patterns section from
    ``channel/strategy/analysis.md`` (if present).

    Args:
        root: Project root directory.
        topic_number: 1-based index of the selected topic brief.

    Returns:
        ``{"brief_markdown": str, "title_patterns": str}``.

    Raises:
        FileNotFoundError: if topics.md does not exist.
        ValueError: if *topic_number* is not present in topics.md.
    """
    briefs_path = root / "channel" / "strategy" / "topics.md"
    analysis_path = root / "channel" / "strategy" / "analysis.md"

    if not briefs_path.exists():
        raise FileNotFoundError(
            f"Topic briefs not found: {briefs_path}. Run 'topics' first to generate it."
        )

    text = briefs_path.read_text(encoding="utf-8")
    section_pattern = re.compile(r"^## (\d+)\..*$", re.MULTILINE)
    matches = list(section_pattern.finditer(text))

    brief_markdown = ""
    available: list[int] = []
    for idx, m in enumerate(matches):
        n = int(m.group(1))
        available.append(n)
        if n == topic_number:
            start = m.start()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
            brief_markdown = text[start:end].strip()

    if not brief_markdown:
        raise ValueError(
            f"Topic #{topic_number} not found in {briefs_path}. Available: {available}"
        )

    title_patterns = ""
    if analysis_path.exists():
        analysis_text = analysis_path.read_text(encoding="utf-8")
        m = re.search(
            r"(## Title Patterns\b.*?)(?=\n## |\Z)",
            analysis_text,
            re.DOTALL,
        )
        if m:
            title_patterns = m.group(1).strip()

    return {
        "brief_markdown": brief_markdown,
        "title_patterns": title_patterns,
    }

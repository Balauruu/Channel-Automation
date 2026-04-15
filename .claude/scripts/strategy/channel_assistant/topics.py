"""DB-driven topic context formatting and brief management.

Queries the database for computed analysis data and formats it as structured
context for Claude to reason over during topic generation. Also handles
duplicate checking against past_topics.md and writing briefs to both DB
and file.
"""

from __future__ import annotations

import re
import statistics
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .config import Config
    from .database import Database


class TopicEngine:
    """DB-driven engine for topic generation context and brief management.

    Parameters
    ----------
    db : Database
        Initialized Database instance.
    config : Config
        Pipeline configuration (provides PAST_TOPICS_PATH, TOPICS_PATH).
    """

    def __init__(self, db: "Database", config: "Config") -> None:
        self.db = db
        self.config = config

    # ------------------------------------------------------------------
    # Context formatting
    # ------------------------------------------------------------------

    def format_context(self) -> str:
        """Build a structured markdown context string from DB data.

        Sections:
        - ## Topic Clusters
        - ## Underserved Clusters
        - ## Top Keywords
        - ## Opportunity Keywords
        - ## Trend Signals
        - ## Past Topics
        """
        sections: list[str] = []

        # -- Topic Clusters ------------------------------------------------
        clusters = self.db.get_clusters()
        if clusters:
            header = "## Topic Clusters\n"
            table_rows = ["| Cluster | Videos | Avg Views | Saturation | Status |",
                          "|---------|--------|-----------|------------|--------|"]
            for c in clusters:
                avg_views = int(c["avg_views"]) if c["avg_views"] is not None else 0
                sat = f"{c['saturation_score']:.2f}" if c["saturation_score"] is not None else "—"
                table_rows.append(
                    f"| {c['label']} | {c['video_count']} | {avg_views:,} | {sat} | {c['status']} |"
                )
            sections.append(header + "\n".join(table_rows))

            # -- Underserved Clusters --------------------------------------
            underserved = [c for c in clusters if c["status"] == "underserved"]
            if underserved:
                lines = ["## Underserved Clusters\n"]
                for c in underserved:
                    kws = c["keywords"] or ""
                    lines.append(f"- **{c['label']}** — keywords: {kws}")
                sections.append("\n".join(lines))

        # -- Top Keywords --------------------------------------------------
        keywords = self.db.get_keywords(limit=20)
        if keywords:
            header = "## Top Keywords\n"
            table_rows = ["| Keyword | Frequency | Channels | Avg Views |",
                          "|---------|-----------|----------|-----------|"]
            for kw in keywords:
                avg_views = int(kw["avg_views"]) if kw["avg_views"] is not None else 0
                channels = kw["channels_count"] if kw["channels_count"] is not None else 0
                freq = kw["frequency"] if kw["frequency"] is not None else 0
                table_rows.append(
                    f"| {kw['keyword']} | {freq} | {channels} | {avg_views:,} |"
                )
            sections.append(header + "\n".join(table_rows))

            # -- Opportunity Keywords --------------------------------------
            all_avg_views = [
                kw["avg_views"] for kw in keywords
                if kw["avg_views"] is not None
            ]
            if all_avg_views:
                median_views = statistics.median(all_avg_views)
                opportunity = [
                    kw for kw in keywords
                    if (kw["channels_count"] or 0) < 3
                    and (kw["avg_views"] or 0) > median_views
                ]
                if opportunity:
                    lines = ["## Opportunity Keywords\n",
                             "*(low competition, above-median views)*\n"]
                    for kw in opportunity:
                        avg_v = int(kw["avg_views"]) if kw["avg_views"] else 0
                        lines.append(
                            f"- **{kw['keyword']}** — "
                            f"{kw['channels_count']} channel(s), {avg_v:,} avg views"
                        )
                    sections.append("\n".join(lines))

        # -- Trend Signals -------------------------------------------------
        signals = self.db.get_trend_signals()
        if signals:
            lines = ["## Trend Signals\n"]
            for s in signals:
                slope = f"{s['slope']:+.4f}" if s["slope"] is not None else "—"
                conf = f"{s['confidence']:.0%}" if s["confidence"] is not None else "—"
                window = s["window_days"] or "?"
                details = f" — {s['details']}" if s["details"] else ""
                lines.append(
                    f"- **{s['signal_type']}** | slope {slope} | "
                    f"confidence {conf} | {window}d window{details}"
                )
            sections.append("\n".join(lines))

        # -- Past Topics ---------------------------------------------------
        past_path = self.config.PAST_TOPICS_PATH
        if past_path.exists():
            content = past_path.read_text(encoding="utf-8").strip()
            if content:
                sections.append(f"## Past Topics\n\n{content}")

        return "\n\n".join(sections)

    # ------------------------------------------------------------------
    # Duplicate checking
    # ------------------------------------------------------------------

    def check_duplicate(self, title: str, threshold: float = 0.75) -> str | None:
        """Return the matching past topic title if a near-duplicate exists, else None.

        Reads `config.PAST_TOPICS_PATH` and compares using SequenceMatcher.
        Comparison is case-insensitive. Threshold defaults to 0.75.
        """
        past_path = self.config.PAST_TOPICS_PATH
        if not past_path.exists():
            return None

        text = past_path.read_text(encoding="utf-8")
        pattern = re.compile(r"\*\*([^*]+)\*\*")
        past_titles = [m.group(1) for m in pattern.finditer(text)]

        if not past_titles:
            return None

        candidate_lower = title.lower()
        best_ratio = 0.0
        best_match: str | None = None

        for past in past_titles:
            ratio = SequenceMatcher(None, candidate_lower, past.lower()).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = past

        return best_match if best_ratio >= threshold else None

    # ------------------------------------------------------------------
    # Brief writing
    # ------------------------------------------------------------------

    def write_briefs(self, briefs_list: list[dict]) -> None:
        """Save topic briefs to both the DB and a markdown file.

        Each brief dict must have at minimum: title, scores (JSON string),
        total_score, pillar_primary. Optional: hook, duplicate_of, status.

        The markdown file is written to `config.TOPICS_PATH`.
        """
        # Persist to DB
        self.db.save_topic_briefs(briefs_list)

        # Write markdown file
        output_path = self.config.TOPICS_PATH
        output_path.parent.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        lines: list[str] = [
            "# Topic Briefs",
            "",
            f"*Generated: {timestamp}*",
            "",
        ]

        for i, brief in enumerate(briefs_list, start=1):
            title = brief["title"]
            pillar = brief.get("pillar_primary", "")
            hook = brief.get("hook", "")
            total_score = brief.get("total_score", "?")
            scores_raw = brief.get("scores", "{}")
            duplicate_of = brief.get("duplicate_of")

            lines.append(f"## {i}. {title}")
            lines.append("")
            lines.append(f"**Pillar:** {pillar}")
            lines.append("")
            lines.append(f"**Score:** {total_score}")
            lines.append("")

            if hook:
                lines.append(f"**Hook:** {hook}")
                lines.append("")

            lines.append(f"**Scores (raw):** {scores_raw}")
            lines.append("")

            if duplicate_of:
                lines.append(f"> **Warning:** Similar to past topic: *{duplicate_of}*")
                lines.append("")

            lines.append("---")
            lines.append("")

        output_path.write_text("\n".join(lines), encoding="utf-8")

    # ------------------------------------------------------------------
    # Terminal display
    # ------------------------------------------------------------------

    def format_chat_cards(self, briefs: list[dict]) -> str:
        """Return formatted markdown cards for terminal display with ASCII score bars.

        Expects briefs with: title, total_score, pillar_primary, hook,
        and optionally duplicate_of.
        """
        cards: list[str] = []

        for i, brief in enumerate(briefs, start=1):
            total = brief.get("total_score", 0) or 0
            filled = min(total, 20)
            empty = 20 - filled
            bar = "#" * filled + "-" * empty

            title = brief["title"]
            pillar = brief.get("pillar_primary", "")
            hook = brief.get("hook", "")
            duplicate_of = brief.get("duplicate_of")

            card_lines = [
                f"### [{i}] {title}",
                "",
            ]
            if hook:
                card_lines += [f"> {hook}", ""]

            card_lines += [
                f"**Score:** {bar} **{total}/20**",
                f"**Pillar:** {pillar}",
            ]

            if duplicate_of:
                card_lines.append(f"**Similar to:** *{duplicate_of}*")

            card_lines += ["", "---"]
            cards.append("\n".join(card_lines))

        footer = (
            f"\n**{len(briefs)} topics generated.**"
            f" Full briefs: `channel/strategy/topics.md`\n"
            "\nReply with a topic number (e.g. **1**) to start a project."
        )

        return "\n\n".join(cards) + "\n\n" + footer

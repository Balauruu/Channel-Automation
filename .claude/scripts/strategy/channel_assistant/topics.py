"""Deterministic helpers for the topic generation workflow.

LLM reasoning (ideation, scoring) is performed externally by Claude via
parallel subagent dispatch. This module handles: past-topic dedup,
writing the briefs markdown file, and rendering chat cards.
"""

from __future__ import annotations

from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path


def _load_past_topics(path: Path) -> list[str]:
    """Read past_topics.md and return a list of title strings.

    Canonical format: a markdown table with columns
    ``| Topic | Primary Pillar | Selected | Project |``. The first
    cell of each data row is the topic title.

    Skips header rows, separator rows (``|---|---|...``), and any
    line that is not a table data row.

    Returns an empty list if the file is missing or empty.
    """
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    if not text.strip():
        return []

    titles: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|") or not stripped.endswith("|"):
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if not cells:
            continue
        first = cells[0]
        if not first or first.lower() == "topic":
            continue
        if set(first.replace(" ", "")) <= {"-", ":"}:
            continue  # separator row
        titles.append(first)

    return titles


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def check_duplicates(
    candidate_title: str,
    past_titles: list[str],
    threshold: float = 0.85,
) -> str | None:
    """Return the past title that is a near-duplicate of *candidate_title*, or None.

    Comparison is case-insensitive. Uses SequenceMatcher ratio.
    Returns the *best* match above *threshold*, or None if no match.
    """
    if not past_titles:
        return None

    candidate_lower = candidate_title.lower()
    best_ratio = 0.0
    best_match: str | None = None

    for past in past_titles:
        ratio = SequenceMatcher(None, candidate_lower, past.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = past

    if best_ratio >= threshold:
        return best_match
    return None


def load_past_topics(root: Path) -> list[str]:
    """Public entry: return the list of selected past-topic titles.

    Returns an empty list if ``channel/past_topics.md`` does not exist.
    """
    return _load_past_topics(root / "channel" / "past_topics.md")


def rank_briefs(briefs: list[dict]) -> list[dict]:
    """Rank briefs by total score desc with anchored tiebreakers.

    Tiebreaker order (per agent body): shock_factor > obscurity > verifiability.
    Returns a new list; does not mutate the input.
    """
    def key(b: dict) -> tuple:
        s = b["scores"]
        total = sum(int(s.get(k, 0)) for k in (
            "obscurity", "complexity", "shock_factor", "verifiability", "pillar_fit"
        ))
        return (
            -total,
            -int(s.get("shock_factor", 0)),
            -int(s.get("obscurity", 0)),
            -int(s.get("verifiability", 0)),
        )
    return sorted(briefs, key=key)


def write_topic_briefs(briefs: list[dict], output_path: Path) -> None:
    """Write a list of topic brief dicts to a markdown file.

    Creates parent directories as needed. Overwrites on each call.

    Brief dict schema::

        {
            "title": str,
            "pillar": str,
            "hook": str,
            "timeline": list[str],
            "scores": {"obscurity": int, "complexity": int,
                       "shock_factor": int, "verifiability": int,
                       "pillar_fit": int},
            "justification": {"obscurity": str, "complexity": str,
                              "shock_factor": str, "verifiability": str,
                              "pillar_fit": str},
            "estimated_runtime_min": int,
            "duplicate_of": str | None,
            "tags": list[str],
        }

    Scores are on a 1-10 scale across 5 dimensions; total maximum is 50.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = [
        "# Topic Briefs",
        "",
        f"*Generated: {timestamp}*",
        "",
    ]

    for i, brief in enumerate(briefs, start=1):
        scores = brief["scores"]
        o = scores["obscurity"]
        c = scores["complexity"]
        s = scores["shock_factor"]
        v = scores["verifiability"]
        p = scores["pillar_fit"]
        total = o + c + s + v + p
        score_line = f"O:{o} C:{c} S:{s} V:{v} P:{p} = {total}/50"

        lines.append(f"## {i}. {brief['title']}")
        lines.append("")
        lines.append(f"**Pillar:** {brief['pillar']}")
        lines.append("")
        lines.append(f"**Score:** {score_line}  |  ~{brief['estimated_runtime_min']}min")
        lines.append("")
        lines.append(f"**Hook:** {brief['hook']}")
        lines.append("")

        # Timeline
        lines.append("**Timeline:**")
        for entry in brief["timeline"]:
            lines.append(f"- {entry}")
        lines.append("")

        # Scoring justification
        lines.append("**Scoring Justification:**")
        justification = brief.get("justification", {})
        lines.append(f"- Obscurity ({o}/10): {justification.get('obscurity', '')}")
        lines.append(f"- Complexity ({c}/10): {justification.get('complexity', '')}")
        lines.append(f"- Shock Factor ({s}/10): {justification.get('shock_factor', '')}")
        lines.append(f"- Verifiability ({v}/10): {justification.get('verifiability', '')}")
        lines.append(f"- Pillar Fit ({p}/10): {justification.get('pillar_fit', '')}")
        lines.append("")

        # Optional tags
        tags = brief.get("tags", [])
        if tags:
            lines.append(f"**Tags:** {' | '.join(tags)}")
            lines.append("")

        # Duplicate warning
        if brief.get("duplicate_of"):
            lines.append(f"> **Warning:** Similar to past topic: *{brief['duplicate_of']}*")
            lines.append("")

        lines.append("---")
        lines.append("")

    output_path.write_text("\n".join(lines), encoding="utf-8")


def format_chat_cards(briefs: list[dict]) -> str:
    """Return a markdown-formatted string with numbered topic cards for chat display.

    Produces clean, readable markdown that Claude should output directly in conversation.
    Each card shows: title, score bar, hook, pillar, runtime, and tags.
    """
    cards: list[str] = []

    for i, brief in enumerate(briefs, start=1):
        scores = brief["scores"]
        o = scores["obscurity"]
        c = scores["complexity"]
        s = scores["shock_factor"]
        v = scores["verifiability"]
        p = scores["pillar_fit"]
        total = o + c + s + v + p

        # Visual score bar: ASCII-safe filled/empty blocks (1-10 scale, 5 dimensions, max 50)
        filled = total
        empty = 50 - total
        bar = "#" * filled + "-" * empty

        runtime = brief["estimated_runtime_min"]
        pillar = brief["pillar"]

        card_lines = [
            f"### [{i}] {brief['title']}",
            "",
            f"> {brief['hook']}",
            "",
            f"**Score:** {bar} **{total}/50** "
            f"(O:{o} C:{c} S:{s} V:{v} P:{p})",
            f"**Pillar:** {pillar} | **Runtime:** ~{runtime} min",
        ]

        # Optional tags (e.g., UNDERSERVED CLUSTER)
        tags = brief.get("tags", [])
        if tags:
            card_lines.append(f"**Tags:** {', '.join(tags)}")

        # Duplicate warning
        if brief.get("duplicate_of"):
            card_lines.append(f"**Similar to:** *{brief['duplicate_of']}*")

        card_lines.append("")
        card_lines.append("---")

        cards.append("\n".join(card_lines))

    footer = f"\n**{len(briefs)} topics generated.** Full briefs with timelines and justifications: `channel/strategy/topics.md`\n"
    footer += "\nReply with a topic number (e.g. **1**) to start a project."

    return "\n\n".join(cards) + "\n\n" + footer

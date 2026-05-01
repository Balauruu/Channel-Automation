"""Source file aggregation into synthesis_input.md for the researcher skill.

Reads all src_*.json, pass2_*.json, and pass3_*.json files from the output
directory's sources/ subfolder and produces a flat markdown document
(synthesis_input.md) for Claude to synthesize into Research.md and entity_index.json.
Each source is labeled with its originating pass so the synthesizer can
distinguish broad survey, deep-dive, and targeted gap-fill provenance.

Exported functions:
    load_source_files  — glob and read source JSON files from output_dir/sources/
    build_synthesis_input — format sources into synthesis markdown string
    write_synthesis_input — write the markdown string to output_dir/sources/synthesis_input.md
"""
import json
from datetime import datetime, timezone
from pathlib import Path


def _load_glob(sources_dir: Path, pattern: str) -> list[dict]:
    """Load and parse JSON files matching pattern, sorted by filename. Skip parse errors."""
    out: list[dict] = []
    for src_file in sorted(sources_dir.glob(pattern)):
        try:
            out.append(json.loads(src_file.read_text(encoding="utf-8")))
        except Exception:  # noqa: BLE001
            pass
    return out


def load_source_files(output_dir: Path) -> tuple[list[dict], list[dict], list[dict]]:
    """Load all source JSON files from output_dir/sources/.

    Files are sorted by filename to ensure deterministic ordering.
    Files that fail to parse are silently skipped.

    Args:
        output_dir: Root output directory (sources live in output_dir/sources/).

    Returns:
        Tuple of (pass1, pass2, pass3) source lists. Each list is sorted by
        filename. Any list may be empty.
    """
    sources_dir = output_dir / "sources"
    return (
        _load_glob(sources_dir, "src_*.json"),
        _load_glob(sources_dir, "pass2_*.json"),
        _load_glob(sources_dir, "pass3_*.json"),
    )


def build_synthesis_input(
    topic: str,
    pass1: list[dict],
    pass2: list[dict],
    pass3: list[dict],
    output_dir: Path,
) -> str:
    """Format source lists into a flat markdown document for Claude synthesis.

    Sources with fetch_status != "ok" or empty content are listed in a
    "Skipped/failed sources" section at the top, not rendered as full sections.

    Args:
        topic: The research topic string.
        pass1: List of Pass 1 source dicts (from src_*.json).
        pass2: List of Pass 2 source dicts (from pass2_*.json).
        pass3: List of Pass 3 source dicts (from pass3_*.json).
        output_dir: The output directory path (included in header for Claude).

    Returns:
        Formatted markdown string.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    passes = [("Pass 1", pass1), ("Pass 2", pass2), ("Pass 3", pass3)]
    all_sources = [(label, s) for label, srcs in passes for s in srcs]

    good: list[tuple[str, dict]] = []
    skipped: list[tuple[str, dict]] = []

    for pass_label, src in all_sources:
        if src.get("fetch_status") == "ok" and src.get("content", "").strip():
            good.append((pass_label, src))
        else:
            skipped.append((pass_label, src))

    lines: list[str] = [
        "# Synthesis Input",
        "",
        f"**Topic:** {topic}",
        f"**Generated:** {timestamp}",
        f"**Total sources (usable):** {len(good)}",
    ]
    for label, srcs in passes:
        lines.append(f"**{label} sources:** {len(srcs)}")
    lines.append(f"**Output directory:** {output_dir}")

    # Include iteration metadata if manifest exists
    manifest_path = output_dir / "source_manifest.json"
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            iteration = manifest.get("iteration", "?")
            complexity = manifest.get("topic_complexity", "unclassified")
            lines.append(f"**Iterations completed:** {iteration}")
            lines.append(f"**Topic complexity:** {complexity}")

            convergence = manifest.get("convergence", {})
            if convergence:
                conv_items = [f"{k}: {'Yes' if v else 'No'}" for k, v in convergence.items()]
                lines.append(f"**Convergence:** {', '.join(conv_items)}")

            gaps = manifest.get("gap_register", [])
            open_gaps = [g for g in gaps if g.get("status") != "resolved"]
            if open_gaps:
                lines.append(f"**Open gaps:** {len(open_gaps)}")
        except Exception:  # noqa: BLE001
            pass

    lines.append("")

    # Skipped/failed section
    if skipped:
        lines.append("## Skipped/failed sources")
        lines.append("")
        for pass_label, src in skipped:
            url = src.get("url", "(no url)")
            reason = src.get("error", "") or src.get("fetch_status", "empty")
            lines.append(f"- [{pass_label}] {url} — {reason}")
        lines.append("")

    lines.append("---")
    lines.append("")

    # Source sections
    lines.append("## Sources")
    lines.append("")

    for pass_label, src in good:
        url = src.get("url", "(no url)")
        domain = src.get("domain", "")
        tier = src.get("tier", "")
        word_count = src.get("word_count", 0)
        content = src.get("content", "")

        lines.append(f"### [{pass_label}] {domain}")
        lines.append("")
        lines.append(f"- **URL:** {url}")
        lines.append(f"- **Domain:** {domain}")
        lines.append(f"- **Tier:** {tier}")
        lines.append(f"- **Words:** {word_count}")
        lines.append("")
        lines.append(content)
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def write_synthesis_input(output_dir: Path, content: str) -> Path:
    """Write synthesis_input.md to output_dir/sources/ and return the path.

    Args:
        output_dir: Root output directory.
        content: Markdown string to write.

    Returns:
        Path to the written synthesis_input.md file.
    """
    sources_dir = output_dir / "sources"
    sources_dir.mkdir(parents=True, exist_ok=True)
    output_path = sources_dir / "synthesis_input.md"
    output_path.write_text(content, encoding="utf-8")
    return output_path

"""CLI entry point for the channel assistant strategy pipeline.

Provides subcommands: add, remove, promote, demote, scrape, analyze,
dashboard, topics, init, package, status.
"""

import argparse
import json
import sys
from pathlib import Path

from .config import Config
from .database import Database
from .pipeline import Pipeline


def _find_channel_by_name(db: Database, name: str) -> "sqlite3.Row":
    """Case-insensitive channel lookup. Exits if not found."""
    for ch in db.get_all_channels():
        if ch["name"].lower() == name.lower():
            return ch
    print(f"Error: Channel '{name}' not found.", file=sys.stderr)
    sys.exit(1)


def find_project_root(start_dir: str | None = None) -> Path:
    """Walk up from *start_dir* looking for CLAUDE.md.

    Returns the directory containing CLAUDE.md, or calls sys.exit(1)
    if none is found.
    """
    current = Path(start_dir).resolve() if start_dir else Path.cwd().resolve()

    # Check current and all parents
    for directory in [current, *current.parents]:
        if (directory / "CLAUDE.md").exists():
            return directory

    print("Error: Could not find project root (no CLAUDE.md found).", file=sys.stderr)
    sys.exit(1)


# ------------------------------------------------------------------
# Subcommand handlers
# ------------------------------------------------------------------


def _cmd_add(args: argparse.Namespace, db: Database, config: Config, pipeline: Pipeline) -> None:
    """Register a new competitor channel via YouTube Data API."""
    api_key = config.youtube_api_key
    if not api_key:
        print(
            "Error: YOUTUBE_API_KEY environment variable is required for 'add'.",
            file=sys.stderr,
        )
        sys.exit(1)

    from .collector import Collector

    try:
        collector = Collector(db, config)
        result = collector.add_channel(args.url, tier=args.tier)
        print(f"Added: {result.get('name', 'unknown')} ({result.get('channel_id', '?')})")
        print(f"  Videos fetched: {result.get('videos_fetched', 0)}")
        # Mark scrape stale per spec (cascades to downstream on next run)
        pipeline.mark_stale("scrape")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def _cmd_remove(args: argparse.Namespace, db: Database, pipeline: Pipeline) -> None:
    """Remove a channel by name."""
    match = _find_channel_by_name(db, args.name)

    db.remove_channel(match["youtube_id"])
    print(f"Removed: {match['name']} ({match['youtube_id']})")
    pipeline.mark_stale("analyze")
    pipeline.mark_stale("dashboard")


def _cmd_promote(args: argparse.Namespace, db: Database, pipeline: Pipeline) -> None:
    """Promote a channel to watch_list tier."""
    match = _find_channel_by_name(db, args.name)

    db.update_channel_tier(match["youtube_id"], "watch_list")
    print(f"Promoted: {match['name']} -> watch_list")
    pipeline.mark_stale("analyze")
    pipeline.mark_stale("dashboard")


def _cmd_demote(args: argparse.Namespace, db: Database, pipeline: Pipeline) -> None:
    """Demote a channel to landscape tier."""
    match = _find_channel_by_name(db, args.name)

    db.update_channel_tier(match["youtube_id"], "landscape")
    print(f"Demoted: {match['name']} -> landscape")
    pipeline.mark_stale("analyze")
    pipeline.mark_stale("dashboard")


def _cmd_scrape(args: argparse.Namespace, db: Database, config: Config, pipeline: Pipeline) -> None:
    """Scrape all channels if pipeline says it should run."""
    api_key = config.youtube_api_key
    if not api_key:
        print(
            "Error: YOUTUBE_API_KEY environment variable is required for 'scrape'.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not pipeline.should_run("scrape", force=args.force):
        print("Scrape: cache is fresh, skipping. Use --force to override.")
        return

    from .collector import Collector

    input_hash = pipeline.compute_input_hash("scrape")
    run_id = db.start_pipeline_run("scrape", input_hash)
    try:
        collector = Collector(db, config)
        result = collector.scrape_all()

        summary = (
            f"{result['channels_scraped']} scraped, "
            f"{result['channels_failed']} failed"
        )
        if result["quota_exceeded"]:
            summary += " (quota exceeded)"

        db.complete_pipeline_run(run_id, "success", summary)
        print(f"Scrape complete: {summary}")
    except Exception as e:
        db.complete_pipeline_run(run_id, "error", str(e))
        print(f"Error during scrape: {e}", file=sys.stderr)
        sys.exit(1)


def _cmd_analyze(args: argparse.Namespace, db: Database, config: Config, pipeline: Pipeline) -> None:
    """Run 3-pass analysis if pipeline says it should run."""
    if not pipeline.should_run("analyze", force=args.force):
        print("Analyze: cache is fresh, skipping. Use --force to override.")
        return

    from .analyzer import Analyzer

    input_hash = pipeline.compute_input_hash("analyze")
    run_id = db.start_pipeline_run("analyze", input_hash)
    try:
        analyzer = Analyzer(
            db,
            cluster_min_k=config.CLUSTER_MIN_K,
            cluster_max_k=config.CLUSTER_MAX_K,
            outlier_multiplier=config.OUTLIER_MULTIPLIER,
            convergence_window_days=config.CONVERGENCE_WINDOW_DAYS,
            convergence_min_channels=config.CONVERGENCE_MIN_CHANNELS,
            saturation_decay_lambda=config.SATURATION_DECAY_LAMBDA,
        )
        result = analyzer.run_all()

        clusters = result.get("clusters", [])
        keywords = result.get("keywords", [])
        summary = f"{len(clusters)} clusters, {len(keywords)} keywords"

        db.complete_pipeline_run(run_id, "success", summary)
        print(f"Analysis complete: {summary}")

        # Print cluster summary
        if clusters:
            print("\nClusters:")
            for c in clusters:
                print(f"  - {c['label']} ({c['video_count']} videos, {c['avg_views']:,.0f} avg views)")
    except Exception as e:
        db.complete_pipeline_run(run_id, "error", str(e))
        print(f"Error during analysis: {e}", file=sys.stderr)
        sys.exit(1)


def _cmd_dashboard(args: argparse.Namespace, db: Database, config: Config, pipeline: Pipeline) -> None:
    """Generate HTML dashboard if pipeline says it should run."""
    if not pipeline.should_run("dashboard", force=args.force):
        print("Dashboard: cache is fresh, skipping. Use --force to override.")
        return

    from .dashboard import DashboardGenerator

    input_hash = pipeline.compute_input_hash("dashboard")
    run_id = db.start_pipeline_run("dashboard", input_hash)
    try:
        generator = DashboardGenerator(db, config)
        output_path = generator.generate()

        db.complete_pipeline_run(run_id, "success", str(output_path))
        print(f"Dashboard generated: {output_path}")
    except Exception as e:
        db.complete_pipeline_run(run_id, "error", str(e))
        print(f"Error generating dashboard: {e}", file=sys.stderr)
        sys.exit(1)


def _cmd_topics(args: argparse.Namespace, db: Database, config: Config) -> None:
    """Print formatted topic context to stdout for Claude."""
    from .topics import TopicEngine

    engine = TopicEngine(db, config)
    context = engine.format_context()
    print(context)


def _cmd_init(args: argparse.Namespace, db: Database, config: Config) -> None:
    """Initialize a project directory from a topic brief number."""
    briefs = db.get_topic_briefs()
    if not briefs:
        print("Error: No topic briefs found. Run 'topics' first.", file=sys.stderr)
        sys.exit(1)

    topic_num = args.topic_num
    if topic_num < 1 or topic_num > len(briefs):
        print(
            f"Error: Topic number {topic_num} is out of range (1-{len(briefs)}).",
            file=sys.stderr,
        )
        sys.exit(1)

    brief = briefs[topic_num - 1]

    from .project_init import ProjectInit

    try:
        scores_str = brief["scores"]
        scores = json.loads(scores_str) if isinstance(scores_str, str) else scores_str
        # Remove 'total' from scores if present (computed by init)
        scores.pop("total", None)

        pi = ProjectInit(db, config)
        project_dir = pi.init(
            title=brief["title"],
            scores=scores,
            pillar_primary=brief["pillar_primary"] or "",
            runtime_estimate=20,  # default estimate
            pillar_secondary=brief["pillar_secondary"],
            source_clusters=json.loads(brief["source_clusters"])
            if brief["source_clusters"]
            else None,
        )
        db.select_topic(brief["id"])
        print(f"Project initialized: {project_dir}")
    except Exception as e:
        print(f"Error initializing project: {e}", file=sys.stderr)
        sys.exit(1)


def _cmd_package(args: argparse.Namespace, db: Database, config: Config) -> None:
    """Print packaging instructions for Claude to generate titles and description."""
    project_path = config.root / "projects" / args.project
    if not project_path.exists():
        print(f"Error: Project directory not found: {project_path}", file=sys.stderr)
        sys.exit(1)

    metadata_path = project_path / "metadata.json"
    if not metadata_path.exists():
        print(f"Error: metadata.json not found in {project_path}", file=sys.stderr)
        sys.exit(1)

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    title = metadata.get("title", "unknown")

    print(f"Project: {title}")
    print(f"Path: {project_path}")
    print()
    print("To package this project, Claude should:")
    print("1. Generate 5 title variants (different hook types)")
    print("2. Write a YouTube description")
    print("3. Call ProjectInit.package(project_path, title_variants, description)")
    print()
    print("Import:")
    print("  from channel_assistant.project_init import ProjectInit")
    print("  from channel_assistant.database import Database")
    print("  from channel_assistant.config import Config")


def _cmd_status(args: argparse.Namespace, db: Database, config: Config, pipeline: Pipeline) -> None:
    """Print pipeline freshness status for all stages."""
    status = pipeline.get_status()

    # Table header
    print(f"{'Stage':<12} {'State':<8} {'Age (days)':<12} {'Last Run':<20}")
    print("-" * 52)

    for stage, info in status.items():
        state = info["state"]
        age = f"{info['age_days']}" if info["age_days"] is not None else "never"
        last_run = ""
        if info["last_run"] is not None:
            completed = info["last_run"]["completed_at"]
            last_run = completed[:19] if completed else ""

        print(f"{stage:<12} {state:<8} {age:<12} {last_run:<20}")

    # Channel count
    channels = db.get_all_channels()
    print(f"\nChannels tracked: {len(channels)}")
    watch = [ch for ch in channels if ch["tier"] == "watch_list"]
    landscape = [ch for ch in channels if ch["tier"] == "landscape"]
    print(f"  watch_list: {len(watch)}  |  landscape: {len(landscape)}")


# ------------------------------------------------------------------
# CLI entry point
# ------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    """Argparse-based CLI with subcommands."""
    parser = argparse.ArgumentParser(
        description="Channel Assistant — strategy pipeline CLI"
    )
    subparsers = parser.add_subparsers(dest="command")

    # add
    add_parser = subparsers.add_parser("add", help="Register a new competitor channel")
    add_parser.add_argument("url", help="YouTube channel URL or @handle")
    add_parser.add_argument(
        "--tier",
        choices=["watch_list", "landscape"],
        default="landscape",
        help="Channel tier (default: landscape)",
    )

    # remove
    remove_parser = subparsers.add_parser("remove", help="Remove a channel by name")
    remove_parser.add_argument("name", help="Channel name")

    # promote
    promote_parser = subparsers.add_parser("promote", help="Promote channel to watch_list")
    promote_parser.add_argument("name", help="Channel name")

    # demote
    demote_parser = subparsers.add_parser("demote", help="Demote channel to landscape")
    demote_parser.add_argument("name", help="Channel name")

    # scrape
    scrape_parser = subparsers.add_parser("scrape", help="Scrape all channels")
    scrape_parser.add_argument("--force", action="store_true", help="Force scrape even if cache is fresh")

    # analyze
    analyze_parser = subparsers.add_parser("analyze", help="Run 3-pass analysis")
    analyze_parser.add_argument("--force", action="store_true", help="Force analysis even if cache is fresh")

    # dashboard
    dashboard_parser = subparsers.add_parser("dashboard", help="Generate HTML dashboard")
    dashboard_parser.add_argument("--force", action="store_true", help="Force regeneration")

    # topics
    subparsers.add_parser("topics", help="Print topic context for Claude")

    # init
    init_parser = subparsers.add_parser("init", help="Initialize project from topic brief")
    init_parser.add_argument("topic_num", type=int, help="Topic brief number")

    # package
    package_parser = subparsers.add_parser("package", help="Print packaging instructions")
    package_parser.add_argument("project", help="Project slug (directory name)")

    # status
    subparsers.add_parser("status", help="Show pipeline freshness status")

    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # -- Resolve project root and create shared instances --
    root = find_project_root()
    config = Config(root)
    db = Database(config.DB_PATH)
    db.init_db()
    pipeline = Pipeline(db, config)

    # -- Dispatch --
    if args.command == "add":
        _cmd_add(args, db, config, pipeline)
    elif args.command == "remove":
        _cmd_remove(args, db, pipeline)
    elif args.command == "promote":
        _cmd_promote(args, db, pipeline)
    elif args.command == "demote":
        _cmd_demote(args, db, pipeline)
    elif args.command == "scrape":
        _cmd_scrape(args, db, config, pipeline)
    elif args.command == "analyze":
        _cmd_analyze(args, db, config, pipeline)
    elif args.command == "dashboard":
        _cmd_dashboard(args, db, config, pipeline)
    elif args.command == "topics":
        _cmd_topics(args, db, config)
    elif args.command == "init":
        _cmd_init(args, db, config)
    elif args.command == "package":
        _cmd_package(args, db, config)
    elif args.command == "status":
        _cmd_status(args, db, config, pipeline)


if __name__ == "__main__":
    main()

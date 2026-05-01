"""CLI entry point for channel_assistant.

Three subcommands:
  add       Register a competitor channel.
  scrape    Scrape registered competitors into the SQLite DB. Per-channel
            freshness gate skips channels scraped within the last N days.
  context   Build channel/strategy/context.md from current DB state.

Topic generation is not a CLI command -- it lives in the strategy agent
body and uses parallel subagent dispatch.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

from .context import write_context
from .database import Database
from .registry import Registry
from .scraper import scrape_all_channels, scrape_single_channel


def _get_project_root() -> Path:
    """Find the project root (directory containing CLAUDE.md)."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "CLAUDE.md").exists():
            return parent
    return Path.cwd()


def cmd_add(args: argparse.Namespace, registry: Registry) -> None:
    url_or_handle = args.url.strip()
    print(f"Resolving channel info for {url_or_handle}...")
    try:
        result = subprocess.run(
            [
                "yt-dlp", "--dump-json", "--skip-download", "--no-warnings",
                "--playlist-items", "1", url_or_handle,
            ],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout.strip().split("\n")[0])
            channel_name = data.get("channel", "Unknown")
            handle = data.get("uploader_id", "")
            channel_url = data.get("channel_url", url_or_handle)
        else:
            print("Warning: Could not resolve channel info. Using URL as-is.")
            channel_name = url_or_handle
            handle = url_or_handle if url_or_handle.startswith("@") else ""
            channel_url = url_or_handle
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        print("Warning: Could not resolve channel info. Using URL as-is.")
        channel_name = url_or_handle
        handle = url_or_handle if url_or_handle.startswith("@") else ""
        channel_url = url_or_handle

    youtube_id = (
        handle if handle.startswith("@")
        else f"@{handle}" if handle
        else f"@{channel_name.replace(' ', '')}"
    )

    try:
        entry = registry.add(name=channel_name, youtube_id=youtube_id, url=channel_url)
        print(f"Added: {entry['name']} ({entry['youtube_id']})")
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)


def cmd_scrape(args: argparse.Namespace, registry: Registry, db: Database) -> None:
    db.init_db()
    if args.name:
        result = scrape_single_channel(args.name, registry, db)
    else:
        result = scrape_all_channels(registry, db, freshness_days=args.since)
    if result and result.get("failed"):
        sys.exit(1)


def cmd_context(args: argparse.Namespace, db: Database, root: Path) -> None:
    db.init_db()
    out_path = write_context(db, root)
    rel = out_path.relative_to(root) if out_path.is_relative_to(root) else out_path
    print(f"Context written: {rel}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Channel Assistant -- competitor tracking and analysis"
    )
    sub = parser.add_subparsers(dest="command")

    add_parser = sub.add_parser("add", help="Register a new competitor channel")
    add_parser.add_argument("url", help="YouTube channel URL or @handle")

    scrape_parser = sub.add_parser("scrape", help="Scrape registered competitors")
    scrape_parser.add_argument(
        "name", nargs="?", help="Channel name (omit to scrape all)"
    )
    scrape_parser.add_argument(
        "--since", type=int, default=7,
        help="Skip channels scraped within last N days (default: 7, ignored when name is given)",
    )

    sub.add_parser("context", help="Build channel/strategy/context.md from current DB")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    root = _get_project_root()
    registry = Registry(root / "channel" / "strategy" / "competitors.json")
    db = Database(root / "data" / "channel_assistant.db")

    if args.command == "add":
        cmd_add(args, registry)
    elif args.command == "scrape":
        cmd_scrape(args, registry, db)
    elif args.command == "context":
        cmd_context(args, db, root)


if __name__ == "__main__":
    main()

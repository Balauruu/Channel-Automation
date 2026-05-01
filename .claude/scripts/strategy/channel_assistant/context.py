"""Build the single consolidated context file Claude reads for topic generation.

Writes ``channel/strategy/context.md`` containing, in order:
  1. Per-channel summary stats (videos, median views, upload frequency, latest upload)
  2. Top outliers across all channels (videos with views >= 2x channel median)
  3. Recent uploads (30-day window) for convergence detection
  4. Raw video data grouped by channel, sorted by views desc

This module is the only data-shaping step between the SQLite DB and Claude.
The previous ``analyzer.py`` and ``trend_scanner.py`` modules were folded
into this single file. Autocomplete + crawl4ai search-result scraping
were removed -- they produced noisy data at high cost; competitor
convergence is the only clean signal and comes directly from the DB.
"""

from __future__ import annotations

import statistics
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from .database import Database
from .models import Channel, Video


_OUTLIER_MULTIPLIER = 2.0
_TOP_OUTLIERS = 30
_CONVERGENCE_WINDOW_DAYS = 30


def _parse_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def _channel_stats(channel: Channel, videos: list[Video]) -> dict:
    """Median views, upload frequency in days, latest upload."""
    if not videos:
        return {
            "channel": channel.name,
            "video_count": 0,
            "median_views": 0,
            "upload_frequency_days": None,
            "latest_upload": None,
        }

    valid_views = [v.views for v in videos if v.views is not None]
    median_views = int(statistics.median(valid_views)) if valid_views else 0

    parsed_dates = sorted(
        (d for v in videos if (d := _parse_date(v.upload_date)))
    )
    latest_upload = parsed_dates[-1].strftime("%Y-%m-%d") if parsed_dates else None
    upload_freq = None
    if len(parsed_dates) >= 2:
        span = (parsed_dates[-1] - parsed_dates[0]).days
        upload_freq = round(span / (len(parsed_dates) - 1), 1)

    return {
        "channel": channel.name,
        "video_count": len(videos),
        "median_views": median_views,
        "upload_frequency_days": upload_freq,
        "latest_upload": latest_upload,
    }


def _outliers(channel: Channel, videos: list[Video]) -> list[dict]:
    valid_views = [v.views for v in videos if v.views is not None]
    if not valid_views:
        return []
    median = statistics.median(valid_views)
    if median == 0:
        return []
    out = []
    for v in videos:
        if v.views is None:
            continue
        mult = round(v.views / median, 1)
        if mult >= _OUTLIER_MULTIPLIER:
            out.append({
                "title": v.title,
                "channel": channel.name,
                "views": v.views,
                "multiplier": mult,
                "upload_date": v.upload_date,
            })
    return out


def _recent_uploads(db: Database, days: int) -> list[dict]:
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    conn = db.connect()
    try:
        rows = conn.execute(
            """
            SELECT v.title, v.upload_date, v.views, c.name AS channel_name
            FROM videos v
            JOIN channels c ON v.channel_id = c.youtube_id
            WHERE v.upload_date IS NOT NULL AND v.upload_date >= ?
            ORDER BY v.upload_date DESC
            """,
            (cutoff,),
        ).fetchall()
    finally:
        conn.close()
    return [
        {
            "title": r["title"],
            "upload_date": r["upload_date"],
            "views": r["views"],
            "channel_name": r["channel_name"],
        }
        for r in rows
    ]


def _format_stats_table(stats: list[dict]) -> str:
    headers = ["Channel", "Videos", "Median Views", "Upload Freq", "Latest Upload"]
    rows = []
    for s in stats:
        freq = f"{int(s['upload_frequency_days'])}d" if s["upload_frequency_days"] else "n/a"
        rows.append([
            s["channel"],
            str(s["video_count"]),
            f"{s['median_views']:,}",
            freq,
            s["latest_upload"] or "n/a",
        ])
    widths = [len(h) for h in headers]
    for r in rows:
        for i, cell in enumerate(r):
            widths[i] = max(widths[i], len(cell))

    def fmt(cells: list[str]) -> str:
        return "| " + " | ".join(c.ljust(widths[i]) for i, c in enumerate(cells)) + " |"

    lines = [fmt(headers), "| " + " | ".join("-" * w for w in widths) + " |"]
    lines.extend(fmt(r) for r in rows)
    return "\n".join(lines)


def write_context(db: Database, root: Path) -> Path:
    """Build context.md from current DB state. Returns the written path."""
    channels = db.get_all_channels()
    if not channels:
        raise RuntimeError(
            "No channels in DB. Run 'add' to register competitors and 'scrape' to populate data."
        )

    all_stats: list[dict] = []
    all_outliers: list[dict] = []
    videos_by_channel: dict[str, list[Video]] = {}
    total_videos = 0

    for ch in channels:
        videos = db.get_videos_by_channel(ch.youtube_id)
        total_videos += len(videos)
        videos_by_channel[ch.name] = videos
        all_stats.append(_channel_stats(ch, videos))
        all_outliers.extend(_outliers(ch, videos))

    all_outliers.sort(key=lambda x: x["multiplier"], reverse=True)
    top_outliers = all_outliers[:_TOP_OUTLIERS]
    recent = _recent_uploads(db, _CONVERGENCE_WINDOW_DAYS)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = [
        "# Strategy Context",
        "",
        f"*Generated: {timestamp} | {len(channels)} channels | {total_videos} videos*",
        "",
        "## Channel Stats",
        "",
        _format_stats_table(all_stats),
        "",
        f"## Outlier Videos (top {_TOP_OUTLIERS} by channel-median multiplier)",
        "",
    ]
    if top_outliers:
        for o in top_outliers:
            views_str = f"{o['views']:,}" if o['views'] else "n/a"
            lines.append(
                f"- **{o['title']}** ({o['channel']}) -- "
                f"{views_str} views -- {o['multiplier']}x median "
                f"-- {o.get('upload_date') or 'date n/a'}"
            )
    else:
        lines.append("_No outliers detected._")

    lines.extend([
        "",
        f"## Recent Uploads ({_CONVERGENCE_WINDOW_DAYS}-day convergence window)",
        "",
    ])
    if recent:
        for v in recent:
            views_str = f"{v['views']:,}" if v['views'] else "n/a"
            lines.append(
                f"- {v['upload_date']} | {v['channel_name']} | "
                f"{views_str} views | {v['title']}"
            )
    else:
        lines.append(f"_No competitor uploads in the last {_CONVERGENCE_WINDOW_DAYS} days._")

    lines.extend(["", "## Raw Video Data (grouped by channel, sorted by views desc)", ""])
    for channel_name, videos in videos_by_channel.items():
        lines.append(f"### {channel_name}")
        lines.append("")
        sorted_videos = sorted(
            videos, key=lambda v: v.views if v.views is not None else -1, reverse=True
        )
        for v in sorted_videos:
            views_str = f"{v.views:,}" if v.views is not None else "n/a"
            tags_str = ", ".join(v.tags) if v.tags else ""
            lines.append(
                f"- {v.title} | views: {views_str} | "
                f"date: {v.upload_date or 'n/a'} | tags: {tags_str}"
            )
        lines.append("")

    out_path = root / "channel" / "strategy" / "context.md"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path

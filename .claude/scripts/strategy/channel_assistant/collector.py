"""YouTube Data API collector for channel assistant.

Replaces the yt-dlp scraper with google-api-python-client.
Handles pagination, quota awareness, and tier-based fetch limits.
"""

import logging
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


def _build_youtube_client(api_key: str):
    """Build a YouTube Data API v3 client."""
    return build("youtube", "v3", developerKey=api_key)


def _parse_duration(iso_duration: str) -> int:
    """Convert ISO 8601 duration (PT30M, PT1H20M5S) to seconds."""
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration)
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def resolve_channel_id(url: str, api_key: str) -> str:
    """Resolve a YouTube URL to a channel ID.

    If URL contains /channel/UC..., extract directly.
    If URL contains /@handle, use search API to resolve.
    """
    parsed = urlparse(url)
    path = parsed.path

    # Direct channel URL: /channel/UCxxx
    if "/channel/" in path:
        parts = path.split("/channel/")
        return parts[1].split("/")[0]

    # Handle URL: /@handle
    if "/@" in path:
        handle = path.split("/@")[1].split("/")[0]
        yt = _build_youtube_client(api_key)
        response = (
            yt.search()
            .list(q=f"@{handle}", type="channel", part="snippet", maxResults=1)
            .execute()
        )
        if response.get("items"):
            return response["items"][0]["snippet"]["channelId"]

    raise ValueError(f"Could not resolve channel ID from URL: {url}")


class Collector:
    """YouTube Data API collector with tier-aware fetching."""

    def __init__(self, db, config):
        self.db = db
        self.config = config
        api_key = config.youtube_api_key
        if not api_key:
            raise ValueError("YOUTUBE_API_KEY environment variable is required")
        self._yt = _build_youtube_client(api_key)

    def fetch_channel_details(self, channel_id: str) -> dict:
        """Fetch channel metadata from YouTube Data API."""
        response = (
            self._yt.channels()
            .list(part="snippet,statistics", id=channel_id)
            .execute()
        )

        if not response.get("items"):
            raise ValueError(f"Channel not found: {channel_id}")

        item = response["items"][0]
        snippet = item["snippet"]
        stats = item["statistics"]

        return {
            "youtube_id": item["id"],
            "name": snippet["title"],
            "handle": snippet.get("customUrl"),
            "description": snippet.get("description", ""),
            "subscribers": int(stats.get("subscriberCount", 0)),
            "total_views": int(stats.get("viewCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
        }

    def fetch_channel_videos(
        self, channel_id: str, max_results: int | None = None
    ) -> list[dict]:
        """Fetch videos for a channel with pagination."""
        video_ids = []
        page_token = None

        while True:
            per_page = (
                min(50, max_results - len(video_ids)) if max_results else 50
            )
            if per_page <= 0:
                break

            search_response = (
                self._yt.search()
                .list(
                    channelId=channel_id,
                    type="video",
                    order="date",
                    part="id",
                    maxResults=per_page,
                    pageToken=page_token,
                )
                .execute()
            )

            items = search_response.get("items", [])
            video_ids.extend(item["id"]["videoId"] for item in items)

            page_token = search_response.get("nextPageToken")
            if (
                not page_token
                or not items
                or (max_results and len(video_ids) >= max_results)
            ):
                break

        if not video_ids:
            return []

        # Fetch full video details in batches of 50
        videos = []
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i : i + 50]
            detail_response = (
                self._yt.videos()
                .list(id=",".join(batch), part="snippet,statistics,contentDetails")
                .execute()
            )

            for item in detail_response.get("items", []):
                snippet = item["snippet"]
                stats = item["statistics"]
                content = item["contentDetails"]

                videos.append(
                    {
                        "video_id": item["id"],
                        "channel_id": channel_id,
                        "title": snippet["title"],
                        "description": snippet.get("description", ""),
                        "upload_date": snippet["publishedAt"][:10],
                        "url": f"https://www.youtube.com/watch?v={item['id']}",
                        "views": int(stats.get("viewCount", 0)),
                        "likes": int(stats.get("likeCount", 0)),
                        "comment_count": int(stats.get("commentCount", 0)),
                        "duration": _parse_duration(
                            content.get("duration", "PT0S")
                        ),
                        "tags": snippet.get("tags", []),
                        "thumbnail_url": snippet.get("thumbnails", {})
                        .get("high", {})
                        .get("url"),
                    }
                )

        return videos

    def scrape_channel(
        self, channel_id: str, tier: str = "landscape"
    ) -> dict:
        """Fetch details + videos for a channel, upsert to DB."""
        max_results = (
            self.config.WATCH_LIST_MAX_VIDEOS
            if tier == "watch_list"
            else self.config.LANDSCAPE_MAX_VIDEOS
        )

        try:
            details = self.fetch_channel_details(channel_id)
            videos = self.fetch_channel_videos(
                channel_id, max_results=max_results
            )

            self.db.upsert_channel(
                {
                    **details,
                    "url": f"https://www.youtube.com/channel/{channel_id}",
                    "tier": tier,
                }
            )

            if videos:
                self.db.upsert_videos(videos)

            self.db.record_stats_snapshot(
                channel_id=channel_id,
                subscribers=details["subscribers"],
                total_views=details["total_views"],
                video_count=details["video_count"],
            )

            self._log_scrape(
                channel_id=channel_id,
                video_count=len(videos),
                new_videos=len(videos),
                status="ok",
            )

            return {
                "channel_id": channel_id,
                "name": details["name"],
                "videos_fetched": len(videos),
                "status": "ok",
            }

        except HttpError as e:
            if e.resp.status == 403:
                logger.warning(
                    "Quota exceeded scraping %s: %s", channel_id, e
                )
                self._log_scrape(
                    channel_id=channel_id,
                    video_count=0,
                    new_videos=0,
                    status="quota_exceeded",
                    error_message=str(e),
                )
                return {
                    "channel_id": channel_id,
                    "videos_fetched": 0,
                    "status": "quota_exceeded",
                    "error": str(e),
                }
            raise

        except Exception as e:
            logger.warning("Failed to scrape %s: %s", channel_id, e)
            self._log_scrape(
                channel_id=channel_id,
                video_count=0,
                new_videos=0,
                status="error",
                error_message=str(e),
            )
            return {
                "channel_id": channel_id,
                "videos_fetched": 0,
                "status": "error",
                "error": str(e),
            }

    def scrape_all(self) -> dict:
        """Scrape all channels in the database."""
        channels = self.db.get_all_channels()
        results = []
        quota_hit = False

        for ch in channels:
            if quota_hit:
                break

            result = self.scrape_channel(ch["youtube_id"], ch["tier"])
            results.append(result)

            if result.get("status") == "quota_exceeded":
                quota_hit = True

        scraped = [r for r in results if r["status"] == "ok"]
        failed = [r for r in results if r["status"] != "ok"]

        return {
            "channels_scraped": len(scraped),
            "channels_failed": len(failed),
            "quota_exceeded": quota_hit,
            "results": results,
        }

    def add_channel(self, url: str, tier: str = "landscape") -> dict:
        """Add a new channel: resolve URL, fetch details, initial scrape."""
        channel_id = resolve_channel_id(url, self.config.youtube_api_key)
        return self.scrape_channel(channel_id, tier)

    def _log_scrape(
        self,
        channel_id: str,
        video_count: int,
        new_videos: int,
        status: str,
        error_message: str | None = None,
    ) -> None:
        """Write an entry to the scrape_log table."""
        now = datetime.now(timezone.utc).isoformat()
        conn = self.db.connect()
        try:
            conn.execute(
                """
                INSERT INTO scrape_log
                    (channel_id, scraped_at, video_count, new_videos,
                     status, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (channel_id, now, video_count, new_videos, status, error_message),
            )
            conn.commit()
        finally:
            conn.close()

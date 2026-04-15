"""Tests for YouTube Data API collector (mocked)."""
import pytest
from unittest.mock import MagicMock, patch
from channel_assistant.collector import Collector, resolve_channel_id


class TestResolveChannelId:
    @patch("channel_assistant.collector._build_youtube_client")
    def test_resolve_handle_url(self, mock_build):
        """@Handle URL resolves to channel ID via search."""
        mock_yt = MagicMock()
        mock_build.return_value = mock_yt
        mock_yt.search().list().execute.return_value = {
            "items": [{"snippet": {"channelId": "UCabc123"}}]
        }
        result = resolve_channel_id("https://www.youtube.com/@TestChannel", "fake-key")
        assert result == "UCabc123"

    @patch("channel_assistant.collector._build_youtube_client")
    def test_resolve_channel_url(self, mock_build):
        """Direct /channel/UC... URL extracts ID from path."""
        result = resolve_channel_id(
            "https://www.youtube.com/channel/UCabc123", "fake-key"
        )
        assert result == "UCabc123"


class TestCollector:
    @pytest.fixture
    def collector(self, db, tmp_config, monkeypatch):
        monkeypatch.setenv("YOUTUBE_API_KEY", "fake-key")
        with patch("channel_assistant.collector._build_youtube_client") as mock_build:
            mock_yt = MagicMock()
            mock_build.return_value = mock_yt
            c = Collector(db, tmp_config)
            c._yt = mock_yt
            yield c, mock_yt

    def test_fetch_channel_details(self, collector):
        c, mock_yt = collector
        mock_yt.channels().list().execute.return_value = {
            "items": [{
                "id": "UCabc123",
                "snippet": {
                    "title": "Test Channel",
                    "customUrl": "@TestChannel",
                    "description": "A channel",
                },
                "statistics": {
                    "subscriberCount": "100000",
                    "viewCount": "5000000",
                    "videoCount": "50",
                },
            }]
        }
        ch = c.fetch_channel_details("UCabc123")
        assert ch["name"] == "Test Channel"
        assert ch["subscribers"] == 100000

    def test_fetch_channel_videos_respects_tier_limit(self, collector):
        c, mock_yt = collector
        # Mock returns 5 videos
        mock_yt.search().list().execute.return_value = {
            "items": [
                {"id": {"videoId": f"v{i}"}, "snippet": {"title": f"Video {i}",
                 "publishedAt": "2026-03-01T00:00:00Z"}}
                for i in range(5)
            ]
        }
        mock_yt.videos().list().execute.return_value = {
            "items": [
                {"id": f"v{i}", "snippet": {"title": f"Video {i}", "description": "",
                 "publishedAt": "2026-03-01T00:00:00Z", "tags": ["test"]},
                 "statistics": {"viewCount": "1000", "likeCount": "50", "commentCount": "10"},
                 "contentDetails": {"duration": "PT30M"}}
                for i in range(5)
            ]
        }
        videos = c.fetch_channel_videos("UCabc123", max_results=20)
        assert len(videos) == 5
        assert videos[0]["views"] == 1000

    def test_scrape_all_records_to_db(self, collector, sample_channel):
        c, mock_yt = collector
        c.db.upsert_channel(sample_channel)
        # Mock channel details
        mock_yt.channels().list().execute.return_value = {
            "items": [{
                "id": "UC_test_123",
                "snippet": {"title": "Test Channel", "customUrl": "@TestChannel", "description": ""},
                "statistics": {"subscriberCount": "100000", "viewCount": "5000000", "videoCount": "50"},
            }]
        }
        # Mock empty video list
        mock_yt.search().list().execute.return_value = {"items": []}
        mock_yt.videos().list().execute.return_value = {"items": []}

        result = c.scrape_all()
        assert result["channels_scraped"] == 1
        # Stats history should have a new snapshot
        history = c.db.get_stats_history("UC_test_123")
        assert len(history) == 1

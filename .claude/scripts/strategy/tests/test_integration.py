"""End-to-end integration test for the strategy pipeline.

Uses mocked YouTube API to test the full flow:
scrape -> analyze -> dashboard -> topics -> init -> package.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path

from channel_assistant.config import Config
from channel_assistant.database import Database
from channel_assistant.collector import Collector
from channel_assistant.analyzer import Analyzer
from channel_assistant.dashboard import DashboardGenerator
from channel_assistant.pipeline import Pipeline
from channel_assistant.topics import TopicEngine
from channel_assistant.project_init import ProjectInit


@pytest.fixture
def full_setup(tmp_path, monkeypatch):
    """Full pipeline setup with mocked API."""
    monkeypatch.setenv("YOUTUBE_API_KEY", "fake-key")

    # Create directory structure
    (tmp_path / "data").mkdir()
    (tmp_path / "channel" / "strategy").mkdir(parents=True)
    (tmp_path / "projects").mkdir()
    (tmp_path / "channel" / "past_topics.md").write_text(
        "# Past Topics\n\n", encoding="utf-8",
    )
    (tmp_path / "docs" / "pizzint-design" / "fonts").mkdir(parents=True)

    config = Config(project_root=tmp_path)
    db = Database(config.DB_PATH)
    db.init_db()
    return config, db


def _mock_youtube_data():
    """Build mock YouTube API responses."""
    channel_response = {
        "items": [{
            "id": "UCtest1",
            "snippet": {"title": "Mystery Channel", "customUrl": "@mystery", "description": "Mysteries"},
            "statistics": {"subscriberCount": "50000", "viewCount": "2000000", "videoCount": "30"},
        }]
    }
    video_titles = [
        "The Unsolved Case of the Missing Hiker",
        "Dark History: The Cult That Controlled a Town",
        "Cold War Secrets the Government Hid for Decades",
        "Inside the Most Bizarre Disappearance in History",
        "The Cult Leader Who Built an Empire of Fear",
        "Government Experiments: What They Never Told You",
    ]
    search_response = {
        "items": [{"id": {"videoId": f"v{i}"}, "snippet": {"title": t, "publishedAt": f"2026-0{i+1}-15T00:00:00Z"}}
                  for i, t in enumerate(video_titles)]
    }
    videos_response = {
        "items": [{
            "id": f"v{i}",
            "snippet": {"title": t, "description": f"A video about {t.lower()}", "publishedAt": f"2026-0{i+1}-15T00:00:00Z", "tags": ["mystery", "documentary"]},
            "statistics": {"viewCount": str(100000 + i * 80000), "likeCount": str(5000 + i * 2000), "commentCount": str(200 + i * 100)},
            "contentDetails": {"duration": "PT35M"},
        } for i, t in enumerate(video_titles)]
    }
    return channel_response, search_response, videos_response


class TestFullPipeline:
    @patch("channel_assistant.collector.resolve_channel_id", return_value="UCtest1")
    @patch("channel_assistant.collector._build_youtube_client")
    def test_scrape_analyze_dashboard_topics_init(self, mock_build, mock_resolve, full_setup):
        config, db = full_setup
        mock_yt = MagicMock()
        mock_build.return_value = mock_yt

        ch_resp, search_resp, vid_resp = _mock_youtube_data()
        mock_yt.channels().list().execute.return_value = ch_resp
        mock_yt.search().list().execute.return_value = search_resp
        mock_yt.videos().list().execute.return_value = vid_resp

        # 1. Add a channel
        collector = Collector(db, config)
        collector._yt = mock_yt
        result = collector.add_channel("https://youtube.com/@mystery", tier="watch_list")
        assert result["name"] == "Mystery Channel"

        # 2. Verify DB has data
        channels = db.get_all_channels()
        assert len(channels) == 1
        videos = db.get_videos_by_channel("UCtest1")
        assert len(videos) == 6

        # 3. Run analysis
        analyzer = Analyzer(db, cluster_min_k=2, cluster_max_k=4)
        analysis_result = analyzer.run_all()
        assert len(analysis_result["clusters"]) >= 2

        # 4. Check pipeline state
        pipeline = Pipeline(db, config)
        run_id = db.start_pipeline_run("analyze", pipeline.compute_input_hash("analyze"))
        db.complete_pipeline_run(run_id, "success", "6 videos analyzed")
        assert pipeline.should_run("analyze") is False  # just ran

        # 5. Generate dashboard
        dashboard = DashboardGenerator(db, config)
        dash_path = dashboard.generate()
        assert dash_path.exists()
        html = dash_path.read_text(encoding="utf-8")
        assert "#1a202c" in html  # pizzint background

        # 6. Format topic context
        topics = TopicEngine(db, config)
        ctx = topics.format_context()
        assert len(ctx) > 100  # should have substantial content

        # 7. Init a project
        init = ProjectInit(db, config)
        proj_path = init.init(
            title="Cold War Mind Control",
            scores={"obscurity": 5, "complexity": 4, "shock_factor": 4,
                    "verifiability": 4, "pillar_fit": 4},
            pillar_primary="Institutional Corruption",
            runtime_estimate=35,
        )
        assert (proj_path / "metadata.json").exists()
        meta = json.loads((proj_path / "metadata.json").read_text(encoding="utf-8"))
        assert meta["scores"]["total"] == 21
        assert "youtube" not in meta  # not packaged yet

        # 8. Package after script
        (proj_path / "script" / "Script.md").write_text("# Script\n\nContent.", encoding="utf-8")
        init.package(
            proj_path,
            title_variants=[{"title": "Test Title", "hook_type": "statement", "recommended": True,
                             "recommendation_reason": "test"}],
            description="A test description.",
        )
        meta = json.loads((proj_path / "metadata.json").read_text(encoding="utf-8"))
        assert "youtube" in meta
        assert len(meta["youtube"]["title_variants"]) == 1

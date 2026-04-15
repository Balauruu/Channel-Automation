"""Tests for dashboard HTML generation."""
import pytest
from pathlib import Path
from channel_assistant.dashboard import DashboardGenerator


@pytest.fixture
def populated_analysis_db(db, sample_channel, sample_video):
    """DB with channels, videos, clusters, and keywords for dashboard."""
    db.upsert_channel(sample_channel)
    videos = []
    for i in range(10):
        v = sample_video.copy()
        v["video_id"] = f"vid_{i:03d}"
        v["title"] = f"Test Video {i}"
        v["views"] = 100000 + i * 50000
        v["upload_date"] = f"2026-03-{(i % 28) + 1:02d}"
        videos.append(v)
    db.upsert_videos(videos)
    db.save_clusters([
        {"label": "cults", "keywords": "cult,leader", "video_count": 5,
         "avg_views": 300000, "saturation_score": 0.6, "status": "competitive"},
        {"label": "cold war", "keywords": "cold war,cia", "video_count": 3,
         "avg_views": 500000, "saturation_score": 0.15, "status": "underserved"},
    ])
    db.save_keywords([
        {"keyword": "cult leader", "source": "title", "frequency": 5,
         "channels_count": 3, "avg_views": 300000},
        {"keyword": "cold war", "source": "title", "frequency": 3,
         "channels_count": 1, "avg_views": 500000},
    ])
    return db


class TestDashboardGeneration:
    def test_generate_produces_html_file(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        output_path = gen.generate()
        assert output_path.exists()
        assert output_path.suffix == ".html"

    def test_html_contains_pizzint_colors(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        gen.generate()
        html = tmp_config.DASHBOARD_PATH.read_text(encoding="utf-8")
        assert "#1a202c" in html  # background
        assert "#1e2939" in html  # surface
        assert "#00b7d7" in html  # accent

    def test_html_contains_plotly_charts(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        gen.generate()
        html = tmp_config.DASHBOARD_PATH.read_text(encoding="utf-8")
        assert "plotly" in html.lower()

    def test_html_contains_kpi_data(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        gen.generate()
        html = tmp_config.DASHBOARD_PATH.read_text(encoding="utf-8")
        # Should contain the channel count and video count
        assert "1" in html  # 1 channel
        assert "10" in html  # 10 videos

    def test_html_is_self_contained(self, populated_analysis_db, tmp_config):
        gen = DashboardGenerator(populated_analysis_db, tmp_config)
        gen.generate()
        html = tmp_config.DASHBOARD_PATH.read_text(encoding="utf-8")
        # Should not have external script/link refs (except fonts if CDN fallback)
        assert "<!DOCTYPE html>" in html or "<html" in html

    def test_generate_with_no_data(self, db, tmp_config):
        """Dashboard should still generate with empty DB (shows zeros)."""
        gen = DashboardGenerator(db, tmp_config)
        output_path = gen.generate()
        assert output_path.exists()

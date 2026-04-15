"""Tests for the 3-pass analysis engine."""
import pytest
from channel_assistant.analyzer import Analyzer


@pytest.fixture
def populated_db(db, sample_channel, sample_video):
    """DB with enough data to run analysis."""
    db.upsert_channel(sample_channel)
    videos = []
    titles = [
        "The Dark History of Cults in America",
        "Unsolved Mystery: The Missing Children of Springfield",
        "Government Cover-Up: Cold War Experiments on Citizens",
        "Inside the Most Dangerous Cult You Never Heard Of",
        "The Disappearance That Baffled Investigators for Decades",
        "How the CIA Funded Secret Mind Control Programs",
        "The Cult Leader Who Fooled an Entire Nation",
        "Cold War Secrets: Underground Bunkers and Hidden Experiments",
        "Missing Persons: 5 Cases That Were Never Solved",
        "Institutional Corruption: When Governments Silence Victims",
    ]
    for i, title in enumerate(titles):
        v = sample_video.copy()
        v["video_id"] = f"vid_{i:03d}"
        v["title"] = title
        v["views"] = 100000 + i * 50000
        v["likes"] = 5000 + i * 1000
        v["comment_count"] = 200 + i * 50
        v["upload_date"] = f"2026-{(i % 3) + 1:02d}-{(i % 28) + 1:02d}"
        videos.append(v)
    db.upsert_videos(videos)
    return db


class TestStatsPass:
    def test_compute_channel_stats(self, populated_db):
        analyzer = Analyzer(populated_db)
        stats = analyzer.compute_channel_stats("UC_test_123")
        assert stats["total_videos"] == 10
        assert stats["avg_views"] > 0
        assert stats["median_views"] > 0
        assert "upload_frequency_days" in stats

    def test_detect_outliers(self, populated_db):
        analyzer = Analyzer(populated_db, outlier_multiplier=1.5)
        outliers = analyzer.detect_outliers("UC_test_123")
        # The last video has highest views (550K vs median ~325K)
        assert len(outliers) >= 1
        assert outliers[0]["multiplier"] > 1.5


class TestNLPPass:
    def test_cluster_titles(self, populated_db):
        analyzer = Analyzer(populated_db, cluster_min_k=2, cluster_max_k=5)
        clusters = analyzer.cluster_titles()
        assert len(clusters) >= 2
        for c in clusters:
            assert "label" in c
            assert "keywords" in c
            assert "video_count" in c
            assert c["video_count"] > 0

    def test_extract_keywords(self, populated_db):
        analyzer = Analyzer(populated_db)
        keywords = analyzer.extract_keywords(max_keywords=10)
        assert len(keywords) > 0
        assert len(keywords) <= 10
        for kw in keywords:
            assert "keyword" in kw
            assert "frequency" in kw
            assert "channels_count" in kw

    def test_classify_title_patterns(self, populated_db):
        analyzer = Analyzer(populated_db)
        patterns = analyzer.classify_title_patterns()
        assert "question" in patterns or "declarative" in patterns
        total = sum(patterns.values())
        assert total == 10  # 10 videos


class TestTrendsPass:
    def test_compute_saturation_scores(self, populated_db):
        analyzer = Analyzer(populated_db, cluster_min_k=2, cluster_max_k=5)
        # Must cluster first
        analyzer.cluster_titles()
        scores = analyzer.compute_saturation_scores()
        assert len(scores) > 0
        for s in scores:
            assert 0.0 <= s["saturation_score"] <= 1.0

    def test_detect_convergence(self, populated_db):
        analyzer = Analyzer(populated_db)
        # With only 1 channel, no convergence should be detected
        signals = analyzer.detect_convergence(window_days=30, min_channels=3)
        assert len(signals) == 0


class TestFullAnalysis:
    def test_run_all_writes_to_db(self, populated_db):
        analyzer = Analyzer(populated_db, cluster_min_k=2, cluster_max_k=5)
        result = analyzer.run_all()
        assert "stats" in result
        assert "clusters" in result
        assert "keywords" in result
        # Verify DB has clusters
        clusters = populated_db.get_clusters()
        assert len(clusters) >= 2
        # Verify DB has keywords
        keywords = populated_db.get_keywords()
        assert len(keywords) > 0

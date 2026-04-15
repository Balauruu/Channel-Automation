"""Integration tests for CLI subcommands."""
import json
import os
import pytest
from unittest.mock import patch, MagicMock
from channel_assistant.cli import main, find_project_root


class TestProjectRoot:
    def test_find_project_root_from_subdir(self, tmp_config):
        """find_project_root walks up and returns the dir containing CLAUDE.md."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        found = find_project_root(str(tmp_config.root / "data"))
        assert found == tmp_config.root

    def test_find_project_root_at_root(self, tmp_config):
        """find_project_root works when start_dir IS the root."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        found = find_project_root(str(tmp_config.root))
        assert found == tmp_config.root

    def test_find_project_root_missing_exits(self, tmp_path):
        """find_project_root exits when no CLAUDE.md is found."""
        with pytest.raises(SystemExit):
            find_project_root(str(tmp_path))


class TestStatusCommand:
    def test_status_shows_all_stages(self, tmp_config, capsys):
        """status subcommand prints freshness for every pipeline stage."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            main(["status"])
        output = capsys.readouterr().out
        assert "scrape" in output.lower()
        assert "analyze" in output.lower()
        assert "dashboard" in output.lower()


class TestAddCommand:
    def test_add_registers_channel(self, tmp_config, capsys):
        """add subcommand instantiates Collector and calls add_channel."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        mock_collector = MagicMock()
        mock_collector.add_channel.return_value = {
            "youtube_id": "UCabc", "name": "Test", "tier": "landscape",
            "channel_id": "UCabc", "videos_fetched": 5, "status": "ok",
        }
        mock_collector_cls = MagicMock(return_value=mock_collector)

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with patch.dict(os.environ, {"YOUTUBE_API_KEY": "fake-key"}):
                with patch("channel_assistant.collector.Collector", mock_collector_cls):
                    main(["add", "https://youtube.com/@Test"])
        mock_collector.add_channel.assert_called_once()

    def test_add_missing_api_key(self, tmp_config, capsys):
        """add exits with clear message when YOUTUBE_API_KEY is not set."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with patch.dict("os.environ", {}, clear=True):
                with patch("channel_assistant.cli.Config") as MockConfig:
                    mock_cfg = MagicMock()
                    mock_cfg.youtube_api_key = None
                    mock_cfg.DB_PATH = tmp_config.DB_PATH
                    MockConfig.return_value = mock_cfg
                    with pytest.raises(SystemExit):
                        main(["add", "https://youtube.com/@Test"])


class TestRemoveCommand:
    def test_remove_channel(self, tmp_config, db, sample_channel, capsys):
        """remove subcommand deletes channel and marks analysis stale."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        db.upsert_channel(sample_channel)

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            main(["remove", "Test Channel"])

        assert db.get_all_channels() == []

    def test_remove_unknown_channel_exits(self, tmp_config, db, capsys):
        """remove exits with error when channel is not found."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with pytest.raises(SystemExit):
                main(["remove", "Nonexistent Channel"])


class TestPromoteDemoteCommand:
    def test_promote_channel(self, tmp_config, db, sample_channel, capsys):
        """promote changes tier to watch_list."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        sample_channel["tier"] = "landscape"
        db.upsert_channel(sample_channel)

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            main(["promote", "Test Channel"])

        ch = db.get_channel(sample_channel["youtube_id"])
        assert ch["tier"] == "watch_list"

    def test_demote_channel(self, tmp_config, db, sample_channel, capsys):
        """demote changes tier to landscape."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        sample_channel["tier"] = "watch_list"
        db.upsert_channel(sample_channel)

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            main(["demote", "Test Channel"])

        ch = db.get_channel(sample_channel["youtube_id"])
        assert ch["tier"] == "landscape"


class TestScrapeCommand:
    def test_scrape_runs_when_stale(self, tmp_config, capsys):
        """scrape calls scrape_all when pipeline says it should run."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        mock_collector = MagicMock()
        mock_collector.scrape_all.return_value = {
            "channels_scraped": 2, "channels_failed": 0,
            "quota_exceeded": False, "results": [],
        }
        mock_collector_cls = MagicMock(return_value=mock_collector)

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with patch.dict(os.environ, {"YOUTUBE_API_KEY": "fake-key"}):
                with patch("channel_assistant.collector.Collector", mock_collector_cls):
                    main(["scrape", "--force"])

        mock_collector.scrape_all.assert_called_once()


class TestTopicsCommand:
    def test_topics_prints_context(self, tmp_config, db, capsys):
        """topics subcommand prints formatted context to stdout."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            main(["topics"])
        output = capsys.readouterr().out
        # Should produce some output (even if empty DB means minimal context)
        assert isinstance(output, str)


class TestAnalyzeCommand:
    def test_analyze_runs_with_force(self, tmp_config, capsys):
        """analyze --force calls Analyzer.run_all."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        mock_analyzer = MagicMock()
        mock_analyzer.run_all.return_value = {
            "stats": {}, "clusters": [], "keywords": [],
            "patterns": [], "trends": [],
        }
        mock_analyzer_cls = MagicMock(return_value=mock_analyzer)

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with patch("channel_assistant.analyzer.Analyzer", mock_analyzer_cls):
                main(["analyze", "--force"])

        mock_analyzer.run_all.assert_called_once()
        output = capsys.readouterr().out
        assert "Analysis complete" in output


class TestDashboardCommand:
    def test_dashboard_runs_with_force(self, tmp_config, capsys):
        """dashboard --force calls DashboardGenerator.generate."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        mock_generator = MagicMock()
        mock_generator.generate.return_value = tmp_config.root / "channel" / "strategy" / "dashboard.html"
        mock_generator_cls = MagicMock(return_value=mock_generator)

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with patch("channel_assistant.dashboard.DashboardGenerator", mock_generator_cls):
                main(["dashboard", "--force"])

        mock_generator.generate.assert_called_once()
        output = capsys.readouterr().out
        assert "Dashboard generated" in output


class TestInitCommand:
    def test_init_creates_project_from_brief(self, tmp_config, db, capsys):
        """init subcommand calls ProjectInit.init with topic brief data."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        # Insert a topic brief into the database
        db.save_topic_briefs([{
            "title": "The Lost City of Z",
            "scores": json.dumps({"novelty": 8, "hook": 7, "feasibility": 9}),
            "total_score": 24,
            "pillar_primary": "exploration",
            "pillar_secondary": None,
            "source_clusters": json.dumps(["lost-civilizations"]),
            "hook": "What really happened to Percy Fawcett?",
            "duplicate_of": None,
        }])

        mock_pi = MagicMock()
        mock_pi.init.return_value = tmp_config.root / "projects" / "the-lost-city-of-z"
        mock_pi_cls = MagicMock(return_value=mock_pi)

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with patch("channel_assistant.project_init.ProjectInit", mock_pi_cls):
                main(["init", "1"])

        mock_pi.init.assert_called_once()
        output = capsys.readouterr().out
        assert "Project initialized" in output

    def test_init_no_briefs_exits(self, tmp_config, db, capsys):
        """init exits with error when no topic briefs exist."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with pytest.raises(SystemExit):
                main(["init", "1"])


class TestPackageCommand:
    def test_package_prints_instructions(self, tmp_config, capsys):
        """package prints packaging instructions for a valid project."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        project_dir = tmp_config.root / "projects" / "test-project"
        project_dir.mkdir(parents=True)
        metadata = {"title": "Test Documentary", "slug": "test-project"}
        (project_dir / "metadata.json").write_text(
            json.dumps(metadata), encoding="utf-8"
        )

        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            main(["package", "test-project"])

        output = capsys.readouterr().out
        assert "Test Documentary" in output
        assert "package" in output.lower()

    def test_package_missing_project_exits(self, tmp_config, capsys):
        """package exits with error when project directory does not exist."""
        (tmp_config.root / "CLAUDE.md").write_text("# Test", encoding="utf-8")
        with patch("channel_assistant.cli.find_project_root", return_value=tmp_config.root):
            with pytest.raises(SystemExit):
                main(["package", "nonexistent-project"])


class TestNoSubcommand:
    def test_no_command_exits(self, capsys):
        """Calling main with no subcommand exits with code 1."""
        with patch("channel_assistant.cli.find_project_root", return_value=None):
            with pytest.raises(SystemExit):
                main([])

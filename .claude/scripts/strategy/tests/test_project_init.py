"""Tests for project initialization and packaging."""
import json
import pytest
from pathlib import Path
from channel_assistant.project_init import ProjectInit


@pytest.fixture
def project_init(db, tmp_config):
    (tmp_config.root / "projects").mkdir(exist_ok=True)
    tmp_config.PAST_TOPICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_config.PAST_TOPICS_PATH.write_text("# Past Topics\n\n", encoding="utf-8")
    return ProjectInit(db, tmp_config)


class TestInit:
    def test_creates_project_directory(self, project_init, tmp_config):
        path = project_init.init(
            title="The Duplessis Orphans",
            scores={"obscurity": 5, "complexity": 4, "shock_factor": 5,
                    "verifiability": 4, "pillar_fit": 5},
            pillar_primary="Institutional Corruption",
            runtime_estimate=35,
        )
        assert path.exists()
        assert (path / "research").is_dir()
        assert (path / "script").is_dir()
        assert (path / "visuals").is_dir()
        assert (path / "assets").is_dir()

    def test_creates_metadata_json(self, project_init, tmp_config):
        path = project_init.init(
            title="The Duplessis Orphans",
            scores={"obscurity": 5, "complexity": 4, "shock_factor": 5,
                    "verifiability": 4, "pillar_fit": 5},
            pillar_primary="Institutional Corruption",
            runtime_estimate=35,
        )
        meta = json.loads((path / "metadata.json").read_text(encoding="utf-8"))
        assert meta["title"] == "The Duplessis Orphans"
        assert meta["scores"]["total"] == 23
        assert "youtube" not in meta  # no titles at init

    def test_appends_to_past_topics(self, project_init, tmp_config):
        project_init.init(
            title="Test Topic",
            scores={"obscurity": 3, "complexity": 3, "shock_factor": 3,
                    "verifiability": 3, "pillar_fit": 3},
            pillar_primary="Cults",
            runtime_estimate=25,
        )
        content = tmp_config.PAST_TOPICS_PATH.read_text(encoding="utf-8")
        assert "Test Topic" in content

    def test_slug_is_lowercase_hyphenated(self, project_init):
        path = project_init.init(
            title="The Dark History of Something",
            scores={"obscurity": 3, "complexity": 3, "shock_factor": 3,
                    "verifiability": 3, "pillar_fit": 3},
            pillar_primary="Cults",
            runtime_estimate=25,
        )
        assert " " not in path.name
        assert path.name == path.name.lower() or path.name[0].isdigit()


class TestPackage:
    def test_package_adds_youtube_to_metadata(self, project_init, tmp_config):
        # First init a project
        path = project_init.init(
            title="Test Topic",
            scores={"obscurity": 3, "complexity": 3, "shock_factor": 3,
                    "verifiability": 3, "pillar_fit": 3},
            pillar_primary="Cults",
            runtime_estimate=25,
        )
        # Create a mock script
        (path / "script" / "Script.md").write_text(
            "# Test Topic\n\nA script about cults.\n", encoding="utf-8",
        )
        # Package it
        title_variants = [
            {"title": "Title A", "hook_type": "question", "recommended": False},
            {"title": "Title B", "hook_type": "statement", "recommended": True,
             "recommendation_reason": "Best pattern match"},
        ]
        description = "A deep dive into test topic."
        project_init.package(path, title_variants, description)

        meta = json.loads((path / "metadata.json").read_text(encoding="utf-8"))
        assert "youtube" in meta
        assert len(meta["youtube"]["title_variants"]) == 2
        assert meta["youtube"]["description"] == description

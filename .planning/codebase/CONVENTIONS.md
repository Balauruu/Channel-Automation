# Coding Conventions

**Analysis Date:** 2026-04-22

## Language Mix

This project has two distinct code layers with different conventions:

- **Python** (``.claude/scripts/``): Pipeline automation scripts (researcher, strategy, media). Run via ``python -m <package>`` with conda envs.
- **JavaScript (Node.js CommonJS)** (``.claude/tests/``, ``.claude/scripts/obs-summarize.js``, ``.claude/scripts/memory/evolve.js``, ``.claude/hooks/``): Smoke tests, hook scripts, memory management, and observability tooling. Run via ``node``.
- **Markdown** (``.claude/agents/``, ``.claude/skills/``): Agent definitions and skill specifications with YAML frontmatter.

## Naming Patterns

**Python files:**
- ``snake_case.py`` for all module files: ``fetcher.py``, ``url_builder.py``, ``trend_scanner.py``
- Package directories use ``snake_case``: ``.claude/scripts/editorial/researcher/``, ``.claude/scripts/strategy/channel_assistant/``
- ``__init__.py`` + ``__main__.py`` + ``cli.py`` pattern for runnable packages

**JavaScript files:**
- ``kebab-case.js`` for all files: ``smoke-test-observe.js``, ``obs-summarize.js``, ``check-memory-limit.js``, ``evolve.js``
- Test files: ``smoke-test-<domain>.js`` (structural validation), ``eval-<domain>.js`` (quality evaluation)

**Markdown files:**
- Agent definitions: ``kebab-case.md`` matching agent name: ``researcher.md``, ``observer.md``, ``visual-planner.md``
- Skill specifications: ``SKILL.md`` (uppercase) inside a ``kebab-case`` directory: ``.claude/skills/evolve/SKILL.md``
- Memory files: ``MEMORY.md`` (uppercase) inside agent-name directory: ``.claude/agent-memory/researcher/MEMORY.md``

**Python functions:**
- ``snake_case`` for all functions: ``fetch_with_retry()``, ``classify_domain()``, ``compute_channel_stats()``
- Private/internal functions prefixed with ``_``: ``_fetch_once()``, ``_strip_trailing_sections()``, ``_parse_ddg_result_urls()``
- CLI subcommand handlers: ``cmd_survey()``, ``cmd_deepen()``, ``cmd_analyze()``

**Python variables:**
- ``snake_case`` for all variables and parameters
- Constants as ``UPPER_SNAKE_CASE``: ``MIN_CONTENT_CHARS``, ``TIER_RETRY_MAP``, ``TIER_1_DOMAINS``
- Use ``frozenset`` for immutable domain sets: ``TIER_1_DOMAINS: frozenset[str] = frozenset({...})``

**JavaScript variables:**
- ``camelCase`` for variables and functions: ``testCases``, ``makeTmpProject()``, ``readJsonl()``
- ``UPPER_SNAKE_CASE`` for constants: ``REASON_MAX_CHARS``, ``LIST_MAX``

**Python classes:**
- ``PascalCase``: ``Database``, ``Registry``, ``Channel``, ``Video``, ``ScrapeError``

## Code Style

**Formatting:**
- No project-level linter or formatter config detected (no ``.eslintrc``, ``.prettierrc``, ``biome.json``, ``ruff.toml``, ``pyproject.toml``)
- Python code follows PEP 8 by convention with 4-space indent
- JavaScript code uses 2-space indent
- Line length: Python approximately 100 chars, JavaScript approximately 120 chars

**Linting:**
- No enforced linting. However, Python code uses ``# noqa:`` comments indicating awareness of flake8/ruff:
  - ``# noqa: PLC0415`` — deferred imports (used in ``.claude/scripts/editorial/researcher/fetcher.py`` and ``cli.py``)
  - ``# noqa: BLE001`` — broad exception handling (used in ``writer.py``, ``cli.py``)
- Apply these suppressions when deferring imports or using broad ``except Exception`` for resilience

**Type Hints:**
- Python uses modern type hints throughout (Python 3.10+ syntax):
  - ``str | None`` (not ``Optional[str]``)
  - ``list[str]`` (not ``List[str]``)
  - ``tuple[bool, str, str]`` (not ``Tuple``)
  - ``dict[str, int]`` (not ``Dict``)
  - ``frozenset[str]``
- Return type annotations on all public functions: ``-> None``, ``-> dict``, ``-> list[str]``
- ``from __future__ import annotations`` used selectively (e.g., ``analyzer.py``)

## Import Organization

**Python import order:**
1. Standard library imports (``import json``, ``import sys``, ``from pathlib import Path``)
2. Third-party imports (``import numpy as np``, ``import torch``, ``from tqdm import tqdm``)
3. Local/relative imports (``from researcher.tiers import classify_domain``, ``from .models import Channel``)

**Python import patterns:**
- Deferred imports for heavy/optional dependencies: ``from crawl4ai import AsyncWebCrawler  # noqa: PLC0415`` inside function bodies
- Relative imports within packages: ``from .analyzer import compute_channel_stats``
- ``sys.path.insert(0, ...)`` used in media scripts for local module resolution (fragile; see CONCERNS.md)

**JavaScript imports:**
- CommonJS ``require()`` only (no ESM): ``const fs = require('fs')``
- ``path.resolve(__dirname, '..')`` or ``path.resolve(__dirname, '..', '..')`` for project root resolution (check existing files for the correct level -- hooks use one level, tests use two)

**Path Aliases:**
- None. All imports use relative paths or ``sys.path`` manipulation.

## Error Handling

**Python patterns:**
- Return-dict pattern for operations that can fail (not exceptions):
  ```python
  return {
      "success": False,
      "content": "",
      "error": last_error,
      "fetch_status": "failed",
      "attempts_used": effective_attempts,
  }
  ```
  Used in: ``.claude/scripts/editorial/researcher/fetcher.py``

- ``ValueError`` for input validation with descriptive messages:
  ```python
  raise ValueError(
      f"youtube_id must start with '@' (handle format), got: {youtube_id!r}"
  )
  ```
  Used in: ``.claude/scripts/strategy/channel_assistant/registry.py``

- Custom exception classes for domain-specific errors:
  ```python
  class ScrapeError(Exception):
      """Raised when yt-dlp scraping fails after all retries."""
  ```
  Used in: ``.claude/scripts/strategy/channel_assistant/scraper.py``

- Broad ``except Exception`` with ``# noqa: BLE001`` for resilience in file I/O and parsing:
  ```python
  except Exception:  # noqa: BLE001
      pass
  ```
  Used in: ``.claude/scripts/editorial/researcher/writer.py`` (skipping unparseable JSON files)

- ``try/finally`` pattern for database connections (manual cleanup, no context manager):
  ```python
  conn = self.connect()
  try:
      conn.execute(...)
      conn.commit()
  finally:
      conn.close()
  ```
  Used in: ``.claude/scripts/strategy/channel_assistant/database.py``

**JavaScript patterns:**
- ``try/catch`` with ``process.exit(0)`` -- hooks must never block agent execution:
  ```javascript
  try {
    // check logic
  } catch (err) {
    process.stderr.write('Memory limit check error: ' + err.message + '\n');
  }
  process.exit(0);
  ```
  Used in: ``.claude/hooks/check-memory-limit.js``

- Test cases wrapped in individual try/catch to isolate failures:
  ```javascript
  try {
    const ok = tc.check();
    console.log(ok ? 'PASS' : 'FAIL', tc.name);
  } catch (e) {
    console.log('FAIL', tc.name, e.message);
  }
  ```
  Used in all smoke test files

## Logging

**Python framework:** ``logging`` standard library
- Module-level logger: ``logger = logging.getLogger(__name__)``
- ``logger.info()`` for normal flow, ``logger.warning()`` for degraded paths
- ``print()`` to stdout for CLI user-facing output (progress, tables, summaries)
- ``print(..., file=sys.stderr)`` for diagnostic/progress output that should not mix with data stdout

**JavaScript:** ``console.log()`` for test output, ``process.stderr.write()`` for error diagnostics in hooks

## Comments

**When to comment:**
- Module-level docstrings are mandatory on every Python file -- describe purpose, design decisions, and exported API
- Function docstrings use Google-style with Args/Returns sections
- Inline comments for non-obvious decisions, referencing ticket IDs: ``# SCRP-02: minimum content threshold``
- ``# noqa:`` comments for intentional linting suppressions

**Docstring style (Python):**
```python
def fetch_with_retry(
    url: str,
    max_attempts: int = 3,
    delay_seconds: float = 5.0,
) -> dict:
    """Fetch a URL with retry logic and content validation.

    Tier 3 URLs are skipped immediately (no fetch attempt).
    Unknown domains default to Tier 2 (1 retry).

    Args:
        url: The URL to fetch.
        max_attempts: Maximum attempts (overridden by TIER_RETRY_MAP).
        delay_seconds: Base delay between retries.

    Returns:
        dict with keys: success, content, error, fetch_status, attempts_used.
    """
```

**JavaScript comments:**
- File-header comments describe purpose and usage:
  ```javascript
  // .claude/tests/smoke-test-observe.js
  // Smoke tests for pipeline-observe.js hook
  // Covers: CAPT-01 through CAPT-07
  // Run: node .claude/tests/smoke-test-observe.js
  ```

## Function Design

**Size:** Functions are focused and moderate-length (10-50 lines typical). CLI ``cmd_*`` handlers can reach 60-80 lines.

**Parameters:**
- Named parameters with type hints and defaults in Python
- Trailing comma after last parameter in multi-line signatures
- ``argparse.Namespace`` for CLI argument passing

**Return values:**
- ``dict`` for complex results (fetch results, stats, summaries)
- ``tuple`` for simple multi-value returns: ``-> tuple[bool, str, str]``
- ``list[dict]`` for collection results
- ``None`` return on void operations, with ``-> None`` annotation

## Module Design

**Exports:**
- Python packages use ``__init__.py`` (can be empty) + ``__main__.py`` for CLI entry
- No ``__all__`` definitions detected -- all public names are exported by default
- JavaScript uses ``module.exports = { fn1, fn2 }`` for library scripts (``obs-summarize.js``)

**Barrel files:** Not used. Each module imports directly from its source.

**Package structure pattern:**
```
.claude/scripts/<domain>/<package>/
    __init__.py      # Empty or minimal
    __main__.py      # Entry point: delegates to cli.main()
    cli.py           # argparse + cmd_* handlers
    models.py        # @dataclass definitions
    database.py      # Data persistence layer
    <domain>.py      # Core business logic modules
```

## Agent/Skill Markdown Conventions

**Agent definition format** (`.claude/agents/<name>.md`):
- YAML frontmatter with required fields: ``name``, ``description``, ``model: sonnet``, ``memory: project``, ``skills`` (list), ``tools`` (list)
- Body starts with ``# Title`` then ``## Identity`` section
- References channel context with ``@channel/channel.md``
- Includes ``<project_context>`` block
- Agents do NOT write to memory files -- observer handles all memory writes

**Skill definition format** (`.claude/skills/<name>/SKILL.md`):
- YAML frontmatter with: ``name``, ``description``, ``user-invocable: true|false``
- Pipeline skills add ``disable-model-invocation: true``
- Body has ``## Phase 0: Context Loading`` as first operational section (expertise skills) or Instructions section (dispatcher skills)
- Task classification tags: ``[HEURISTIC]`` and ``[DETERMINISTIC]``
- Companion ``insights.md`` file with ``Append new insights below this line`` marker

**Memory file conventions** (`.claude/agent-memory/<agent>/MEMORY.md`):
- Permanent entries: ``- [HIGH/MED/LOW] description`` (confidence tagged by observer)
- Pending Review section: ``## Pending Review`` -- entries awaiting /evolve promotion
- Agents read MEMORY.md as reference only; observer writes all entries
- 200-line limit enforced by ``check-memory-limit.js`` SubagentStop hook

**Git workflow convention** (from `.claude/rules/git-workflow.md`):
- Use targeted ``git add <path>`` instead of ``git add -A`` in ``.claude/`` trees
- Reason: ``MEMORY.md`` and ``insights.md`` accumulate uncommitted appends from normal agent runs

## Data Serialization

**JSON conventions:**
- ``json.dumps(..., ensure_ascii=False, indent=2)`` for human-readable files
- ``encoding="utf-8"`` on all file reads/writes via ``Path.read_text()`` / ``Path.write_text()``
- JSONL format for observability logs (one JSON object per line, ``.jsonl`` extension)

**Timestamps:**
- UTC everywhere: ``datetime.now(timezone.utc)``
- ISO 8601 format: ``"%Y-%m-%dT%H:%M:%SZ"``
- Filenames and JSONL timestamps use dash-separated time (Windows-safe): ``2026-04-17T10-00-00-000Z`` (no colons -- colons are illegal in Windows filenames)

**Confidence tags (memory entries):**
- ``[HIGH]`` -- Observer-assessed high-confidence learning (no decay)
- ``[MED]`` -- Medium-confidence (30-day decay)
- ``[LOW]`` -- Low-confidence (14-day decay)
- Untagged entries are legacy (pre-observer system)

**Secret scrubbing:**
- Observability hooks apply regex-based secret scrubbing before logging:
  ```javascript
  // Matches common secret key names before writing to obs.jsonl
  // pipeline-observe.js
  ```
  Used in: ``.claude/hooks/pipeline-observe.js``

---

*Convention analysis: 2026-04-22*

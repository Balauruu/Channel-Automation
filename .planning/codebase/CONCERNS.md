# Codebase Concerns

**Analysis Date:** 2026-04-22

## Tech Debt

**V5 path references (`.pi/multi-team/`) remain in production Python scripts:**
- Issue: Multiple Python scripts still contain hardcoded references to the V5 directory structure (`.pi/multi-team/`). These paths do not exist in V0.6.
- Files:
  - `.claude/scripts/editorial/writer/cli.py` (lines 8, 32, 63, 88) -- docstring, fallback path, scratch dir, prompt path
  - `.claude/scripts/editorial/researcher/url_builder.py` (line 66 in docstring)
  - `.claude/scripts/strategy/channel_assistant/cli.py` (lines 370, 481) -- print statements showing V5 paths to user
  - `.claude/scripts/media/discover.py` (line 1) -- module docstring
  - `.claude/scripts/media/promote.py` (line 1) -- module docstring
  - `.claude/scripts/media/ingest.py` (line 1) -- module docstring
- Impact: The writer CLI fallback creates directories under `.pi/multi-team/scratch/writer/` instead of `.claude/scratch/writer/`. The strategy CLI prints V5 paths in user-facing output.
- Fix approach: Search-and-replace all `.pi/multi-team/` references. Update fallback paths to `.claude/scratch/<agent>/`. Update docstrings and print statements.

**`AGENTS.md` project root marker used by scripts but the file does not exist:**
- Issue: Two CLI scripts use `AGENTS.md` existence to detect the project root directory, but this file does not exist in V0.6.
- Files:
  - `.claude/scripts/editorial/writer/cli.py` (lines 15-24) -- walks up looking for `AGENTS.md`, always falls through to `cwd`
  - `.claude/scripts/strategy/channel_assistant/cli.py` (lines 37-42) -- same broken walk
- Impact: Writer and strategy CLIs always fall back to `Path.cwd()` which may or may not be the project root. This causes unreliable project directory resolution when scripts are invoked from subdirectories.
- Fix approach: Change the marker file from `AGENTS.md` to `CLAUDE.md` in both files.

**14 skills missing `insights.md` files:**
- Issue: The `agent-protocols` skill defines a reflection/insights lifecycle, and several skills have properly initialized `insights.md` files. However, approximately 14 skills (dispatcher and infrastructure skills) have no `insights.md`.
- Files: `.claude/skills/agent-observability/`, `.claude/skills/agent-protocols/`, `.claude/skills/assets-download/`, `.claude/skills/assets-embed/`, `.claude/skills/assets-score/`, `.claude/skills/assets-search/`, `.claude/skills/compile/`, `.claude/skills/process-assets/`, `.claude/skills/strategy/`, `.claude/skills/strategy-analyze/`, `.claude/skills/strategy-scrape/`, `.claude/skills/strategy-topics/`, `.claude/skills/visual-plan/`, `.claude/skills/write-script/`
- Impact: Dispatcher skills that accumulate learnings have no place to record them. The pipeline-design audit workflow expects `insights.md` in every skill directory.
- Fix approach: Add `insights.md` with the lifecycle template marker to all missing skill directories.

**Hardcoded local paths in `embed.py`:**
- Issue: The embedding script has hardcoded Windows-specific paths to a local conda environment and a local git repository.
- Files: `.claude/scripts/media/embed.py` (lines 19, 25)
  - `PE_PYTHON = "C:/Users/iorda/miniconda3/envs/perception-models/python.exe"`
  - `_sys.path.insert(0, "C:/Users/iorda/repos/perception_models")`
- Impact: The script only works on the current developer's machine. Any environment change (new machine, CI) breaks the embedding pipeline.
- Fix approach: Use environment variables (`PERCEPTION_MODELS_PATH`) with fallback to the current hardcoded defaults. Document as required env vars.

## Known Bugs

**Smoke test suites reference deleted/renamed entities:**
- Symptoms: Legacy smoke test files may fail because they reference entities that no longer exist (pre-Phase 6 cleanup).
- Files:
  - `.claude/tests/smoke-test-observe.js` -- New test for pipeline-observe.js (CAPT coverage); needs verification after Phase 6 cleanup
  - `.claude/tests/smoke-test-evolve.js` -- New test for /evolve workflow; needs verification
- Note: The old `smoke-test-observability.js`, `smoke-test-feedback.js`, `smoke-test-agents.js`, `smoke-test-pipeline.js`, `smoke-test-paths.js`, and `smoke-test-skills.js` have been replaced by the new test files. If any of those old files persist, remove them.
- Risk: Test coverage gaps after the major Phase 6 refactor. Run the new smoke tests to verify.

**Writer CLI references non-existent file paths:**
- Symptoms: The writer `cmd_load` function references `channel/voice/WRITTING_STYLE_PROFILE.md` (typo: "WRITTING" for "WRITING") and `.pi/multi-team/prompts/writer/generation.md`. Neither path exists in V0.6.
- Files: `.claude/scripts/editorial/writer/cli.py` (lines 85-88)
- Trigger: Run `python -m writer load "any-topic"` -- exits with "required file not found" for the style profile.
- Workaround: The writer agent does not currently use this CLI script; it reads files directly.

## Security Considerations

**Secret scrubbing in pipeline-observe.js has limited pattern coverage:**
- Risk: The observation hook scrubs secrets using a regex pattern matching common key names (`api_key`, `token`, `secret`, `password`, `authorization`, `credentials`, `auth`). Secrets with non-standard names (e.g., `YOUTUBE_COOKIES`, custom header values, connection strings) would pass through unredacted into `.claude/logs/observations/`.
- Files: `.claude/hooks/pipeline-observe.js` (secret scrubbing section)
- Current mitigation: The logs directory is gitignored. Secret scrubbing covers the most common patterns. Tool inputs/outputs are truncated.
- Recommendations: Add common service-specific patterns (e.g., `cookie`, `session`, `connection_string`). Consider a blocklist of env var names known to contain secrets.

**`__pycache__` directories not gitignored (partially resolved):**
- Risk: Python bytecode cache directories were previously showing as untracked in git status. `__pycache__/` and `*.pyc` were added to `.gitignore` in commit `8e9e7ec`.
- Status: Resolved for new files. Existing `__pycache__` directories under `.claude/scripts/strategy/` may still be present on disk but are now gitignored.

## Performance Bottlenecks

**Observation hook scans full obs.jsonl on SubagentStop (if applicable):**
- Problem: Depending on the pipeline-observe.js implementation, SubagentStop handling may need to scan obs.jsonl to aggregate per-agent stats. As the file grows (up to 10MB before rotation), this O(n) scan could be slow.
- Files: `.claude/hooks/pipeline-observe.js`
- Improvement path: Maintain sidecar JSON per agent_id with running counts (incremented during tool events), read at SubagentStop instead of scanning the full log.

**Embedding pipeline loads full model per invocation:**
- Problem: `embed.py` loads the PE-Core-L14-336 model fresh on every CLI invocation. Model loading takes 5-15 seconds.
- Files: `.claude/scripts/media/embed.py`
- Improvement path: For batch operations, the script already accepts multiple videos. Low priority since batch mode is the typical usage.

## Fragile Areas

**Dispatcher skills (12 total) are tightly coupled to agent interfaces:**
- Files: `.claude/skills/strategy/SKILL.md`, `.claude/skills/process-assets/SKILL.md`, `.claude/skills/visual-plan/SKILL.md`, `.claude/skills/write-script/SKILL.md`, `.claude/skills/compile/SKILL.md`, `.claude/skills/assets-download/SKILL.md`, `.claude/skills/assets-embed/SKILL.md`, `.claude/skills/assets-search/SKILL.md`, `.claude/skills/assets-score/SKILL.md`, `.claude/skills/strategy-scrape/SKILL.md`, `.claude/skills/strategy-analyze/SKILL.md`, `.claude/skills/strategy-topics/SKILL.md`
- Why fragile: Each dispatcher skill contains a hardcoded prompt string dispatched to a specific agent. Any change to the agent's expected input format, output paths, or directory conventions requires updating the corresponding dispatcher skill.
- Safe modification: When changing an agent's interface, grep all dispatcher skills for `@agent-name` and update the prompt text.

**Agent memory files approach the 200-line auto-injection limit:**
- Files: `.claude/agent-memory/researcher/MEMORY.md`, `.claude/agent-memory/asset-processor/MEMORY.md`
- Why fragile: Only the first 200 lines of MEMORY.md are auto-injected. The `check-memory-limit.js` hook warns at 200+ lines. Observer consolidation (via /evolve) should periodically compact entries.
- Safe modification: Run `/evolve` regularly to promote high-confidence entries and clean pending sections.

**Cross-file import using `sys.path.insert(0, ...)` in media scripts:**
- Files: `.claude/scripts/media/embed.py`, `.claude/scripts/media/search.py`, `.claude/scripts/media/evaluate.py`
- Why fragile: Uses `sys.path.insert(0, os.path.dirname(__file__))` to import sibling modules. Running from a different working directory or through a symlink can break imports.
- Safe modification: Use proper Python package structure with `__init__.py` and relative imports, or use `PYTHONPATH` consistently.

## Scaling Limits

**Single JSONL observation log per project:**
- Current capacity: One rolling file per project slug, rotated at 10MB.
- Limit: High-throughput agent sessions could generate 5-10MB of observation data per run. With multiple runs per day, the 30-day archive purge could accumulate hundreds of MB.
- Scaling path: The 10MB rotation and 30-day purge are adequate for the current single-user pipeline. If parallel agent execution is introduced, file locking (or per-agent-id files) would be needed.

**SQLite databases with no backup or migration strategy:**
- Current capacity: `data/channel_assistant.db` and `data/asset_catalog.db` store all channel/video metadata and asset catalog data.
- Limit: SQLite is single-writer. No schema migration tooling exists.
- Scaling path: Add a migration script or version table. WAL mode already enabled in `database.py`.

## Dependencies at Risk

**crawl4ai dependency is fragile on Windows:**
- Risk: The `crawl4ai` package requires Playwright browsers to be installed. On Windows, browser installation can fail silently.
- Impact: The entire researcher pipeline's web scraping capability depends on crawl4ai. If it breaks, the researcher falls back to WebFetch.
- Migration plan: The researcher agent already has a fallback path. No migration needed, but maintaining crawl4ai installation is a recurring maintenance burden.

**yt-dlp for YouTube downloads is subject to frequent breakage:**
- Risk: YouTube regularly changes its API, breaking `yt-dlp`. The download script includes bot-detection patterns but relies on `yt-dlp` being updated promptly.
- Impact: YouTube asset downloads fail entirely when `yt-dlp` is outdated. Internet Archive downloads (separate code path) are unaffected.
- Migration plan: Keep `yt-dlp` updated frequently.

## Missing Critical Features

**No automated test runner or CI:**
- Problem: Smoke test files exist but there is no `package.json` with test scripts, no CI configuration, and no way to run all tests with a single command.
- Blocks: No regression detection. Pipeline changes can break tests without anyone noticing.

**Observer has never been run in production:**
- Problem: The `@observer` agent and `/evolve` skill are implemented but the obs.jsonl -> observer -> pending review -> promote cycle has not been exercised end-to-end in production.
- Blocks: The cross-agent learning loop is untested at scale. Edge cases in scope classification and PLAYBOOK.md routing may surface during first real runs.

## Test Coverage Gaps

**New smoke tests need verification after Phase 6 cleanup:**
- What's not tested: `smoke-test-observe.js` and `smoke-test-evolve.js` cover the new unified memory system. These tests were written during Phases 1-5 but haven't been run against the final clean state after Phase 6 file deletions.
- Risk: Any path or filename assumptions in the tests may need updating after the cleanup.
- Priority: High -- run after Phase 6 completes.

**No tests for Python scripts:**
- What's not tested: The Python scripts in `.claude/scripts/` (editorial, media, strategy) have minimal test coverage. The `strategy/tests/` directory exists but source test files may not be on disk.
- Risk: Any refactoring of the Python scripts has no safety net.
- Priority: Medium -- the scripts work in practice (tested by real agent runs).

**No integration tests for agent -> script -> output pipeline:**
- What's not tested: The end-to-end flow from agent dispatch through Python script execution to output file creation.
- Risk: Path changes, argument format changes, or output schema changes can break the pipeline at integration points without detection.
- Priority: Low -- the pipeline is human-in-the-loop, so integration failures are caught during interactive use.

---

*Concerns audit: 2026-04-22*

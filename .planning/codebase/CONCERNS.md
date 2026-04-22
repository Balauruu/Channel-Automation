# Codebase Concerns

**Analysis Date:** 2026-04-20

## Tech Debt

**Observability skill documents a dead hook (`obs.js`) while production uses `pipeline-observe.sh`:**
- Issue: The `agent-observability` skill (`.claude/skills/agent-observability/SKILL.md`) documents a Node.js hook at `.claude/hooks/obs.js` with 6 event registrations. The actual deployed hook is `.claude/hooks/pipeline-observe.sh` (a Bash+Python rewrite). The old `obs.js` was deleted (visible in git status: `D .claude/hooks/obs.js`). The skill's schema, registration examples, log path (`.claude/logs/runs/`), and debugging instructions all reference the dead implementation.
- Files: `.claude/skills/agent-observability/SKILL.md`, `.claude/hooks/pipeline-observe.sh`
- Impact: Any agent or user invoking the `agent-observability` skill for post-mortem debugging will be directed to `.claude/logs/runs/` (does not exist) instead of `.claude/logs/observations/<project>/obs.jsonl` (actual log location). The skill's schema examples may not match `pipeline-observe.sh` output fields.
- Fix approach: Rewrite `agent-observability/SKILL.md` to document `pipeline-observe.sh`: update log path to `.claude/logs/observations/<project>/obs.jsonl`, update schema to match the actual output fields, remove all `obs.js` references, update the settings.json registration example.

**`obs-summarize.js` reads from non-existent `.claude/logs/runs/` directory:**
- Issue: The summarization script resolves run files from `.claude/logs/runs/` (line 39), but `pipeline-observe.sh` writes to `.claude/logs/observations/<project>/obs.jsonl`. The script will always fail with "no runs dir".
- Files: `.claude/scripts/obs-summarize.js` (line 39)
- Impact: The observability summarization workflow is entirely broken. No post-mortem summaries can be generated.
- Fix approach: Rewrite `obs-summarize.js` to read from `.claude/logs/observations/<project>/obs.jsonl` instead. Accept a `--project` flag or auto-detect from the most recently modified obs.jsonl.

**V5 path references (`.pi/multi-team/`) remain in production Python scripts:**
- Issue: Multiple Python scripts still contain hardcoded references to the V5 directory structure (`.pi/multi-team/`). These paths do not exist in V0.6.
- Files:
  - `.claude/scripts/editorial/writer/cli.py` (lines 8, 32, 63, 88) -- docstring, fallback path, scratch dir, prompt path
  - `.claude/scripts/editorial/researcher/url_builder.py` (line 66 in docstring)
  - `.claude/scripts/strategy/channel_assistant/cli.py` (lines 370, 481) -- print statements showing V5 paths to user
  - `.claude/scripts/media/discover.py` (line 1) -- module docstring
  - `.claude/scripts/media/promote.py` (line 1) -- module docstring
  - `.claude/scripts/media/ingest.py` (line 1) -- module docstring
- Impact: The writer CLI fallback creates directories under `.pi/multi-team/scratch/writer/` instead of `.claude/scratch/writer/`. The strategy CLI prints V5 paths in user-facing output. The researcher URL builder docstring references a wrong fallback path (though the code itself uses `.claude/scratch/researcher`, correctly fixed).
- Fix approach: Search-and-replace all `.pi/multi-team/` references. Update fallback paths to `.claude/scratch/<agent>/`. Update docstrings and print statements.

**`AGENTS.md` project root marker used by 3 scripts but the file does not exist:**
- Issue: Three CLI scripts use `AGENTS.md` existence to detect the project root directory, but this file does not exist in V0.6. The `url_builder.py` for the researcher was partially fixed (code uses `CLAUDE.md`, but the docstring still says `AGENTS.md`). The writer and strategy CLIs are not fixed.
- Files:
  - `.claude/scripts/editorial/writer/cli.py` (lines 15-24) -- walks up looking for `AGENTS.md`, always falls through to `cwd`
  - `.claude/scripts/strategy/channel_assistant/cli.py` (lines 37-42) -- same broken walk
  - `.claude/scripts/editorial/researcher/url_builder.py` (line 4 docstring -- says AGENTS.md, code says CLAUDE.md)
- Impact: Writer and strategy CLIs always fall back to `Path.cwd()` which may or may not be the project root. This causes unreliable project directory resolution when scripts are invoked from subdirectories.
- Fix approach: Change the marker file from `AGENTS.md` to `CLAUDE.md` in all three files. Update docstrings to match.

**14 skills missing `insights.md` files:**
- Issue: The `agent-protocols` skill mandates a reflection/insights lifecycle, and 8 skills have properly initialized `insights.md` files. However, 14 skills (mostly dispatcher and infrastructure skills) have no `insights.md`.
- Files: `.claude/skills/agent-observability/`, `.claude/skills/agent-protocols/`, `.claude/skills/assets-download/`, `.claude/skills/assets-embed/`, `.claude/skills/assets-score/`, `.claude/skills/assets-search/`, `.claude/skills/compile/`, `.claude/skills/process-assets/`, `.claude/skills/strategy/`, `.claude/skills/strategy-analyze/`, `.claude/skills/strategy-scrape/`, `.claude/skills/strategy-topics/`, `.claude/skills/visual-plan/`, `.claude/skills/write-script/`
- Impact: The `smoke-test-skills.js` test suite only validates 8 skills (the content skills). Dispatcher skills that accumulate learnings have no place to record them. The pipeline-design audit workflow expects `insights.md` in every skill directory.
- Fix approach: Add `insights.md` with the lifecycle template marker to all 14 missing skill directories. This is a 5-minute batch operation.

**`check-definition-signals.js` hook referenced but deleted:**
- Issue: The `agent-observability` skill documentation (line 232) mentions `check-definition-signals.js` as a co-registered SubagentStop hook. This file was deleted (visible in git status: `D .claude/hooks/check-definition-signals.js`), but the documentation still references it.
- Files: `.claude/skills/agent-observability/SKILL.md` (line 232)
- Impact: Documentation inaccuracy. No runtime impact since the hook is no longer registered in `settings.json`.
- Fix approach: Remove the reference from the observability skill documentation.

**Hardcoded local paths in `embed.py`:**
- Issue: The embedding script has hardcoded Windows-specific paths to a local conda environment and a local git repository.
- Files: `.claude/scripts/media/embed.py` (lines 19, 25)
  - `PE_PYTHON = "C:/Users/iorda/miniconda3/envs/perception-models/python.exe"`
  - `_sys.path.insert(0, "C:/Users/iorda/repos/perception_models")`
- Impact: The script only works on the current developer's machine. Any environment change (new machine, CI) breaks the embedding pipeline.
- Fix approach: Use environment variables (`PERCEPTION_MODELS_PATH`, or resolve from `CLAUDE.md` global instructions) with fallback to the current hardcoded defaults. Alternatively, document these as required env vars.

## Known Bugs

**Smoke test suites reference deleted/renamed skills and agents:**
- Symptoms: Multiple smoke test files will fail because they reference entities that no longer exist.
- Files:
  - `.claude/tests/smoke-test-skills.js` (line 12) -- lists `documentary-research` in the skills array, but this skill was deleted in commit `ab5315f`
  - `.claude/tests/smoke-test-agents.js` (line 14) -- lists `meta` in the agents array, but no `.claude/agents/meta.md` exists
  - `.claude/tests/smoke-test-pipeline.js` (line 14) -- lists `research` in the pipeline skills array, but no `.claude/skills/research/` directory exists
  - `.claude/tests/smoke-test-pipeline.js` (lines 176-182) -- checks for `audit-agents` skill and `audit-agents.js` script, neither of which exist
  - `.claude/tests/smoke-test-observability.js` (line 10) -- resolves path to `.claude/hooks/obs.js` which was deleted
- Trigger: Run any of the smoke tests: `node .claude/tests/smoke-test-skills.js` etc.
- Workaround: None. Tests crash with ENOENT or report false FAILs.

**Writer CLI references non-existent file paths:**
- Symptoms: The writer `cmd_load` function references `channel/voice/WRITTING_STYLE_PROFILE.md` (note: "WRITTING" is a typo for "WRITING") and `.pi/multi-team/prompts/writer/generation.md`. Neither path exists in V0.6.
- Files: `.claude/scripts/editorial/writer/cli.py` (lines 85-88)
- Trigger: Run `python -m writer load "any-topic"` -- exits with "required file not found" for the style profile.
- Workaround: The writer agent does not currently use this CLI script; it reads files directly.

## Security Considerations

**Secret scrubbing in pipeline-observe.sh has limited pattern coverage:**
- Risk: The observation hook scrubs secrets using a regex pattern matching common key names (`api_key`, `token`, `secret`, `password`, `authorization`, `credentials`, `auth`). Secrets with non-standard names (e.g., `YOUTUBE_COOKIES`, custom header values, connection strings) would pass through unredacted into `.claude/logs/observations/`.
- Files: `.claude/hooks/pipeline-observe.sh` (lines 128-136, 177-185)
- Current mitigation: The logs directory is gitignored (`logs/` in `.gitignore`). Secret scrubbing covers the most common patterns. Tool inputs/outputs are truncated to 5KB.
- Recommendations: Add common service-specific patterns (e.g., `cookie`, `session`, `connection_string`, `dsn`). Consider a blocklist of env var names known to contain secrets. The truncation limit already provides some defense-in-depth.

**`__pycache__` directories not gitignored:**
- Risk: Python bytecode cache directories are showing as untracked in git status. If accidentally committed, they expose interpreter version information and compiled bytecode.
- Files: `.claude/scripts/editorial/researcher/__pycache__/`, `.claude/scripts/strategy/channel_assistant/__pycache__/`, `.claude/scripts/strategy/tests/__pycache__/`
- Current mitigation: They are untracked (not staged), and the `.gitignore` does not exclude `__pycache__/`.
- Recommendations: Add `__pycache__/` and `*.pyc` to `.gitignore`.

**Nested `.claude/` and `.pytest_cache/` directories inside strategy scripts:**
- Risk: A `.claude/logs/sessions.jsonl` file exists inside `.claude/scripts/strategy/.claude/logs/`. This nested `.claude/` directory is an artifact from running Claude Code inside the scripts subdirectory. It may contain session data.
- Files: `.claude/scripts/strategy/.claude/logs/sessions.jsonl`, `.claude/scripts/strategy/.pytest_cache/`
- Current mitigation: These directories are gitignored by virtue of being under untracked paths.
- Recommendations: Delete these directories. Add `**/.pytest_cache/` to `.gitignore`.

## Performance Bottlenecks

**Observation hook scans full obs.jsonl on every SubagentStop:**
- Problem: At `subagent_stop`, `pipeline-observe.sh` reads the entire `obs.jsonl` file line-by-line in Python to aggregate tool counts and derive `agent_type` for the completing agent (lines 258-279). As the file grows (up to 10MB before rotation), this O(n) scan runs on every agent completion.
- Files: `.claude/hooks/pipeline-observe.sh` (lines 258-279)
- Cause: The hook needs per-agent aggregates (tool_calls, tool_fails, permission_denials) but has no index. It scans every line to filter by `agent_id`.
- Improvement path: Maintain a small side-car JSON file per agent_id with running counts (incremented during `tool_post`/`tool_fail` events), then read the sidecar at `subagent_stop` instead of scanning the full log. Alternatively, since rotation happens at 10MB, the current approach may be acceptable -- profile before optimizing.

**Embedding pipeline loads full model per invocation:**
- Problem: `embed.py` loads the PE-Core-L14-336 model fresh on every CLI invocation. Model loading takes 5-15 seconds depending on GPU memory state.
- Files: `.claude/scripts/media/embed.py` (lines 22-35)
- Cause: CLI script design -- no persistent process or model server.
- Improvement path: For batch operations, the script already accepts multiple videos. For interactive use, a simple model server or a warm cache approach would eliminate repeated loading. Low priority since batch mode is the typical usage.

## Fragile Areas

**Dispatcher skills (13 total) are tightly coupled to agent interfaces:**
- Files: `.claude/skills/strategy/SKILL.md`, `.claude/skills/process-assets/SKILL.md`, `.claude/skills/visual-plan/SKILL.md`, `.claude/skills/write-script/SKILL.md`, `.claude/skills/compile/SKILL.md`, `.claude/skills/assets-download/SKILL.md`, `.claude/skills/assets-embed/SKILL.md`, `.claude/skills/assets-search/SKILL.md`, `.claude/skills/assets-score/SKILL.md`, `.claude/skills/strategy-scrape/SKILL.md`, `.claude/skills/strategy-analyze/SKILL.md`, `.claude/skills/strategy-topics/SKILL.md`
- Why fragile: Each dispatcher skill contains a hardcoded prompt string dispatched to a specific agent. Any change to the agent's expected input format, output paths, or directory conventions requires updating the corresponding dispatcher skill. There is no validation that the dispatched prompt matches what the agent expects.
- Safe modification: When changing an agent's interface (expected paths, input format), grep all dispatcher skills for `@agent-name` and update the prompt text. The `smoke-test-pipeline.js` provides some coverage (verifies dispatch references exist) but does not validate prompt content.
- Test coverage: `smoke-test-pipeline.js` checks that each dispatcher references the correct `@agent`, but the `research` skill reference is already stale (skill was deleted/renamed).

**Agent memory files approach the 200-line auto-injection limit:**
- Files: `.claude/agent-memory/researcher/MEMORY.md` (48 lines), `.claude/agent-memory/asset-processor/MEMORY.md` (40 lines)
- Why fragile: The `agent-protocols` skill specifies that only the first 200 lines of MEMORY.md are auto-injected. The `check-memory-limit.js` hook warns at 200+ lines. The researcher agent (most active) is at 48 lines after ~10 days of operation. At this growth rate (~5 lines/day), it will hit the limit in approximately 30 days.
- Safe modification: The `check-memory-limit.js` hook provides a warning. The agent-protocols skill instructs agents to "flag in task completion summary" when approaching the limit.
- Test coverage: The hook only fires at SubagentStop; there is no proactive cleanup mechanism.

**Cross-file import using `sys.path.insert(0, ...)` in media scripts:**
- Files: `.claude/scripts/media/embed.py` (line 15), `.claude/scripts/media/search.py` (line 25), `.claude/scripts/media/evaluate.py` (assumed similar pattern)
- Why fragile: Media scripts use `sys.path.insert(0, os.path.dirname(__file__))` to import sibling modules (`pool`, `ingest`). This works only when the script's `__file__` resolves correctly. Running from a different working directory or through a symlink can break imports.
- Safe modification: Use proper Python package structure with `__init__.py` and relative imports, or use `PYTHONPATH` consistently as the editorial scripts do.
- Test coverage: No tests for media scripts. Any import failure is caught only at runtime.

## Scaling Limits

**Single JSONL observation log per project:**
- Current capacity: One rolling file per project slug, rotated at 10MB.
- Limit: High-throughput agent sessions (e.g., asset-processor processing 50+ assets) could generate 5-10MB of observation data per run. With multiple runs per day, the 30-day archive purge could accumulate hundreds of MB.
- Scaling path: The 10MB rotation and 30-day purge are adequate for the current single-user pipeline. If parallel agent execution is introduced, file locking (or per-agent-id files) would be needed to prevent write interleaving.

**SQLite databases with no backup or migration strategy:**
- Current capacity: `data/channel_assistant.db` and `data/asset_catalog.db` store all channel/video metadata and asset catalog data.
- Limit: SQLite is single-writer. Concurrent agent writes (if parallel execution is introduced) will cause `SQLITE_BUSY` errors. No schema migration tooling exists.
- Scaling path: Add a migration script or version table. For parallel writes, switch to WAL mode (already done in `database.py`) and add retry logic. For true concurrency, consider PostgreSQL.

## Dependencies at Risk

**crawl4ai dependency is fragile on Windows:**
- Risk: The `crawl4ai` package (used by `fetcher.py` for web scraping) requires Playwright browsers to be installed. On Windows, browser installation can fail silently, and the async event loop handling differs from Linux.
- Impact: The entire researcher pipeline's web scraping capability depends on crawl4ai. If it breaks, the researcher falls back to WebFetch (per script-failure policy), which produces lower-quality extractions.
- Migration plan: The researcher agent already has a fallback path (WebFetch for process-blocked cases). The `pipeline-design` skill's script-failure policy correctly distinguishes environment-broken (stop) from process-blocked (fallback). No migration needed, but maintaining crawl4ai installation is a recurring maintenance burden.

**yt-dlp for YouTube downloads is subject to frequent breakage:**
- Risk: YouTube regularly changes its API, breaking `yt-dlp`. The download script includes bot-detection patterns (line 24-30) but relies on `yt-dlp` being updated promptly.
- Impact: YouTube asset downloads fail entirely when `yt-dlp` is outdated. Internet Archive downloads (separate code path) are unaffected.
- Migration plan: Keep `yt-dlp` updated frequently. The `--cookies-from-browser` flag (lines 587-589) provides some resilience against bot detection. Consider a version-pinning strategy.

## Missing Critical Features

**No feedback signal infrastructure exists at runtime:**
- Problem: The `agent-protocols` skill defines a full cross-agent feedback system using `.claude/feedback/signals.yaml`. Every agent is instructed to read this file at task start and write cross-domain insights at task end. However, the `.claude/feedback/` directory is gitignored and does not exist on disk.
- Blocks: Cross-agent learning loop is entirely non-functional. Agents skip signal processing silently ("If the file or directory does not exist, skip signal processing").
- Fix: Create `.claude/feedback/signals.yaml` with an empty `signals: []` array. The gitignore entry prevents it from being committed, which is correct (runtime state), but means each fresh checkout starts with no feedback history.

**No automated test runner or CI:**
- Problem: Six smoke test files exist but there is no `package.json` with test scripts, no CI configuration, and no way to run all tests with a single command. The tests reference entities that no longer exist, so they would fail even if run.
- Blocks: No regression detection. Pipeline changes can break tests without anyone noticing.

**Orchestration playbook is empty:**
- Problem: `.claude/orchestration/PLAYBOOK.md` was created as a cross-agent coordination inbox but has zero entries in both `## Open` and `## Resolved` sections.
- Blocks: The pipeline observer -> harvester -> target agent feedback loop described in the playbook has never been activated. No cross-agent patterns have been surfaced through this channel.

## Test Coverage Gaps

**Smoke tests are stale and will fail:**
- What's not tested: The test suites have not been updated after recent pipeline changes (researcher debloat, obs.js -> pipeline-observe.sh migration, documentary-research skill deletion, meta agent removal/rename).
- Files:
  - `.claude/tests/smoke-test-skills.js` -- references deleted `documentary-research` skill
  - `.claude/tests/smoke-test-agents.js` -- references non-existent `meta` agent
  - `.claude/tests/smoke-test-pipeline.js` -- references non-existent `research` skill, `audit-agents` skill, `audit-agents.js` script
  - `.claude/tests/smoke-test-observability.js` -- references deleted `obs.js` hook
- Risk: All four smoke test suites will crash or report failures. There is no way to verify pipeline integrity after changes.
- Priority: High -- these should be the first thing fixed in any cleanup effort.

**No tests for Python scripts:**
- What's not tested: The 13 Python scripts in `.claude/scripts/` (editorial, media, strategy) have zero test coverage. The `strategy/tests/` directory exists but contains only `__pycache__/` (empty test directory).
- Files: `.claude/scripts/editorial/researcher/cli.py` (518 lines), `.claude/scripts/strategy/channel_assistant/cli.py` (547 lines), `.claude/scripts/media/download.py` (604 lines), `.claude/scripts/media/search.py` (314 lines)
- Risk: Any refactoring of the Python scripts (e.g., fixing V5 path references, changing project root detection) has no safety net. The largest scripts (500+ lines) are the most likely to have subtle bugs.
- Priority: Medium -- the scripts work in practice (tested by real agent runs), but manual testing is the only validation.

**No integration tests for agent -> script -> output pipeline:**
- What's not tested: The end-to-end flow from agent dispatch through Python script execution to output file creation. Each layer is tested in isolation (agent smoke tests check frontmatter; script functionality is verified manually) but the handoff points are untested.
- Files: All agent files in `.claude/agents/`, all scripts in `.claude/scripts/`
- Risk: Path changes, argument format changes, or output schema changes can break the pipeline at integration points without detection.
- Priority: Low -- the pipeline is human-in-the-loop, so integration failures are caught during interactive use. Becomes high priority if autonomous/batch execution is introduced.

---

*Concerns audit: 2026-04-20*

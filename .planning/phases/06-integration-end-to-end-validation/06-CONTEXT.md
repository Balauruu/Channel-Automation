# Phase 6: Integration & End-to-End Validation - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The complete pipeline is wired up end-to-end: Python scripts copied and accessible, GPU conda environment validated, SQLite databases in place, global video library created, and all agent/skill paths updated to point at real files. The user performs the actual end-to-end pipeline run manually — Phase 6 delivers the infrastructure and smoke-tests it.

</domain>

<decisions>
## Implementation Decisions

### Script Hosting
- **D-01:** Python scripts are **copied from V5** (`.pi/multi-team/scripts/`) into V0.6 at **`.claude/scripts/`** with domain subdirectories: `strategy/`, `editorial/`, `media/`. Scripts stay unmodified per PROJECT.md constraint — only their location changes.
- **D-02:** The old top-level directories (`strategy/`, `editorial/`, `media/`) listed in CLAUDE.md's folder map are **replaced** by `.claude/scripts/{strategy,editorial,media}/`. CLAUDE.md folder map needs updating.
- **D-03:** `.claude/scripts/` already contains `audit-agents.js` — Python scripts join it as a natural extension of the agent system's scripts directory.

### Script Invocation Architecture
- **D-04:** **Agent bodies own script invocation** — agents already contain full invocation commands, paths, environment requirements, and expected outputs. Phase 6 updates these paths from `strategy/cli.py` → `.claude/scripts/strategy/cli.py` (and similar for editorial/media) and removes all "not yet connected in V0.6" caveats.
- **D-05:** **Pipeline skills stay as pure routers** — they dispatch agents and manage checkpoints. They have zero script knowledge and don't need any.
- **D-06:** **Domain skills keep reference-only script docs** — script paths updated, "Available after Phase 6 integration" notes removed, but scripts remain documented-for-reference, not procedural.

### Script Failure Behavior
- **D-07:** **Scripts primary, no fallback.** When a script exists for a task, the agent uses it exclusively. If the script fails, the agent reports the error and stops — does NOT silently fall back to Claude-native capabilities (WebSearch, etc.). Clear failure signals are better than degraded-but-hidden behavior.

### Database & Library Access
- **D-08:** Both SQLite databases **copied from V5** (`data/channel_assistant.db`, `data/asset_catalog.db`) to V0.6 `data/` directory. Historical competitor data and asset catalog preserved. Agent path references (`data/channel_assistant.db`, `data/asset_catalog.db`) already correct.
- **D-09:** `D:/VideoLibrary/` **created as empty directory** during Phase 6. Asset Curator can access it immediately; assets accumulate as the pipeline runs over time.

### Validation Scope
- **D-10:** **Critical-path scripts only** (~15 of ~30 scripts) are validated. These are the scripts needed for a complete pipeline run: strategy CLI (add/scrape/analyze/topics/init), editorial researcher CLI (survey/deepen/synthesize), editorial writer CLI (load/generate/revise), and media scripts (embed, search, download, evaluate, ingest). Niche scripts (wiki_screenshots, crawl_images, export_clips, trend_scanner, promote, organize_assets, pool) are deferred until needed.
- **D-11:** Validation is **smoke-test level** — scripts importable, `--help` works, conda env has required dependencies, databases open with expected tables, agent paths point to real files. The user performs the actual end-to-end pipeline run manually.
- **D-12:** No automated E2E test run within Phase 6. The user validates the full pipeline (topic → research → script → visuals → assets → edit sheet) themselves.

### Claude's Discretion
- Exact file copy strategy (full directory copy vs cherry-pick critical path files)
- Python dependency validation approach (import checks vs full test suite)
- Smoke test script structure and implementation details
- Order of script migration (strategy first, then editorial, then media — or parallel)
- Whether to add `__init__.py` files if missing for module imports
- CLAUDE.md folder map update format

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### V5 script source (copy from here)
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\scripts\strategy\channel_assistant\` — Strategy Python scripts (cli.py, scraper.py, analyzer.py, topics.py, project_init.py, database.py, models.py, registry.py)
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\scripts\editorial\` — Editorial Python scripts (researcher/cli.py, writer/cli.py, and supporting modules)
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\scripts\media\` — Media Python scripts (embed.py, search.py, download.py, evaluate.py, ingest.py, and others)

### V5 databases (copy from here)
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\data\channel_assistant.db` — Strategy competitor database
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\data\asset_catalog.db` — Asset catalog database

### Agent definitions (path update targets)
- `.claude/agents/strategy.md` — References `strategy/cli.py` → update to `.claude/scripts/strategy/cli.py`
- `.claude/agents/researcher.md` — References `editorial/researcher/cli.py` → update to `.claude/scripts/editorial/researcher/cli.py`
- `.claude/agents/writer.md` — References `editorial/writer/cli.py` → update to `.claude/scripts/editorial/writer/cli.py`
- `.claude/agents/asset-processor.md` — References `media/embed.py`, `media/search.py` etc. → update to `.claude/scripts/media/`
- `.claude/agents/asset-curator.md` — References `media/organize_assets.py`, `media/promote.py` → update to `.claude/scripts/media/`
- `.claude/agents/compiler.md` — May reference media scripts → check and update

### Domain skills (reference doc update targets)
- `.claude/skills/documentary-research/SKILL.md` — Has "Script References" section with editorial paths
- `.claude/skills/data-analysis/SKILL.md` — May reference strategy scripts
- `.claude/skills/media-evaluation/SKILL.md` — May reference media scripts
- `.claude/skills/archive-search/SKILL.md` — May reference media/ia_search.py

### Pipeline skills (verify routing still works)
- `.claude/skills/strategy/SKILL.md`, `.claude/skills/research/SKILL.md`, `.claude/skills/write-script/SKILL.md`, `.claude/skills/visual-plan/SKILL.md`, `.claude/skills/process-assets/SKILL.md`, `.claude/skills/compile/SKILL.md` — Pure routers, no script paths to update, but verify dispatch still works after agent body changes

### GPU environment
- `C:/Users/iorda/miniconda3/envs/perception-models/python.exe` — Required for CLIP embedding and search scripts

### Prior phase context
- `.planning/phases/04-pipeline-triggers-hooks/04-CONTEXT.md` — Pipeline skill architecture (D-01-D-03), pre-Phase 6 mode (D-03)
- `.planning/phases/05-feedback-propagation/05-CONTEXT.md` — Verification gates in pipeline skills, signal system

### Project requirements
- `.planning/REQUIREMENTS.md` — INTG-01 through INTG-05
- `.planning/PROJECT.md` — Core constraints on script modification and platform

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.claude/scripts/audit-agents.js` — Existing script in target directory, establishes the pattern
- Agent bodies already contain full script invocation instructions — just need path updates
- `tests/smoke-test-*.js` — Existing smoke test pattern (paths, skills, agents, pipeline, feedback) to follow for integration smoke tests
- `projects/duplessis-orphans/` — Existing project with research output, available for manual E2E testing

### Established Patterns
- Agent frontmatter: `tools: Read, Write, Edit, Bash, Grep, Glob` — Bash tool enables script invocation
- Scripts use `python -m` module invocation for packages with `__main__.py` (strategy, editorial)
- GPU scripts use absolute conda path: `C:/Users/iorda/miniconda3/envs/perception-models/python.exe`
- Smoke tests use Node.js with `testCases` array pattern

### Integration Points
- `.claude/scripts/` — Target directory for all copied Python scripts
- `data/` — Target directory for copied SQLite databases
- `D:/VideoLibrary/` — New directory to create
- `CLAUDE.md` — Folder map needs updating (remove strategy/editorial/media top-level, add .claude/scripts/ subdirs)
- All agent `.md` files — Script paths need updating
- Domain skill SKILL.md files — Script reference paths need updating

</code_context>

<specifics>
## Specific Ideas

- User rejected top-level domain directories (strategy/, editorial/, media/) as V5 team-hierarchy artifacts that don't fit V0.6's flat agent model — `.claude/scripts/` with subdirs is the right home
- User confirmed the three-layer architecture analysis: pipeline skills = WHEN (routing), agent bodies = HOW (procedures + scripts), domain skills = WHAT (expertise). Scripts belong in agents because agents dictate workflow.
- User explicitly chose no fallback — script failures should surface clearly, not be masked by Claude-native degradation
- User will perform E2E validation manually — Phase 6 delivers the wiring and smoke tests, not a test pipeline run

</specifics>

<deferred>
## Deferred Ideas

- Niche script validation (wiki_screenshots, crawl_images, export_clips, trend_scanner, promote, organize_assets, pool) — validate when first needed in production
- Configurable VideoLibrary path — currently hardcoded to D:/VideoLibrary/, can be made configurable if needed later

None beyond these — discussion stayed within phase scope

</deferred>

---

*Phase: 06-integration-end-to-end-validation*
*Context gathered: 2026-04-11*

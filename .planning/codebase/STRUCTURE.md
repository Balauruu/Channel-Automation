# Codebase Structure

**Analysis Date:** 2026-04-22

## Directory Layout

```
Channel-Automation V0.6/
├── .claude/                    # Pipeline infrastructure (agents, skills, scripts, hooks)
│   ├── agents/                 # Agent definitions (12 agents)
│   ├── agent-memory/           # Per-agent persistent memory (MEMORY.md files)
│   ├── hooks/                  # Lifecycle hooks (observability, memory checks)
│   ├── logs/                   # Agent run logs and observations
│   │   └── observations/       # Pipeline observation output (obs.jsonl per project)
│   ├── orchestration/          # Cross-agent coordination (legacy PLAYBOOK.md)
│   ├── rules/                  # Modular on-demand rules (git-workflow, etc.)
│   ├── scratch/                # Ephemeral agent workspace
│   │   └── researcher/         # Researcher scratch space with sources/
│   ├── scripts/                # Python + JS scripts by domain
│   │   ├── editorial/          # Editorial pipeline scripts
│   │   │   ├── researcher/     # Research CLI (survey, deepen, write, status)
│   │   │   └── writer/         # Script generation CLI (load, generate, revise)
│   │   ├── media/              # Media processing scripts (15 files)
│   │   ├── memory/             # Memory management scripts (evolve.js)
│   │   └── strategy/           # Strategy pipeline scripts
│   │       ├── channel_assistant/  # Strategy CLI (add, scrape, analyze, topics)
│   │       └── tests/          # Strategy test suite
│   │   obs-summarize.js        # Observation summarizer (obs.jsonl → markdown digest)
│   ├── skills/                 # Shared skills (21 skill directories)
│   ├── tests/                  # Smoke tests and evaluation scripts
│   │   └── fixtures/           # Test fixtures (evolve/, observer/ subdirs)
│   ├── PLAYBOOK.md             # Primary cross-agent coordination log (observer-managed)
│   ├── settings.json           # Hook registrations
│   └── settings.local.json     # Local-only settings (gitignored)
├── channel/                    # Channel identity and strategy outputs
│   ├── channel.md              # Channel DNA (brand, pillars, identity)
│   ├── voice-profile.md        # Narrator voice rules and patterns
│   ├── VISUAL_STYLE_GUIDE.md   # Visual format vocabulary and constraints
│   ├── past_topics.md          # Previously covered topics
│   ├── strategy/               # Strategy outputs (analysis, competitor data, topics, dashboard)
│   └── voice-analysis/         # Style-extractor workspace (reconstructed scripts)
├── data/                       # SQLite databases
│   ├── channel_assistant.db    # Competitor channel and video metadata
│   └── asset_catalog.db        # Global asset library catalog
├── docs/                       # Documentation and specifications
│   ├── claude-code-longform-guide.md
│   ├── claude-code-session-hooks.md
│   ├── ROADMAP.md
│   └── continous-learning-v2/  # Archived CLv2 reference material
├── projects/                   # Per-documentary project directories
│   ├── duplessis-orphans/      # Active project (research complete)
│   └── parallel-test-a-hinterkaifeck/  # Test project (research only)
├── .planning/                  # GSD planning artifacts
│   └── codebase/               # Codebase analysis documents
├── CLAUDE.md                   # Project-level instructions
├── .env                        # Environment configuration (existence noted only)
└── .gitignore                  # Git ignore rules
```

## Directory Purposes

**.claude/agents/:**
- Purpose: Agent persona definitions -- one `.md` file per agent. Claude Code requires flat layout (does not recurse subdirectories, except `strategy/` subdir for subdirectory agent support).
- Contains: 12 markdown files with YAML frontmatter (name, description, model, tools, skills, memory, color) and agent body (identity, procedures, file conventions, task classification)
- Key files:
  - `researcher.md` -- Documentary research agent (multi-pass pipeline)
  - `writer.md` -- Script writing agent (voice-aware)
  - `strategy.md` -- Competitor analysis and topic generation
  - `observer.md` -- Memory learning extraction agent (reads obs.jsonl, writes Pending Review sections)
  - `visual-researcher.md` -- Visual intent and primary resource discovery
  - `visual-planner.md` -- Shotlist generation and b-roll curation
  - `asset-processor.md` -- CLIP embedding, semantic search, download
  - `asset-curator.md` -- Global library management, deduplication
  - `compiler.md` -- DaVinci Resolve edit sheet compilation
  - `style-extractor.md` -- Voice profile extraction from reference scripts
  - `code-reviewer.md` -- Code quality review and fixes

**.claude/agent-memory/:**
- Purpose: Persistent cross-session agent learning (observer-written, agent-read-only, 200-line limit)
- Contains: One subdirectory per agent, each with a `MEMORY.md`
- Key files: `.claude/agent-memory/<agent-name>/MEMORY.md`
- Note: These files are auto-injected into agent context (first 200 lines) at task start. Observer writes all updates; agents must NOT write to these files. Use targeted `git add` when committing nearby files (see `.claude/rules/git-workflow.md`).

**.claude/skills/:**
- Purpose: Shared domain expertise and pipeline dispatcher definitions
- Contains: 21 skill directories, each with `SKILL.md` and optionally `insights.md`
- Two skill types:
  - **Expertise skills** (injected via agent `skills:` frontmatter): `agent-protocols`, `agent-observability`, `crawl4ai-scraping`, `visual-narrative`, `archive-search`, `media-evaluation`, `data-analysis`, `structured-output`, `pipeline-design`
  - **Dispatcher skills** (user-invocable via `/skill-name`, `disable-model-invocation: true`): `evolve`, `strategy`, `strategy-scrape`, `strategy-analyze`, `strategy-topics`, `compile`, `process-assets`, `write-script`, `visual-plan`, `assets-download`, `assets-embed`, `assets-search`, `assets-score`

**.claude/scripts/editorial/researcher/:**
- Purpose: Research pipeline CLI (survey, deepen, write, status commands)
- Contains: `cli.py` (main logic), `fetcher.py` (web content fetching), `tiers.py` (source tier classification), `url_builder.py` (deep dive URL generation), `writer.py` (synthesis input generation)
- Invoked via: `PYTHONPATH=".claude/scripts/editorial" C:/Users/iorda/venvs/crawl4ai/Scripts/python -m researcher <command> "<topic>"`

**.claude/scripts/editorial/writer/:**
- Purpose: Script generation CLI (load, generate, revise commands)
- Contains: `cli.py`
- Invoked via: `PYTHONPATH=".claude/scripts/editorial" python -m writer <command> "<project>"`

**.claude/scripts/strategy/channel_assistant/:**
- Purpose: Strategy pipeline CLI (add, scrape, analyze, topics commands)
- Contains: `cli.py`, `scraper.py`, `analyzer.py`, `database.py`, `topics.py`, `trend_scanner.py`, `project_init.py`, `registry.py`, `models.py`
- Invoked via: `PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant <command>`

**.claude/scripts/media/:**
- Purpose: Media processing scripts for download, embedding, search, and video manipulation
- Contains: 15 Python scripts
- Key files:
  - `download.py` -- Asset download from YouTube/archive.org with rate limiting
  - `embed.py` -- CLIP embedding generation (GPU, perception-models env)
  - `search.py` -- Semantic search against embedded pool (GPU)
  - `ingest.py` -- Frame extraction from video at 1fps via FFmpeg
  - `pool.py` -- Embedding pool index management
  - `evaluate.py` -- Media quality evaluation and scoring
  - `discover.py` -- Visual source discovery across archives
  - `export_clips.py` -- FFmpeg clip extraction
  - `organize_assets.py` -- Editor-ready asset renaming and organization
  - `promote.py` -- Asset promotion to global library
  - `crawl_images.py` -- Image extraction from crawled web pages
  - `wiki_screenshots.py` -- Playwright-based Wikipedia page captures
  - `ia_search.py` -- Internet Archive search with metadata extraction

**.claude/scripts/memory/:**
- Purpose: Memory management scripts invoked by the `/evolve` skill
- Contains: `evolve.js` -- Presents pending review entries, handles promote/edit/revert operations

**.claude/hooks/:**
- Purpose: Claude Code lifecycle hooks for observability and memory management
- Contains:
  - `pipeline-observe.js` (Node.js, 14KB) -- Main observability hook; logs tool calls, durations, errors to `.claude/logs/observations/<project>/obs.jsonl`
  - `check-memory-limit.js` (2KB) -- SubagentStop hook that warns when MEMORY.md exceeds 200 lines
- Registered in: `.claude/settings.json`

**.claude/tests/:**
- Purpose: Smoke tests and evaluation scripts validating pipeline integrity
- Contains:
  - `smoke-test-observe.js` -- Validates pipeline-observe.js hook and obs.jsonl output (CAPT-01 through CAPT-07)
  - `smoke-test-evolve.js` -- Validates /evolve workflow, promote/revert operations
  - `eval-observer.js` -- Evaluation harness for @observer agent quality
  - `eval-evolve.js` -- Evaluation harness for /evolve workflow
  - `fixtures/evolve/` -- Test fixtures for evolve workflow (insights.md, memory.md, playbook.md samples)
  - `fixtures/observer/` -- Test fixtures for observer agent (obs.jsonl samples, malformed lines, error runs)

**.claude/PLAYBOOK.md:**
- Purpose: Primary cross-agent coordination inbox (observer-managed)
- Contains: Open/Resolved lifecycle entries authored by `@observer`, consumed by target agents at task start
- This is the active coordination log. `.claude/orchestration/PLAYBOOK.md` is the legacy location.

**channel/:**
- Purpose: Channel identity and strategic intelligence
- Contains: Brand definition, voice profile, visual style guide, past topics, strategy outputs
- Key files:
  - `channel.md` -- Channel DNA: brand identity, 5 content pillars, target audience
  - `voice-profile.md` -- Comprehensive voice rules, vocabulary constraints, arc templates, transition phrases
  - `VISUAL_STYLE_GUIDE.md` -- Visual format vocabulary, shot types, equilibrium rules, asset constraints
  - `past_topics.md` -- Previously covered topics for near-duplicate detection

**data/:**
- Purpose: SQLite databases for persistent structured data
- Contains:
  - `channel_assistant.db` -- Competitor channel registry, video metadata, analysis results
  - `asset_catalog.db` -- Global asset library catalog (paths, categories, quality scores, tags, perceptual hashes)

**projects/:**
- Purpose: Per-documentary project workspaces with standardized subdirectory structure
- Contains: One directory per documentary project

## Key File Locations

**Entry Points:**
- `.claude/agents/*.md`: Agent definitions dispatched via `@agent-name`
- `.claude/skills/*/SKILL.md`: Skill definitions invoked via `/skill-name`
- `.claude/scripts/editorial/researcher/__main__.py`: Research CLI entry
- `.claude/scripts/editorial/writer/__main__.py`: Writer CLI entry
- `.claude/scripts/strategy/channel_assistant/__main__.py`: Strategy CLI entry

**Configuration:**
- `.claude/settings.json`: Hook registrations (PreToolUse, PostToolUse, etc.)
- `CLAUDE.md`: Project-level instructions, folder map, agent reference table, architecture rules
- `.env`: Environment variables (existence noted only -- never read contents)
- `.gitignore`: Git ignore rules

**Core Logic (Agent Definitions):**
- `.claude/agents/researcher.md`: Multi-pass research pipeline (survey, deepen, gap-fill, synthesize)
- `.claude/agents/writer.md`: Voice-aware script writing procedure
- `.claude/agents/observer.md`: Learning extraction and memory routing
- `.claude/agents/strategy.md`: Competitor analysis and topic generation
- `.claude/agents/visual-researcher.md`: Visual intent and resource discovery
- `.claude/agents/visual-planner.md`: Shotlist and b-roll curation
- `.claude/agents/asset-processor.md`: CLIP embedding and semantic search
- `.claude/agents/compiler.md`: DaVinci Resolve edit sheet compilation

**Core Logic (Python Scripts):**
- `.claude/scripts/editorial/researcher/cli.py`: Research command routing and execution
- `.claude/scripts/strategy/channel_assistant/cli.py`: Strategy command routing
- `.claude/scripts/media/download.py`: Asset download with rate limiting
- `.claude/scripts/media/embed.py`: CLIP embedding generation
- `.claude/scripts/media/search.py`: Semantic search against CLIP pool

**Observability:**
- `.claude/hooks/pipeline-observe.js`: Event capture hook (writes obs.jsonl)
- `.claude/scripts/obs-summarize.js`: Digest generator (obs.jsonl → markdown)
- `.claude/logs/observations/<project>/obs.jsonl`: Live JSONL event log per project

**Memory System:**
- `.claude/PLAYBOOK.md`: Cross-agent coordination log (observer writes, agents read)
- `.claude/agent-memory/<agent>/MEMORY.md`: Per-agent persistent learnings (200-line limit)
- `.claude/skills/<skill>/insights.md`: Per-skill accumulated learnings
- `.claude/scripts/memory/evolve.js`: Promote/revert UI for pending entries
- `.claude/skills/evolve/SKILL.md`: /evolve command dispatcher

**Shared Behavioral Protocols:**
- `.claude/skills/agent-protocols/SKILL.md`: Memory lifecycle, project context rules
- `.claude/skills/agent-observability/SKILL.md`: obs.jsonl schema, event types, debug recipes
- `.claude/skills/pipeline-design/SKILL.md`: Agent/skill design framework, anti-patterns, audit workflow

**Testing:**
- `.claude/tests/smoke-test-observe.js`: Observability hook validation (CAPT-01 through CAPT-07)
- `.claude/tests/smoke-test-evolve.js`: /evolve workflow validation
- `.claude/scripts/strategy/tests/`: Strategy module tests

## Naming Conventions

**Files:**
- Agent definitions: `kebab-case.md` (e.g., `visual-planner.md`, `observer.md`)
- Skills: `kebab-case/SKILL.md` (e.g., `crawl4ai-scraping/SKILL.md`, `evolve/SKILL.md`)
- Python scripts: `snake_case.py` (e.g., `export_clips.py`, `wiki_screenshots.py`)
- Python packages: `snake_case/` directory with `__init__.py` and `__main__.py`
- Project directories: `kebab-case` (e.g., `duplessis-orphans`)
- Research outputs: `PascalCase.md` for primary artifacts (`Research.md`, `Script.md`)
- JSON outputs: `snake_case.json` (e.g., `entity_index.json`, `shotlist.json`, `visual_brief.json`)
- Test files: `smoke-test-<domain>.js`
- Observation log: `obs.jsonl` (fixed name, one per project in `observations/<project>/`)

**Directories:**
- Agent memory: `.claude/agent-memory/<agent-name>/`
- Skills: `.claude/skills/<skill-name>/`
- Scripts: `.claude/scripts/<domain>/<package>/`
- Projects: `projects/<project-name>/`
- Project subdirs: lowercase singular (`research/`, `script/`, `visuals/`, `assets/`, `compilation/` or `edit/`)
- Observation logs: `.claude/logs/observations/<project-slug>/`

**Entity IDs (in research outputs):**
- Persons: `P001`, `P002`, ...
- Locations: `L001`, `L002`, ...
- Organizations: `O001`, `O002`, ...
- Events: `E001`, `E002`, ...
- Documents: `D001`, `D002`, ...

## Where to Add New Code

**New Agent:**
- Definition: `.claude/agents/<agent-name>.md` (must be flat -- Claude Code does not recurse subdirs, with `strategy/` being a documented exception)
- Memory directory: `.claude/agent-memory/<agent-name>/MEMORY.md`
- Must include: YAML frontmatter (name, description, model, tools, skills, memory, color), Identity section, Channel Context, procedures, File Conventions, Task Classification
- Must reference `agent-protocols` in `skills:` frontmatter
- Before creating: Invoke the `pipeline-design` skill to audit for anti-patterns

**New Skill:**
- Definition: `.claude/skills/<skill-name>/SKILL.md`
- Insights file: `.claude/skills/<skill-name>/insights.md` (initially empty with marker line)
- Two types: expertise skill (injected via agent frontmatter) or dispatcher skill (`disable-model-invocation: true`)
- Decision rule: shared by 2+ agents = skill. Single-consumer + tightly coupled = merge into agent body.

**New Python Script:**
- Editorial domain: `.claude/scripts/editorial/<package>/`
- Strategy domain: `.claude/scripts/strategy/channel_assistant/`
- Media domain: `.claude/scripts/media/`
- GPU scripts must use: `C:/Users/iorda/miniconda3/envs/perception-models/python.exe`
- Non-GPU scripts: standard Python via conda
- Follow Windows path safety: use `os.path.join()` or `pathlib.Path`, never string concatenation

**New Project:**
- Directory: `projects/<project-name>/`
- Standard structure:
  ```
  projects/<project-name>/
    metadata.json
    research/
    script/
    visuals/
    assets/
    compilation/  (or edit/)
  ```
- Project name: lowercase, hyphens for spaces
- Initialized by `@strategy` agent after topic selection

**New Hook:**
- Implementation: `.claude/hooks/<hook-name>.js`
- Registration: Add to `.claude/settings.json` under the appropriate event
- Follow the existing pattern: async for pre/post hooks, synchronous for SubagentStop

**New Test:**
- Smoke tests: `.claude/tests/smoke-test-<domain>.js`
- Evaluation scripts: `.claude/tests/eval-<domain>.js`
- Strategy tests: `.claude/scripts/strategy/tests/`
- Test fixtures: `.claude/tests/fixtures/<domain>/`

**New Channel Identity Artifact:**
- Channel-level: `channel/` (e.g., new style guide, branding document)
- Strategy output: `channel/strategy/`

## Special Directories

**.claude/agent-memory/:**
- Purpose: Persistent agent learning files
- Generated: Observer writes; agents read-only
- Committed: Yes (tracked in git, but use targeted `git add` to avoid sweeping unrelated changes)

**.claude/scratch/:**
- Purpose: Ephemeral agent workspace for intermediate files
- Generated: Yes (by agents during execution)
- Committed: No (should be gitignored or cleaned up)

**.claude/logs/:**
- Purpose: Agent run observability logs (JSONL format)
- Generated: Yes (by pipeline-observe.js hook)
- Committed: No (gitignored -- runtime state)

**projects/<name>/research/sources/:**
- Purpose: Raw source files fetched during research (HTML, TXT)
- Generated: Yes (by researcher scripts and WebFetch)
- Committed: Yes (research provenance)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents (this document)
- Generated: Yes (by GSD mapping commands)
- Committed: Yes

**data/:**
- Purpose: SQLite databases
- Generated: Yes (by strategy and asset scripts)
- Committed: Yes (tracked in git as binary files)

---

*Structure analysis: 2026-04-22*

# Codebase Structure

**Analysis Date:** 2026-04-20

## Directory Layout

```
Channel-Automation V0.6/
├── .claude/                    # Pipeline infrastructure (agents, skills, scripts, hooks)
│   ├── agents/                 # Agent definitions (11 agents)
│   ├── agent-memory/           # Per-agent persistent memory (MEMORY.md files)
│   ├── feedback/               # Cross-agent feedback signals (signals.yaml) [not yet created]
│   ├── hooks/                  # Lifecycle hooks (observability, memory checks)
│   ├── logs/                   # Agent run logs and observations
│   │   └── observations/       # Pipeline observation output
│   ├── orchestration/          # Cross-agent coordination (PLAYBOOK.md)
│   ├── project-memories/       # Per-project agent notes [not yet populated]
│   ├── rules/                  # Modular on-demand rules (git-workflow, etc.)
│   ├── scratch/                # Ephemeral agent workspace
│   │   └── researcher/         # Researcher scratch space with sources/
│   ├── scripts/                # Python scripts by domain
│   │   ├── editorial/          # Editorial pipeline scripts
│   │   │   ├── researcher/     # Research CLI (survey, deepen, write, status)
│   │   │   └── writer/         # Script generation CLI (load, generate, revise)
│   │   ├── media/              # Media processing scripts (15 files)
│   │   └── strategy/           # Strategy pipeline scripts
│   │       ├── channel_assistant/  # Strategy CLI (add, scrape, analyze, topics)
│   │       └── tests/          # Strategy test suite
│   ├── skills/                 # Shared skills (22 skill directories)
│   ├── settings.json           # Hook registrations
│   └── tests/                  # Smoke tests (agents, feedback, observability, paths, pipeline, skills)
│       └── fixtures/           # Test fixtures
├── channel/                    # Channel identity and strategy outputs
│   ├── channel.md              # Channel DNA (brand, pillars, identity)
│   ├── voice-profile.md        # Narrator voice rules and patterns
│   ├── VISUAL_STYLE_GUIDE.md   # Visual format vocabulary and constraints
│   ├── past_topics.md          # Previously covered topics
│   ├── strategy/               # Strategy outputs (analysis, competitor data, topics, dashboard)
│   └── voice-analysis/         # Style-extractor workspace (empty, awaiting scripts)
├── data/                       # SQLite databases
│   ├── channel_assistant.db    # Competitor channel and video metadata (217 KB)
│   └── asset_catalog.db        # Global asset library catalog (40 KB)
├── docs/                       # Documentation and specifications
│   ├── claude-code-longform-guide.md
│   ├── claude-code-session-hooks.md
│   ├── ROADMAP.md
│   └── superpowers/            # Feature specs and plans
│       ├── plans/
│       └── specs/              # Memory system specs (archived and current)
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
- Purpose: Agent persona definitions -- one `.md` file per agent
- Contains: 11 markdown files with YAML frontmatter (name, description, model, tools, skills, memory, color) and agent body (identity, procedures, file conventions, task classification)
- Key files:
  - `researcher.md` -- Documentary research agent (multi-pass pipeline)
  - `writer.md` -- Script writing agent (voice-aware)
  - `strategy.md` -- Competitor analysis and topic generation
  - `editorial-lead.md` -- Quality gate (read-only tools)
  - `visual-researcher.md` -- Visual intent and primary resource discovery
  - `visual-planner.md` -- Shotlist generation and b-roll curation
  - `asset-processor.md` -- CLIP embedding, semantic search, download
  - `asset-curator.md` -- Global library management, deduplication
  - `compiler.md` -- DaVinci Resolve edit sheet compilation
  - `style-extractor.md` -- Voice profile extraction from reference scripts
  - `code-reviewer.md` -- Code quality review and fixes

**.claude/agent-memory/:**
- Purpose: Persistent cross-session agent learning (append-only, 200-line limit)
- Contains: One subdirectory per agent, each with a `MEMORY.md`
- Key files: `.claude/agent-memory/<agent-name>/MEMORY.md`
- Note: These files are auto-injected into agent context (first 200 lines) at task start. Modified during normal agent runs -- use targeted `git add` when committing nearby files.

**.claude/skills/:**
- Purpose: Shared domain expertise and pipeline dispatcher definitions
- Contains: 22 skill directories, each with `SKILL.md` and optionally `insights.md`
- Two skill types:
  - **Expertise skills** (injected via agent `skills:` frontmatter): `agent-protocols`, `agent-observability`, `autoresearch`, `crawl4ai-scraping`, `visual-narrative`, `archive-search`, `media-evaluation`, `data-analysis`, `structured-output`, `pipeline-design`
  - **Dispatcher skills** (user-invocable via `/skill-name`, `disable-model-invocation: true`): `strategy`, `strategy-scrape`, `strategy-analyze`, `strategy-topics`, `compile`, `process-assets`, `write-script`, `visual-plan`, `assets-download`, `assets-embed`, `assets-search`, `assets-score`

**.claude/scripts/editorial/researcher/:**
- Purpose: Research pipeline CLI (survey, deepen, write, status commands)
- Contains: `cli.py` (18KB, main logic), `fetcher.py` (web content fetching), `tiers.py` (source tier classification), `url_builder.py` (deep dive URL generation), `writer.py` (synthesis input generation)
- Invoked via: `PYTHONPATH=".claude/scripts/editorial" C:/Users/iorda/venvs/crawl4ai/Scripts/python -m researcher <command> "<topic>"`

**.claude/scripts/editorial/writer/:**
- Purpose: Script generation CLI (load, generate, revise commands)
- Contains: `cli.py` (5KB)
- Invoked via: `PYTHONPATH=".claude/scripts/editorial" python -m writer <command> "<project>"`

**.claude/scripts/strategy/channel_assistant/:**
- Purpose: Strategy pipeline CLI (add, scrape, analyze, topics commands)
- Contains: `cli.py` (19KB, command routing), `scraper.py` (11KB, YouTube metadata scraping), `analyzer.py` (6KB, statistical analysis), `database.py` (8KB, SQLite operations), `topics.py` (9KB, topic generation), `trend_scanner.py` (13KB, trend detection), `project_init.py` (10KB, directory scaffolding), `registry.py` (3KB, channel registry), `models.py` (1KB, data models)
- Invoked via: `PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant <command>`

**.claude/scripts/media/:**
- Purpose: Media processing scripts for download, embedding, search, and video manipulation
- Contains: 15 Python scripts
- Key files:
  - `download.py` (23KB) -- Asset download from YouTube/archive.org with rate limiting
  - `embed.py` (5KB) -- CLIP embedding generation (GPU, perception-models env)
  - `search.py` (11KB) -- Semantic search against embedded pool (GPU)
  - `ingest.py` (5KB) -- Frame extraction from video at 1fps via FFmpeg
  - `pool.py` (6KB) -- Embedding pool index management
  - `evaluate.py` (10KB) -- Media quality evaluation and scoring
  - `discover.py` (9KB) -- Visual source discovery across archives
  - `export_clips.py` (3KB) -- FFmpeg clip extraction
  - `organize_assets.py` (3KB) -- Editor-ready asset renaming and organization
  - `promote.py` (3KB) -- Asset promotion to global library
  - `crawl_images.py` (3KB) -- Image extraction from crawled web pages
  - `wiki_screenshots.py` (5KB) -- Playwright-based Wikipedia page captures
  - `ia_search.py` (4KB) -- Internet Archive search with metadata extraction

**.claude/hooks/:**
- Purpose: Claude Code lifecycle hooks for observability and memory management
- Contains:
  - `pipeline-observe.sh` (14KB) -- Main observability hook (logs tool calls, durations, errors to `.claude/logs/`)
  - `check-memory-limit.js` (2KB) -- SubagentStop hook that warns when MEMORY.md exceeds 200 lines
- Registered in: `.claude/settings.json`

**.claude/tests/:**
- Purpose: Smoke tests validating pipeline integrity
- Contains:
  - `smoke-test-agents.js` (7KB) -- Validates agent definitions (frontmatter, identity, tools)
  - `smoke-test-feedback.js` (10KB) -- Validates feedback signal system
  - `smoke-test-observability.js` (28KB) -- Validates observability hook and log format
  - `smoke-test-paths.js` (5KB) -- Validates file paths referenced in agents/skills
  - `smoke-test-pipeline.js` (6KB) -- Validates pipeline stage dependencies
  - `smoke-test-skills.js` (4KB) -- Validates skill definitions and references
  - `fixtures/` -- Test fixture data

**channel/:**
- Purpose: Channel identity and strategic intelligence
- Contains: Brand definition, voice profile, visual style guide, past topics, strategy outputs
- Key files:
  - `channel.md` (3KB) -- Channel DNA: brand identity, 5 content pillars, target audience
  - `voice-profile.md` (23KB) -- Comprehensive voice rules, vocabulary constraints, arc templates, transition phrases
  - `VISUAL_STYLE_GUIDE.md` (15KB) -- Visual format vocabulary, shot types, equilibrium rules, asset constraints
  - `past_topics.md` (1KB) -- Previously covered topics for near-duplicate detection
  - `strategy/analysis.md` (7KB) -- Latest competitor analysis
  - `strategy/competitor_data.md` (17KB) -- Raw competitor channel data
  - `strategy/competitors.json` (1KB) -- Registered competitor channel URLs
  - `strategy/topics.md` (20KB) -- Generated topic candidates with scores
  - `strategy/dashboard.html` (445KB) -- Interactive strategy dashboard

**data/:**
- Purpose: SQLite databases for persistent structured data
- Contains:
  - `channel_assistant.db` (217KB) -- Competitor channel registry, video metadata, analysis results
  - `asset_catalog.db` (40KB) -- Global asset library catalog (paths, categories, quality scores, tags, perceptual hashes)

**projects/:**
- Purpose: Per-documentary project workspaces with standardized subdirectory structure
- Contains: One directory per documentary project
- Key projects:
  - `duplessis-orphans/` -- Active project with completed research (49KB dossier, 26KB entity index, 27 source files)
  - `parallel-test-a-hinterkaifeck/` -- Test project with partial research

**.claude/orchestration/:**
- Purpose: Cross-agent coordination inbox
- Contains: `PLAYBOOK.md` -- Staging area for handoff signals between agents (authored by pipeline observer, consumed by target agents)

**.claude/rules/:**
- Purpose: Modular on-demand rules loaded when relevant (not auto-loaded)
- Contains: `git-workflow.md` -- Git staging rules to avoid sweeping agent-memory appends into unrelated commits

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

**Shared Behavioral Protocols:**
- `.claude/skills/agent-protocols/SKILL.md`: Memory lifecycle, feedback signals, project context
- `.claude/skills/pipeline-design/SKILL.md`: Agent/skill design framework, anti-patterns, audit workflow

**Testing:**
- `.claude/tests/smoke-test-*.js`: Pipeline integrity validation (6 test suites)
- `.claude/scripts/strategy/tests/`: Strategy module tests

## Naming Conventions

**Files:**
- Agent definitions: `kebab-case.md` (e.g., `visual-planner.md`, `asset-processor.md`)
- Skills: `kebab-case/SKILL.md` (e.g., `crawl4ai-scraping/SKILL.md`)
- Python scripts: `snake_case.py` (e.g., `export_clips.py`, `wiki_screenshots.py`)
- Python packages: `snake_case/` directory with `__init__.py` and `__main__.py`
- Project directories: `kebab-case` (e.g., `duplessis-orphans`)
- Research outputs: `PascalCase.md` for primary artifacts (`Research.md`, `Script.md`)
- JSON outputs: `snake_case.json` (e.g., `entity_index.json`, `shotlist.json`, `visual_brief.json`)
- Test files: `smoke-test-<domain>.js`

**Directories:**
- Agent memory: `.claude/agent-memory/<agent-name>/`
- Skills: `.claude/skills/<skill-name>/`
- Scripts: `.claude/scripts/<domain>/<package>/`
- Projects: `projects/<project-name>/`
- Project subdirs: lowercase singular (`research/`, `script/`, `visuals/`, `assets/`, `compilation/` or `edit/`)

**Entity IDs (in research outputs):**
- Persons: `P001`, `P002`, ...
- Locations: `L001`, `L002`, ...
- Organizations: `O001`, `O002`, ...
- Events: `E001`, `E002`, ...
- Documents: `D001`, `D002`, ...

## Where to Add New Code

**New Agent:**
- Definition: `.claude/agents/<agent-name>.md` (must be flat -- Claude Code does not recurse subdirs)
- Memory directory: `.claude/agent-memory/<agent-name>/MEMORY.md`
- Must include: YAML frontmatter (name, description, model, tools, skills, memory, color), Identity section, Channel Context, procedures, File Conventions, Task Classification
- Must reference `agent-protocols` in `skills:` frontmatter
- Before creating: Invoke the `pipeline-design` skill to audit for anti-patterns

**New Skill:**
- Definition: `.claude/skills/<skill-name>/SKILL.md`
- Insights file: `.claude/skills/<skill-name>/insights.md` (initially empty)
- Two types: expertise skill (injected via agent frontmatter) or dispatcher skill (`disable-model-invocation: true`)
- Decision rule: shared by 2+ agents = skill. Single-consumer + tightly coupled = merge into agent body. Single-consumer + bulky = bundled reference in `.claude/agents/<agent>/references/`.

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
- Implementation: `.claude/hooks/<hook-name>.js` or `.sh`
- Registration: Add to `.claude/settings.json` under the appropriate event
- Follow the existing pattern: async for pre/post hooks, synchronous for SubagentStop

**New Test:**
- Smoke tests: `.claude/tests/smoke-test-<domain>.js`
- Strategy tests: `.claude/scripts/strategy/tests/`
- Test fixtures: `.claude/tests/fixtures/`

**New Channel Identity Artifact:**
- Channel-level: `channel/` (e.g., new style guide, branding document)
- Strategy output: `channel/strategy/`

## Special Directories

**.claude/agent-memory/:**
- Purpose: Persistent agent learning files
- Generated: Yes (by agents during task execution)
- Committed: Yes (tracked in git, but use targeted `git add` to avoid sweeping unrelated changes)

**.claude/scratch/:**
- Purpose: Ephemeral agent workspace for intermediate files
- Generated: Yes (by agents during execution)
- Committed: No (should be gitignored or cleaned up)

**.claude/logs/:**
- Purpose: Agent run observability logs (JSONL format)
- Generated: Yes (by pipeline-observe.sh hook)
- Committed: Selectively (observations may be committed, raw run logs typically not)

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

*Structure analysis: 2026-04-20*

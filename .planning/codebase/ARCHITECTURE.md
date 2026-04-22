# Architecture

**Analysis Date:** 2026-04-22

## Pattern Overview

**Overall:** Multi-Agent Pipeline with Skill Injection and Unified Memory System

This is a Claude Code subagent-based production pipeline for dark mysteries documentary videos. There is no traditional application runtime -- the entire system is a collection of Claude Code agent definitions (`.claude/agents/*.md`), shared skills (`.claude/skills/*/SKILL.md`), Python helper scripts (`.claude/scripts/`), and hook-based observability. The human user dispatches agents via `@agent-name` or `/skill-name` commands in Claude Code. Agents produce artifacts (markdown files, JSON manifests, media assets) in a per-project directory structure.

**Key Characteristics:**
- **Agent-per-domain:** Each agent owns a single domain (research, writing, visual planning, asset processing, etc.) with explicit boundary declarations ("I do not write scripts. I do not conduct research.")
- **Skill injection via frontmatter:** Shared behavioral knowledge is injected into agents via the `skills:` field in agent YAML frontmatter. Skills provide domain expertise; agent bodies define procedures.
- **Artifact-based handoff:** Agents communicate through files on disk -- a researcher writes `Research.md`, the writer reads it; the visual planner writes `shotlist.json`, the asset processor reads it. There is no in-memory message passing.
- **Human-in-the-loop checkpoints:** Several pipeline stages (topic selection, asset review, script review) require explicit user approval before proceeding.
- **Memory persistence:** Each agent has a `MEMORY.md` file (`.claude/agent-memory/<agent>/MEMORY.md`) auto-injected at task start. The observer system writes all memory updates; agents treat MEMORY.md as read-only.

## Layers

**Channel Identity Layer:**
- Purpose: Define the channel's brand, voice, visual style, and content pillars
- Location: `channel/`
- Contains: Channel DNA (`channel.md`), voice profile (`voice-profile.md`), visual style guide (`VISUAL_STYLE_GUIDE.md`), past topics list (`past_topics.md`)
- Depends on: Nothing (foundational)
- Used by: Nearly all agents via `@channel/channel.md` context injection

**Agent Definition Layer:**
- Purpose: Define each agent's identity, procedure, tools, and domain boundaries
- Location: `.claude/agents/*.md`
- Contains: 12 agent definitions (researcher, writer, strategy, style-extractor, visual-researcher, visual-planner, asset-processor, asset-curator, compiler, code-reviewer, observer, editorial-lead in memory)
- Depends on: Skill layer (via `skills:` frontmatter), Channel Identity layer (via `@channel/` references)
- Used by: Claude Code runtime (dispatched by user via `@agent-name`)

**Skill Layer:**
- Purpose: Provide shared domain expertise and behavioral protocols injected into agents at startup
- Location: `.claude/skills/*/SKILL.md`
- Contains: 21 skills spanning meta-behavior (agent-protocols, agent-observability, evolve, pipeline-design), domain expertise (visual-narrative, media-evaluation, archive-search, crawl4ai-scraping, data-analysis, structured-output), and user-invocable pipeline dispatchers (strategy, strategy-scrape, strategy-analyze, strategy-topics, compile, process-assets, write-script, visual-plan, assets-download, assets-embed, assets-search, assets-score)
- Depends on: Nothing (knowledge only, no executable dependencies)
- Used by: Agent definitions via `skills:` frontmatter

**Script Layer:**
- Purpose: Execute deterministic operations (web scraping, data analysis, media processing, CLIP embedding)
- Location: `.claude/scripts/`
- Contains: Subdirectories organized by domain:
  - `editorial/researcher/` -- Survey, deepen, and synthesize research passes (`cli.py`, `fetcher.py`, `tiers.py`, `url_builder.py`, `writer.py`)
  - `editorial/writer/` -- Script generation helpers (`cli.py`)
  - `strategy/channel_assistant/` -- Competitor scraping, analysis, topic generation, project init (`cli.py`, `scraper.py`, `analyzer.py`, `database.py`, `topics.py`, `trend_scanner.py`, `project_init.py`, `registry.py`, `models.py`)
  - `media/` -- Asset download, CLIP embedding, semantic search, video processing (`download.py`, `embed.py`, `search.py`, `ingest.py`, `pool.py`, `evaluate.py`, `discover.py`, `export_clips.py`, `organize_assets.py`, `promote.py`, `crawl_images.py`, `wiki_screenshots.py`, `ia_search.py`)
  - `memory/` -- Memory management scripts (`evolve.js`)
  - `obs-summarize.js` -- Compresses obs.jsonl into ~2-5KB markdown summaries
- Depends on: Python conda environments, external tools (FFmpeg, yt-dlp, crawl4ai, CLIP model)
- Used by: Agents invoke these via `Bash` tool calls with pinned Python interpreters

**Hooks Layer:**
- Purpose: Lifecycle hooks for observability and memory management
- Location: `.claude/hooks/`
- Contains:
  - `pipeline-observe.js` -- Main observability hook (Node.js); logs tool calls, durations, errors to `.claude/logs/observations/<project>/obs.jsonl`
  - `check-memory-limit.js` -- SubagentStop hook that warns when agent MEMORY.md exceeds 200 lines
- Depends on: Claude Code hook system (PreToolUse, PostToolUse, PostToolUseFailure, PermissionDenied, SubagentStop events)
- Used by: Registered in `.claude/settings.json`, fires automatically on every tool call and agent completion

**Data Layer:**
- Purpose: Persistent storage for channel strategy data and asset catalogs
- Location: `data/`
- Contains:
  - `channel_assistant.db` -- SQLite database for competitor channel metadata, video data, and analysis results
  - `asset_catalog.db` -- SQLite database for global asset library metadata (paths, categories, quality scores, tags)
- Depends on: Strategy and asset-curator scripts
- Used by: Strategy agent (competitor analysis), asset-curator agent (library management)

**Project Layer:**
- Purpose: Per-documentary output artifacts organized in a standard directory structure
- Location: `projects/<project-name>/`
- Contains: Subdirectories for each pipeline stage (research, script, visuals, assets, compilation/edit)
- Depends on: All upstream agents producing artifacts into the correct subdirectories
- Used by: Each downstream agent reads the upstream agent's output

**Coordination Layer:**
- Purpose: Cross-agent coordination and shared learning inbox
- Location: `.claude/PLAYBOOK.md` (primary) and `.claude/orchestration/PLAYBOOK.md` (legacy)
- Contains: `PLAYBOOK.md` -- staging area for cross-agent handoff signals (authored by `@observer`, consumed by target agents, Open/Resolved lifecycle)
- Depends on: Observer agent, agent-protocols skill
- Used by: Target agents at task start (per agent-protocols)

## Data Flow

**Documentary Production Pipeline (Primary Flow):**

1. **Strategy** (`@strategy`): Scrape competitors, analyze trends, generate 5 scored topic candidates. Writes to `channel/strategy/`. User selects a topic.
2. **Project Init** (`@strategy`): Scaffold `projects/<name>/` with `metadata.json`, `research/`, `script/`, `visuals/`, `assets/` directories.
3. **Research** (`@researcher`): Multi-pass research (survey, deepen, gap-fill, synthesize). Writes `Research.md`, `entity_index.json`, `source_manifest.json`, raw sources to `projects/<name>/research/`.
4. **Script Writing** (`@writer`): Transform research dossier into 3,000-7,000 word documentary script. Writes `Script.md` to `projects/<name>/script/`.
5. **Visual Research** (`@visual-researcher`): Define visual intent per chapter, gather primary visual resources. Writes `visual_brief.json`, `media_leads.json`, downloads images to `projects/<name>/visuals/` and `projects/<name>/assets/`.
6. **Visual Planning** (`@visual-planner`): Generate structured shotlist with timing, b-roll curation, archive searches. Writes `shotlist.json` to `projects/<name>/visuals/`.
7. **Asset Processing** (`@asset-processor`): Download media, generate CLIP embeddings, run semantic search, score relevance. Writes to `projects/<name>/assets/`. User reviews and approves assets.
8. **Asset Curation** (`@asset-curator`): Deduplicate, evaluate reuse potential, promote assets to global library at `D:/Youtube/D. Mysteries Channel/3. Assets/`.
9. **Compilation** (`@compiler`): Compile edit sheet for DaVinci Resolve with timing-synced asset references. Writes `edit_sheet.md` and `manifest.json` to `projects/<name>/edit/`.

**Memory Learning Pipeline (Secondary Flow):**

1. `pipeline-observe.js` captures all tool calls and agent lifecycle events to `obs.jsonl`
2. User invokes `/evolve` skill to trigger memory learning
3. `@observer` agent reads `obs.jsonl`, extracts learnings, classifies via scope-test questions
4. Observer writes candidates to `## Pending Review` sections in MEMORY.md / insights.md files
5. User reviews via `/evolve` -- promote, edit, or revert (git history as rollback)
6. Cross-agent insights route through PLAYBOOK.md (observer writes, target agents consume)

**State Management:**
- No shared runtime state -- all state lives in files on disk
- Agent memory (`.claude/agent-memory/<agent>/MEMORY.md`) persists cross-session learnings (read-only for agents; observer writes)
- Skill insights (`.claude/skills/<skill>/insights.md`) accumulate learning from skill usage (observer writes)
- Cross-agent signals staged in `.claude/PLAYBOOK.md` (observer writes; agents read at task start)

## Key Abstractions

**Agent Definition:**
- Purpose: A self-contained domain expert with identity, tools, procedures, and file conventions
- Examples: `.claude/agents/researcher.md`, `.claude/agents/writer.md`, `.claude/agents/observer.md`
- Pattern: YAML frontmatter (name, description, model, memory, color, skills, tools) + markdown body (identity, procedures, file conventions, task classification)

**Skill:**
- Purpose: Shared domain knowledge injected into agents via frontmatter
- Examples: `.claude/skills/agent-protocols/SKILL.md`, `.claude/skills/visual-narrative/SKILL.md`
- Pattern: Two types -- (1) expertise skills (provide knowledge, `user-invocable: true/false`) and (2) dispatcher skills (invoke agents with canned prompts, `disable-model-invocation: true`)

**Pipeline Dispatcher Skill:**
- Purpose: User-invocable shortcuts that dispatch agents with pre-built prompts and verification gates
- Examples: `.claude/skills/strategy/SKILL.md`, `.claude/skills/compile/SKILL.md`, `.claude/skills/process-assets/SKILL.md`
- Pattern: `disable-model-invocation: true` + Instructions section that verifies prerequisites then dispatches an agent

**Observer Agent:**
- Purpose: Post-run learning extraction, scope classification, memory routing
- Location: `.claude/agents/observer.md`
- Invoked via: `/evolve` skill (dispatches observer automatically) or direct `@observer` dispatch
- Reads: `obs.jsonl` log files, existing MEMORY.md / insights.md files
- Writes: `## Pending Review` sections in memory files, PLAYBOOK.md entries

**Project Directory:**
- Purpose: Container for all artifacts produced during a documentary's production
- Examples: `projects/duplessis-orphans/`, `projects/parallel-test-a-hinterkaifeck/`
- Pattern: Standard subdirectory structure: `research/`, `script/`, `visuals/`, `assets/`, `compilation/` (or `edit/`)

**Task Classification:**
- Purpose: Every agent classifies subtasks as `[DETERMINISTIC]` or `[HEURISTIC]` before execution
- Pattern: Deterministic tasks (data extraction, counting, formatting) execute systematically. Heuristic tasks (narrative design, quality judgment) apply judgment.

## Entry Points

**User-to-Agent Dispatch:**
- Location: `.claude/agents/*.md` (invoked via `@agent-name` in Claude Code)
- Triggers: User command in Claude Code conversation
- Responsibilities: Execute domain-specific tasks, produce artifacts, read MEMORY.md at start

**User-to-Skill Dispatch (Pipeline Commands):**
- Location: `.claude/skills/*/SKILL.md` (invoked via `/skill-name` in Claude Code)
- Triggers: User command (e.g., `/strategy`, `/compile`, `/evolve`, `/process-assets`)
- Responsibilities: Verify prerequisites, dispatch appropriate agent with structured prompt, present results

**Python CLI Entry Points:**
- Location:
  - `.claude/scripts/editorial/researcher/__main__.py` -- `python -m researcher <command> "<topic>"`
  - `.claude/scripts/editorial/writer/__main__.py` -- `python -m writer <command> "<project>"`
  - `.claude/scripts/strategy/channel_assistant/__main__.py` -- `python -m channel_assistant <command>`
- Triggers: Bash tool calls from agents with pinned Python interpreters
- Responsibilities: Execute deterministic data operations (scraping, analysis, file generation)

**Hook Entry Points:**
- Location: `.claude/settings.json` (registration), `.claude/hooks/` (implementations)
- Triggers: Claude Code lifecycle events (PreToolUse, PostToolUse, PostToolUseFailure, PermissionDenied, SubagentStop)
- Responsibilities: Log observability data to obs.jsonl, check memory limits

## Error Handling

**Strategy:** Two-tier script failure policy (defined in `pipeline-design` skill)

**Patterns:**
- **Environment broken (ImportError, missing binary, wrong interpreter):** Stop immediately. Report diagnostic. Do not substitute fallback. A broken environment is a configuration problem.
- **Process blocked (single URL 403, rate limited, paywalled):** Fall back for that specific case only. Continue the rest of the pipeline.
- **Agent-level:** Every agent definition includes "If a script fails, report the error and stop. Do NOT fall back to Claude-native capabilities." (with the exception of the researcher, which has specific fallback rules for individual URL failures).
- **FFmpeg safety:** Specific operational safeguards documented in asset-processor: pipe deadlock prevention (`proc.communicate()` not `proc.stdout.read()`), partial decode tolerance, mandatory timeouts, write-to-temp-then-rename.
- **VRAM management:** One embed process at a time, 90-minute video length limit, CUDA OOM recovery via batch size reduction.

## Cross-Cutting Concerns

**Logging/Observability:** `pipeline-observe.js` (Node.js hook) logs every tool call (pre/post/fail/permission-denied) and subagent lifecycle to `.claude/logs/observations/<project>/obs.jsonl`. The `agent-observability` skill provides a structured schema for reading these logs. `obs-summarize.js` at `.claude/scripts/obs-summarize.js` produces ~2-5KB markdown digests.

**Validation:** No centralized validation framework. Each agent performs its own input validation (checking prerequisite files exist, verifying data format). Dispatcher skills (e.g., `process-assets`) include verification gates before dispatching agents.

**Authentication:** No authentication layer. `.env` file present for environment configuration. All LLM calls route through Claude Code subagent dispatches (Claude Max subscription). Direct API calls to `api.anthropic.com` are explicitly prohibited (billing rule in `CLAUDE.md`).

**Memory/Learning:** Two-tier persistent memory system managed by observer:
1. Agent memory (`.claude/agent-memory/<agent>/MEMORY.md`) -- universal cross-project learnings, append-only, 200-line limit, observer-written
2. Skill insights (`.claude/skills/<skill>/insights.md`) -- accumulated learnings per skill, observer-written

**Quality Gates:** Script quality gates are performed by human review (user approves at each pipeline stage). The `@observer` agent serves as the cross-agent learning extractor, not a quality gate. Historical editorial-lead quality gates are preserved in agent-memory.

---

*Architecture analysis: 2026-04-22*

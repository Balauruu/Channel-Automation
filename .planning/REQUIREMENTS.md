# Requirements: Channel-Automation V0.6

**Defined:** 2026-04-09
**Core Value:** Every agent retains specialized expertise and accumulates knowledge across sessions. Cross-agent feedback propagation (downstream insights influencing upstream behavior) is the single most important capability.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: CLAUDE.md contains project context, folder map, architecture rules, and pipeline routing table
- [ ] **FOUND-02**: Directory structure created (`.claude/agents/`, `.claude/skills/`, `.claude/rules/`, `.claude/hooks/`, `.claude/scripts/`)
- [ ] **FOUND-03**: Channel identity docs (channel.md, voice profile, visual style guide) integrated as `channel/` files at project root (per D-10)
- [ ] **FOUND-04**: CLAUDE.md serves as project entry point with documentation-only agent reference table (per D-01 -- no orchestrator agent, no `"agent"` field in settings.json)
- [ ] **FOUND-05**: Windows path handling validated with smoke tests (project path has spaces and periods)
- [ ] **FOUND-06**: Skill crafting guide included as reference at `.claude/references/skill-crafting-guide.md`

### Agents

- [ ] **AGNT-01**: Orchestrator agent definition with routing table, human checkpoint rules, and delegation instructions
- [ ] **AGNT-02**: Strategy agent (consolidated: Strategy Lead + Market Analyst) with full persona and tool scoping
- [ ] **AGNT-03**: Researcher agent with documentary research expertise and 3-pass pipeline instructions
- [ ] **AGNT-04**: Writer agent with voice profile awareness, script generation procedures, and style consistency rules
- [ ] **AGNT-05**: Style Extractor agent for channel voice extraction from reference scripts
- [ ] **AGNT-06**: Editorial Lead agent for research quality gating and editorial coordination
- [ ] **AGNT-07**: Visual Researcher agent for visual intent definition, mood-to-visual mapping, and primary resource gathering
- [ ] **AGNT-08**: Visual Planner agent for shotlist generation, b-roll curation, and archive search
- [ ] **AGNT-09**: Asset Processor agent for downloads, CLIP embeddings, semantic search, and relevance scoring
- [ ] **AGNT-10**: Asset Curator agent for global library management and cross-project asset deduplication
- [ ] **AGNT-11**: Meta agent (consolidated: Meta Lead + Pipeline Observer + Code Reviewer + UX Improver) with pipeline health and code quality focus
- [ ] **AGNT-12**: Compiler agent (if not merged into Media Lead — evaluate during Phase 1) for edit sheet compilation and DaVinci Resolve preparation
- [ ] **AGNT-13**: All agents include mental model instructions in system prompt (read MEMORY.md at start, update after work)
- [ ] **AGNT-14**: All agents include SIGNALS.md reading instructions (read cross-agent insights at start, contribute after work)
- [ ] **AGNT-15**: Agent tool scoping — each agent's `tools` field restricts capabilities to their domain

### Skills

- [ ] **SKIL-01**: Documentary research skill (`.claude/skills/documentary-research/`) with 3-memory-layer structure (SKILL.md, insights.md, references/)
- [ ] **SKIL-02**: Archive search skill for Internet Archive/Prelinger navigation and YouTube search
- [ ] **SKIL-03**: Visual narrative skill for shot planning and visual storytelling
- [ ] **SKIL-04**: Media evaluation skill for asset quality scoring and relevance grading
- [ ] **SKIL-05**: Crawl4ai scraping skill for web research with browser automation
- [ ] **SKIL-06**: Data analysis skill for statistical analysis and trend detection
- [ ] **SKIL-07**: Autoresearch skill (Karpathy-style iterative research loop)
- [ ] **SKIL-08**: Structured output skill for reports and JSON formatting
- [ ] **SKIL-09**: All skills follow crafting guide structure: SKILL.md < 200 lines, prompts/, scripts/, references/exemplar_*.md, insights.md
- [ ] **SKIL-10**: All skills include reflection phase (re-read output, evaluate, append one-line insight to insights.md)
- [ ] **SKIL-11**: All skills include Phase 0 context loading (read insights.md + exemplars before starting)
- [ ] **SKIL-12**: Heuristic vs deterministic sections explicitly tagged in all skills
- [ ] **SKIL-13**: Inter-skill verification gates at pipeline stage boundaries (research→script, script→visual plan, visual plan→assets)

### Pipeline Triggers

- [ ] **PIPE-01**: `/strategy` skill — triggers competitor analysis, topic generation, project initialization
- [ ] **PIPE-02**: `/research` skill — triggers 3-pass research pipeline for a topic
- [ ] **PIPE-03**: `/write-script` skill — triggers script generation from research dossier
- [ ] **PIPE-04**: `/visual-plan` skill — triggers visual research + shotlist generation from script
- [ ] **PIPE-05**: `/process-assets` skill — triggers asset download, embedding, semantic search, and scoring
- [ ] **PIPE-06**: `/compile` skill — triggers edit sheet compilation and asset organization for DaVinci Resolve
- [ ] **PIPE-07**: All pipeline skills invoke existing Python scripts via Bash (scripts stay as-is)
- [ ] **PIPE-08**: Human checkpoints enforced at topic selection (after `/strategy`) and asset review (after `/process-assets`)

### Memory Architecture

- [ ] **MEMO-01**: Per-agent persistent memory via `memory: project` — each agent gets `.claude/agent-memory/<name>/MEMORY.md`
- [ ] **MEMO-02**: MEMORY.md structured with Pi mental model categories: key_files, decisions, patterns, observations, open_questions
- [ ] **MEMO-03**: Mental model instructions baked into each agent's system prompt (read at start, notice during work, update after work, prune when large)
- [ ] **MEMO-04**: Seed initial MEMORY.md files by converting existing V5 YAML expertise files to markdown
- [ ] **MEMO-05**: Per-skill insights.md learning loop — each skill appends one-line insights per run, reads at next run start
- [ ] **MEMO-06**: Insight lifecycle management — merge duplicates at 20+ entries, promote to SKILL.md when 3+ entries point at same issue
- [ ] **MEMO-07**: Exemplar curation slots in each skill's references/ directory (2-3 max per skill)
- [ ] **MEMO-08**: SIGNALS.md — single shared cross-agent insights file for durable pipeline patterns
- [ ] **MEMO-09**: SIGNALS.md read by orchestrator (passes relevant insights in delegation prompts) and by agents when directly invoked
- [ ] **MEMO-10**: SIGNALS.md writable by any agent after work — structured by source agent with timestamped one-line entries

### Hooks & Enforcement

- [ ] **HOOK-01**: PreToolUse domain enforcement hook — blocks unauthorized agent writes based on per-agent allowed directory map
- [ ] **HOOK-02**: Domain rules defined in a JSON config keyed by agent name, referenced by hook script
- [ ] **HOOK-03**: PostToolUse session logging hook — captures Agent tool delegations in project-local JSONL
- [ ] **HOOK-04**: `/audit-agents` validation skill — checks all agent definitions for required fields, valid tool scoping, skill references, memory setup

### Integration

- [ ] **INTG-01**: All Python scripts invocable by agents via Bash tool (strategy, editorial, media scripts)
- [ ] **INTG-02**: GPU conda environment accessible for CLIP operations (`C:/Users/iorda/miniconda3/envs/perception-models/`)
- [ ] **INTG-03**: SQLite databases (channel_assistant.db, asset_catalog.db) accessible by relevant agents
- [ ] **INTG-04**: Global video library (`D:/VideoLibrary/`) accessible by Asset Curator agent
- [ ] **INTG-05**: End-to-end pipeline validated: topic → research → script → visuals → assets → edit sheet

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Orchestration

- **ORCH-01**: Agent Teams for parallel pipeline stages (experimental, wait for Claude Code stability)
- **ORCH-02**: Per-agent cost tracking via SubagentStop hooks
- **ORCH-03**: Automated pipeline stage chaining (currently user-triggered)

### Enhanced Memory

- **EMEM-01**: Project-specific signal files (`projects/N/feedback/signals.md`) for per-video insights
- **EMEM-02**: Memory consolidation automation (auto-prune agent MEMORY.md when approaching 200-line limit)
- **EMEM-03**: Cross-session pipeline analytics (trend analysis across multiple video productions)

### Quality

- **QUAL-01**: A/B testing framework for skill improvements
- **QUAL-02**: Exemplar auto-curation (auto-save high-rated outputs to skill references/)
- **QUAL-03**: Pipeline error pattern logging (`data/error_patterns.jsonl`)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Footer UI / TUI status display | Pi-specific; Claude Code has its own status line |
| 3-tier delegation (orchestrator → lead → worker nesting) | Claude Code hard constraint — subagents cannot spawn subagents |
| Pi CLI extension system (.pi/extensions/ TypeScript) | Entirely replaced by Claude Code native features |
| Wiki/documentation site (Astro/Starlight) | Separate concern, not part of pipeline migration |
| Rebuilding Python scripts | Scripts are battle-tested; only invocation layer changes |
| Custom subprocess spawner | Claude Code Agent tool handles delegation natively |
| Template variable resolution engine | Replaced by native memory, skills, and shell injection |
| Active listener pattern (read conversation log) | Claude Code subagents are isolated — pass context forward instead |
| Custom config parser for YAML team config | Distributed config via agent files is simpler |
| Agent Teams (experimental) | Deferred to v2 — Windows limitations, instability, ~15x token cost |
| Split-pane tmux mode | Not available on Windows Terminal |
| MCP server for pipeline tools | Unnecessary — Python scripts are directly invocable via Bash |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| AGNT-01 | Phase 1 | Pending |
| AGNT-02 | Phase 3 | Pending |
| AGNT-03 | Phase 1 | Pending |
| AGNT-04 | Phase 1 | Pending |
| AGNT-05 | Phase 3 | Pending |
| AGNT-06 | Phase 3 | Pending |
| AGNT-07 | Phase 3 | Pending |
| AGNT-08 | Phase 3 | Pending |
| AGNT-09 | Phase 3 | Pending |
| AGNT-10 | Phase 3 | Pending |
| AGNT-11 | Phase 3 | Pending |
| AGNT-12 | Phase 3 | Pending |
| AGNT-13 | Phase 1 | Pending |
| AGNT-14 | Phase 5 | Pending |
| AGNT-15 | Phase 3 | Pending |
| SKIL-01 | Phase 2 | Pending |
| SKIL-02 | Phase 2 | Pending |
| SKIL-03 | Phase 2 | Pending |
| SKIL-04 | Phase 2 | Pending |
| SKIL-05 | Phase 2 | Pending |
| SKIL-06 | Phase 2 | Pending |
| SKIL-07 | Phase 2 | Pending |
| SKIL-08 | Phase 2 | Pending |
| SKIL-09 | Phase 2 | Pending |
| SKIL-10 | Phase 2 | Pending |
| SKIL-11 | Phase 2 | Pending |
| SKIL-12 | Phase 2 | Pending |
| SKIL-13 | Phase 5 | Pending |
| PIPE-01 | Phase 4 | Pending |
| PIPE-02 | Phase 4 | Pending |
| PIPE-03 | Phase 4 | Pending |
| PIPE-04 | Phase 4 | Pending |
| PIPE-05 | Phase 4 | Pending |
| PIPE-06 | Phase 4 | Pending |
| PIPE-07 | Phase 4 | Pending |
| PIPE-08 | Phase 4 | Pending |
| MEMO-01 | Phase 3 | Pending |
| MEMO-02 | Phase 3 | Pending |
| MEMO-03 | Phase 3 | Pending |
| MEMO-04 | Phase 3 | Pending |
| MEMO-05 | Phase 3 | Pending |
| MEMO-06 | Phase 3 | Pending |
| MEMO-07 | Phase 3 | Pending |
| MEMO-08 | Phase 5 | Pending |
| MEMO-09 | Phase 5 | Pending |
| MEMO-10 | Phase 5 | Pending |
| HOOK-01 | Phase 4 | Pending |
| HOOK-02 | Phase 4 | Pending |
| HOOK-03 | Phase 4 | Pending |
| HOOK-04 | Phase 4 | Pending |
| INTG-01 | Phase 6 | Pending |
| INTG-02 | Phase 6 | Pending |
| INTG-03 | Phase 6 | Pending |
| INTG-04 | Phase 6 | Pending |
| INTG-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 61 total
- Mapped to phases: 61
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after roadmap creation (phase assignments updated, count corrected from 55 to 61)*

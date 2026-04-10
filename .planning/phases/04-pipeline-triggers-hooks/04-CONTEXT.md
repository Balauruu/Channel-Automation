# Phase 4: Pipeline Triggers & Hooks - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can run every pipeline stage via slash commands, agent delegations are logged, and an audit skill validates the agent system's health. Delivers: 6 pipeline trigger slash commands (with sub-commands for multi-operation stages), a session logging hook capturing agent dispatches, and an agent audit skill with auto-fix capability.

**Descoped from original phase:** Domain enforcement hooks (HOOK-01, HOOK-02) — deferred. The `tools:` frontmatter field + agent body instructions provide sufficient scoping. Revisit if issues emerge during Phase 6 integration testing.

</domain>

<decisions>
## Implementation Decisions

### Pipeline Skill Architecture
- **D-01:** Pipeline commands are user-invocable slash commands that auto-dispatch agents via the Agent/Task tool. The user types `/research`, the command dispatches `@researcher`. This is NOT auto-orchestration (rejected in Phase 1 D-01) — the user explicitly triggers each stage. The command handles workflow mechanics (setup, dispatch, checkpoint).
- **D-02:** Agents already have domain skills injected via `skills:` frontmatter. Pipeline commands coordinate WHEN agents run and with WHAT context — they don't duplicate or replace domain expertise.
- **D-03:** Pre-Phase 6 mode — agents use Claude's native capabilities (WebSearch, WebFetch, Read, Bash) without invoking Python scripts. Phase 6 adds Python script invocations as an enhancement layer. Pipeline is fully usable from Phase 4.

### Context Flow
- **D-04:** Project directory convention — each pipeline stage writes output to `projects/<name>/` following naming conventions (research-dossier.md, script.md, visual-brief.md, shotlist.md, etc.). Next stage reads previous stage's output from the same directory.
- **D-05:** Auto-create — the first pipeline command that runs for a topic auto-creates `projects/<name>/` with standard subdirectories. No separate `/init` step required.

### Command Structure
- **D-06:** Two-tier commands for multi-operation stages — unified command runs the full pipeline, sub-commands available for granular control:
  - `/strategy` (full) + `/strategy-scrape`, `/strategy-analyze`, `/strategy-topics` (granular)
  - `/process-assets` (full) + `/assets-download`, `/assets-embed`, `/assets-search`, `/assets-score` (granular)
- **D-07:** Single commands for single-operation or internally-managed stages:
  - `/research` — researcher agent manages the 3-pass process internally
  - `/write-script` — writer agent manages load/generate/revise internally
  - `/visual-plan` — auto-chains @visual-researcher then @visual-planner sequentially
  - `/compile` — single-agent, single-operation

### Agent Chaining
- **D-08:** Multi-agent stages chain automatically — `/visual-plan` dispatches @visual-researcher first, waits for output, then dispatches @visual-planner with that output. One command, two agents, sequential.

### Human Checkpoints
- **D-09:** Present and pause + guide to next step. At checkpoint stages (`/strategy` after topic generation, `/process-assets` after asset review), the command presents results, stops, and tells the user what to run next. No auto-continuation.

### Domain Enforcement — DEFERRED
- **D-10:** Domain enforcement hooks (HOOK-01, HOOK-02) are deferred from Phase 4. Rationale: PreToolUse hooks cannot natively identify which agent is running (no `agent_name` in hook input). The `tools:` frontmatter field already restricts agent capabilities, and agent body instructions define scope boundaries. Per-agent write path enforcement adds complexity without proportional benefit at this stage.

### Session Logging
- **D-11:** Agent dispatches only — log when agents are dispatched and when they complete. Fields: timestamp, agent name, task description, duration, outcome. No logging of individual tool calls (Read/Write/Edit/Bash).
- **D-12:** Log location: `logs/sessions.jsonl` at project root. Single file, append-only, gitignored.
- **D-13:** Dual-event logging — PreToolUse hook on Agent/Task tool calls logs dispatch (start). SubagentStop hook logs completion (end). Together they provide duration and outcome tracking.

### Agent Audit
- **D-14:** `/audit-agents` validates all 12 agent definitions across 4 dimensions:
  1. Required frontmatter fields (name, description, model, memory, skills)
  2. Tool scoping validity (only valid Claude Code tool names)
  3. Skill references (every `skills:` entry exists under `.claude/skills/`)
  4. Memory setup (every `memory: project` agent has corresponding MEMORY.md)
- **D-15:** Cross-consistency checks across the system:
  - CLAUDE.md agent reference table matches actual agent files
  - config.json `agent_skills` has entries for all agents
  - No orphan memory directories or skill directories
- **D-16:** Output format: structured console report (pass/fail per check with fix suggestions), followed by a prompt offering to auto-fix approved changes.

### Claude's Discretion
- Pipeline command internal structure and formatting
- Exact JSONL log schema field names and structure
- `/audit-agents` report format and fix implementation details
- Sub-command naming conventions (e.g., `/strategy-scrape` vs `/strategy scrape`)
- Project directory subdirectory naming conventions
- How auto-fix suggestions are presented and confirmed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture and stack reference
- `.planning/research/ARCHITECTURE.md` — Directory structure, agent definition templates, pipeline orchestration stages
- `.planning/research/STACK.md` — Claude Code extension points (agents, hooks, MCP, skills, memory), all frontmatter fields, hook input format

### Prior phase context
- `.planning/phases/01-foundation-architecture-validation/01-CONTEXT.md` — User-invoked only (D-01), fat agent bodies + shared skills (D-05/D-06), human checkpoints instruction-based (D-03)
- `.planning/phases/02-skills-library/02-CONTEXT.md` — Skills provide expertise not procedures (D-01), lead coordination becomes pipeline skills (D-07)
- `.planning/phases/03-agent-migration-memory/03-CONTEXT.md` — 12 agent roster (D-01), media-lead dropped/coordination to pipeline skills (D-02/D-03), agent persona depth (D-06-D-08)

### Existing agents (dispatch targets)
- `.claude/agents/*.md` — All 12 agent definitions with frontmatter (name, model, memory, skills, tools)
- `.claude/skills/agent-protocols/SKILL.md` — Shared behavioral protocol injected into all agents

### Existing skills (domain expertise already in agents)
- `.claude/skills/` — 8 domain skills available: documentary-research, archive-search, crawl4ai-scraping, visual-narrative, media-evaluation, data-analysis, autoresearch, structured-output

### Config reference
- `.planning/config.json` — `agent_skills` mapping for all 12 agents
- `.claude/settings.json` — Current hooks config (empty `hooks: {}`, ready for registration)

### Project requirements
- `.planning/REQUIREMENTS.md` — PIPE-01 through PIPE-08, HOOK-03, HOOK-04 (HOOK-01/HOOK-02 deferred)
- `.planning/PROJECT.md` — Project charter, constraints, V5 migration context

### Claude Code hooks documentation
- Context7 `/anthropics/claude-code` — PreToolUse/PostToolUse/SubagentStop hook input format, command vs prompt hook types, permissionDecision response structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 12 agent definitions in `.claude/agents/` — all fully configured with personas, tool scoping, skills injection, memory
- 9 skills in `.claude/skills/` — 8 domain skills + agent-protocols shared skill
- `config.json` `agent_skills` mapping — complete mapping for all 12 agents
- `.claude/settings.json` — has empty `hooks: {}` ready for hook registration
- `.claude/hooks/`, `.claude/rules/`, `.claude/scripts/` directories exist (empty, ready for content)

### Established Patterns
- Agent frontmatter: `name`, `description`, `model: sonnet`, `memory: project`, `color`, `skills: [agent-protocols, ...]`, `tools: [...]`
- Skills use YAML frontmatter with `user-invocable: true/false`
- Agent body structure: `<project_context>` block, Identity, Channel Context (`@file`), Procedures, Output Format
- `@file` syntax for referencing external docs in agent/skill bodies

### Integration Points
- `.claude/settings.json` `hooks` — where PreToolUse and SubagentStop hooks will be registered
- `.claude/hooks/` — directory for hook scripts
- `.claude/scripts/` — directory for audit validation scripts
- `projects/` — output directory for pipeline stage results (to be created by pipeline commands)
- `logs/` — directory for session JSONL log (to be created)

</code_context>

<specifics>
## Specific Ideas

- User confirmed the two-layer model: pipeline commands coordinate workflow, agents do work with injected domain skills
- User wants both unified commands AND granular sub-commands for multi-operation stages (strategy, process-assets) — power user flexibility
- Domain enforcement was descoped after research showed hooks can't natively identify the active agent — user decided tools: field + instructions are sufficient
- Session logging focuses on agent dispatches only (not all tool calls) — pipeline observability, not full audit trail
- /audit-agents should report + suggest fixes + offer auto-fix on approval — not silent auto-repair

</specifics>

<deferred>
## Deferred Ideas

- Domain enforcement hooks (HOOK-01, HOOK-02) — deferred from Phase 4. Revisit if agent scope violations emerge during Phase 6 integration testing
- Python script invocation in pipeline commands — Phase 6 adds script calls as enhancement layer
- SIGNALS.md feedback propagation — Phase 5
- Verification gates at pipeline boundaries — Phase 5

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-pipeline-triggers-hooks*
*Context gathered: 2026-04-11*

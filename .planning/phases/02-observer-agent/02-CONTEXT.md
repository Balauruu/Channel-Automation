# Phase 2: Observer Agent - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the @observer subagent that reads obs.jsonl, extracts reusable learnings from completed runs, classifies them via the 3-layer scope-test questions, and writes tagged entries to ## Pending Review sections in the correct memory file. Includes cursor-based incremental processing, deduplication, self-loop prevention, and rejection logging.

</domain>

<decisions>
## Implementation Decisions

### Learning Signal Types
- **D-01:** Broad extraction — observer looks for ALL signal types: error patterns & recoveries, successful strategies, tool usage anti-patterns, decision rationale from thinking blocks, and coordination issues between agents. Confidence scoring separates valuable insights from noise.
- **D-02:** Full analysis with thinking blocks — observer reads thinking blocks (captured at 10KB cap per turn) to understand WHY agents made decisions, not just WHAT they did. This is where the richest learnings live.
- **D-03:** Batch by run — observer groups events by run (contiguous events with same agent_id or session). Analyzes each run as a unit, extracts 0-3 learnings per run. Natural boundary that keeps context focused.

### Entry Format
- **D-04:** Distilled + evidence pointer — each Pending Review entry is a 1-2 sentence distilled insight with confidence tag `[HIGH]`/`[MED]`/`[LOW]`, source agent name, and timestamp pointer to the source run. Entry stands alone without needing to dig into obs.jsonl.
- **D-05:** Strip pointer on promote — when an entry is promoted from ## Pending Review to ## Permanent during /evolve, the evidence pointer is removed. Promoted entries are clean, concise insights only.

### PLAYBOOK.md Bootstrap
- **D-06:** Minimal bootstrap in Phase 2 — create a bare `.claude/PLAYBOOK.md` with just ## Pending Review and ## Permanent sections. Observer writes orchestration insights there. Phase 4 redesigns the full structure (Open/Resolved, lifecycle).
- **D-07:** Location is `.claude/PLAYBOOK.md` — top-level in .claude/ as a cross-agent coordination file, not scoped to any single agent or skill.

### Rejection Logging
- **D-08:** Dedicated rejections file at `.claude/logs/observations/<project>/rejections.jsonl`. Each JSONL line includes: candidate text, rejection reason (which scope-test failed), confidence, source agent, source run timestamp.
- **D-09:** Same rotation as obs.jsonl — 10MB cap with timestamped archive, 30-day purge. Reuses rotation logic from pipeline-observe.js.

### Claude's Discretion
- Observer agent definition structure (frontmatter fields, tool selection, skill injection)
- Cursor storage mechanism and format (where the observer tracks its read position)
- Deduplication algorithm (how to compare new candidates against existing entries)
- Self-loop prevention implementation (agent_id filtering approach)
- Observer prompt engineering (the core prompt that drives learning extraction)
- Entry formatting details (exact markdown structure within Pending Review sections)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — OBSV-01 through OBSV-08 and MEML-01 define all observer requirements
- `.planning/PROJECT.md` — Key decisions table (scope-test questions, confidence model, observer as Sonnet 4.6, pending review staging, no self-loop)

### Phase 1 Output (Observer's Input)
- `.claude/hooks/pipeline-observe.js` — Event schema, truncation caps (D-09/D-10), rotation logic to reuse for rejections.jsonl
- `.planning/phases/01-capture-hardening/01-CONTEXT.md` — Phase 1 decisions: agent_id field semantics, event detail levels, output paths

### Agent Patterns
- `.claude/agents/researcher.md` — Reference pattern for agent definition (YAML frontmatter + markdown body, model field, skills field, tools list)
- `.claude/skills/agent-protocols/SKILL.md` — Current agent behavioral protocols (observer must follow same memory lifecycle)

### Memory Write Targets
- `.claude/agent-memory/*/MEMORY.md` — Agent-layer write targets (11 files, mostly empty sections)
- `.claude/skills/*/insights.md` — Skill-layer write targets (5 files with existing entries)
- `.claude/PLAYBOOK.md` — Orchestration-layer write target (to be bootstrapped by this phase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipeline-observe.js` rotation logic (lines ~30-50): 10MB cap, timestamped archive, 30-day purge — reuse for rejections.jsonl rotation
- `pipeline-observe.js` project slug detection: determines obs directory path — observer needs same logic to find its input
- `check-memory-limit.js`: JS hook pattern reference (stdin JSON, try/catch, process.exit(0))
- Agent definition YAML frontmatter pattern: `model`, `skills`, `tools`, `memory`, `color` fields

### Established Patterns
- Agent definitions: YAML frontmatter + markdown body in `.claude/agents/`
- CommonJS with Node.js stdlib only — zero npm dependencies
- JSONL format for event storage (one JSON object per line)
- Memory files: 5-section structure (Key Files, Decisions, Patterns, Observations, Open Questions)
- insights.md: append-only with `- [YYYY-MM-DD] observation` format, merge at 20+ entries

### Integration Points
- Observer reads from: `.claude/logs/observations/<project>/obs.jsonl`
- Observer writes to: `.claude/agent-memory/<agent>/MEMORY.md`, `.claude/skills/<skill>/insights.md`, `.claude/PLAYBOOK.md`
- Observer writes rejections to: `.claude/logs/observations/<project>/rejections.jsonl`
- Phase 3 (/evolve) will dispatch this observer then present Pending Review entries

</code_context>

<specifics>
## Specific Ideas

- Entry format example: `- [HIGH] researcher: Always verify Wikipedia dates against primary sources before committing to dossier — two corrections needed in Duplessis run (2026-04-18T10:22)`
- On promote, strip everything after the insight (the "— evidence pointer" part)
- PLAYBOOK.md starts minimal — just Pending Review + Permanent. Phase 4 adds the full message bus structure
- Rejection log mirrors obs.jsonl format (JSONL) for consistency across the observation pipeline

</specifics>

<deferred>
## Deferred Ideas

- Remove all files related to the old memory system (signals.yaml, project-memories/ references, old scratchpad paths, etc.) — future cleanup phase after new system is operational

</deferred>

---

*Phase: 02-observer-agent*
*Context gathered: 2026-04-20*

# Phase 3: Evolve Command - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the `/evolve` skill that dispatches the @observer subagent for new runs, auto-promotes all Pending Review entries to Permanent sections across memory files, shows a summary, and lets the user revert specific entries by number. Includes a JS helper script for deterministic file operations (scan, promote, revert).

</domain>

<decisions>
## Implementation Decisions

### Review Interaction Flow
- **D-01:** File-at-a-time presentation — entries grouped by target file per EVLV-02 ordering (insights.md files first, then MEMORY.md files, then PLAYBOOK.md).
- **D-02:** Auto-promote with batch override — no per-entry human gate. /evolve auto-promotes ALL Pending Review entries to Permanent, then shows a numbered summary. User can revert specific entries by number after the fact. This changes EVLV-03 from "per-entry review" to "auto-promote with optional revert." PROJECT.md Out of Scope entry "Auto-promotion without human review" should be updated to reflect this v1 decision.
- **D-03:** Promote-first, show-after — auto-promote immediately, then display what was promoted. Git history is the safety net for recovery.
- **D-04:** No "edit" option — actions are promote (automatic) or reject (revert/delete). Simplifies the UX to a single post-summary interaction.

### Observer Dispatch Behavior
- **D-05:** Always observe first — every /evolve invocation dispatches @observer for new events, then promotes all Pending Review entries (including any from prior observer runs).
- **D-06:** Quick exit on empty state — "No new events. No pending entries. Nothing to do." and exit immediately.
- **D-07:** Current project only — use CLAUDE_PROJECT_DIR env var to derive project slug and locate obs.jsonl. Same project detection logic as pipeline-observe.js.
- **D-08:** Brief inline stats from observer — show key numbers after observer completes: runs processed, entries written, rejections. Enough visibility without flooding.

### Revert Mechanics
- **D-09:** Revert = delete from Permanent section — simple removal via Edit tool (or JS script). No git-level revert. Git history is already the safety net for recovery.
- **D-10:** Numbered revert prompt — after showing the summary, plain text prompt: "Revert any? (enter numbers, or press Enter to keep all)". User types numbers (e.g., "2,4") to revert. Single interaction.

### Skill Architecture
- **D-11:** Skill + JS helper — `.claude/skills/evolve/SKILL.md` (user-invocable, orchestration flow) + `.claude/scripts/memory/evolve.js` (deterministic file operations). Skill dispatches observer and handles UX; script handles file scanning, promotion, and revert operations.
- **D-12:** Script location at `.claude/scripts/memory/evolve.js` — new `memory/` subdirectory for memory-related scripts. Sets up for Phase 5 lifecycle scripts (decay, consolidation).
- **D-13:** Three subcommands — `scan` (find all Pending Review entries across files, output JSON), `promote` (move all Pending Review → Permanent, strip pointers, output JSON), `revert` (delete specific entries by file:index, output JSON). All output is structured JSON for skill consumption.
- **D-14:** Same promotion pattern for all files — all 21 memory files use ## Pending Review → ## Permanent. insights.md entries use the same pattern (no special merge into main body).
- **D-15:** Strip evidence pointer on promote — per Phase 2 D-05. Entry `- [HIGH] researcher: insight text (2026-04-18T10:22)` becomes `- [HIGH] researcher: insight text` after promotion.

### Claude's Discretion
- JS script internal structure (function decomposition, error handling)
- Exact JSON output schema for scan/promote/revert commands
- Skill prompt structure and observer dispatch prompt
- How to handle edge cases (malformed entries, missing ## Pending Review headings)
- Commit strategy for promoted changes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — EVLV-01, EVLV-02, EVLV-03 (note: EVLV-03 needs updating to reflect auto-promote decision D-02)
- `.planning/PROJECT.md` — Key decisions table, Out of Scope section (needs update re: auto-promotion)

### Phase Dependencies
- `.planning/phases/01-capture-hardening/01-CONTEXT.md` — JS CommonJS pattern, project slug detection, pipeline-observe.js conventions
- `.planning/phases/02-observer-agent/02-CONTEXT.md` — Observer decisions: D-04 (entry format), D-05 (strip pointer on promote), D-06/D-07 (PLAYBOOK.md location), D-08/D-09 (rejections.jsonl)

### Observer Agent (Dispatch Target)
- `.claude/agents/observer.md` — Complete agent definition with 10-step processing pipeline, scope-test questions, entry format specs, guardrails. This is what /evolve dispatches.

### Memory Write Targets
- `.claude/PLAYBOOK.md` — Orchestration-layer target (## Pending Review → ## Permanent)
- `.claude/agent-memory/*/MEMORY.md` — 12 agent-layer targets (same section pattern)
- `.claude/skills/*/insights.md` — 8 skill-layer targets (same section pattern). Note: autoresearch skill has been deprecated and manually deleted.

### Existing Code (Reuse Patterns)
- `.claude/hooks/pipeline-observe.js` — Project slug detection logic to reuse in evolve.js
- `.claude/scripts/obs-summarize.js` — Reference pattern for cross-domain JS script (CommonJS, JSON output)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipeline-observe.js` project slug detection: regex on CLAUDE_PROJECT_DIR to derive obs directory path — evolve.js needs identical logic
- `obs-summarize.js`: CommonJS script pattern with `module.exports` and JSON output — reference for evolve.js structure
- Observer agent completion report format: structured text output with run counts, entry counts, rejection breakdowns — skill parses this for brief inline stats

### Established Patterns
- CommonJS with Node.js stdlib only (fs, path) — zero npm dependencies
- kebab-case.js for script files
- JSON output from scripts consumed by skills/agents
- `## Pending Review` / `## Permanent` section pattern across all 21 memory files
- Entry format: `- [CONF] agent: insight text (timestamp)` for MEMORY.md/PLAYBOOK.md
- Entry format: `- [YYYY-MM-DD] [CONF] insight text (from: agent, timestamp)` for insights.md

### Integration Points
- Skill dispatches @observer via Agent tool with `subagent_type: "observer"`
- Script reads from: all `.claude/agent-memory/*/MEMORY.md`, `.claude/skills/*/insights.md`, `.claude/PLAYBOOK.md`
- Script writes to: same files (promote = move between sections, revert = delete from Permanent)
- Project detection: `CLAUDE_PROJECT_DIR` env var → slug → `.claude/logs/observations/<slug>/obs.jsonl`

</code_context>

<specifics>
## Specific Ideas

- The preview mockup from discussion shows the exact UX flow: numbered entries grouped by file, "Revert any? (numbers, or Enter to keep all)" prompt
- autoresearch skill is deprecated and manually deleted — do not reference it in examples or target file lists
- EVLV-03 requirement text needs updating before planning: original "promote/edit/revert per entry" → actual "auto-promote all, revert by number after summary"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-evolve-command*
*Context gathered: 2026-04-21*

# Phase 6: Old Memory Cleanup - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all traces of the old broken memory system (project-memories/, signals.yaml, stale agent-memory references, deprecated skills, old hooks, dead test fixtures, stale documentation) so the codebase only contains the new unified memory system. This is the final cleanup phase of the Unified Memory System milestone.

</domain>

<decisions>
## Implementation Decisions

### Live File Cleanup
- **D-01:** Remove stale CLAUDE.md Folder Map entries (`project-memories/`, `feedback/signals.yaml`) and add new system paths (PLAYBOOK.md, logs/observations/) — keeps the Folder Map accurate for all agents that read it at task start.
- **D-02:** Remove `.gitignore` entry for `.claude/project-memories/` — directory is gone and won't be recreated; dead gitignore entries add confusion.

### Uncommitted Deletions
- **D-03:** Commit all 8 git-tracked deletions in a single Phase 6 commit — `obs.js`, `check-definition-signals.js`, `autoresearch/SKILL.md`, `autoresearch/insights.md`, and 4 old test fixture `.jsonl` files in `tests/fixtures/observability/`.
- **D-04:** The `autoresearch` skill deletion is intentional (confirmed by user) — include in Phase 6 cleanup.

### Planning Docs Refresh
- **D-05:** Regenerate codebase maps via `/gsd-map-codebase` — ARCHITECTURE.md, STRUCTURE.md, CONCERNS.md all describe the old system. Fresh maps reflect the new unified memory system accurately.
- **D-06:** Rewrite PROJECT.md "Current State (Broken)" section to reflect the working unified memory system — replace outdated description with current state.

### Verification Scope
- **D-07:** Full codebase grep for old-system terms (`project-memories`, `signals.yaml`, `obs.js`, `logs/runs`, `scratchpad`, `check-definition-signals`) across the entire repo including `.planning/`.
- **D-08:** Leave historical phase artifacts (PLAN.md, SUMMARY.md, RESEARCH.md) in place but fix actionable references — update paths and file names that point to dead locations. Narrative context stays intact.

### Claude's Discretion
- Exact wording for CLAUDE.md Folder Map new entries
- Exact wording for PROJECT.md "Current State" rewrite
- Which specific references in historical phase artifacts need path fixes vs. which are purely narrative
- Commit message wording and ordering of operations
- How to handle edge cases found during the full grep audit

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level
- `.planning/ROADMAP.md` — Phase 6 goal and dependencies
- `.planning/PROJECT.md` — Key decisions table, "Current State" section (to be rewritten)
- `.planning/REQUIREMENTS.md` — MEML-03 mentions old system terms in requirement description
- `CLAUDE.md` — Folder Map section (to be updated)
- `.gitignore` — project-memories/ entry (to be removed)

### Prior Phase Context
- `.planning/phases/04-agent-consumption/04-CONTEXT.md` — D-17 (settings.json cleanup already done), D-14 (obs.jsonl path only)
- `.planning/phases/02-observer-agent/02-CONTEXT.md` — Deferred idea that originated Phase 6

### Files to Delete (git rm)
- `.claude/hooks/obs.js` — Old observation hook (replaced by pipeline-observe.js)
- `.claude/hooks/check-definition-signals.js` — Old signals hook (signals.yaml system removed)
- `.claude/skills/autoresearch/SKILL.md` — Deprecated skill (intentional deletion)
- `.claude/skills/autoresearch/insights.md` — Deprecated skill insights
- `.claude/tests/fixtures/observability/tool-events.jsonl` — Old test fixtures for obs.js
- `.claude/tests/fixtures/observability/transcript-errored.jsonl` — Old test fixture
- `.claude/tests/fixtures/observability/transcript-stopped.jsonl` — Old test fixture
- `.claude/tests/fixtures/observability/transcript.jsonl` — Old test fixture

### Codebase Maps (to be regenerated)
- `.planning/codebase/ARCHITECTURE.md` — Describes old project-memories/, signals.yaml, feedback system
- `.planning/codebase/STRUCTURE.md` — Lists project-memories/ and feedback/ directories
- `.planning/codebase/CONCERNS.md` — Documents issues with old obs.js (now resolved)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Prior phase cleanup audits (Phase 4 plan 04-03) already defined grep patterns for old-system terms — reuse those patterns for the full verification sweep
- `gsd-map-codebase` command available for codebase map regeneration

### Established Patterns
- Phase 4 D-17 established the pattern: grep for old terms, verify zero matches in live files
- Git deletions use `git rm` for tracked files, single commit per logical cleanup unit

### Integration Points
- CLAUDE.md is read by every agent at task start — Folder Map accuracy directly affects all agent behavior
- Codebase maps are read by planning workflows — stale maps mislead phase researchers and planners
- PROJECT.md is read at milestone start — outdated "Current State" section misleads future milestones

</code_context>

<specifics>
## Specific Ideas

- The 8 uncommitted deletions accumulated across prior phases but were never staged. Phase 6 commits them as a single cleanup batch.
- The autoresearch skill is unrelated to the memory system but its deletion was intentional and is included in Phase 6 for housekeeping.
- Codebase map regeneration should happen AFTER all file deletions and updates, so the maps reflect the final clean state.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-old-memory-cleanup*
*Context gathered: 2026-04-21*

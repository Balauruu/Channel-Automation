---
phase: 03-agent-migration-memory
plan: 04
subsystem: agents
tags: [agent-migration, memory-seeding, config, claude-md, smoke-test]

# Dependency graph
requires:
  - phase: 03-01
    provides: "10 new agent definitions with frontmatter and MEMORY.md"
  - phase: 03-02
    provides: "Agent body templates with Identity, project_context, domain procedures"
  - phase: 03-03
    provides: "Smoke test suite for agent validation"
provides:
  - "Researcher and writer agents with domain skills injected into frontmatter"
  - "Reseeded researcher and writer MEMORY.md with rich V5 domain knowledge"
  - "Complete 12-agent config.json agent_skills mapping"
  - "Updated CLAUDE.md agent reference table (no Phase 3 markers)"
  - "136/136 smoke test validation across all 12 agents"
affects: [04-feedback-propagation, 05-pipeline-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [memory-seeding-from-v5, skill-injection-via-config]

key-files:
  created: []
  modified:
    - ".claude/agents/researcher.md"
    - ".claude/agents/writer.md"
    - ".claude/agent-memory/researcher/MEMORY.md"
    - ".claude/agent-memory/writer/MEMORY.md"
    - ".planning/config.json"
    - "CLAUDE.md"

key-decisions:
  - "V5 expertise merged into MEMORY.md Decisions/Patterns sections (7 entries each) rather than separate expertise files"
  - "tools: field added to researcher and writer frontmatter matching all other agents (Read, Write, Edit, Bash, Grep, Glob)"

patterns-established:
  - "Memory seeding: merge V5 agent body + read-only expertise into Decisions and Patterns sections"
  - "Config-driven skill injection: agent_skills in config.json is the source of truth for each agent's skills: frontmatter"

requirements-completed: [AGNT-15, MEMO-01, MEMO-02, MEMO-03, MEMO-04, MEMO-05, MEMO-06]

# Metrics
duration: 3min
completed: 2026-04-10
---

# Phase 3 Plan 4: Existing Agent Updates & Final Validation Summary

**Researcher and writer agents updated with domain skills and rich V5 MEMORY.md seeds; config.json complete with 12-agent mapping; CLAUDE.md agent table finalized; 136/136 smoke tests pass**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-10T11:16:40Z
- **Completed:** 2026-04-10T11:19:31Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Researcher agent frontmatter updated with documentary-research, archive-search, crawl4ai-scraping skills plus tools field
- Writer agent frontmatter updated with documentary-research, structured-output skills plus tools field
- Researcher MEMORY.md reseeded with 6 key files, 7 decisions, 7 patterns from V5 expertise (survey-evaluation.md, synthesis.md)
- Writer MEMORY.md reseeded with 6 key files, 7 decisions, 7 patterns from V5 expertise (generation.md)
- config.json agent_skills expanded from 8 to 12 entries (added editorial-lead, style-extractor, code-reviewer, compiler)
- CLAUDE.md agent reference table updated: Phase 3 markers removed, strategy-lead renamed to strategy, code-reviewer added
- Full smoke test suite passes: 136/136 checks across all 12 agents

## Task Commits

Each task was committed atomically:

1. **Task 1: Update researcher and writer agents with domain skills and reseed MEMORY.md files** - `1ecbdb8` (feat)
2. **Task 2: Update config.json with all 12 agents and update CLAUDE.md agent reference table** - `e9ecb4f` (feat)

## Files Created/Modified
- `.claude/agents/researcher.md` - Added domain skills and tools to frontmatter
- `.claude/agents/writer.md` - Added domain skills and tools to frontmatter
- `.claude/agent-memory/researcher/MEMORY.md` - Full reseed with V5 domain knowledge
- `.claude/agent-memory/writer/MEMORY.md` - Full reseed with V5 domain knowledge
- `.planning/config.json` - Added 4 missing agents to agent_skills (12 total)
- `CLAUDE.md` - Updated agent reference table, removed Phase 3 markers

## Decisions Made
- V5 expertise (survey-evaluation.md, synthesis.md, generation.md) merged into MEMORY.md Decisions and Patterns sections rather than creating separate expertise files -- Claude Code's memory system handles this natively
- tools: field set to Read, Write, Edit, Bash, Grep, Glob for both agents, matching the pattern established by Wave 1 agents in Plan 01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 12 agents validated with full smoke test suite (136/136)
- Phase 3 agent migration complete -- ready for Phase 4 (feedback propagation) or Phase 5 (pipeline integration)
- config.json agent_skills mapping complete for all agents
- CLAUDE.md accurately reflects the final agent roster

## Self-Check: PASSED

All 7 files verified present. Both task commits (1ecbdb8, e9ecb4f) verified in git log.

---
*Phase: 03-agent-migration-memory*
*Completed: 2026-04-10*

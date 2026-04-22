---
phase: 06-old-memory-cleanup
plan: 02
subsystem: planning-docs
tags: [codebase-maps, grep-audit, cleanup, documentation]

requires:
  - phase: 06-01
    provides: deleted deprecated files, updated CLAUDE.md, updated PROJECT.md

provides:
  - Accurate codebase maps reflecting pipeline-observe.js, obs.jsonl, @observer, /evolve, PLAYBOOK.md
  - Full grep audit confirming zero actionable stale references in live files
  - settings.local.json cleaned of signals.yaml permission entries

affects: [future-phase-planners, gsd-planning-workflow]

tech-stack:
  added: []
  patterns: [manual codebase map regeneration without /gsd-map-codebase command]

key-files:
  created:
    - .planning/phases/06-old-memory-cleanup/06-02-SUMMARY.md
  modified:
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/STRUCTURE.md
    - .planning/codebase/CONCERNS.md
    - .planning/codebase/CONVENTIONS.md
    - .planning/codebase/INTEGRATIONS.md
    - .planning/codebase/STACK.md
    - .planning/codebase/TESTING.md
    - .claude/settings.local.json

key-decisions:
  - "All obs.js grep matches in codebase maps are obs.jsonl/obs-summarize.js/pipeline-observe.js substrings — new system terms, not stale"
  - "PROJECT.md and ROADMAP.md matches are requirement descriptions and phase goal statements naming old terms as removed — narrative, not actionable"
  - "settings.local.json had two remaining stale entries (mkdir feedback, cp signals.yaml) — fixed as Rule 1 deviation since Plan 01 SUMMARY incorrectly claimed they were removed"
  - ".claude/worktrees/ contains stale parallel-agent worktrees — out of audit scope (not main working tree)"
  - "docs/ROADMAP.md lines 70/77 (logs/runs, obs.js) are historical dev journal entries from 2026-04-17/18 — narrative, leave intact"

requirements-completed: [CLEANUP-04, CLEANUP-05]

duration: ~15min
completed: 2026-04-22
---

# Phase 06 Plan 02: Codebase Map Regeneration and Grep Audit Summary

**Regenerated all 7 codebase maps to accurately describe pipeline-observe.js/obs.jsonl/@observer/evolve system; full grep audit confirmed zero actionable stale references in live files.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-22T09:50:00Z
- **Completed:** 2026-04-22T10:05:00Z
- **Tasks:** 3 (Tasks 1 + 2 combined into one commit per plan; Task 3 is the commit itself)
- **Files modified:** 8 (7 codebase maps + settings.local.json)

## Accomplishments

- All 7 `.planning/codebase/` maps regenerated from current codebase state: correct hook name (pipeline-observe.js not .sh), observer agent, /evolve skill, obs.jsonl paths, PLAYBOOK.md lifecycle, new test structure (smoke-test-observe.js, smoke-test-evolve.js, eval-*.js)
- Full 6-pattern grep audit run across entire repo; all matches classified as narrative or new-system terms — zero actionable stale references remain in any live file
- settings.local.json cleaned: removed `mkdir -p .claude/feedback` and `cp feedback/signals.yaml .claude/feedback/` permission entries that persisted from before Plan 01

## Task Commits

1. **Task 1: Regenerate codebase maps** - `5dec2f9` (docs)
2. **Task 2: Grep audit** - no separate commit (audit found only one fixup needed, combined below)
3. **Task 3: Commit codebase maps** - `5dec2f9` (already committed in Task 1 per plan)

**Deviation fix:** `[in progress — metadata commit will follow]` (settings.local.json fix)

## Files Created/Modified

- `.planning/codebase/ARCHITECTURE.md` — Updated to describe pipeline-observe.js (not .sh), @observer agent, /evolve skill, two-tier memory system (no project-memories/)
- `.planning/codebase/STRUCTURE.md` — Removed project-memories/ and feedback/ directories; added observer/, memory/evolve.js, new test files, PLAYBOOK.md location
- `.planning/codebase/CONCERNS.md` — Removed resolved old-system concerns (obs.js dead hook, check-definition-signals, feedback signal infrastructure); updated to current state
- `.planning/codebase/CONVENTIONS.md` — Updated to reflect observer-written memory (agents read-only), new confidence tags [HIGH/MED/LOW], pipeline-observe.js (not Bash)
- `.planning/codebase/INTEGRATIONS.md` — Updated hook table to pipeline-observe.js Node.js commands, correct obs.jsonl output path, observer/evolve memory pipeline
- `.planning/codebase/STACK.md` — Removed Bash from secondary languages (hook is now Node.js), added evolve.js and eval scripts
- `.planning/codebase/TESTING.md` — Replaced old smoke test suite (smoke-test-observability.js, smoke-test-feedback.js, etc.) with new suite (smoke-test-observe.js, smoke-test-evolve.js, eval-observer.js, eval-evolve.js); updated fixture locations
- `.claude/settings.local.json` — Removed stale `mkdir .claude/feedback` and `cp feedback/signals.yaml` permission entries

## Decisions Made

- All `obs.js` grep matches in codebase maps are false positives from `obs.jsonl`, `obs-summarize.js`, `pipeline-observe.js` substrings — confirmed new-system terms per plan's disambiguation rule
- PROJECT.md and ROADMAP.md matches for `project-memories` / `signals.yaml` are requirement description text and phase goal statements — classified as narrative per D-08 and the plan's explicit MEML-03 note
- `docs/ROADMAP.md` lines 70/77 (`logs/runs`, `obs.js`) are a historical developer journal entry from April 2026 describing the old problem — narrative, left intact
- `.claude/worktrees/` directories excluded from audit scope — stale parallel-agent worktrees not part of the main working tree

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] settings.local.json still had stale signals.yaml entries**
- **Found during:** Task 2 (grep audit)
- **Issue:** Plan 01 SUMMARY stated these entries were removed, but the file still contained `mkdir -p .claude/feedback` and `cp feedback/signals.yaml .claude/feedback/` permission entries. settings.local.json is gitignored/untracked so git diff couldn't catch it.
- **Fix:** Removed both lines from the permissions allow list
- **Files modified:** `.claude/settings.local.json`
- **Verification:** `grep "signals.yaml" .claude/settings.local.json` returns zero matches
- **Committed in:** metadata commit (file is gitignored, not tracked in git)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug: Plan 01 cleanup missed settings.local.json)
**Impact on plan:** Minor fix to a gitignored file. No scope creep.

## Grep Audit Results

Full 6-pattern audit across all `.md`, `.js`, `.json`, `.yaml`, `.sh` files:

| Term | Total matches | Actionable | Narrative | Status |
|------|--------------|------------|-----------|--------|
| `project-memories` | ~46 | 0 | 46 | All in `.planning/phases/` artifacts, PROJECT.md requirements, ROADMAP.md phase goal |
| `signals.yaml` | ~50 | 0 | 50 | All in `.planning/phases/` artifacts, PROJECT.md requirements; settings.local.json fixed (gitignored) |
| `obs.js` | ~100+ | 0 | all | All are `obs.jsonl`, `obs-summarize.js`, or `pipeline-observe.js` substrings (new system); historical dev journal in docs/ROADMAP.md |
| `logs/runs` | ~23 | 0 | 23 | All in `.planning/phases/` artifacts; TESTING.md match is a negative-test assertion |
| `scratchpad` | ~22 | 0 | 22 | All in `.planning/phases/` artifacts and PROJECT.md requirement descriptions |
| `check-definition-signals` | ~15 | 0 | 15 | All in `.planning/phases/` artifacts, REQUIREMENTS.md, ROADMAP.md phase goal |

**Zero actionable stale references in any live file.**

Note: `.claude/worktrees/` contained stale worktree copies with old file versions — these are out-of-scope (parallel-agent artifacts, not the main working tree).

## Known Stubs

None — this plan only updates documentation files. No stubs introduced.

## Threat Flags

None — no new security surface introduced. Documentation-only changes.

## Self-Check

- FOUND: `.planning/codebase/ARCHITECTURE.md`
- FOUND: `.planning/codebase/STRUCTURE.md`
- FOUND: `.planning/codebase/CONCERNS.md`
- FOUND: `.planning/codebase/CONVENTIONS.md`
- FOUND: `.planning/codebase/INTEGRATIONS.md`
- FOUND: `.planning/codebase/STACK.md`
- FOUND: `.planning/codebase/TESTING.md`
- FOUND commit: 5dec2f9 (docs(phase-06): regenerate codebase maps for clean unified memory system)
- VERIFIED: `grep -r "project-memories" .planning/codebase/` returns 0 matches
- VERIFIED: `grep -r "signals\.yaml" .planning/codebase/` returns 0 matches
- VERIFIED: `grep -r "check-definition-signals" .planning/codebase/` returns 0 matches
- VERIFIED: `.planning/codebase/STRUCTURE.md` does not list project-memories/ or feedback/ directories
- VERIFIED: `.planning/codebase/ARCHITECTURE.md` describes pipeline-observe.js as the capture hook

## Self-Check: PASSED

## Next Phase Readiness

Phase 6 (Old Memory Cleanup) is fully complete. The repo now contains only the new unified memory system with no stale references in any live file:
- All deprecated files removed (Plan 01)
- All live docs updated (Plan 01)
- All codebase maps regenerated (Plan 02)
- Full grep audit passed with zero actionable findings (Plan 02)

No blockers for future phases.

---
*Phase: 06-old-memory-cleanup*
*Completed: 2026-04-22*

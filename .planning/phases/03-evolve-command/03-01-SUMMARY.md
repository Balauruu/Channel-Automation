---
phase: 03-evolve-command
plan: 01
subsystem: memory-evolution
tags: [evolve, deterministic-script, scan, promote, revert, tdd]
dependency_graph:
  requires: []
  provides: [evolve-js-scan, evolve-js-promote, evolve-js-revert, evolve-test-fixtures]
  affects: [.claude/scripts/memory/evolve.js, .claude/tests/eval-evolve.js]
tech_stack:
  added: []
  patterns: [lazy-env-resolution, section-parsing, pointer-stripping, global-index-addressing]
key_files:
  created:
    - .claude/scripts/memory/evolve.js
    - .claude/tests/eval-evolve.js
    - .claude/tests/fixtures/evolve/memory.md
    - .claude/tests/fixtures/evolve/insights.md
    - .claude/tests/fixtures/evolve/playbook.md
  modified:
    - .gitignore
decisions:
  - Lazy PROJECT_ROOT evaluation via getter functions to support test env overrides without require-cache issues
  - Insert Permanent section immediately before Pending Review heading (not after file preamble)
  - Global index assignment follows file discovery order (insights -> memory -> playbook)
metrics:
  duration_seconds: 1481
  completed: 2026-04-21T08:45:43Z
  tasks_completed: 2
  tasks_total: 2
  test_count: 12
  test_pass: 12
---

# Phase 03 Plan 01: Evolve.js Deterministic Helper Summary

Node.js CommonJS script with scan/promote/revert subcommands for memory file manipulation, plus 12-test eval suite covering EVLV-02 ordering and EVLV-03 promote/revert mechanics.

## What Was Built

### evolve.js (.claude/scripts/memory/evolve.js)
- **discoverTargetFiles()**: Scans .claude/skills/*/insights.md, .claude/agent-memory/*/MEMORY.md, .claude/PLAYBOOK.md in that order
- **parseSections(content)**: Line-by-line markdown section parser extracting ## headings and bullet entries
- **stripPointer(entry)**: Removes evidence timestamps from MEMORY.md format `(YYYY-MM-DDThh:mm)` and insights.md format `(from: agent, YYYY-MM-DDThh:mm)`
- **scan()**: Returns JSON with all Pending Review entries across discovered files
- **promote()**: Moves entries from Pending Review to Permanent (creates section if absent), strips pointers, assigns global indices
- **revert(indices)**: Removes entries from Permanent by global index, processing highest-first to avoid offset corruption

### eval-evolve.js (.claude/tests/eval-evolve.js)
12 test cases covering:
- Scan ordering (insights before memory before playbook)
- Scan entry count accuracy
- Scan empty state
- Promote creates Permanent section
- Promote moves entries and clears Pending Review
- Promote strips memory pointer
- Promote strips insight pointer
- Promote assigns sequential global indices
- Revert removes specific entry
- Revert preserves other entries
- Revert handles multiple indices
- Promote appends to existing Permanent (no duplicate heading)

### Test Fixtures (.claude/tests/fixtures/evolve/)
- memory.md: MEMORY.md with Pending Review entries, no Permanent section
- insights.md: insights.md with Pending Review entries, no Permanent section
- playbook.md: PLAYBOOK.md with both Pending Review and Permanent sections

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lazy PROJECT_ROOT evaluation for testability**
- **Found during:** Task 2 GREEN phase
- **Issue:** `const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd()` evaluated at module load time. Node.js `require()` caches the module, so changing `process.env.CLAUDE_PROJECT_DIR` between tests had no effect.
- **Fix:** Replaced with `getProjectRoot()` and `getClaudeDir()` getter functions that evaluate the env var at call time.
- **Files modified:** .claude/scripts/memory/evolve.js
- **Commit:** ccc4a58

**2. [Rule 3 - Blocking] .gitignore exclusion for eval-evolve.js**
- **Found during:** Task 1 commit
- **Issue:** `.claude/tests/*.js` gitignore rule blocked tracking of eval-evolve.js
- **Fix:** Added `!.claude/tests/eval-evolve.js` exclusion (same pattern as existing eval-observer.js exclusion)
- **Files modified:** .gitignore
- **Commit:** def4b14

## TDD Gate Compliance

- RED gate: `81f234f` (test commit with 12 failing tests)
- GREEN gate: `ccc4a58` (feat commit with implementation passing all 12)
- REFACTOR gate: Not needed (implementation is clean as-is)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | def4b14 | test(03-01): create evolve test fixtures and eval scaffold |
| 2 (RED) | 81f234f | test(03-01): add failing tests for evolve.js scan/promote/revert |
| 2 (GREEN) | ccc4a58 | feat(03-01): implement evolve.js with scan/promote/revert subcommands |

## Known Stubs

None -- all functions are fully implemented and wired.

## Self-Check: PASSED

- All 5 created files exist on disk
- All 3 commits found in git log (def4b14, 81f234f, ccc4a58)
- eval-evolve.js exits 0 with 12/12 passed
- evolve.js scan CLI runs without error

---
phase: 01-capture-hardening
plan: 03
subsystem: infra
tags: [nodejs, hooks, smoke-tests, settings-json, hook-registration, cleanup]

requires:
  - phase: 01-01
    provides: pipeline-observe.js core hook with tool event handlers
  - phase: 01-02
    provides: handleSubagentStop with transcript parsing and duration computation

provides:
  - 13-test smoke suite validating all 7 CAPT requirements end-to-end
  - settings.json wired to pipeline-observe.js for all 5 event types
  - Deprecated bash hook and old test files removed

affects: [02-observer]

tech-stack:
  added: []
  patterns: [execFileSync-stdin-piping-for-hook-testing, temp-directory-isolation]

key-files:
  created:
    - .claude/tests/smoke-test-observe.js
  modified:
    - .claude/settings.json
    - .gitignore

key-decisions:
  - "Updated .gitignore to allow smoke-test-observe.js and remove deprecated test file exceptions"
  - "Staged deprecated test file deletions (smoke-test-observability.js, smoke-test-pipeline.js) alongside settings.json update per D-06"

patterns-established:
  - "Hook testing via execFileSync: invoke hook with JSON stdin and CLAUDE_PROJECT_DIR env, verify obs.jsonl output in temp directory"
  - "Temp directory isolation: makeTmpProject creates obs structure, cleanTmpProject removes in finally block"

requirements-completed: [CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07]

duration: 4min
completed: 2026-04-20
---

# Phase 1 Plan 03: Test Suite and Hook Registration Summary

**13-test smoke suite proving all CAPT-01 through CAPT-07 requirements, settings.json wired to pipeline-observe.js for all 5 event types, deprecated bash hook and old tests removed**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-20T10:56:48Z
- **Completed:** 2026-04-20T11:00:38Z
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 2
- **Files deleted:** 2

## Accomplishments

- Created smoke-test-observe.js (208 lines, 13 tests) covering every CAPT requirement with automated verification using temp directories
- Updated settings.json to register pipeline-observe.js (node) for all 5 hook event types, replacing bash+pipeline-observe.sh
- Removed deprecated test files (smoke-test-observability.js, smoke-test-pipeline.js) per D-06

## Task Commits

Each task was committed atomically:

1. **Task 1: Create smoke-test-observe.js covering CAPT-01 through CAPT-07** - `773a6f2` (test)
2. **Task 2: Update settings.json and remove deprecated pipeline-observe.sh** - `1f98d58` (chore)

## Files Created/Modified

- `.claude/tests/smoke-test-observe.js` - 13-test smoke suite: main+subagent capture, event fields, SubagentStop synthesis, JSON validity, truncation caps, duration computation, rotation, purge, path-with-spaces, project routing
- `.claude/settings.json` - All 5 event types now invoke `node ... pipeline-observe.js` (was `bash ... pipeline-observe.sh`); SubagentStop synchronous at timeout 15, others async at timeout 5
- `.gitignore` - Replaced deprecated test file exceptions with smoke-test-observe.js
- `.claude/tests/smoke-test-observability.js` - Deleted (deprecated per D-06)
- `.claude/tests/smoke-test-pipeline.js` - Deleted (deprecated per D-06)

## Decisions Made

- Updated .gitignore to track the new test file and drop the two deprecated exceptions (Rule 3: blocking issue -- new test file was gitignored)
- Staged deprecated test file deletions in the same commit as settings.json update for clean D-06 closure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] .gitignore blocked new test file from being committed**
- **Found during:** Task 1 (smoke test creation)
- **Issue:** `.gitignore` line `.claude/tests/*.js` blocked the new file; only old test filenames had exceptions
- **Fix:** Replaced deprecated exceptions (`smoke-test-observability.js`, `smoke-test-pipeline.js`) with `!.claude/tests/smoke-test-observe.js`
- **Files modified:** .gitignore
- **Verification:** `git add` succeeded after update
- **Committed in:** 773a6f2 (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for correctness -- without the fix, the test file could not be version-controlled. No scope creep.

## Issues Encountered

None beyond the auto-fixed .gitignore blocking issue documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 (Capture Hardening) is complete: all 3 plans executed, all 7 CAPT requirements verified by automated tests
- Phase 2 (Observer) can proceed -- pipeline-observe.js is fully operational and producing obs.jsonl events for the observer to consume

## Verification Results

Task 1 verification:
- `node .claude/tests/smoke-test-observe.js` exits 0 with 13/13 PASS
- File is 208 lines (>= 150 minimum)
- Tests cover: CAPT-01 (3 tests), CAPT-02 (2 tests), CAPT-03 (2 tests), CAPT-04 (2 tests), CAPT-05 (1 test), CAPT-06 (2 tests), CAPT-07 (1 test)

Task 2 verification:
- settings.json is valid JSON
- All 5 event types reference pipeline-observe.js (5 matches, 0 .sh references)
- SubagentStop: timeout 15, no async flag (synchronous)
- PreToolUse/PostToolUse/PostToolUseFailure/PermissionDenied: async true, timeout 5
- check-memory-limit.js preserved as second SubagentStop hook
- pipeline-observe.sh does not exist on filesystem
- Deprecated test files removed

---
*Phase: 01-capture-hardening*
*Completed: 2026-04-20*

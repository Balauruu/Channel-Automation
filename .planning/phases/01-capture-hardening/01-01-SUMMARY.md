---
phase: 01-capture-hardening
plan: 01
subsystem: infra
tags: [nodejs, hooks, jsonl, event-capture, ntfs-atomic-write]

requires:
  - phase: none
    provides: greenfield

provides:
  - pipeline-observe.js hook capturing 4 tool event types to per-project obs.jsonl
  - atomic JSONL write pattern (fs.appendFileSync)
  - per-project event routing via detectProject regex
  - 10MB rotation with timestamped archives
  - 30-day archive purge with daily throttle
  - tool-specific truncation caps (D-09)
  - SubagentStop placeholder for Plan 02

affects: [01-02, 01-03, 02-observer]

tech-stack:
  added: []
  patterns: [atomic-jsonl-append, stdin-buffered-hook, project-slug-detection]

key-files:
  created:
    - .claude/hooks/pipeline-observe.js
  modified: []

key-decisions:
  - "Used process.argv[2] for event type dispatch (matches settings.json registration pattern)"
  - "Lean event schema with epoch_ms for CAPT-05 duration matching in Plan 02"
  - "Purge throttled via .last-purge marker file mtime check (avoids scanning archives on every hook invocation)"

patterns-established:
  - "Atomic JSONL append: JSON.stringify(obj) + '\\n' via fs.appendFileSync -- single write syscall"
  - "Stdin buffering: process.stdin.on('data'/'end') with try/catch and unconditional process.exit(0)"
  - "Project slug detection: regex /projects[/\\\\]([a-z0-9][a-z0-9-]*)/i across cwd, tool_input, prompt, transcript path"
  - "File rotation: statSync size check before write, renameSync to obs.archive/ with timestamp-pid filename"

requirements-completed: [CAPT-01, CAPT-02, CAPT-04, CAPT-06, CAPT-07]

duration: 2min
completed: 2026-04-20
---

# Phase 1 Plan 01: Core Hook Summary

**Pure Node.js pipeline-observe.js hook capturing tool events to per-project obs.jsonl with atomic writes, truncation caps, 10MB rotation, and 30-day archive purge**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-20T10:47:41Z
- **Completed:** 2026-04-20T10:49:53Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- Created pipeline-observe.js (235 lines) handling PreToolUse, PostToolUse, PostToolUseFailure, PermissionDenied events
- Atomic JSONL writes via fs.appendFileSync -- eliminates the 15% corruption rate from the bash+Python predecessor
- Per-project routing with detectProject regex, tool-specific truncation caps per D-09, and SubagentStop placeholder for Plan 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pipeline-observe.js core hook with tool event handlers** - `4d589b5` (feat)

## Files Created/Modified

- `.claude/hooks/pipeline-observe.js` - Core event capture hook: stdin parsing, project detection, event building, truncation, rotation, purge, atomic append

## Decisions Made

- Used `process.argv[2]` for event type dispatch (matches existing settings.json registration pattern and check-memory-limit.js convention)
- Included `epoch_ms` numeric field for CAPT-05 duration computation in Plan 02
- Purge throttle via `.last-purge` marker file mtime check -- avoids directory scan overhead on every hook invocation
- Archive filename includes PID (`obs-{ts}-{pid}.jsonl`) to prevent collisions when concurrent hooks rotate simultaneously

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 (SubagentStop handler) can add the `subagent_stop` case to the existing switch statement
- Plan 03 (settings.json + smoke tests) can register the hook and validate end-to-end
- The `detectProject` function and `appendEvent` function are ready for reuse by SubagentStop handler

## Verification Results

All 19 acceptance criteria passed:
- Syntax valid (`node -c` exit 0)
- File is 235 lines (>= 180 minimum)
- Contains `'use strict'`, `require('fs')`, `require('path')` -- no other requires
- TRUNCATION_CAPS with all 7 tool keys
- `fs.appendFileSync(` atomic write pattern
- `rotateIfNeeded` with MAX_SIZE (10 * 1024 * 1024)
- `purgeOldArchives` with PURGE_DAYS = 30
- `detectProject` with regex `/projects[/\\]([a-z0-9][a-z0-9-]*)/i`
- `process.exit(0)` unconditional exit
- No `require('child_process')`, no `console.log`, has `process.stderr.write`

Threat model mitigations verified: T-01-01 (atomic write), T-01-02 (always exit 0), T-01-04 (path.join with OBS_BASE), T-01-05 (rotation + purge).

## Self-Check

```
FOUND: .claude/hooks/pipeline-observe.js
FOUND: 4d589b5
```

## Self-Check: PASSED

---
*Phase: 01-capture-hardening*
*Completed: 2026-04-20*

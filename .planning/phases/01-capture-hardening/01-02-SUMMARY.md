---
phase: 01-capture-hardening
plan: 02
subsystem: infra
tags: [nodejs, hooks, subagent-stop, transcript-parsing, duration-computation, event-synthesis]

requires:
  - phase: 01-01
    provides: pipeline-observe.js core hook with tool event handlers and appendEvent utility

provides:
  - handleSubagentStop function synthesizing dispatch + assistant_message[] + complete events
  - computeDurations utility matching tool_pre/tool_post pairs by tool_use_id
  - Transcript JSONL parsing with thinking block capture (10KB cap per D-10)
  - Aggregate stats (tool_calls, tool_fails, permission_denials) from prior obs.jsonl events

affects: [01-03, 02-observer]

tech-stack:
  added: []
  patterns: [transcript-jsonl-parsing, duration-pair-matching, event-synthesis-from-transcript]

key-files:
  created: []
  modified:
    - .claude/hooks/pipeline-observe.js

key-decisions:
  - "Three cap constants (THINKING_CAP=10KB, TEXT_CAP=10KB, PROMPT_CAP=2KB) as top-level constants for SubagentStop-specific truncation"
  - "computeDurations reads obs.jsonl once and builds a map from tool_pre epoch_ms, then matches tool_post events by tool_use_id"
  - "Aggregate stats computed from obs.jsonl scan (not from transcript) since tool events are already captured by Plan 01 handlers"

patterns-established:
  - "Transcript parsing: line-by-line JSONL with per-line try/catch, first user message extraction, assistant turn accumulation"
  - "Duration pair matching: preEvents map keyed by tool_use_id, delete after match to free memory"
  - "Event synthesis: multiple appendEvent calls per SubagentStop (dispatch + N assistant_message + complete)"

requirements-completed: [CAPT-03, CAPT-05]

duration: 2min
completed: 2026-04-20
---

# Phase 1 Plan 02: SubagentStop Handler Summary

**SubagentStop handler parsing transcript JSONL, synthesizing dispatch/assistant_message/complete events, and computing per-tool durations from tool_pre/tool_post epoch_ms pairs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-20T10:53:00Z
- **Completed:** 2026-04-20T10:54:32Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added handleSubagentStop function (100+ lines) that parses subagent transcript JSONL for dispatch prompt and assistant turns with thinking blocks
- Added computeDurations utility that scans obs.jsonl for matching tool_pre/tool_post pairs by tool_use_id to compute per-tool execution time
- SubagentStop now synthesizes 3 event types: dispatch (with prompt, agent_type, cwd), assistant_message (with text, thinking, tokens, stop_reason), and complete (with outcome, tool counts, durations)
- Graceful fallback when transcript file is missing or empty -- minimal events still written

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement handleSubagentStop with transcript parsing and event synthesis** - `a001f67` (feat)

## Files Created/Modified

- `.claude/hooks/pipeline-observe.js` - Extended with handleSubagentStop, computeDurations, and three cap constants (THINKING_CAP, TEXT_CAP, PROMPT_CAP). File grew from 235 to 404 lines.

## Decisions Made

- Three cap constants (THINKING_CAP=10240, TEXT_CAP=10240, PROMPT_CAP=2048) placed as top-level constants alongside existing TRUNCATION_CAPS
- computeDurations reads obs.jsonl once, builds preEvents map keyed by tool_use_id, matches on tool_post, deletes matched entries to avoid memory buildup
- Aggregate stats (tool_calls, tool_fails, permission_denials) computed by scanning obs.jsonl for the agent's prior events, not from the transcript

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 (settings.json update + smoke tests) can register SubagentStop in settings.json and validate the full event pipeline end-to-end
- The observer (Phase 2) now has full subagent execution detail: reasoning (thinking blocks), performance metrics (durations), and aggregate stats

## Verification Results

All acceptance criteria passed:
- Syntax valid (`node -c` exit 0)
- handleSubagentStop function present with transcript parsing
- computeDurations function present with tool_pre/tool_post matching by tool_use_id
- THINKING_CAP = 10240, TEXT_CAP = 10240, PROMPT_CAP = 2048
- Three synthesized event types: dispatch, assistant_message, complete
- dispatch includes prompt, agent_type, cwd fields
- assistant_message includes text, thinking, input_tokens, output_tokens, stop_reason fields
- complete includes outcome, tool_calls, tool_fails, permission_denials, durations fields
- switch statement has `case 'subagent_stop'` calling handleSubagentStop(data, obsFile, project)
- fs.existsSync used before reading transcript (graceful fallback)

Threat model mitigations verified: T-01-07 (TEXT_CAP + THINKING_CAP limit output per turn), T-01-08 (obs.jsonl read-back only at SubagentStop, bounded by 10MB rotation).

## Self-Check

```
FOUND: .claude/hooks/pipeline-observe.js
FOUND: a001f67
```

## Self-Check: PASSED

---
*Phase: 01-capture-hardening*
*Completed: 2026-04-20*

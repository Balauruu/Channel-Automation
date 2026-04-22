---
phase: 05-memory-lifecycle
plan: 01
subsystem: memory-lifecycle
tags: [decay, evolve, tdd, memory-lifecycle]
dependency_graph:
  requires: []
  provides: [decay-engine, decay-remove, decay-upgrade, extractTimestamp, extractConfidence]
  affects: [.claude/scripts/memory/evolve.js, .claude/skills/evolve/SKILL.md]
tech_stack:
  added: []
  patterns: [tdd-red-green, scan-pattern, revert-pattern, descending-line-removal]
key_files:
  created:
    - .claude/tests/smoke-test-evolve.js
  modified:
    - .claude/scripts/memory/evolve.js
    - .gitignore
decisions:
  - "Decay skips PLAYBOOK.md (type=playbook) — uses Open/Resolved lifecycle, not Permanent (D-03)"
  - "null confidence treated as non-decayable (equivalent to HIGH) to preserve legacy entries (Pitfall 5)"
  - "Global index incremented for ALL Permanent entries (not just expired) to ensure stable indexing for decay-remove/decay-upgrade"
  - "Index validation follows revert() pattern: parseInt + range check guards T-05-01 and T-05-02"
metrics:
  duration_seconds: 206
  completed_date: "2026-04-21"
  tasks_completed: 1
  files_changed: 3
---

# Phase 5 Plan 01: Decay Engine Summary

**One-liner:** Deterministic decay engine scanning Permanent entries for expired LOW (14d) / MED (30d) entries with index-based remove and confidence-upgrade subcommands, validated by 7 TDD smoke tests.

## What Was Built

Extended `.claude/scripts/memory/evolve.js` with three new subcommands completing the memory lifecycle decay loop:

- `decay` — scans all `## Permanent` sections (skipping PLAYBOOK.md), flags LOW entries older than 14 days and MED entries older than 30 days, reports capacity warnings at 180+ lines. Never flags HIGH or no-timestamp entries.
- `decay-remove` — removes specific Permanent entries by global index; deletion done in descending line order to avoid offset corruption (same pattern as existing `revert()`).
- `decay-upgrade` — replaces `[LOW]` or `[MED]` confidence tag with `[HIGH]` in-place by global index, preserving the rest of the entry text.

Two new helpers added:
- `extractTimestamp(entryText, fileType)` — extracts a Date from trailing timestamp pointers; handles memory/playbook format and insights format with legacy-date fallback.
- `extractConfidence(entryText)` — extracts HIGH/MED/LOW confidence tag from entry text.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED — failing tests | cb92370 | PASS (7/7 failed before implementation) |
| GREEN — passing tests | 7e8409f | PASS (7/7 pass after implementation) |
| REFACTOR | n/a | Not needed — implementation clean on first pass |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| cb92370 | test(05-01) | Add failing smoke tests for decay subcommands (RED) |
| 7e8409f | feat(05-01) | Implement decay, decay-remove, decay-upgrade subcommands (GREEN) |

## Verification Results

| Suite | Passed | Total | Regression |
|-------|--------|-------|------------|
| smoke-test-evolve.js | 7 | 7 | — |
| smoke-test-observe.js | 13 | 13 | None |
| eval-evolve.js | 12 | 12 | None |

## Deviations from Plan

None — plan executed exactly as written. The .gitignore exclusion was added before the RED commit (required to track the test file), which is functionally equivalent to the plan's specification of adding it in the GREEN phase.

## Known Stubs

None. All subcommands are fully wired — no placeholder return values or hardcoded data.

## Threat Surface Scan

No new network endpoints, auth paths, or external data ingestion introduced. The two mitigations specified in the threat model are implemented:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-05-01: decayRemove index tampering | parseInt + NaN/non-positive check + range check before any file mutation |
| T-05-02: decayUpgrade index tampering | Same validation pattern as T-05-01 |

## Self-Check: PASSED

- `.claude/tests/smoke-test-evolve.js` exists: FOUND
- `.claude/scripts/memory/evolve.js` contains `function decay()`: FOUND
- `.claude/scripts/memory/evolve.js` contains `function decayRemove(`: FOUND
- `.claude/scripts/memory/evolve.js` contains `function decayUpgrade(`: FOUND
- `.claude/scripts/memory/evolve.js` contains `function extractTimestamp(`: FOUND
- `.claude/scripts/memory/evolve.js` contains `function extractConfidence(`: FOUND
- `.gitignore` contains `!.claude/tests/smoke-test-evolve.js`: FOUND
- Commits cb92370 and 7e8409f: FOUND
- `node .claude/tests/smoke-test-evolve.js` exit 0: VERIFIED (7/7 passed)
- `node .claude/scripts/memory/evolve.js decay` exit 0 with `command: "decay"`: VERIFIED
- `node .claude/tests/smoke-test-observe.js` exit 0: VERIFIED (13/13 passed)
- `node .claude/tests/eval-evolve.js` exit 0: VERIFIED (12/12 passed)

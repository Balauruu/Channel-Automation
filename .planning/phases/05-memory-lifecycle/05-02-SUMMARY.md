---
phase: 05-memory-lifecycle
plan: 02
subsystem: memory-lifecycle
tags: [decay, evolve, consolidation, observer, memory-lifecycle]
dependency_graph:
  requires: [05-01]
  provides: [evolve-decay-flow, evolve-consolidation-dispatch, observer-consolidation-mode]
  affects: [.claude/skills/evolve/SKILL.md, .claude/agents/observer.md]
tech_stack:
  added: []
  patterns: [skill-step-extension, agent-mode-dispatch, unified-summary-display]
key_files:
  created: []
  modified:
    - .claude/skills/evolve/SKILL.md
    - .claude/agents/observer.md
decisions:
  - "Unified summary uses continuous numbering: promoted 1..N, expired N+1..N+M (Pitfall 2 avoidance)"
  - "decay-upgrade called for ALL kept entries when user presses Enter (not just explicitly kept)"
  - "Consolidation before/after diff shown inline in chat — no temp files (RESEARCH.md open question 2)"
  - "Observer consolidation mode appended after Completion Report so normal pipeline unchanged"
  - "Verify check string 'Preserve ALL [HIGH]' requires imperative form — fixed 'Preserves' -> 'Preserve'"
metrics:
  duration_seconds: 162
  completed_date: "2026-04-21"
  tasks_completed: 2
  files_changed: 2
---

# Phase 5 Plan 02: Evolve Skill Extension + Observer Consolidation Mode Summary

**One-liner:** Extended /evolve to 10-step flow wiring decay scan after promote, unified three-section summary, and observer consolidation mode with C1-C4 steps that bypasses the normal 10-step pipeline.

## What Was Built

### Task 1: evolve SKILL.md (8 steps -> 10 steps)

Extended `.claude/skills/evolve/SKILL.md` from 8 steps to 10 steps:

- **Step 4 (NEW): Decay Scan** — runs `node .claude/scripts/memory/evolve.js decay` after promote, stores result as `decay_result` with `expired`, `capacity_warnings`, and `total_expired`.
- **Step 5 (NEW): Consolidation Check** — if capacity warnings exist, reads each file, dispatches `@observer` with consolidation prompt starting with "Consolidate the ## Permanent section of {file_path}", shows inline before/after diff, applies only on user approval.
- **Step 6 (renamed): Display Unified Summary** — three sections with continuous numbering: (1) Promoted entries 1..N using promote `global_index`, (2) Expired entries N+1..N+M using `promote_result.total + decay_entry.global_index`, (3) Capacity warnings as file:lines/200.
- **Step 7 (renamed): User Interaction** — single prompt covers reverts and removals. Classifies numbers by range: 1..N = promoted reverts, N+1..N+M = expired removals. Out-of-range numbers warned and skipped.
- **Step 8 (renamed): Execute Actions** — three sequential operations: (a) revert promoted via `evolve.js revert`, (b) remove expired via `evolve.js decay-remove` with index remapping, (c) upgrade kept entries via `evolve.js decay-upgrade`. Enter = upgrade ALL expired.
- **Step 9 (renamed): Commit Changes** — collects paths from promote, revert, decay-remove, decay-upgrade, and consolidation; deduplicates; commit message varies by which operations ran.
- **Step 10 (renamed): Done** — net count display omitting zero items.

Updated description field to mention decay and consolidation. Added "Do NOT auto-remove expired entries" constraint (D-04).

### Task 2: observer.md (consolidation mode)

Three targeted edits to `.claude/agents/observer.md`:

1. **YAML description** — appended "In consolidation mode, rewrites a memory file's ## Permanent section to reduce size while preserving essential knowledge."
2. **Identity section** — added sentence: "When dispatched with a consolidation prompt, you rewrite a memory file's ## Permanent section to be more concise while preserving all essential knowledge."
3. **New `## Consolidation Mode` section** (appended after Completion Report) with four steps:
   - C1: Read the target file to confirm current state
   - C2: Analyze entries for merge candidates, removal candidates, verbosity, and [HIGH] entries
   - C3: Rewrite the section (merge same-topic, remove superseded, tighten wording, preserve [HIGH], target 20% reduction)
   - C4: Output ONLY the complete rewritten ## Permanent section — no other sections, no explanation

All existing sections (Processing Pipeline Steps 1-10, Guardrails, Completion Report) unchanged.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 68f9760 | feat(05-02) | Extend /evolve SKILL.md to 10-step decay+consolidation flow |
| ca64a0c | feat(05-02) | Add consolidation mode to observer agent definition |

## Verification Results

| Check | Result |
|-------|--------|
| SKILL.md automated verify (8 required strings) | PASS |
| SKILL.md acceptance criteria (17 checks) | PASS |
| observer.md automated verify (10 required strings) | PASS |
| observer.md acceptance criteria (13 checks) | PASS |
| Plan verification (5 checks: steps 1-10, decay subcommands, consolidation prompt, C1-C4, pipeline unchanged) | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Verify check string required imperative form**
- **Found during:** Task 2 verification
- **Issue:** The plan's verify script checks for `'Preserve ALL [HIGH]'` but the initial write used `'Preserves ALL [HIGH]'` (plural verb form).
- **Fix:** Changed `- Preserves ALL [HIGH] confidence entries unchanged` to `- Preserve ALL [HIGH] confidence entries unchanged` in the C3 step of the Consolidation Mode section.
- **Files modified:** `.claude/agents/observer.md`
- **Commit:** ca64a0c (fix was part of the same task commit)

## Known Stubs

None. Both files contain fully specified, actionable instructions. No placeholder text, hardcoded empty values, or TODO markers.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Both modified files are markdown skill/agent definitions. The threat mitigations specified in the plan's threat model are fully documented in the SKILL.md:

| Threat | Mitigation Documented |
|--------|-----------------------|
| T-05-05: User input index tampering | Step 7 classifies numbers by range and warns on out-of-range with skip |
| T-05-06: Observer consolidation output auto-written | Step 5 shows before/after diff and requires explicit yes/no approval before Edit |
| T-05-07: Consolidation bypassing pipeline | Consolidation mode is triggered only by specific prompt prefix from /evolve skill |

## Self-Check: PASSED

- `.claude/skills/evolve/SKILL.md` exists: FOUND
- `.claude/agents/observer.md` exists: FOUND
- SKILL.md contains `## Step 4: Decay Scan`: FOUND
- SKILL.md contains `## Step 10: Done`: FOUND
- SKILL.md contains `node .claude/scripts/memory/evolve.js decay`: FOUND
- SKILL.md contains `Consolidate the ## Permanent section`: FOUND
- observer.md contains `## Consolidation Mode`: FOUND
- observer.md contains `Skip the entire 10-step Processing Pipeline`: FOUND
- observer.md contains `C4: Output`: FOUND
- Commit 68f9760: FOUND
- Commit ca64a0c: FOUND

---
phase: 03-evolve-command
fixed_at: 2026-04-21T00:00:00Z
review_path: .planning/phases/03-evolve-command/03-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-21T00:00:00Z
**Source review:** .planning/phases/03-evolve-command/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: `insightPointerRe` silently fails for agent names containing digits

**Files modified:** `.claude/scripts/memory/evolve.js`
**Commit:** 993e160
**Applied fix:** Changed character class in `insightPointerRe` from `[a-z][-a-z]*` to `[a-z][a-z0-9-]*` so agent names with digits (e.g. `agent2`, `v2-writer`) are matched and their evidence pointers stripped during promote.

### WR-02: `memoryPointerRe` does not match full ISO timestamps with seconds

**Files modified:** `.claude/scripts/memory/evolve.js`
**Commit:** d924f57
**Applied fix:** Extended `memoryPointerRe` from `\d{2}:\d{2}\)$` to `\d{2}:\d{2}(?::\d{2})?Z?\)$` so full ISO-8601 timestamps (with optional seconds and Z suffix) produced by `new Date().toISOString()` are matched and stripped.

### WR-03: Dead variable `newPendingStart` in `promote()`

**Files modified:** `.claude/scripts/memory/evolve.js`
**Commit:** 9dbc62d
**Applied fix:** Deleted the unused `const newPendingStart = pendingLineIdx + shift;` assignment. The `shift` variable remains in use by the entry-removal loop below it.

### WR-04: SKILL.md Step 7 commit message uses N inconsistently with Step 8

**Files modified:** `.claude/skills/evolve/SKILL.md`
**Commit:** cb8224b
**Applied fix:** Made gross/net distinction explicit. Step 7 commit messages now reference `promote_result.total` (gross) and `revert_result.total` (gross). Step 8 done message uses `promote_result.total - revert_result.total` (net). Added inline comments explaining why gross is used for commits and net for the user-facing summary.

## Skipped Issues

None -- all findings were fixed.

---

_Fixed: 2026-04-21T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

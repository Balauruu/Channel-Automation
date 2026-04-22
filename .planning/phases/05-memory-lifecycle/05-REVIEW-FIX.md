---
phase: 05-memory-lifecycle
fixed_at: 2026-04-21T00:00:00Z
review_path: .planning/phases/05-memory-lifecycle/05-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-21T00:00:00Z
**Source review:** .planning/phases/05-memory-lifecycle/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: promote() double-splice bug

**Files modified:** `.claude/scripts/memory/evolve.js`
**Commit:** 0a124dc
**Applied fix:** Replaced the manual shift-and-splice logic in the existing-Permanent branch of `promote()` with a re-parse approach. After inserting promoted entries into `newLines`, the code now joins the array, re-parses sections via `parseSections()` to get fresh line positions, then removes Pending Review entries using those accurate positions in bottom-up order. This eliminates the double-splice corruption when Permanent and Pending sections appear in non-standard order.

### WR-02: revert() and decayRemove() stale line numbers

**Files modified:** `.claude/scripts/memory/evolve.js`
**Commit:** 1805762
**Applied fix:** Added a `contentCache` Map to both `revert()` and `decayRemove()` that stores each file's content during the index-building pass. The per-file splice loop now reads from the cache instead of re-reading the file from disk, ensuring line positions from the index map are always aligned with the content being spliced.

### WR-03: SKILL.md data shape description mismatch

**Files modified:** `.claude/skills/evolve/SKILL.md`
**Commit:** b9130f6
**Applied fix:** Updated Step 4's `decay_result` description from the incorrect nested structure (`expired` as array of files with sub-`entries` array) to the actual flat array structure (`expired` as flat array where each entry directly has `global_index`, `path`, `type`, etc.). Also fixed Step 8(c)'s reference from `decay_result.expired[*].entries[*].global_index` to the correct flat path `decay_result.expired` with top-level `global_index`.

### WR-04: promote() missing blank line separator

**Files modified:** `.claude/scripts/memory/evolve.js`
**Commit:** ad07940
**Applied fix:** Changed the `insertLines` initialization in the no-Permanent branch of `promote()` to conditionally prepend a blank line when `pendingLineIdx > 0`. This prevents whitespace drift when repeatedly promoting into files that have content before the `## Pending Review` heading.

### WR-05: Observer byte offset underspecified

**Files modified:** `.claude/agents/observer.md`
**Commit:** 2c059a7
**Applied fix:** Replaced the vague "summing byte lengths of all processed lines" instruction in Step 10 with an explicit formula: `cursor.byte_offset + sum of Buffer.byteLength(line + '\n', 'utf8')`. Added clarification that `Buffer.byteLength` must be used instead of string `.length` for multibyte safety, and documented the 1-based offset convention used by `tail -c`.

## Skipped Issues

None -- all findings were fixed.

---

_Fixed: 2026-04-21T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

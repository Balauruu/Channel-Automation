---
phase: 03-evolve-command
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - .claude/scripts/memory/evolve.js
  - .claude/tests/eval-evolve.js
  - .claude/skills/evolve/SKILL.md
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files implement the `/evolve` memory-evolution command: `evolve.js` (deterministic
file operations), `eval-evolve.js` (12-test eval suite), and `SKILL.md` (agent
orchestration protocol).

The core logic is sound. The promote/revert flow, line-offset arithmetic, and
bottom-up splice ordering are all correct. The eval suite has good coverage of the
happy path and cross-file scenarios. Issues fall into two clusters: (1) a regex
character-class gap that silently skips pointer stripping for a defined class of
agent names, and (2) a logic spec ambiguity in SKILL.md that can cause the wrong
commit message N value or leave a variable undefined at a branch point.

---

## Warnings

### WR-01: `insightPointerRe` silently fails for agent names containing digits

**File:** `.claude/scripts/memory/evolve.js:27`

**Issue:** The regex `[a-z][-a-z]*` only matches names made of lowercase ASCII letters
and hyphens. Any agent directory name containing a digit (e.g. `agent2`, `v2-writer`)
will not match and the evidence pointer will NOT be stripped during promote. The entry
is still moved to Permanent, but the raw `(from: agent2, ...)` timestamp remains,
polluting permanent memory with evidence metadata.

No current agent name in CLAUDE.md triggers this (all are `[a-z][-a-z]+`), but there
is no enforcement that prevents a future agent from having a digit.

**Fix:**
```js
// Line 27 — allow digits anywhere after the first character
const insightPointerRe = / \(from: [a-z][a-z0-9-]*, \d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
```

---

### WR-02: `memoryPointerRe` does not match full ISO timestamps with seconds

**File:** `.claude/scripts/memory/evolve.js:26`

**Issue:** The regex `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}` matches `YYYY-MM-DDThh:mm` but
not `YYYY-MM-DDThh:mm:ss` or `YYYY-MM-DDThh:mm:ssZ`. If an agent writes a full
ISO-8601 timestamp (which `new Date().toISOString()` produces), the pointer is NOT
stripped. The entry lands in Permanent with a trailing timestamp like `(2026-04-21T10:22:30Z)`.

The fixtures use the short form so all tests pass, masking this in CI.

**Fix:**
```js
// Line 26 — extend to optionally match seconds and timezone suffix
const memoryPointerRe = / \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?\)$/;
```

---

### WR-03: Dead variable `newPendingStart` in `promote()`

**File:** `.claude/scripts/memory/evolve.js:213`

**Issue:** `const newPendingStart = pendingLineIdx + shift;` is computed but never
read. This appears to be leftover from an earlier draft where the shifted pending
heading index was used. Dead variables obscure intent and may cause future editors
to believe the value has downstream effects.

**Fix:** Delete line 213 entirely.
```js
// Remove this line:
const newPendingStart = pendingLineIdx + shift;
```

---

### WR-04: SKILL.md Step 7 commit message uses `N` inconsistently with Step 8

**File:** `.claude/skills/evolve/SKILL.md:174-175`

**Issue:** Step 7 commit messages are:
- `evolve: promote {N} entries to permanent memory`
- `evolve: promote {N} entries, revert {M} entries`

Step 8 defines N as "net promoted count (total promoted minus reverted)". But in the
two-revert case, the commit message also includes `, revert {M} entries` — so if N
is already net, the commit message double-counts the information (net minus M would
be less than gross). More importantly, if N is gross in the commit message and net in
the done message, the numbers don't agree, which will confuse anyone auditing git history.

**Fix:** Make the definition explicit and consistent. Recommended: use gross promoted
count in the commit message (what was actually written to Permanent before any revert)
and net in the Step 8 display.

```
# Step 7 commit messages — use gross promoted count (promote_result.total)
evolve: promote {promote_result.total} entries to permanent memory
evolve: promote {promote_result.total} entries, revert {revert_result.total} entries

# Step 8 done message — use net count
Evolution complete. {promote_result.total - revert_result.total} entries promoted, {revert_result.total} reverted.
```

---

## Info

### IN-01: `loadEvolve()` comment is misleading

**File:** `.claude/tests/eval-evolve.js:19`

**Issue:** The comment `// Set PROJECT_ROOT via env before requiring` suggests the
environment variable should be set before `require()`. It is not — the env is set
by each test case after calling `loadEvolve()`. The code is correct because
`getProjectRoot()` reads the env at call time, but the comment creates a false
obligation that could cause confusion if the function is refactored.

**Fix:** Update the comment to reflect actual behaviour:
```js
function loadEvolve() {
  // Module is cached after first require; getProjectRoot() reads env at call time.
  return require(evolveScript);
}
```

---

### IN-02: SKILL.md Step 1 does not define a default for `obs_written` on observer failure

**File:** `.claude/skills/evolve/SKILL.md:36-38`

**Issue:** When the observer dispatch fails, Step 1 says to set `obs_runs = -1` but
does not specify initial values for `obs_written` or `obs_rejected`. Step 2's re-scan
guard reads `obs_written > 0`. If the agent leaves `obs_written` undefined, the
expression evaluates to false (safe), but the spec should be explicit.

**Fix:** Add explicit defaults in the failure branch:
```
If the Agent tool dispatch fails, set obs_runs = -1, obs_written = 0, obs_rejected = 0,
log the error text, and continue to Step 2.
```

---

### IN-03: `promote()` inserts entries directly after last Permanent entry without a trailing newline separator

**File:** `.claude/scripts/memory/evolve.js:229`

**Issue:** When `## Permanent` already has entries, new entries are spliced at
`lastEntry.line + 1`. If the last existing entry is immediately followed by `## Pending Review`
with no blank line between them, the promoted entries are inserted between the last
Permanent entry and the `## Pending Review` heading without any blank line. The file
remains parseable but formatting is degraded.

**Fix:** After computing `insertAt`, check whether `newLines[insertAt]` is a `##`
heading and if so prepend a blank line:
```js
insertAt = permanentSection.entries[permanentSection.entries.length - 1].line + 1;
// Ensure blank line before next heading
if (newLines[insertAt] && newLines[insertAt].startsWith('## ')) {
  newLines.splice(insertAt, 0, '');
}
```

---

### IN-04: `eval-evolve.js` has no test for the re-scan-after-observer path or the quick-exit path

**File:** `.claude/tests/eval-evolve.js` (whole file)

**Issue:** The eval suite covers scan ordering, promote, strip, global index, revert,
and existing-Permanent append — all deterministic file-operation contracts. It does
not cover the SKILL.md-level logic paths (Step 2 quick-exit, re-scan after observer
writes). These are heuristic agent paths and cannot be unit tested here, but the gap
means any regression in those branches is silent.

This is an informational note about coverage scope, not a code defect. The existing
12 tests are appropriate and sufficient for the deterministic layer they cover.

**Fix:** No code change needed. Consider a comment at the top of eval-evolve.js
noting which SKILL.md steps are out of scope for deterministic testing.

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

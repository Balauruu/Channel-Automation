---
phase: 02-observer-agent
status: findings
severity_counts:
  critical: 0
  high: 0
  medium: 3
  low: 2
  info: 3
files_reviewed: 2
files_reviewed_list:
  - .claude/agents/observer.md
  - .claude/tests/eval-observer.js
reviewed: 2026-04-20T16:00:00Z
depth: standard
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-20T16:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the observer agent definition (320 lines) and its eval test script (319 lines, 10 test cases). The observer.md agent prompt is well-structured with clear scope-test questions, guardrails, and a defined processing pipeline. The eval-observer.js test suite passes all 10 cases but has several test quality issues -- some tests are tautological (testing hardcoded values against themselves) and the regex patterns have edge cases where legitimate entries would be incorrectly rejected by downstream consumers using these as validation specs.

No critical or high-severity issues found. The medium findings concern test correctness (false sense of coverage) and a regex limitation that could cause the observer to misclassify valid entries.

## Warnings

### WR-01: Tautological test -- MEML-01/confidence_tag_valid validates constants against themselves

**File:** `.claude/tests/eval-observer.js:122-133`
**Issue:** The test defines `validTags = ['HIGH', 'MED', 'LOW']` then checks `if (!validTags.includes(t)) return false` where `t` iterates over... `validTags` itself. This can never fail -- it tests that an array contains its own elements. The test provides zero regression value. If someone changed the valid set (e.g., added 'CRITICAL' or removed 'LOW'), this test would still pass because it validates against itself, not an external source of truth.
**Fix:** The test should validate the tags against the regex patterns used in other tests, or against an externally-defined spec constant:
```javascript
check: () => {
  // The canonical set defined by MEML-01
  const validTags = ['HIGH', 'MED', 'LOW'];
  // These MUST match what the format regexes accept
  const memoryRe = /^- \[(HIGH|MED|LOW)\] [a-z][-a-z]*: .+ \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
  for (const t of validTags) {
    const testEntry = `- [${t}] researcher: test insight (2026-04-20T10:00)`;
    if (!memoryRe.test(testEntry)) return false;
  }
  // Confirm invalid tags fail
  const invalidTags = ['MEDIUM', 'high', 'H', '0.8', 'CRITICAL', 'med', 'Low'];
  for (const t of invalidTags) {
    const testEntry = `- [${t}] researcher: test insight (2026-04-20T10:00)`;
    if (memoryRe.test(testEntry)) return false;
  }
  return true;
}
```

### WR-02: Tautological test -- OBSV-08/rejection_reason_enum validates its own array length

**File:** `.claude/tests/eval-observer.js:238-255`
**Issue:** The test checks `if (validReasons.length !== 5) return false` then verifies each element is a non-empty string and that known-invalid strings are not in the set. This is purely self-referential. The test would pass even if the set were wrong (e.g., if "format-error" were misspelled as "format-err"). It provides no regression protection because there is no external source of truth being compared against.
**Fix:** Compare against the fixture data or against a shared constant imported from a config module. Alternatively, validate that the rejection format test (OBSV-08/rejection_jsonl_format) uses the same reason set -- cross-reference between tests:
```javascript
check: () => {
  const validReasons = ['no-scope-match', 'ambiguous-scope', 'duplicate-of-existing', 'format-error', 'target-file-corrupt'];
  // Cross-validate: the rejection_jsonl_format test's validateRejection 
  // function must accept all 5 reasons
  for (const reason of validReasons) {
    const entry = { ts: 'x', candidate: 'x', reason, confidence: 'HIGH', source_agent: 'x', source_run_ts: 'x' };
    // Inline validation logic (same as rejection_jsonl_format test)
    if (!validReasons.includes(entry.reason)) return false;
  }
  // Verify expected count matches PROJECT.md spec (5 reasons)
  if (validReasons.length !== 5) return false;
  return true;
}
```

### WR-03: MEMORY.md/PLAYBOOK.md format regex rejects multi-word agent names with digits or dots

**File:** `.claude/tests/eval-observer.js:71` and `:262`
**Issue:** The regex `[a-z][-a-z]*` for agent name validation only permits lowercase letters and hyphens. This works for the current agent list (researcher, editorial-lead, etc.) but will silently reject entries if an agent name ever contains a digit (e.g., `researcher2`) or if the observer writes the `source-agent` field from an `agent_id` like `"researcher-abc123"` without stripping the run suffix. The observer.md instructions at line 156 show the format as `source-agent: distilled insight text` but the few-shot examples (lines 265-267) show `writer:` -- the agent name portion. If the observer writes the full `agent_id` (e.g., `researcher-abc123`), the regex would reject it because of digits.

The risk is subtle: the observer extracts `source_agent` from the event's `agent_id` field (which includes a run suffix like `-abc123`). If the observer fails to strip the suffix and writes `researcher-abc123:`, the format self-check would not catch it (because the observer uses its own judgment, not this regex), but downstream `/evolve` validation using this spec would flag it.
**Fix:** Either:
1. Make the observer prompt explicit about extracting the base agent name (strip the run-ID suffix from `agent_id`), OR
2. Update the regex to allow digits: `[a-z][-a-z0-9]*`

Option 1 is safer (keep the regex strict, make the observer smarter):
```
In observer.md Step 8, add:
"The source-agent field uses the base agent name (e.g., 'researcher', not 'researcher-abc123'). 
Strip any run-ID suffix from agent_id to get the base name. Known agents: researcher, writer, 
editorial-lead, style-extractor, strategy, visual-researcher, visual-planner, asset-processor, 
asset-curator, code-reviewer, compiler."
```

## Info

### IN-01: Self-loop filter in test uses `.includes('observer')` without case-insensitive check

**File:** `.claude/tests/eval-observer.js:141`
**Issue:** The observer.md prompt (line 83) specifies the self-loop filter should be case-insensitive: "contains the string 'observer' (case-insensitive)." However, the test at line 141 uses `e.agent_id.includes('observer')` (case-sensitive). If a fixture ever uses `"Observer-xyz789"` or `"OBSERVER-test"`, the test would not catch it. Currently the fixture uses lowercase so this does not cause a false negative, but the test does not validate the case-insensitive requirement stated in the prompt.
**Fix:** Use `.toLowerCase().includes('observer')` to match the prompt's specification:
```javascript
const observerEvents = events.filter(e => e.agent_id && e.agent_id.toLowerCase().includes('observer'));
```

### IN-02: `readJsonlStrict` helper is only used once and has no error handling for empty files

**File:** `.claude/tests/eval-observer.js:23-27`
**Issue:** `readJsonlStrict` will throw on `JSON.parse('')` if the file has a trailing newline that `.filter(Boolean)` does not catch (e.g., a line with only whitespace). This is minor since it is only used in the rotation detection test with a controlled file, but the asymmetry with `readJsonl` (which swallows parse errors) could confuse future maintainers about which to use.
**Fix:** Either remove `readJsonlStrict` and use `readJsonl` everywhere (since parsing `null` from malformed lines is already handled by `.filter(Boolean)` in the caller), or add a comment explaining why strict parsing is needed for this specific test.

### IN-03: observer.md Step 2 byte offset is 1-indexed due to `tail -c +<offset>` semantics

**File:** `.claude/agents/observer.md:77`
**Issue:** The `tail -c +N` command is 1-indexed (byte 1 is the first byte of the file). The cursor stores `byte_offset` which the Step 10 description says should "reflect the byte position just past the last complete event processed." If the initial cursor starts at `byte_offset: 0` (line 63) and is used as `tail -c +0`, the behavior depends on the `tail` implementation -- on GNU coreutils `tail -c +0` and `tail -c +1` are equivalent (both start from byte 1). On some implementations `+0` may behave differently.

This is unlikely to cause issues in practice because MSYS2/Git Bash uses GNU tail, but the semantic mismatch between "byte 0 means start of file" (cursor) and "tail -c +1 means start of file" (command) could confuse the observer LLM or cause off-by-one on the first invocation.
**Fix:** Either document that `byte_offset: 0` is a sentinel meaning "first invocation, start from beginning" and the actual command should use `byte_offset + 1`, or change the initial cursor to `byte_offset: 1` with a comment explaining `tail -c +` is 1-indexed.

---

_Reviewed: 2026-04-20T16:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

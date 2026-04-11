---
phase: 05-feedback-propagation
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - feedback/signals.yaml
  - tests/smoke-test-feedback.js
  - .claude/skills/agent-protocols/SKILL.md
  - .claude/skills/write-script/SKILL.md
  - .claude/skills/visual-plan/SKILL.md
  - .claude/skills/process-assets/SKILL.md
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files reviewed for Phase 5 (feedback propagation): the signals data file, the smoke-test validation suite, the upgraded agent-protocols skill, and the three pipeline skills (write-script, visual-plan, process-assets) that received Verification Gates in this phase.

No critical (security or crash) issues were found. Four warnings were identified: two protocol inconsistencies in agent-protocols that will cause data drift in signals.yaml over time, one contradictory failure message in write-script that undermines the hard-stop gate, and one logically weak OR guard in process-assets. Two info items cover test-suite robustness.

---

## Warnings

### WR-01: `resolved_date` field documented but absent from new-entry schema template

**File:** `.claude/skills/agent-protocols/SKILL.md:74`

**Issue:** Line 74 instructs agents to add `resolved_date: "YYYY-MM-DD"` when resolving a signal. However, the new-entry template block (lines 86-95) does not include a `resolved_date` field. Because agents copy the template when writing new signals, `resolved_date` will never be present on a freshly-written entry, and the field will only appear retrospectively when an entry is resolved. This is not wrong per se, but the template and the resolution instructions describe two different schemas. Over time this creates inconsistent YAML entries: some resolved signals will have `resolved_date`, others written before the field was documented will not, and agents scanning the file cannot rely on the field being present.

**Fix:** Add `resolved_date` explicitly to the schema section as a comment so agents understand it is set at resolution time, not at creation time:

```yaml
- id: SIG-NNN
  date: "YYYY-MM-DD"
  source_agent: your-agent-name
  domain: target-domain  # editorial | visual | strategy | meta
  type: category         # quality | content | technical | process
  promotion: memory      # memory (default) | definition (only for procedure/guardrail changes)
  resolved: false
  # resolved_by and resolved_date are added when an agent resolves this signal
  insight: "One-line actionable insight"
```

---

### WR-02: `promotion: definition` signals have no write-back path at task end

**File:** `.claude/skills/agent-protocols/SKILL.md:75`

**Issue:** At task start (line 75), agents are told "If `promotion: definition` -- do NOT self-promote. Note it for your task completion summary." At task end (lines 97-98), they are told to report the signal in their completion message but are given no instruction to update `resolved: true` on that signal. The signal stays `resolved: false` indefinitely. Every subsequent agent in the same domain will re-process it and re-report it, creating permanent duplicate completion messages and polluting every task summary until a human manually edits signals.yaml.

**Fix:** Add an explicit resolution step for `promotion: definition` signals in the "At Task End" section:

```markdown
6. For any `promotion: definition` signals you reported in your task start, update them in signals.yaml:
   set `resolved: true`, add `resolved_by: your-agent-name`, add `resolved_date: "YYYY-MM-DD"`
   This prevents other agents re-flagging the same signal; the human review note in your
   completion message is the permanent record.
```

---

### WR-03: Failure message for `source_manifest.json` gate contradicts the hard-stop behavior

**File:** `.claude/skills/write-script/SKILL.md:26`

**Issue:** The gate instruction at line 15 states "if ANY check fails, STOP and show the failure message. Do not dispatch the writer." Gate check (c) for `source_manifest.json` (line 25-26) shows this failure message:

> "Source manifest not found at `...`. Re-run `/research $ARGUMENTS`. Note: script will have limited source attribution without this file."

The phrase "script will have limited source attribution without this file" implies the user could proceed anyway with reduced functionality. An agent following an LLM-natural reading of this message may interpret the note as a permission to continue despite the gate failure, contradicting the hard-stop rule. This is a logic-level inconsistency: the gate halts execution, but the error text implies degraded continuation is acceptable.

**Fix:** Remove the softening note from the failure message, or restructure it as a separate "soft" gate with explicit proceed logic:

Option A (keep hard gate, clean message):
```
If not: "Source manifest not found at `projects/$ARGUMENTS/research/source_manifest.json`. Re-run `/research $ARGUMENTS`."
```

Option B (convert to soft gate with explicit bypass):
```
c. Check `projects/$ARGUMENTS/research/source_manifest.json` exists.
   If not: WARN (do not stop): "Source manifest not found -- source attribution in the
   script will be limited. You may continue or re-run `/research $ARGUMENTS`."
   Present the warning and wait for the user to confirm before proceeding.
```

---

### WR-04: process-assets shotlist validation uses a logically weak OR guard

**File:** `.claude/skills/process-assets/SKILL.md:29`

**Issue:** Gate check (d) reads: "check that the file contains at least one `\"chapter\"` key or is longer than 50 characters." The OR makes both branches nearly useless as independent guards. A malformed 51-byte JSON stub (e.g., `{"error": "generation failed"}`) passes the length check while containing no chapter data. Conversely, any file with a `"chapter"` key passes regardless of length or structure. The intent is to detect an empty or corrupted shotlist, but neither branch reliably accomplishes that.

**Fix:** Use AND logic and tighten both predicates:

```
d. Read shotlist.json and verify it contains at least one `"chapter"` key AND
   is longer than 100 characters (a minimal valid entry exceeds 100 chars).
   If not: "Shotlist appears empty or malformed. Re-run `/visual-plan $ARGUMENTS`."
```

---

## Info

### IN-01: Smoke test re-reads agent-protocols/SKILL.md on every check (10 separate disk reads)

**File:** `tests/smoke-test-feedback.js:66,75,87,100,110,120,131,143,154,165`

**Issue:** Tests 6 through 15 each call `fs.readFileSync` on `.claude/skills/agent-protocols/SKILL.md` inside their individual `check()` closure. The file is read 10 times for 10 separate substring checks. On a slow filesystem or in CI with cold file caches this multiplies I/O unnecessarily. This is not a correctness bug -- results are always fresh -- but it is an avoidable overhead given all 10 checks target the same static file.

**Fix:** Cache the file content in a shared variable before the test cases are defined and reference it in each closure:

```js
const agentProtocolsContent = fs.readFileSync(
  path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8'
);

// Then in each check:
check: () => agentProtocolsContent.includes('signals.yaml')
```

The same pattern applies to write-script, visual-plan, and process-assets SKILL.md reads (tests 16-25, each file read twice per skill).

---

### IN-02: Smoke test runner cannot distinguish `false` return from `undefined` return

**File:** `tests/smoke-test-feedback.js:293-296`

**Issue:** The test runner at line 293 evaluates `const ok = tc.check()`. Both `false` (intentional assertion failure) and `undefined` (accidental missing `return` statement in a check function) are falsy and produce identical `FAIL` output. If a future contributor adds a check function that conditionally returns without an explicit `return false`, the test would appear to fail with a cryptic "Expected: true, Got: false" message rather than signaling a test authoring error. There are no missing returns in the current 25 checks, but there is no guard against future regressions.

**Fix:** Add an explicit `undefined` guard in the runner:

```js
const ok = tc.check();
if (ok === undefined) {
  console.log('ERROR', tc.name, '-- check() returned undefined (missing return statement?)');
} else {
  console.log(ok ? 'PASS' : 'FAIL', tc.name);
  if (ok) passed++;
  else console.log('  Expected: true, Got: false');
}
```

---

_Reviewed: 2026-04-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

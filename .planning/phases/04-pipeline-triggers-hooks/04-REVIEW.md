---
phase: 04-pipeline-triggers-hooks
reviewed: 2026-04-11T12:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - .claude/hooks/log-agent-complete.js
  - .claude/hooks/log-agent-dispatch.js
  - .claude/scripts/audit-agents.js
  - .claude/settings.json
  - .claude/skills/assets-download/SKILL.md
  - .claude/skills/assets-embed/SKILL.md
  - .claude/skills/assets-score/SKILL.md
  - .claude/skills/assets-search/SKILL.md
  - .claude/skills/audit-agents/SKILL.md
  - .claude/skills/compile/SKILL.md
  - .claude/skills/process-assets/SKILL.md
  - .claude/skills/research/SKILL.md
  - .claude/skills/strategy/SKILL.md
  - .claude/skills/strategy-analyze/SKILL.md
  - .claude/skills/strategy-scrape/SKILL.md
  - .claude/skills/strategy-topics/SKILL.md
  - .claude/skills/visual-plan/SKILL.md
  - .claude/skills/write-script/SKILL.md
  - .gitignore
  - tests/smoke-test-pipeline.js
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-11T12:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 4 introduces pipeline trigger skills (13 SKILL.md files), session-logging hooks (2 JS files), an agent audit script, a smoke test suite, settings.json hook registration, and a .gitignore update. The code is generally well-structured and follows project conventions. No critical security issues were found. Four warnings relate to missing error handling, a potential race condition in JSONL logging, and a redundant exit path. Four informational items cover minor code quality improvements.

## Warnings

### WR-01: Race condition in concurrent JSONL append operations

**File:** `.claude/hooks/log-agent-dispatch.js:42` and `.claude/hooks/log-agent-complete.js:41`
**Issue:** Both hooks use `fs.appendFileSync` to write to the same `logs/sessions.jsonl` file. Since both hooks run with `"async": true` in settings.json, they execute without blocking the main process. If a dispatch hook and a completion hook fire near-simultaneously (e.g., one agent completes while another is dispatched), two Node.js processes may call `appendFileSync` on the same file concurrently. On Windows, this can cause an `EACCES` or `EPERM` error because one process holds the file handle while the other attempts to write.
**Fix:** The error is caught by the existing try/catch and logged to stderr, so this will not crash anything -- but log entries could silently be lost. Consider using exclusive-open flags or a simple retry:
```javascript
// Option A: retry once on EACCES
try {
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
} catch (appendErr) {
  if (appendErr.code === 'EACCES' || appendErr.code === 'EPERM') {
    // Brief delay then retry
    const { execSync } = require('child_process');
    try { execSync('ping -n 1 127.0.0.1 > NUL', { timeout: 200 }); } catch {}
    try { fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8'); } catch {}
  }
}
```

### WR-02: Unreachable `return` after `process.exit(0)` in hook scripts

**File:** `.claude/hooks/log-agent-complete.js:20` and `.claude/hooks/log-agent-dispatch.js:21`
**Issue:** After `process.exit(0)` on line 19/20, the `return` statement on line 20/21 is unreachable. `process.exit()` terminates the process synchronously -- the `return` never executes. While harmless, this suggests the author may have been uncertain whether `process.exit()` halts execution, which could mask intent issues in future maintenance.
**Fix:** Remove the `return` statement after `process.exit(0)`, or replace `process.exit(0)` with `return` (since the `end` callback completing naturally will exit with code 0 anyway):
```javascript
// Option A: just return (simpler, exit code 0 is default)
if (builtIn.includes(agentType)) {
  return;
}

// Option B: keep process.exit, drop return
if (builtIn.includes(agentType)) {
  process.exit(0);
}
```

### WR-03: YAML frontmatter parser does not handle quoted strings or inline arrays

**File:** `.claude/scripts/audit-agents.js:39-88`
**Issue:** The `parseFrontmatter` function handles basic key-value pairs, multi-line strings (`>-`), and YAML arrays, but does not handle quoted string values (single or double quotes). If any agent frontmatter field contains a YAML-quoted value like `name: "code-reviewer"` or `description: 'some text'`, the quotes would be included as part of the parsed value. This could cause the name-matching check on line 148 (`fm.name !== agent`) to fail incorrectly because `fm.name` would be `"code-reviewer"` (with quotes) instead of `code-reviewer`.
**Fix:** Strip surrounding quotes from parsed values:
```javascript
// In the "Key with inline value" branch (line 71-77)
else if (line.match(/^(\w[\w-]*):\s+(.+)/)) {
  const m = line.match(/^(\w[\w-]*):\s+(.*)/);
  let val = m[2].trim();
  // Strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  fm[m[1]] = val;
  currentKey = m[1];
  inArray = false;
  multiLineStr = false;
}
```

### WR-04: Smoke test reads files without checking existence first

**File:** `tests/smoke-test-pipeline.js:41-53`
**Issue:** Several test checks call `fs.readFileSync` directly (e.g., lines 41, 49, 60, 67, 74, etc.) without first confirming the file exists. The outer try/catch on line 199-207 will catch the error and report `FAIL`, but the error message shown will be a raw Node.js `ENOENT` error instead of a clear "file not found" message. More importantly, if a SKILL.md file does not exist, the `has_disable_model_invocation` and `has_name_field` tests will fail with an unhelpful "ENOENT" error rather than indicating the root cause is the missing file.
**Fix:** Guard `readFileSync` calls with an existence check, or sequence tests so that file-content tests depend on the existence test passing:
```javascript
// Add a guard at the top of content-reading checks
check: () => {
  if (!fs.existsSync(skillMd)) return false;
  const content = fs.readFileSync(skillMd, 'utf8');
  return content.includes('disable-model-invocation: true');
}
```

## Info

### IN-01: Duplicate code between hook scripts

**File:** `.claude/hooks/log-agent-dispatch.js:1-49` and `.claude/hooks/log-agent-complete.js:1-46`
**Issue:** The two hook scripts share approximately 80% of their code (stdin reading, JSON parsing, built-in filtering, project directory resolution, log directory creation, JSONL writing, error handling). This duplication means any fix (e.g., the race condition from WR-01) must be applied in two places.
**Fix:** Extract shared logic into a common module (e.g., `.claude/hooks/lib/session-logger.js`) and have each hook import it:
```javascript
// .claude/hooks/lib/session-logger.js
module.exports = function logEvent(buildEntry) {
  // shared stdin reading, directory creation, JSONL writing
};
```

### IN-02: Auto-fix mode still exits with failure code after applying fixes

**File:** `.claude/scripts/audit-agents.js:453`
**Issue:** Line 453 (`process.exit(results.fail.length > 0 ? 1 : 0)`) runs after auto-fix is applied. Since `results.fail` is populated before fixes are applied and is never decremented after fixes, the script will always exit with code 1 if any fixable failures were found -- even if they were successfully fixed. The comment on line 401 says "re-run to verify," but the exit code could confuse CI integrations.
**Fix:** Add a note in the output that exit code reflects pre-fix state, or re-run the checks after fixing and use updated counts:
```javascript
if (autoFix && fixes.length > 0) {
  // ... apply fixes ...
  console.log('Applied ' + fixCount + ' fixes. Re-run audit to verify.');
  // Exit 0 after successful auto-fix to indicate "action taken"
  process.exit(0);
}
```

### IN-03: Magic number for string truncation in hooks

**File:** `.claude/hooks/log-agent-complete.js:29` and `.claude/hooks/log-agent-dispatch.js:28`
**Issue:** The string truncation lengths (300 for `outcome_summary`, 200 for `task`) are magic numbers. If these limits need to change, a developer must search for them in the code.
**Fix:** Define constants at the top of each file:
```javascript
const MAX_SUMMARY_LENGTH = 300;
const MAX_TASK_LENGTH = 200;
```

### IN-04: settings.json lacks `allowedTools` or `permissions` configuration

**File:** `.claude/settings.json:1-29`
**Issue:** The settings file only configures hooks. While this is correct for Phase 4 scope, the file will grow with future phases. The current structure is clean but could benefit from a comment (via a `"_comment"` field) documenting the purpose of each hook for maintainability.
**Fix:** Consider adding a documentation field:
```json
{
  "_doc": "Hook registrations for agent session logging (Phase 4)",
  "hooks": { ... }
}
```

---

_Reviewed: 2026-04-11T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

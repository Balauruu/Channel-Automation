---
phase: 01-capture-hardening
reviewed: 2026-04-20T12:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - .claude/hooks/pipeline-observe.js
  - .claude/tests/smoke-test-observe.js
  - .claude/settings.json
  - .gitignore
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-04-20T12:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

The observability hook (`pipeline-observe.js`) is a well-structured, defensive implementation. It handles atomicity correctly for Windows NTFS, uses `appendFileSync` for single-syscall writes, implements sensible truncation caps, and never throws in a way that would block the parent process. The test suite (`smoke-test-observe.js`) covers all documented CAPT requirements with proper temp-directory isolation.

Three warnings relate to correctness edge cases: a character-based truncation that can split multi-byte UTF-8 sequences, a race condition in file rotation on concurrent hook invocations, and redundant file reads during `subagentStop` that could yield stale data. Two info items flag minor quality concerns.

## Warnings

### WR-01: Truncation splits multi-byte characters (pipeline-observe.js:392-394)

**File:** `.claude/hooks/pipeline-observe.js:392`
**Issue:** The `truncate()` function uses `str.slice(0, maxBytes)` where `maxBytes` is named as a byte limit but `String.slice()` operates on UTF-16 code units, not bytes. For ASCII content this is fine, but for multi-byte content (e.g. Unicode in transcript text or tool output), two problems arise: (1) the cap doesn't actually enforce a byte budget -- a 1024-codepoint string of CJK characters is ~3KB in UTF-8, exceeding the intended cap, and (2) slicing at `maxBytes` can split a surrogate pair, producing an invalid lone surrogate that corrupts the JSON line downstream.

**Fix:**
```javascript
function truncate(str, maxBytes) {
  if (!str) return '';
  if (typeof str !== 'string') str = String(str);
  const buf = Buffer.from(str, 'utf8');
  if (buf.length <= maxBytes) return str;
  // Decode back to avoid splitting multi-byte sequences
  let truncated = buf.slice(0, maxBytes).toString('utf8');
  // Remove trailing replacement char if a multi-byte seq was split
  if (truncated.endsWith('\uFFFD')) {
    truncated = truncated.slice(0, -1);
  }
  return truncated;
}
```

### WR-02: TOCTOU race in file rotation (pipeline-observe.js:112-119)

**File:** `.claude/hooks/pipeline-observe.js:112`
**Issue:** `rotateIfNeeded` checks file size with `statSync`, then renames if over threshold. When multiple hook invocations run concurrently (e.g. rapid tool calls with `async: true`), two processes can both pass the size check simultaneously and both attempt `renameSync` on the same file. The second rename will throw `ENOENT` (file already moved by the first), which is caught by the outer try/catch -- but the subsequent `appendFileSync` in `appendEvent` will then write to a fresh file that was never rotated, losing the event the first process thought it archived.

In practice this is low-severity because the event is re-appended to the new file, but the comment claims NTFS atomicity guarantees. The real risk is two concurrent rotations producing two archive files for the same logical rotation.

**Fix:**
```javascript
function rotateIfNeeded(obsFile, archiveDir) {
  try {
    const stat = fs.statSync(obsFile);
    if (stat.size >= MAX_SIZE) {
      fs.mkdirSync(archiveDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveName = 'obs-' + ts + '-' + process.pid + '.jsonl';
      const dest = path.join(archiveDir, archiveName);
      try {
        fs.renameSync(obsFile, dest);
      } catch (renameErr) {
        // Another process already rotated -- safe to continue appending
        if (renameErr.code !== 'ENOENT') throw renameErr;
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      process.stderr.write('[pipeline-observe] rotation error: ' + err.message + '\n');
    }
  }
}
```

### WR-03: Double read of obs.jsonl in subagentStop (pipeline-observe.js:284, 366)

**File:** `.claude/hooks/pipeline-observe.js:284`
**Issue:** `handleSubagentStop` reads the full `obs.jsonl` file at line 293 to compute aggregates (tool counts), and `computeDurations` at line 367 reads the same file again independently. For a busy project this file could be several megabytes. Between the two reads, concurrent hook processes may have appended new events, causing the two scans to operate on different data snapshots. More practically, this is simply redundant I/O -- both scans iterate all lines and filter by `agent_id`.

**Fix:** Read the file once and pass the parsed lines array to both the aggregate counter and `computeDurations`:
```javascript
function handleSubagentStop(data, obsFile, project) {
  // ... preamble ...
  const lines = readObsLines(obsFile, agentId);
  const durations = computeDurationsFromLines(lines);
  const { toolCalls, toolFails, permDenials } = computeAggregates(lines);
  // ... rest ...
}

function readObsLines(obsFile, agentId) {
  if (!fs.existsSync(obsFile)) return [];
  return fs.readFileSync(obsFile, 'utf8').split('\n')
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
    .filter(ev => ev && ev.agent_id === agentId);
}
```

## Info

### IN-01: `process.exit(0)` inside event handler may swallow pending stderr writes (pipeline-observe.js:53)

**File:** `.claude/hooks/pipeline-observe.js:53`
**Issue:** Inside the `'end'` event handler, `process.exit(0)` is called after the `return` on empty input (line 53) and at line 60 after processing. If `process.stderr.write()` was called just before (e.g., in `main` catching an error), the exit may fire before the stderr buffer flushes. Node.js `process.exit()` does not wait for stdout/stderr to drain. In practice this rarely matters since stderr writes are small, but it can silently discard error diagnostics.

**Fix:** Remove `process.exit(0)` at line 60 -- the process will exit naturally when the event loop is empty after stdin closes. Keep the early `return` on empty input (the natural exit handles it). Or use `process.exitCode = 0` which allows drain.

### IN-02: Test file excluded from git tracking by default (.gitignore:37-38)

**File:** `.gitignore:37-38`
**Issue:** The `.gitignore` uses a pattern `.claude/tests/*.js` then negates with `!.claude/tests/smoke-test-observe.js`. This means any future smoke test files must also be explicitly negated. If a developer adds `smoke-test-foo.js` they will wonder why git does not track it. The naming convention `smoke-test-*` could be the negation pattern instead of listing each file individually.

**Fix:**
```gitignore
# Track versioned suites by naming convention
.claude/tests/*.js
!.claude/tests/smoke-test-*.js
```

---

_Reviewed: 2026-04-20T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---
phase: 05-memory-lifecycle
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - .claude/scripts/memory/evolve.js
  - .claude/tests/smoke-test-evolve.js
  - .claude/skills/evolve/SKILL.md
  - .claude/agents/observer.md
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files reviewed: the `evolve.js` deterministic file-manipulation script (716 lines), its smoke test suite, the evolve skill definition (SKILL.md), and the observer agent definition.

The core logic in `evolve.js` is well-structured and handles the main happy paths correctly. However, there are two distinct logic bugs that can corrupt memory files under specific but reachable conditions: a double-splice in the `promote()` branch when `## Permanent` already exists and `## Pending Review` comes before it, and a stale-index read in `revert()` and `decayRemove()` where file content is re-read after mutation but line positions are taken from an earlier scan.

The smoke test suite has a structural gap: it tests `decay` and `decay-remove` in isolation but never exercises `promote()`, meaning the most complex code path (the splice logic) has no test coverage. The observer agent spec has one mild ambiguity in its cursor byte-offset calculation that could cause duplicate processing on restart.

No security vulnerabilities or hardcoded secrets were found.

---

## Warnings

### WR-01: `promote()` — Pending entries before Permanent section get wrong line indices after insertion

**File:** `.claude/scripts/memory/evolve.js:287-291`

**Issue:** When `## Permanent` already exists and `## Pending Review` appears *after* `## Permanent` in the file (the expected layout for MEMORY.md: Pending first, Permanent second), the insertion point `insertAt` is computed from `permanentSection.entries[last].line + 1`, which is a line index *above* the Pending section. After `newLines.splice(insertAt, 0, ...insertLines)` all subsequent lines shift down by `insertLines.length`. The mapping on line 288 applies the shift only to entries whose `e.line >= insertAt` — which is correct for entries after the insertion point. However, because the Pending entries appear *below* Permanent, their lines are always `>= insertAt`, so the shift is always applied. This part is fine.

The actual bug activates in the reverse layout: if `## Permanent` appears *after* `## Pending Review` in the file (e.g., a file where the user hand-placed Pending at the bottom), `insertAt` falls inside or below the Pending block. After the splice the Pending entry lines that are `< insertAt` are used unshifted and then splice-removed correctly, but entries `>= insertAt` have `insertAt` itself recalculated on an already-mutated `newLines` array — the shift is accumulated twice and the wrong lines are deleted.

More concretely: `parseSections` captures line positions from the *original* content. `newLines.splice(insertAt, 0, ...)` mutates `newLines` in place. Then the removal loop on lines 289-292 operates on `newLines` but uses positions derived from the original scan, only partially corrected. If any pending entry's original line number equals the insertion point exactly, the condition `e.line >= insertAt` is ambiguous after the insertion.

**Fix:** Parse sections from a snapshot, compute all mutations, then apply them in a single bottom-up pass. Alternatively, re-parse `newLines` after the insertion to get fresh line positions before doing deletions:

```js
// After the splice, find pending entries by re-parsing (cheap for small files)
const updatedContent = newLines.join('\n');
const updatedSections = parseSections(updatedContent);
const updatedPending = updatedSections.find(s => s.heading === 'Pending Review');
if (updatedPending) {
  updatedPending.entries
    .map(e => e.line)
    .sort((a, b) => b - a)
    .forEach(lineIdx => newLines.splice(lineIdx, 1));
}
```

---

### WR-02: `revert()` and `decayRemove()` — Re-read file content but reuse stale line numbers

**File:** `.claude/scripts/memory/evolve.js:375-390` and `.claude/scripts/memory/evolve.js:557-573`

**Issue:** Both functions scan all files once to build an `indexMap` containing `{ filePath, line, entry }`. They then group items by file and, for each file, re-read the content fresh (`fs.readFileSync(filePath, ...)`). The re-read is unnecessary if nothing else has touched the file — but if two indices from the same file are being removed, the splice on `item.line` in iteration 1 shifts all subsequent lines, then splice on the second `item.line` (which was computed from the *original* file scan) removes the wrong line.

The code does sort items by line descending before splicing (line 379 / line 562), which is the standard approach to avoid this problem. However, the sort happens on the `items` array which holds original-scan line numbers — but those numbers come from a *separate* read (the index-building pass), not from the `content` variable re-read just before the splice loop. If the file was modified between the index-building pass and the splice pass (e.g., by a parallel process or a previous file in the same loop), the positions are stale.

More importantly: the fresh `fs.readFileSync` re-read on line 375/557 splits into `lines`, but then splices are applied using positions from `indexMap` (built from an earlier `content.split('\n')`). If the file on disk changed (even just line endings) between the two reads, the splice targets the wrong line silently.

**Fix:** Remove the redundant re-read and use the content captured during index-building, or re-parse positions after each read to keep them aligned:

```js
// Build indexMap, storing content per file to avoid re-reading
const contentCache = new Map();
for (const target of targetFiles) {
  const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
  contentCache.set(target.path, content);
  // ... rest of indexMap building
}

// In the per-file loop, use cached content instead of re-reading
for (const [filePath, items] of byFile) {
  const lines = contentCache.get(filePath).split('\n');
  items.sort((a, b) => b.line - a.line);
  for (const item of items) {
    lines.splice(item.line, 1);
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}
```

---

### WR-03: `decay()` — Global index counter increments unconditionally, diverging from `decayRemove()` / `decayUpgrade()` index space

**File:** `.claude/scripts/memory/evolve.js:448-481`

**Issue:** In `decay()`, the `globalIndex` counter is incremented for every entry in the Permanent section, including [HIGH] entries and entries without timestamps that are skipped for decay purposes (lines 453-456 and 460-462). This means the `global_index` values in `decay_result.expired` reflect positions in the full Permanent entry list.

In `decayRemove()` and `decayUpgrade()`, the index-building loop (lines 522-531 and 621-631) also iterates over all Permanent entries without filtering. So both counters start at 1 and advance for every entry — this is consistent, and the indices do match.

However, the SKILL.md (line 92) describes `decay_result` entries as having a `global_index` field on each file's `entries` array, while the actual `decay()` implementation (line 469-478) puts `global_index` directly on each expired entry at the top level of `result.expired`. The SKILL.md's data shape description is inaccurate, which will cause the evolve skill's Step 8 index-mapping logic (`decay_global_index = display_number - promote_result.total`) to fail if an LLM agent reads the skill and tries to map `decay_result.expired[*].entries[*].global_index` — that path does not exist.

**Fix:** Update SKILL.md Step 4 to match the actual JSON shape emitted by `decay()`:

```
The `decay_result` contains:
- `expired` -- flat array of expired entries. Each entry has:
  `global_index`, `path`, `type`, `line`, `text`, `confidence`, `age_days`, `ttl_days`.
- `capacity_warnings` -- array of files at or above 180 lines.
- `total_expired` -- total count.
```

---

### WR-04: `promote()` — New `## Permanent` section inserted without a blank line separator before `## Pending Review`

**File:** `.claude/scripts/memory/evolve.js:238-248`

**Issue:** When no `## Permanent` section exists, the code builds `insertLines` as:

```js
const insertLines = ['## Permanent', ''];
for (const fe of fileEntries) {
  insertLines.push(fe.promoted);
}
insertLines.push('');
```

This produces:
```
## Permanent

- entry 1
- entry 2

## Pending Review
```

The trailing `''` before `## Pending Review` is present. However, if the original file had zero blank lines between the document start and `## Pending Review` (i.e., `## Pending Review` was the very first line, line 0), the resulting file starts with `## Permanent` at line 0 with no leading newline — which is fine for Markdown. But `parseSections()` uses `lines[i].startsWith('## ')` to detect headings, so a section immediately preceded by another section's last entry (no blank line) is still parsed correctly. The concern is cosmetic/convention only, but `writeMemoryFile()` in the smoke test (line 43) does not emit a blank line before `## Permanent`, meaning round-trip files differ in whitespace from what `writeMemoryFile` produces. This won't cause corruption but will accumulate whitespace drift on repeated promotes.

**Fix:** Add a leading blank line to `insertLines` when `pendingLineIdx > 0`:

```js
const insertLines = pendingLineIdx > 0 ? ['', '## Permanent', ''] : ['## Permanent', ''];
```

---

### WR-05: Observer Step 10 — Byte offset calculation is underspecified, risking duplicate processing on restart

**File:** `.claude/agents/observer.md:230-237`

**Issue:** Step 10 says "The `byte_offset` should reflect the byte position just past the last complete event processed. Calculate by summing the byte lengths of all processed lines from the chunk."

The chunk is read with `tail -c +<byte_offset>`, which returns raw bytes. The byte lengths of JSON lines in the chunk depend on whether the JSONL was written with `\n` or `\r\n` line endings (on Windows, Node.js `fs.writeFile` in text mode emits `\r\n`). If the observer counts `line.length` (UTF-16 code units in JS) rather than the actual byte length of the line as it appears in the file, the offset drifts.

Additionally, the rotation detection condition `byte_offset > file_size` uses `wc -c` which counts bytes. On Windows, `wc -c` in MSYS2 counts bytes correctly, but `tail -c +N` uses a 1-based byte offset while `wc -c` returns total bytes — these are compatible, but the spec does not mention the 1-based vs 0-based distinction, leaving agents to guess.

**Fix:** Tighten the cursor update spec to be explicit about encoding:

```
Calculate new byte_offset as: cursor.byte_offset + (sum of Buffer.byteLength(line + '\n', 'utf8') for each processed JSONL line).
Note: tail -c uses 1-based offsets. byte_offset=0 means "read from the start."
When reading the chunk, count bytes using Buffer.byteLength, not string .length, to handle multibyte characters correctly.
```

---

## Info

### IN-01: Smoke test has no coverage for `promote()`, `revert()`, or `scan()`

**File:** `.claude/tests/smoke-test-evolve.js:68-232`

**Issue:** All seven test cases exercise only the `decay`, `decay-remove`, and `decay-upgrade` subcommands. The most complex code path in `evolve.js` — the splice logic in `promote()` — and the `revert()` command have zero test coverage. The bugs described in WR-01 and WR-02 would not be caught by the existing suite.

**Fix:** Add at minimum two promote tests:
1. Promote into a file where `## Permanent` does not yet exist (exercises the splice-insert branch).
2. Promote into a file where `## Permanent` already exists with entries above `## Pending Review` (exercises the shift-correction logic in lines 287-291).

---

### IN-02: `decayUpgrade()` — Replaces only the first `[LOW]` or `[MED]` tag if an entry has multiple tags

**File:** `.claude/scripts/memory/evolve.js:664`

**Issue:** The replacement uses:

```js
lines[item.line] = lines[item.line].replace(/\[LOW\]/, '[HIGH]').replace(/\[MED\]/, '[HIGH]');
```

`String.prototype.replace` with a non-global regex replaces only the first occurrence. If an entry text somehow contains `[LOW]` twice (e.g., `- [LOW] researcher: avoid [LOW] confidence claims`), only the first is replaced, leaving a `[LOW]` in the insight text. This is unlikely in practice given the format conventions, but the fix is cheap.

**Fix:** Use global flag:

```js
lines[item.line] = lines[item.line].replace(/\[LOW\]/g, '[HIGH]').replace(/\[MED\]/g, '[HIGH]');
```

---

### IN-03: `parseSections()` — Entries nested under sub-headings (`###`) are silently ignored

**File:** `.claude/scripts/memory/evolve.js:90-111`

**Issue:** `parseSections()` only detects `## ` (level 2) headings. If any memory file contains a `### ` sub-heading, entries below it are still collected into the enclosing `##` section's `entries` array (because the `else if (current && lines[i].startsWith('- '))` branch fires). This is fine. However, the `endLine` of a section is set to `i - 1` only when a new `## ` heading is detected — a `### ` heading does not trigger `endLine` update. This means the `endLine` of a section correctly spans sub-headings, which is the right behavior. No bug, but worth noting: if a `### ` heading is inserted between `## Pending Review` and `## Permanent` in the future, the promote insertion point logic could place entries inside the wrong sub-heading. Document the assumption that target files contain only `##` headings.

**Fix:** Add a comment to `parseSections()` noting that `###` sub-headings are transparent (entries beneath them are collected into the parent `##` section):

```js
// Note: ### sub-headings are transparent -- entries beneath them are
// collected into the enclosing ## section. Target memory files must
// not use ### headings to partition entry groups.
```

---

### IN-04: SKILL.md Step 8 references `decay_result.expired[*].entries[*].global_index` — path does not exist

**File:** `.claude/skills/evolve/SKILL.md:275`

**Issue:** Step 8(c) says: "Collect all `global_index` values from `decay_result.expired[*].entries[*].global_index`." The actual JSON emitted by `decay()` has `global_index` directly on each item in the flat `result.expired` array — there is no nested `entries` sub-array. The correct path is `decay_result.expired[*].global_index`. This is the same mismatch described in WR-03 and is filed separately here because it appears in a different location (the "upgrade kept expired" action description in Step 8c vs. the data shape description in Step 4).

**Fix:** Change line 275 to:

```
Collect all `global_index` values from `decay_result.expired` (each item has a top-level `global_index` field).
```

---

_Reviewed: 2026-04-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

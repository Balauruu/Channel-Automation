# Phase 5: Memory Lifecycle - Research

**Researched:** 2026-04-21
**Domain:** Confidence decay, memory consolidation, capacity management for markdown-based memory files
**Confidence:** HIGH

## Summary

Phase 5 adds two capabilities to the existing `/evolve` flow: (1) confidence-based decay that flags expired LOW/MED entries in the `## Permanent` section for user review, and (2) LLM-powered consolidation that triggers when a memory file approaches the 200-line cap. Both integrate into `evolve.js` as a new `decay` subcommand and extend the `/evolve` skill's step sequence.

The implementation is entirely within established patterns: CommonJS Node.js script (no npm dependencies), JSON output consumed by the skill, observer dispatched via Agent tool for consolidation. The decay logic is deterministic date arithmetic on timestamps already present in entries. Consolidation leverages the existing observer agent with a new prompt mode.

**Primary recommendation:** Add a `decay` subcommand to `evolve.js` that scans `## Permanent` entries for expired LOW (14d) and MED (30d) entries, returning structured JSON. Extend the `/evolve` skill to display expired entries in the unified summary and upgrade kept entries to HIGH. Dispatch observer with a consolidation prompt when any file hits 180 lines.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New `decay` subcommand in evolve.js -- consistent with existing scan/promote/revert pattern. Keeps lifecycle logic deterministic in JS. Output: JSON list of expired entries with file paths and ages.
- **D-02:** Decay runs after promote, before summary -- flow becomes: observe -> scan -> promote -> decay -> show unified summary.
- **D-03:** Decay targets Permanent section only -- Pending Review entries are fresh by definition.
- **D-04:** Expired entries flagged in summary for user decision -- not auto-removed.
- **D-05:** Kept entries upgrade to HIGH confidence -- human validation is the strongest confidence signal.
- **D-06:** Unified summary with three sections -- (1) Promoted entries, (2) Expired entries flagged for review, (3) Capacity warnings. Single interaction: "Revert any promoted? Remove any expired? (numbers, or Enter to keep all)". Expired entries not removed get upgraded to HIGH.
- **D-07:** LLM-powered consolidation via observer -- when evolve.js `decay` detects a file at/above 180 lines, /evolve dispatches observer with consolidation prompt.
- **D-08:** Consolidation triggers at 180 lines (90% of 200-line cap).
- **D-09:** Observer produces rewritten file section -- complete rewritten ## Permanent block. User sees before/after diff and approves or edits.

### Claude's Discretion
- Decay timestamp extraction logic (parsing entry timestamps from various formats)
- evolve.js `decay` subcommand internal structure and JSON output schema
- Observer consolidation prompt engineering
- How to present the before/after diff for consolidation (inline text vs file comparison)
- evolve.js `decay` subcommand for removing expired entries (after user confirms)
- Edge cases: entries with missing timestamps, malformed confidence tags

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVLV-04 | Memory consolidation: when a file approaches 200-line cap, /evolve proposes merging, removing, or promoting entries (not just deleting) | D-07/D-08/D-09 define consolidation trigger (180 lines), mechanism (observer dispatch), and output (rewritten ## Permanent block). Research provides timestamp parsing patterns, line-counting approach, and observer prompt strategy. |
| MEML-02 | Decay rules: LOW entries expire after 14 days, MED after 30 days (HIGH entries persist indefinitely) | D-01/D-03/D-04/D-05 define decay subcommand, targeting, flagging behavior, and upgrade-on-keep. Research provides timestamp extraction regexes for both entry formats and Node.js Date arithmetic verification. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Decay scanning (find expired entries) | Script (evolve.js) | -- | Deterministic date arithmetic on file content; no LLM judgment needed |
| Decay removal (delete confirmed entries) | Script (evolve.js) | -- | Same file mutation pattern as existing `revert` subcommand |
| Confidence upgrade (LOW/MED -> HIGH) | Script (evolve.js) | -- | Text replacement in file; deterministic |
| Capacity detection (line counting) | Script (evolve.js) | -- | Simple `wc -l` equivalent; part of decay scan output |
| Consolidation (merge/rewrite entries) | Skill (evolve SKILL.md) | Agent (observer) | Requires LLM judgment for semantic merging; skill orchestrates, observer executes |
| Unified summary display | Skill (evolve SKILL.md) | -- | UX presentation layer; skill formats JSON into readable output |
| User interaction (revert/remove/keep) | Skill (evolve SKILL.md) | -- | Prompt handling and input parsing |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 24.13.0 | Runtime for evolve.js | Already installed, verified [VERIFIED: `node --version`] |
| fs (stdlib) | -- | File read/write | Zero-dependency pattern established in evolve.js [VERIFIED: codebase] |
| path (stdlib) | -- | Path manipulation | Zero-dependency pattern established in evolve.js [VERIFIED: codebase] |

### Supporting
No additional libraries needed. The entire phase extends existing files with existing patterns.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Date arithmetic in JS | day.js / luxon | Adds npm dependency; `new Date()` handles all formats needed [VERIFIED: Node.js test] |
| Line counting in JS | External `wc -l` | JS `split('\n').length` is simpler and already used in `parseSections()` [VERIFIED: codebase] |

**Installation:**
No new packages needed. Zero-dependency CommonJS pattern continues.

## Architecture Patterns

### System Architecture Diagram

```
/evolve command invocation
        |
        v
  [1. Dispatch Observer] ---> @observer (learning extraction)
        |
        v
  [2. Scan] ---> evolve.js scan ---> JSON (pending entries)
        |
        v
  [3. Promote] ---> evolve.js promote ---> JSON (promoted entries)
        |
        v
  [4. Decay] ---> evolve.js decay ---> JSON (expired entries + capacity warnings)
        |                                    |
        |              +---------------------+-------------------+
        |              |                     |                   |
        |        expired[]             capacity_warnings[]     line_counts{}
        |              |                     |
        v              v                     v
  [5. Consolidation?]  (if any file >= 180 lines)
        |              |
        |     Dispatch @observer with consolidation prompt
        |              |
        |     Observer returns rewritten ## Permanent block
        |              |
        |     Show before/after diff to user
        |              |
        v              v
  [6. Unified Summary]
        |-- Section 1: Promoted entries (from step 3)
        |-- Section 2: Expired entries (from step 4)
        |-- Section 3: Capacity warnings (from step 4)
        |
        v
  [7. User Interaction]
        |-- "Revert any promoted? Remove any expired? (numbers, or Enter to keep all)"
        |
        +---> evolve.js revert <indices>     (for promoted entries)
        +---> evolve.js decay-remove <indices>  (for expired entries)
        +---> evolve.js decay-upgrade <indices>  (kept expired -> HIGH)
        |
        v
  [8. Commit + Done]
```

### Recommended Project Structure

No new files or directories. Phase 5 extends existing files:

```
.claude/
  scripts/memory/
    evolve.js          # ADD: decay, decay-remove, decay-upgrade subcommands
  skills/evolve/
    SKILL.md           # EXTEND: steps 4-7 with decay, consolidation, unified summary
  agents/
    observer.md        # EXTEND: add consolidation prompt mode
  tests/
    smoke-test-evolve.js  # NEW: smoke tests for decay subcommands
```

### Pattern 1: Decay Subcommand (evolve.js extension)

**What:** New `decay` subcommand that scans all `## Permanent` entries across memory files, extracts timestamps, computes ages, and returns expired entries grouped by file.

**When to use:** Called by /evolve skill after the promote step.

**Example:**
```javascript
// Source: extends existing evolve.js pattern [VERIFIED: codebase]
function decay() {
  const targetFiles = discoverTargetFiles();
  const result = {
    command: 'decay',
    expired: [],      // entries past their confidence-based TTL
    capacity_warnings: [], // files at/above 180 lines
    total_expired: 0
  };

  let globalIndex = 1;

  for (const target of targetFiles) {
    const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
    const lines = content.split('\n');
    const sections = parseSections(content);
    const permanentSection = sections.find(s => s.heading === 'Permanent');

    // Capacity check (D-08: trigger at 180 lines)
    if (lines.length >= 180) {
      result.capacity_warnings.push({
        path: relativePath(target.path),
        type: target.type,
        lines: lines.length
      });
    }

    if (!permanentSection || permanentSection.entries.length === 0) continue;

    const now = Date.now();
    const fileExpired = [];

    for (const entry of permanentSection.entries) {
      const conf = extractConfidence(entry.text);
      const ts = extractTimestamp(entry.text, target.type);

      // HIGH entries never decay (D-05 inverse)
      if (conf === 'HIGH' || !conf) continue;
      // No timestamp = can't compute age, skip
      if (!ts) continue;

      const ageMs = now - ts.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      const ttl = conf === 'LOW' ? 14 : 30; // MEML-02
      if (ageDays >= ttl) {
        fileExpired.push({
          global_index: globalIndex,
          line: entry.line,
          text: entry.text,
          confidence: conf,
          age_days: Math.floor(ageDays),
          ttl_days: ttl
        });
      }
      globalIndex++;
    }

    if (fileExpired.length > 0) {
      result.expired.push({
        path: relativePath(target.path),
        type: target.type,
        entries: fileExpired
      });
      result.total_expired += fileExpired.length;
    }
  }

  return result;
}
```

### Pattern 2: Timestamp Extraction

**What:** Extract timestamps from two distinct entry formats used across memory file types.

**When to use:** Inside the decay function for age calculation.

**Example:**
```javascript
// Source: format analysis from observer.md and codebase [VERIFIED: codebase grep]

// MEMORY.md / PLAYBOOK.md entries:
//   - [MED] researcher: insight text (2026-04-18T10:22)
const memoryTimestampRe = /\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?)\)$/;

// insights.md entries:
//   - [2026-04-20] [MED] insight text (from: agent, 2026-04-20T10:15)
const insightsTimestampRe = /\(from: [a-z][a-z0-9-]*, (\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\)$/;

// Legacy entries (pre-observer, no confidence tag):
//   - [2026-04-18] insight text
const legacyDateRe = /^- \[(\d{4}-\d{2}-\d{2})\]/;

function extractTimestamp(entryText, fileType) {
  let match;

  if (fileType === 'insights') {
    match = entryText.match(insightsTimestampRe);
    if (match) return new Date(match[1]);
    // Fall back to legacy date prefix
    match = entryText.match(legacyDateRe);
    if (match) return new Date(match[1]);
  } else {
    // memory or playbook
    match = entryText.match(memoryTimestampRe);
    if (match) return new Date(match[1]);
  }

  return null; // No parseable timestamp
}

// Confidence extraction
const confidenceRe = /\[(HIGH|MED|LOW)\]/;

function extractConfidence(entryText) {
  const match = entryText.match(confidenceRe);
  return match ? match[1] : null;
}
```

**Verification:** All timestamp formats parse correctly with `new Date()` in Node.js 24.13.0. Tested: `2026-04-18T10:22` -> valid, `2026-04-18` -> valid, age calculation via subtraction yields correct day count. [VERIFIED: Node.js runtime test]

### Pattern 3: Confidence Upgrade (decay-upgrade subcommand)

**What:** Replace `[LOW]` or `[MED]` with `[HIGH]` in entries the user chose to keep.

**When to use:** After user confirms which expired entries to keep (by not selecting them for removal).

**Example:**
```javascript
// Source: extends evolve.js line mutation pattern [VERIFIED: codebase]
function decayUpgrade(indices) {
  // Similar to revert: look up entries by global index,
  // but instead of deleting, replace [LOW] or [MED] with [HIGH]
  // in the line text, then write back.
  // ...
  for (const item of items) {
    lines[item.line] = lines[item.line]
      .replace(/\[LOW\]/, '[HIGH]')
      .replace(/\[MED\]/, '[HIGH]');
  }
  // Write back
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}
```

### Pattern 4: Observer Consolidation Dispatch

**What:** When a file hits 180+ lines, dispatch observer with a consolidation-specific prompt to rewrite the ## Permanent section.

**When to use:** In the /evolve skill, after decay results show capacity warnings.

**Example:**
```
// Consolidation dispatch prompt (skill sends this to observer via Agent tool):
Consolidate the ## Permanent section of {file_path}.

The file is at {line_count} lines (cap: 200). Rewrite the ## Permanent section to be
more concise while preserving all essential knowledge. You may:
- Merge entries that cover the same topic into a single, tighter entry
- Remove entries that are superseded by later, more specific entries
- Tighten wording without losing meaning
- Preserve all [HIGH] confidence entries (do not remove them)
- Preserve the entry format: "- [CONF] agent: insight text" for MEMORY.md,
  "- [YYYY-MM-DD] [CONF] insight text" for insights.md

Output ONLY the complete rewritten ## Permanent section (heading + entries).
Do not include other sections. Do not explain your changes.
```

### Anti-Patterns to Avoid

- **Auto-deleting expired entries:** D-04 explicitly says flag-only, not auto-remove. User must confirm.
- **Decaying Pending Review entries:** D-03 says decay targets ## Permanent only. Pending entries are fresh.
- **Decaying entries without timestamps:** Skip gracefully. Legacy entries without parseable timestamps should not be flagged for decay.
- **Consolidation without user approval:** D-09 says user sees before/after diff and approves. Never auto-write consolidated content.
- **Consolidating PLAYBOOK.md:** PLAYBOOK uses Open/Resolved, not Permanent. It is a routing log, not a memory file for consolidation purposes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date parsing | Custom ISO parser | `new Date(str)` | Node.js handles all needed formats natively [VERIFIED: runtime test] |
| File discovery | Manual path scanning | `discoverTargetFiles()` | Already exists in evolve.js, returns ordered list of all 21+ files [VERIFIED: codebase] |
| Section parsing | Custom markdown parser | `parseSections()` | Already exists in evolve.js, returns sections with entries and line numbers [VERIFIED: codebase] |
| Entry line mutation | Custom file rewriter | Existing `splice` pattern from `revert()` | Same bottom-up line removal + write pattern [VERIFIED: codebase] |

**Key insight:** Phase 5 is an extension of evolve.js, not a new system. Every primitive needed (file discovery, section parsing, line mutation, pointer regex) already exists. The new work is: timestamp extraction, age calculation, confidence replacement, and capacity counting -- all straightforward.

## Common Pitfalls

### Pitfall 1: Timestamp Parsing Ambiguity
**What goes wrong:** `new Date('2026-04-18T10:22')` interprets the time as local timezone, while `new Date('2026-04-18T10:22Z')` interprets as UTC. Mixing these produces inconsistent age calculations.
**Why it happens:** Observer-written timestamps may or may not include the Z suffix depending on the observer implementation.
**How to avoid:** Normalize all timestamps to the same interpretation. Since decay only needs day-level precision (14d, 30d), timezone differences (up to ~1 day) are negligible. Document that decay uses a +/- 1 day margin implicitly.
**Warning signs:** Entries expiring one day early or late.

### Pitfall 2: Global Index Collision Between Promoted and Expired
**What goes wrong:** The unified summary uses continuous numbering across promoted entries (from promote step) and expired entries (from decay step). If both use independent `globalIndex` counters starting at 1, numbers collide.
**Why it happens:** Promote and decay are separate subcommands with separate JSON outputs.
**How to avoid:** The skill must assign display numbers: promoted entries get 1..N, expired entries get N+1..N+M. The `decay-remove` subcommand needs its own index mapping separate from `revert`.
**Warning signs:** User types "3" to remove an expired entry but it matches a promoted entry instead.

### Pitfall 3: Line Index Corruption During Multi-Operation Writes
**What goes wrong:** If decay-remove and decay-upgrade operate on the same file in the same invocation, line indices from the decay scan become stale after the first mutation.
**Why it happens:** Removing a line shifts all subsequent line indices down by 1.
**How to avoid:** Process removals in descending line order (highest line number first), same as the existing `revert()` function does. Or: run decay-remove first, then re-scan for upgrade targets.
**Warning signs:** Wrong entries get removed or upgraded.

### Pitfall 4: PLAYBOOK.md Has Different Section Structure
**What goes wrong:** Decay tries to find `## Permanent` in PLAYBOOK.md but it uses `## Open` / `## Resolved` (per Phase 4 D-06).
**Why it happens:** PLAYBOOK was redesigned as a routing log, not a standard memory file.
**How to avoid:** `discoverTargetFiles()` returns PLAYBOOK with `type: 'playbook'`. Decay should skip files where `type === 'playbook'` -- they use Open/Resolved, not Permanent, and are managed by observer lifecycle, not by decay.
**Warning signs:** Decay reports zero entries for PLAYBOOK but attempts to scan it anyway.

### Pitfall 5: Legacy Entries Without Confidence Tags
**What goes wrong:** Pre-observer entries like `- [2026-04-10] GPU scripts MUST use perception-models conda env` have no `[HIGH]`/`[MED]`/`[LOW]` tag. Decay regex returns null confidence.
**Why it happens:** These entries were written manually before the observer system existed.
**How to avoid:** When `extractConfidence()` returns null, treat the entry as non-decayable (equivalent to HIGH). Legacy entries without confidence tags should persist indefinitely since they were human-written.
**Warning signs:** Decay flags entries that have no confidence tag.

### Pitfall 6: Consolidation Observer Prompt vs. Learning Extraction Prompt
**What goes wrong:** Observer is dispatched for consolidation but follows its normal 10-step learning extraction pipeline instead.
**Why it happens:** Observer's agent definition includes the full processing pipeline as its default behavior.
**How to avoid:** The /evolve skill must dispatch the observer with a clearly differentiated prompt that instructs consolidation mode, not learning extraction. The observer agent definition should document the consolidation mode, or the skill should pass the entire consolidation instruction inline in the dispatch prompt (overriding the agent's default behavior via explicit instructions in the user message).
**Warning signs:** Observer reads obs.jsonl and extracts learnings instead of rewriting the file section.

## Code Examples

### Decay Subcommand JSON Output Schema

```javascript
// Source: designed to match existing evolve.js output patterns [VERIFIED: codebase]
{
  "command": "decay",
  "expired": [
    {
      "path": ".claude/agent-memory/researcher/MEMORY.md",
      "type": "memory",
      "entries": [
        {
          "global_index": 1,
          "line": 15,
          "text": "- [LOW] researcher: insight text (2026-04-01T10:22)",
          "confidence": "LOW",
          "age_days": 20,
          "ttl_days": 14
        }
      ]
    }
  ],
  "capacity_warnings": [
    {
      "path": ".claude/agent-memory/asset-processor/MEMORY.md",
      "type": "memory",
      "lines": 185
    }
  ],
  "total_expired": 1
}
```

### Decay-Remove Subcommand

```javascript
// Source: follows revert() pattern from evolve.js [VERIFIED: codebase]
// Usage: node evolve.js decay-remove 1 3 5
// Removes expired entries by global_index (from decay output)
function decayRemove(indices) {
  // Re-scan Permanent sections to rebuild index map (same as revert())
  // Remove lines in descending order (same splice pattern)
  // Return JSON with removed entries
}
```

### Updated /evolve Skill Flow (Steps 4-7)

```markdown
## Step 4: Decay Scan (NEW)

Run via Bash tool:
node .claude/scripts/memory/evolve.js decay

Parse the JSON output. Store as `decay_result`.

## Step 5: Consolidation Check (NEW)

If `decay_result.capacity_warnings` is non-empty:
  For each warned file:
    Dispatch @observer with consolidation prompt (file contents + rewrite instructions)
    Show user the before/after diff
    Wait for approval
    If approved: write the consolidated content

## Step 6: Display Unified Summary (MODIFIED from current Step 4)

Three sections with continuous numbering:

**Promoted entries:** (from promote_result, indices 1..N)
  1. [skill-name] [CONF] insight text
  2. ...

**Expired entries (flagged for review):** (from decay_result, indices N+1..N+M)
  N+1. [agent-name] [MED] insight text (age: 35 days, TTL: 30 days)
  N+2. ...

**Capacity warnings:**
  .claude/agent-memory/asset-processor/MEMORY.md: 185/200 lines

## Step 7: User Interaction (MODIFIED from current Step 5)

"Revert any promoted? Remove any expired? (numbers, or Enter to keep all)"

Parse response:
- Numbers in promoted range (1..N) -> evolve.js revert
- Numbers in expired range (N+1..N+M) -> evolve.js decay-remove
- Expired entries NOT in removal list -> evolve.js decay-upgrade (to HIGH)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No decay | Confidence-based TTL (LOW=14d, MED=30d) | Phase 5 (new) | Entries don't accumulate forever; stale knowledge auto-surfaces for review |
| Manual cleanup | LLM-powered consolidation at 180 lines | Phase 5 (new) | Memory files stay within 200-line cap through intelligent merging |
| Per-entry review | Auto-promote + batch revert + decay review | Phase 3 -> Phase 5 | Single unified interaction covers all memory lifecycle operations |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Legacy entries (no confidence tag) should be treated as non-decayable (equivalent to HIGH) | Pitfall 5 | Legacy entries might need manual review; low risk since they were human-written |
| A2 | PLAYBOOK.md should be excluded from decay scanning entirely | Pitfall 4 | If PLAYBOOK needs decay, the subcommand would need Open/Resolved awareness; low risk since PLAYBOOK is a routing log |
| A3 | Observer can be dispatched with a consolidation prompt that overrides its default learning-extraction behavior | Pattern 4 / Pitfall 6 | If observer ignores inline prompt and follows its hardcoded pipeline, consolidation would fail; medium risk -- may need explicit consolidation mode in agent definition |
| A4 | Timezone differences in timestamp parsing are negligible for 14/30 day TTLs | Pitfall 1 | At worst, an entry expires +/- 1 day from expected; negligible impact |

## Open Questions

1. **Should decay-upgrade and decay-remove be separate subcommands or one subcommand with a mode flag?**
   - What we know: The skill needs to both remove confirmed expired entries and upgrade kept entries to HIGH. These are two distinct file mutations.
   - What's unclear: Whether they should be `evolve.js decay-remove 1 3` + `evolve.js decay-upgrade 2 4` (two calls) or `evolve.js decay-act --remove 1,3 --upgrade 2,4` (one call).
   - Recommendation: Two separate subcommands. Consistent with existing scan/promote/revert pattern (one action per subcommand). Simpler implementation. The skill calls them sequentially.

2. **How should the consolidation before/after diff be presented?**
   - What we know: D-09 says "user sees before/after diff and approves or edits."
   - What's unclear: Inline text comparison vs. writing temp files and showing a diff command output.
   - Recommendation: Inline text in chat -- show the current ## Permanent section, then the proposed rewrite. The skill is a conversation, not a CLI tool, so inline is natural. No temp files needed.

3. **Should the decay global index be independent or continue from promote's numbering?**
   - What we know: D-06 describes continuous numbering across all three summary sections.
   - What's unclear: Whether the script or the skill handles index assignment.
   - Recommendation: Scripts use their own internal indices. The skill assigns display numbers by offsetting decay indices by the promote total. This keeps scripts independent and the skill handles presentation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js assert + custom runner (same as smoke-test-observe.js) |
| Config file | None -- standalone test script |
| Quick run command | `node .claude/tests/smoke-test-evolve.js` |
| Full suite command | `node .claude/tests/smoke-test-observe.js && node .claude/tests/smoke-test-evolve.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEML-02 | LOW entries flagged after 14 days | unit | `node .claude/tests/smoke-test-evolve.js` (decay_low_14d test) | Wave 0 |
| MEML-02 | MED entries flagged after 30 days | unit | `node .claude/tests/smoke-test-evolve.js` (decay_med_30d test) | Wave 0 |
| MEML-02 | HIGH entries never flagged | unit | `node .claude/tests/smoke-test-evolve.js` (decay_high_never test) | Wave 0 |
| MEML-02 | Entries without timestamps skipped | unit | `node .claude/tests/smoke-test-evolve.js` (decay_no_timestamp test) | Wave 0 |
| EVLV-04 | Capacity warning at 180+ lines | unit | `node .claude/tests/smoke-test-evolve.js` (capacity_warning test) | Wave 0 |
| EVLV-04 | decay-remove deletes correct entries | unit | `node .claude/tests/smoke-test-evolve.js` (decay_remove test) | Wave 0 |
| EVLV-04 | decay-upgrade changes conf to HIGH | unit | `node .claude/tests/smoke-test-evolve.js` (decay_upgrade test) | Wave 0 |
| EVLV-04 | Consolidation prompt produces rewrite | manual-only | Observer dispatch requires LLM; cannot be automated in unit test | -- |

### Sampling Rate
- **Per task commit:** `node .claude/tests/smoke-test-evolve.js`
- **Per wave merge:** Full suite (observe + evolve tests)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `.claude/tests/smoke-test-evolve.js` -- covers MEML-02 and EVLV-04 (decay subcommands)
- Test infrastructure: reuse `makeTmpProject()`, `cleanTmpProject()`, runner pattern from `smoke-test-observe.js`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | -- |
| V3 Session Management | No | -- |
| V4 Access Control | No | Local file operations only |
| V5 Input Validation | Yes | Validate user input (revert/remove numbers) against valid index range; reject non-integer input |
| V6 Cryptography | No | -- |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via crafted memory file paths | Tampering | `discoverTargetFiles()` only returns known paths under `.claude/`; no user-controlled paths |
| Index out of range | Tampering | Existing `revert()` validates indices against max range; same pattern for decay-remove |

## Sources

### Primary (HIGH confidence)
- **evolve.js** (`.claude/scripts/memory/evolve.js`) -- Full source code read. Verified: discoverTargetFiles(), parseSections(), stripPointer(), scan/promote/revert subcommands, line mutation patterns, JSON output format.
- **evolve SKILL.md** (`.claude/skills/evolve/SKILL.md`) -- Full skill definition read. Verified: 8-step flow, observer dispatch, promote/revert interaction, commit strategy.
- **observer.md** (`.claude/agents/observer.md`) -- Full agent definition read. Verified: 10-step pipeline, entry format specs, scope-test questions, consolidation is not yet implemented.
- **pipeline-observe.js** (`.claude/hooks/pipeline-observe.js`) -- Timestamp format reference. Verified: `ts` field uses `toISOString().replace(/[:.]/g, '-')` format.
- **Memory files** -- Grepped all 21 memory files. Verified: line counts (21-43 lines each, all well below 180), no confidence tags in existing entries (all pre-observer), timestamp formats ([YYYY-MM-DD] prefix in insights.md, [YYYY-MM-DD] prefix in MEMORY.md sections).
- **Node.js Date parsing** -- Runtime test verified all four timestamp formats parse correctly. Age calculation via subtraction produces correct day count.

### Secondary (MEDIUM confidence)
- **Phase 2/3/4 CONTEXT.md** -- Cross-referenced entry format decisions (D-04, D-05), promotion pattern (D-14, D-15), PLAYBOOK lifecycle (D-06).

### Tertiary (LOW confidence)
None -- all claims verified against codebase or runtime.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns verified in codebase
- Architecture: HIGH -- extends existing evolve.js with same subcommand pattern, all integration points verified
- Pitfalls: HIGH -- identified from actual codebase analysis (PLAYBOOK section mismatch, legacy entries, index collision)

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable -- no external dependencies, internal project only)

# Phase 5: Memory Lifecycle - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 4 (3 modified, 1 new)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.claude/scripts/memory/evolve.js` | utility | file-I/O + transform | `.claude/scripts/memory/evolve.js` (self -- existing subcommands) | exact (self-extend) |
| `.claude/skills/evolve/SKILL.md` | skill | request-response (orchestration) | `.claude/skills/evolve/SKILL.md` (self -- existing steps) | exact (self-extend) |
| `.claude/agents/observer.md` | agent-definition | event-driven (processing pipeline) | `.claude/agents/observer.md` (self -- existing pipeline) | exact (self-extend) |
| `.claude/tests/smoke-test-evolve.js` | test | file-I/O | `.claude/tests/smoke-test-observe.js` | exact |

**Note:** All 3 modified files are self-extensions -- the analog is the current version of each file. The new test file has a direct analog in the existing smoke test for the observe hook.

## Pattern Assignments

### `.claude/scripts/memory/evolve.js` (utility, file-I/O -- add 3 subcommands)

**Analog:** Self (current 391 lines). Add `decay`, `decay-remove`, `decay-upgrade` subcommands following existing `scan`/`promote`/`revert` patterns.

**Imports pattern** (lines 1-12):
```javascript
#!/usr/bin/env node
// .claude/scripts/memory/evolve.js
// Deterministic file operations for /evolve command: scan, promote, revert.
// Usage:
//   node .claude/scripts/memory/evolve.js scan
//   node .claude/scripts/memory/evolve.js promote
//   node .claude/scripts/memory/evolve.js revert <global_index> [<global_index> ...]

'use strict';

const fs = require('fs');
const path = require('path');
```

Zero npm dependencies. CommonJS. Extend the header comment to list the new subcommands.

**Existing regex patterns to extend** (lines 26-27):
```javascript
const memoryPointerRe = / \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?\)$/;
const insightPointerRe = / \(from: [a-z][a-z0-9-]*, \d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
```

These are pointer-stripping regexes. Add new timestamp-extraction regexes nearby that capture groups for `extractTimestamp()` and a confidence-extraction regex for `extractConfidence()`. RESEARCH.md provides the exact regexes:
- `memoryTimestampRe = /\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z?)\)$/`
- `insightsTimestampRe = /\(from: [a-z][a-z0-9-]*, (\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\)$/`
- `legacyDateRe = /^- \[(\d{4}-\d{2}-\d{2})\]/`
- `confidenceRe = /\[(HIGH|MED|LOW)\]/`

**Core subcommand pattern -- `scan()` as model** (lines 124-153):
```javascript
function scan() {
  const targetFiles = discoverTargetFiles();
  const result = {
    command: 'scan',
    files: [],
    total: 0
  };

  for (const target of targetFiles) {
    const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
    const sections = parseSections(content);
    const pendingSection = sections.find(s => s.heading === 'Pending Review');

    if (pendingSection && pendingSection.entries.length > 0) {
      const fileResult = {
        path: relativePath(target.path),
        type: target.type,
        entries: pendingSection.entries.map((e, idx) => ({
          index: idx,
          line: e.line,
          text: e.text
        }))
      };
      result.files.push(fileResult);
      result.total += fileResult.entries.length;
    }
  }

  return result;
}
```

Pattern: (1) call `discoverTargetFiles()`, (2) build result object with `command` key, (3) iterate files, (4) parse with `parseSections()`, (5) find target section, (6) process entries, (7) return structured JSON. The `decay` subcommand follows this exact pattern but targets `## Permanent` section and adds age/capacity logic.

**Core mutation pattern -- `revert()` as model for `decay-remove` and `decay-upgrade`** (lines 274-367):
```javascript
function revert(indices) {
  // Validate and parse indices
  const parsedIndices = [];
  const errors = [];

  for (const idx of indices) {
    const parsed = parseInt(idx, 10);
    if (isNaN(parsed) || parsed < 1) {
      errors.push({ index: idx, error: 'Invalid index: must be a positive integer' });
    } else {
      parsedIndices.push(parsed);
    }
  }

  // Discover files and assign global indices to Permanent entries
  const targetFiles = discoverTargetFiles();
  const indexMap = []; // [{globalIndex, filePath, lineInFile, entry}]
  let globalIndex = 1;

  for (const target of targetFiles) {
    const content = fs.readFileSync(target.path, 'utf8').replace(/\r\n/g, '\n');
    const sections = parseSections(content);
    const permanentSection = sections.find(s => s.heading === 'Permanent');

    if (!permanentSection || permanentSection.entries.length === 0) continue;

    for (const entry of permanentSection.entries) {
      indexMap.push({
        globalIndex: globalIndex,
        filePath: target.path,
        line: entry.line,
        entry: entry.text
      });
      globalIndex++;
    }
  }

  // Check for out-of-range indices
  const maxIndex = indexMap.length;
  for (const idx of parsedIndices) {
    if (idx > maxIndex) {
      errors.push({ index: String(idx), error: `Index ${idx} out of range (max: ${maxIndex})` });
    }
  }

  // Collect entries to revert
  const toRevert = parsedIndices
    .filter(idx => idx <= maxIndex)
    .map(idx => indexMap[idx - 1]);

  // Group by file path
  const byFile = new Map();
  for (const item of toRevert) {
    if (!byFile.has(item.filePath)) byFile.set(item.filePath, []);
    byFile.get(item.filePath).push(item);
  }

  const reverted = [];

  // Process each file (remove lines in descending order)
  for (const [filePath, items] of byFile) {
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const lines = content.split('\n');

    items.sort((a, b) => b.line - a.line);

    for (const item of items) {
      lines.splice(item.line, 1);
      reverted.push({
        global_index: item.globalIndex,
        path: relativePath(item.filePath),
        entry: item.entry
      });
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }

  reverted.sort((a, b) => a.global_index - b.global_index);

  const result = {
    command: 'revert',
    reverted: reverted,
    total: reverted.length
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}
```

Key patterns for `decay-remove`:
1. Index validation with `parseInt` + range check (lines 279-287)
2. Rebuild global index map by re-scanning Permanent sections (lines 289-309)
3. Group by file path (lines 324-329)
4. **Descending line-order removal** (line 339: `items.sort((a, b) => b.line - a.line)`) -- critical for index stability
5. `lines.splice(item.line, 1)` for removal (line 341)
6. `fs.writeFileSync(filePath, lines.join('\n'), 'utf8')` for write-back (line 350)
7. Error array appended to result only if non-empty (lines 362-364)

Key difference for `decay-upgrade`: instead of `lines.splice(item.line, 1)`, use `lines[item.line] = lines[item.line].replace(/\[LOW\]/, '[HIGH]').replace(/\[MED\]/, '[HIGH]')` for in-place text replacement.

**CLI dispatch pattern** (lines 371-388):
```javascript
if (require.main === module) {
  const COMMAND = process.argv[2];
  try {
    let result;
    switch (COMMAND) {
      case 'scan':    result = scan(); break;
      case 'promote': result = promote(); break;
      case 'revert':  result = revert(process.argv.slice(3)); break;
      default:
        process.stderr.write('Usage: node evolve.js <scan|promote|revert> [args]\n');
        process.exit(1);
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (err) {
    process.stderr.write('evolve: ' + err.message + '\n');
    process.exit(1);
  }
}
```

Add three new cases: `'decay'`, `'decay-remove'` (with `process.argv.slice(3)`), `'decay-upgrade'` (with `process.argv.slice(3)`). Update usage string.

**Module exports pattern** (line 390):
```javascript
module.exports = { scan, promote, revert, discoverTargetFiles, parseSections, stripPointer };
```

Add new functions: `decay`, `decayRemove`, `decayUpgrade`, `extractTimestamp`, `extractConfidence`.

**PLAYBOOK skip pattern** (from RESEARCH.md Pitfall 4): decay must skip files where `target.type === 'playbook'` since PLAYBOOK uses Open/Resolved, not Permanent.

**Legacy entry handling** (from RESEARCH.md Pitfall 5): when `extractConfidence()` returns null, treat as non-decayable (equivalent to HIGH). Do not flag.

---

### `.claude/skills/evolve/SKILL.md` (skill, request-response -- extend steps)

**Analog:** Self (current 186 lines). Extend with steps 4-7 for decay, consolidation, unified summary, and user interaction.

**YAML frontmatter pattern** (lines 1-8):
```yaml
---
name: evolve
description: >-
  Memory evolution command. Dispatches @observer for new events, auto-promotes
  all Pending Review entries to Permanent sections across memory files, shows
  a numbered summary, and lets the user revert specific entries by number.
user-invocable: true
---
```

Update `description` to mention decay scanning and consolidation.

**Step pattern -- Step 2 as model for new Step 4 (Decay)** (lines 42-63):
```markdown
## Step 2: Scan for Pending Entries

Run via Bash tool:

\`\`\`bash
node .claude/scripts/memory/evolve.js scan
\`\`\`

Parse the JSON output. Store the result as `scan_result`.

**Quick exit (D-06):** If `scan_result.total` is 0 AND either:
- `obs_runs == 0` (observer found nothing new), or
- `obs_runs == -1` (observer failed)

Then display:

\`\`\`
No new events. No pending entries. Nothing to do.
\`\`\`

And STOP. Do not proceed to Step 3.
```

Pattern: (1) `## Step N: Name` heading, (2) Bash tool invocation with exact command, (3) "Parse the JSON output. Store the result as `X`.", (4) conditional logic with formatting. New Step 4 follows this same pattern: `node .claude/scripts/memory/evolve.js decay`, parse as `decay_result`.

**Display summary pattern -- Step 4 as model for unified summary** (lines 79-116):
```markdown
## Step 4: Display Summary

First, display observer stats (if observer succeeded):
...
Then display promoted entries grouped by type, using this format:

\`\`\`
All entries auto-promoted to Permanent sections:

**insights.md files:**
  1. [{skill-name}] [{CONF}] {insight text}
  2. [{skill-name}] [{CONF}] {insight text}

**MEMORY.md files:**
  3. [{agent-name}] [{CONF}] {insight text}
  4. [{agent-name}] [{CONF}] {insight text}
\`\`\`
```

Pattern: bold section headers, numbered entries with continuous indexing, bracketed metadata. Extend with two new sections per D-06: "Expired entries (flagged for review)" and "Capacity warnings". The skill assigns display numbers: promoted entries 1..N, expired entries N+1..N+M.

**User interaction pattern -- Step 5 as model for unified interaction** (lines 124-136):
```markdown
## Step 5: Revert Prompt

Display:

\`\`\`
Revert any? (enter numbers, or press Enter to keep all)
\`\`\`

Wait for user input.

- If user presses Enter (empty input): skip to Step 7.
- If user provides numbers (e.g., `2,4` or `2 4` or `2, 4`): parse the
  input into a list of integers. Proceed to Step 6.
```

Extended prompt becomes: "Revert any promoted? Remove any expired? (numbers, or Enter to keep all)". Parse response: numbers in promoted range (1..N) -> `evolve.js revert`, numbers in expired range (N+1..N+M) -> `evolve.js decay-remove`. Expired entries NOT in removal list -> `evolve.js decay-upgrade`.

**Observer dispatch pattern -- Step 1 as model for consolidation dispatch** (lines 24-38):
```markdown
## Step 1: Dispatch Observer

Use the Agent tool to dispatch `@observer` with this prompt:

\`\`\`
Process new events. Read your cursor and process new runs from obs.jsonl.
Report your completion summary when done.
\`\`\`

After the observer completes, parse its text output for key stats:
- Extract `Runs processed: (\d+)` into `obs_runs`
- Extract `Entries written: (\d+)` into `obs_written`
- Extract `Candidates rejected: (\d+)` into `obs_rejected`
```

Pattern: (1) "Use the Agent tool to dispatch `@observer`", (2) quoted prompt block, (3) parse text output with regex extraction. New consolidation step dispatches observer with a different prompt (consolidation mode, not learning extraction) and parses the rewritten `## Permanent` block from the response.

**Commit pattern -- Step 7** (lines 156-176):
```markdown
## Step 7: Commit Changes

Stage all modified memory files using `git add` with specific file paths
extracted from the promote output (and revert output if applicable).

Do NOT use `git add -A` or `git add .` -- stage only the files that were
actually modified by evolve.js.
```

Extend to also stage files modified by decay-remove, decay-upgrade, and consolidation.

---

### `.claude/agents/observer.md` (agent-definition, event-driven -- add consolidation mode)

**Analog:** Self (current 339 lines). Add consolidation prompt capability as a secondary mode.

**Agent dispatch context** (lines 1-21 YAML frontmatter):
```yaml
---
name: observer
description: >-
  Reads obs.jsonl event logs from completed agent runs, extracts reusable
  learnings, classifies each to the correct memory tier via scope-test
  questions, writes tagged entries to Pending Review sections, and routes
  cross-agent insights through PLAYBOOK.md Open/Resolved lifecycle.
  Do NOT invoke manually -- dispatched by /evolve command only.
model: sonnet
memory: project
color: yellow
skills:
  - agent-protocols
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---
```

Update `description` to mention consolidation mode.

**Identity section pattern** (lines 23-29):
```markdown
## Identity

You are the observer agent for the Channel-Automation pipeline. You analyze
completed agent runs captured in obs.jsonl event logs, extract reusable
learnings, classify each to the correct memory tier, and write tagged entries
to Pending Review sections in the target memory files.
```

Add a sentence acknowledging the consolidation mode: "When dispatched with a consolidation prompt, you rewrite a memory file's ## Permanent section to reduce its size while preserving essential knowledge."

**New section needed after Step 10 (or as a separate mode block):**

The consolidation prompt comes from the /evolve skill, not from the observer's normal pipeline. The observer needs to recognize when it is invoked in consolidation mode (the dispatch prompt will contain "Consolidate the ## Permanent section of {file_path}") and bypass the normal 10-step pipeline. Per RESEARCH.md Pitfall 6, the skill must dispatch with a clearly differentiated prompt.

Pattern for a new section:
```markdown
## Consolidation Mode

When your dispatch prompt begins with "Consolidate the ## Permanent section",
you are in consolidation mode. **Skip the entire 10-step pipeline above.**

Instead:
1. Read the specified file
2. Extract the ## Permanent section
3. Rewrite it to be more concise:
   - Merge entries covering the same topic
   - Remove entries superseded by later entries
   - Tighten wording without losing meaning
   - Preserve all [HIGH] confidence entries
   - Preserve entry format conventions
4. Output ONLY the complete rewritten ## Permanent section (heading + entries)
5. Do not include other sections or explain changes
```

---

### `.claude/tests/smoke-test-evolve.js` (test, file-I/O -- new file)

**Analog:** `.claude/tests/smoke-test-observe.js` (308 lines)

**Imports and setup pattern** (lines 1-16):
```javascript
// .claude/tests/smoke-test-observe.js
// Smoke tests for pipeline-observe.js hook
// Covers: CAPT-01 through CAPT-07
// Run: node .claude/tests/smoke-test-observe.js

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const obsScript = path.join(projectRoot, '.claude', 'hooks', 'pipeline-observe.js');
```

Adapt: change header comment, change `obsScript` to point to `evolve.js`:
```javascript
const evolveScript = path.join(projectRoot, '.claude', 'scripts', 'memory', 'evolve.js');
```

**Temp project helper pattern** (lines 18-25):
```javascript
function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-test-'));
  fs.mkdirSync(path.join(tmp, '.claude', 'logs', 'observations'), { recursive: true });
  return tmp;
}

function cleanTmpProject(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
```

Adapt: change prefix to `'evolve-test-'`, create the memory file structure instead of observations:
```javascript
function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evolve-test-'));
  // Create memory file structure for decay tests
  const agentMemDir = path.join(tmp, '.claude', 'agent-memory', 'test-agent');
  fs.mkdirSync(agentMemDir, { recursive: true });
  // Write a MEMORY.md with Permanent entries having various ages/confidences
  return tmp;
}
```

**Script execution helper pattern** (lines 28-35):
```javascript
function runHook(event, stdinJson, projectDir) {
  execFileSync('node', [obsScript, event], {
    input: JSON.stringify(stdinJson),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });
}
```

Adapt for evolve.js (no stdin, uses argv):
```javascript
function runEvolve(subcommand, args, projectDir) {
  const result = execFileSync('node', [evolveScript, subcommand, ...args], {
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });
  return JSON.parse(result.toString('utf8'));
}
```

**Test case registration pattern** (lines 49-63):
```javascript
const testCases = [];

testCases.push({
  name: 'CAPT-01/main_conversation_captured',
  check: () => {
    const tmp = makeTmpProject();
    try {
      // ... test body ...
      return /* boolean assertion */;
    } finally { cleanTmpProject(tmp); }
  }
});
```

Pattern: array of `{name, check}` objects. Each `check` is a function that creates a temp project, runs the script, asserts, and cleans up in `finally`. Name format: `REQ_ID/descriptive_name`.

Tests to create per RESEARCH.md validation map:
- `MEML-02/decay_low_14d` -- LOW entry at 15 days is flagged
- `MEML-02/decay_med_30d` -- MED entry at 31 days is flagged
- `MEML-02/decay_high_never` -- HIGH entry at 60 days is NOT flagged
- `MEML-02/decay_no_timestamp` -- entry without timestamp is skipped
- `EVLV-04/capacity_warning_180` -- file at 180+ lines triggers capacity warning
- `EVLV-04/decay_remove_correct_entries` -- decay-remove deletes specified entries
- `EVLV-04/decay_upgrade_to_high` -- decay-upgrade changes [LOW]/[MED] to [HIGH]

**Test runner pattern** (lines 292-308):
```javascript
let passed = 0;
const total = testCases.length;

for (const tc of testCases) {
  try {
    const ok = tc.check();
    console.log(ok ? 'PASS' : 'FAIL', tc.name);
    if (ok) passed++;
    else console.log('  Expected: true, Got: false');
  } catch (e) {
    console.log('FAIL', tc.name);
    console.log('  Error:', e.message);
  }
}

console.log('\n' + passed + '/' + total + ' passed');
process.exit(passed === total ? 0 : 1);
```

Copy verbatim. Exit code 0 on all pass, 1 on any failure.

**Test data construction pattern** (adapting from lines 127-137 transcript mock):

For evolve tests, construct MEMORY.md files with backdated entries:
```javascript
function writeMemoryFile(tmpDir, agentName, permanentEntries) {
  const dir = path.join(tmpDir, '.claude', 'agent-memory', agentName);
  fs.mkdirSync(dir, { recursive: true });
  const content = [
    '## Pending Review',
    '',
    '## Permanent',
    '',
    ...permanentEntries,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'MEMORY.md'), content, 'utf8');
}
```

Use ISO timestamps backdated to desired ages:
```javascript
// Create a timestamp N days ago
function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16); // YYYY-MM-DDThh:mm
}

// Example entries for decay tests:
const lowExpired = `- [LOW] test-agent: old insight (${daysAgo(15)})`;
const medExpired = `- [MED] test-agent: aging insight (${daysAgo(31)})`;
const highNeverExpires = `- [HIGH] test-agent: permanent insight (${daysAgo(60)})`;
const noTimestamp = `- [LOW] test-agent: no timestamp entry`;
```

---

## Shared Patterns

### CommonJS + Node.js Stdlib Convention
**Source:** `.claude/scripts/memory/evolve.js` lines 1-12, `.claude/hooks/pipeline-observe.js` lines 1-12
**Apply to:** evolve.js (extensions), smoke-test-evolve.js (new file)

```javascript
'use strict';

const fs = require('fs');
const path = require('path');
```

Zero npm dependencies. CommonJS modules. Path construction via `path.join()`. CRLF normalization via `.replace(/\r\n/g, '\n')`.

### Subcommand JSON Output Convention
**Source:** `.claude/scripts/memory/evolve.js` -- all three existing subcommands
**Apply to:** decay, decay-remove, decay-upgrade subcommands

Every subcommand returns a JSON object with:
- `command` key matching the subcommand name
- Primary data array (e.g., `files`, `promoted`, `reverted`, `expired`)
- `total` count
- Optional `errors` array (only included if non-empty)

Output via `process.stdout.write(JSON.stringify(result, null, 2) + '\n')`.

### Descending-Order Line Mutation
**Source:** `.claude/scripts/memory/evolve.js` line 339
**Apply to:** decay-remove subcommand

```javascript
items.sort((a, b) => b.line - a.line);
for (const item of items) {
  lines.splice(item.line, 1);
}
```

When removing multiple lines from a file, sort by line number descending (highest first) to prevent index corruption. Same pattern for decay-remove.

### File Discovery and Section Parsing
**Source:** `.claude/scripts/memory/evolve.js` lines 35-100
**Apply to:** All new subcommands (decay, decay-remove, decay-upgrade)

Reuse `discoverTargetFiles()` and `parseSections()` directly. Do not duplicate.

### Skill Step Structure
**Source:** `.claude/skills/evolve/SKILL.md` -- all 8 existing steps
**Apply to:** New steps 4-7 in evolve SKILL.md

Pattern: `## Step N: Name` -> prose description -> bash code block with exact command -> "Parse the JSON output. Store as `var_name`." -> conditional logic -> display format.

### Entry Format Conventions
**Source:** `.claude/agents/observer.md` lines 152-175
**Apply to:** Timestamp and confidence extraction regexes in evolve.js

| Target Type | Format | Timestamp Location |
|-------------|--------|-------------------|
| MEMORY.md / PLAYBOOK.md | `- [CONF] agent: insight (YYYY-MM-DDThh:mm)` | Trailing parenthesized timestamp |
| insights.md | `- [YYYY-MM-DD] [CONF] insight (from: agent, YYYY-MM-DDThh:mm)` | Trailing parenthesized timestamp after `from: agent,` |
| Legacy (pre-observer) | `- [YYYY-MM-DD] insight text` | Leading bracketed date |

### Test Structure Convention
**Source:** `.claude/tests/smoke-test-observe.js` lines 49-308
**Apply to:** smoke-test-evolve.js

Pattern: `testCases` array of `{name, check}` objects -> `check()` creates temp dir, runs script, asserts boolean, cleans up in `finally` -> runner iterates, logs PASS/FAIL, exits 0/1.

## No Analog Found

No files in this phase lack an analog. The 3 modified files are self-extensions of existing code. The 1 new file (smoke-test-evolve.js) has a direct analog in smoke-test-observe.js.

## Metadata

**Analog search scope:** `.claude/scripts/memory/`, `.claude/skills/evolve/`, `.claude/agents/`, `.claude/tests/`, `.claude/hooks/`
**Files scanned:** 6 (evolve.js, evolve SKILL.md, observer.md, pipeline-observe.js, smoke-test-observe.js, pipeline-design SKILL.md)
**Pattern extraction date:** 2026-04-21

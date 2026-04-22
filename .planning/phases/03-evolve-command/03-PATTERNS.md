# Phase 3: Evolve Command - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 4 (new/modified files)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.claude/scripts/memory/evolve.js` | utility (script) | file-I/O + transform | `.claude/scripts/obs-summarize.js` | exact |
| `.claude/skills/evolve/SKILL.md` | skill (orchestration) | request-response | `.claude/skills/pipeline-design/SKILL.md` | role-match |
| `.claude/tests/eval-evolve.js` | test | transform | `.claude/tests/eval-observer.js` | exact |
| `.claude/tests/fixtures/evolve/` | test fixture | N/A | `.claude/tests/fixtures/observer/` | exact |

## Pattern Assignments

### `.claude/scripts/memory/evolve.js` (utility, file-I/O + transform)

**Analog:** `.claude/scripts/obs-summarize.js` (structure, CommonJS, JSON output) + `.claude/hooks/pipeline-observe.js` (project detection, subcommand dispatch, fs patterns)

**CommonJS module header pattern** (obs-summarize.js lines 1-6, 24-29):
```javascript
#!/usr/bin/env node
// .claude/scripts/memory/evolve.js
// Deterministic file operations for /evolve command: scan, promote, revert.
// Usage:
//   node .claude/scripts/memory/evolve.js scan
//   node .claude/scripts/memory/evolve.js promote
//   node .claude/scripts/memory/evolve.js revert <global_index> [<global_index> ...]

const fs = require('fs');
const path = require('path');
```

**Subcommand dispatch pattern** (pipeline-observe.js lines 76-89):
```javascript
// pipeline-observe.js uses switch on HOOK_EVENT (process.argv[2])
switch (HOOK_EVENT) {
  case 'tool_pre':
  case 'tool_post':
  case 'tool_fail':
  case 'permission_denied':
    handleToolEvent(data, obsFile);
    break;
  case 'subagent_stop':
    handleSubagentStop(data, obsFile, project);
    break;
  default:
    // Unknown event -- no-op, never block
    break;
}
```

Adapt for evolve.js:
```javascript
const COMMAND = process.argv[2];
switch (COMMAND) {
  case 'scan':    scan(); break;
  case 'promote': promote(); break;
  case 'revert':  revert(process.argv.slice(3)); break;
  default:
    process.stderr.write('Usage: node evolve.js <scan|promote|revert> [args]\n');
    process.exit(1);
}
```

**Project root detection pattern** (pipeline-observe.js lines 19-20):
```javascript
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const OBS_BASE = path.join(PROJECT_ROOT, '.claude', 'logs', 'observations');
```

Adapt for evolve.js:
```javascript
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');
```

**File discovery pattern** (pipeline-observe.js lines 66-68 for mkdirSync + existsSync; obs-summarize.js lines 39-53 for readdirSync + file validation):
```javascript
// obs-summarize.js: directory scanning with existence check and filter
const runsDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || '.', '.claude', 'logs', 'runs');
if (!fs.existsSync(runsDir)) throw new Error(`no runs dir at ${runsDir}`);
const files = fs.readdirSync(runsDir).filter(f => f.endsWith('.jsonl'));
```

**JSONL read utility** (obs-summarize.js lines 31-35):
```javascript
function readJsonl(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}
```

**JSON output pattern** (obs-summarize.js line 211 writes to stdout; the module.exports pattern at line 220):
```javascript
// obs-summarize.js: stdout output + module.exports for testability
if (require.main === module) main();
module.exports = { summarize, resolveRunFile };
```

Adapt for evolve.js:
```javascript
if (require.main === module) {
  const result = main();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
module.exports = { scan, promote, revert, discoverTargetFiles, parseSections, stripPointer };
```

**Error handling pattern** (pipeline-observe.js lines 50-61, 172-175):
```javascript
// pipeline-observe.js: stderr logging, never throw/crash in hook context
try {
  // ...operation...
} catch (err) {
  process.stderr.write('[pipeline-observe] ' + err.message + '\n');
}
process.exit(0);
```

For evolve.js (not a hook, so exit(1) on failure is appropriate):
```javascript
try {
  const result = main();
  process.stdout.write(JSON.stringify(result) + '\n');
} catch (err) {
  process.stderr.write('evolve: ' + err.message + '\n');
  process.exit(1);
}
```

---

### `.claude/skills/evolve/SKILL.md` (skill, request-response)

**Analog:** `.claude/skills/pipeline-design/SKILL.md`

**Frontmatter pattern** (pipeline-design/SKILL.md lines 1-11):
```yaml
---
name: pipeline-design
description: >-
  Framework for auditing and designing pipeline agents and skills. Use when
  auditing an existing agent or skill, designing a new one, or reviewing
  the pipeline for bloat, overlap, stale references, or overfitting to
  test cases. Provides decision rules ( skill vs agent-body vs
  bundled reference), script-failure policy, generalization audit
  pattern, and a one-at-a-time audit workflow.
user-invocable: true
---
```

Adapt for evolve:
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

**Phase 0 context loading pattern** (pipeline-design/SKILL.md lines 22-27):
```markdown
## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/pipeline-design/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read `./CLAUDE.md` for the project folder map and agent reference table
```

Note: The evolve skill does NOT need a Phase 0 context loading step since it is a procedural orchestration (dispatch observer, run scripts, show results). It does not require skill insights or CLAUDE.md reading -- its steps are deterministic.

**Procedural step structure** (pipeline-design/SKILL.md lines 96-110 for numbered workflow):
```markdown
## One-at-a-Time Audit Workflow

This skill is explicitly human-in-the-loop. Do not audit multiple agents
in a single pass. For each target:

1. **Read** the agent's `.md` file fully...
2. **Inventory overlap.** List content...
3. **Inventory stale references.**...
4. **Inventory overfits.**...
5. **Propose cuts.**...
6. **Confirm with the user.**...
7. **Apply the changes.**...
8. **Append to `insights.md`.**...
```

The evolve skill should follow the same numbered-step procedural format but for its own flow: (1) dispatch observer, (2) parse stats, (3) scan, (4) check empty state, (5) promote, (6) display summary, (7) revert prompt, (8) commit.

---

### `.claude/tests/eval-evolve.js` (test, transform)

**Analog:** `.claude/tests/eval-observer.js`

**Test file header pattern** (eval-observer.js lines 1-6):
```javascript
// .claude/tests/eval-evolve.js
// Deterministic eval tests for evolve.js output contracts
// Covers: EVLV-02, EVLV-03
// Run: node .claude/tests/eval-evolve.js

'use strict';
```

**Imports and project root pattern** (eval-observer.js lines 8-13):
```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

const projectRoot = path.resolve(__dirname, '..', '..');
const fixtureDir = path.join(projectRoot, '.claude', 'tests', 'fixtures', 'observer');
```

**Temp project factory pattern** (eval-observer.js lines 29-56):
```javascript
function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-eval-'));
  fs.mkdirSync(path.join(tmp, '.claude', 'agent-memory', 'researcher'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.claude', 'skills', 'autoresearch'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.claude', 'agent-memory', 'researcher', 'MEMORY.md'), [
    '# Researcher Agent Memory',
    '',
    '## Core Identity',
    'Research agent for documentary topics.',
    '',
    '## Permanent',
    '- [HIGH] researcher: Always verify Wikipedia dates...',
    '',
    '## Pending Review',
    '',
    // ...
  ].join('\n'), 'utf8');
  return tmp;
}

function cleanTmpProject(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
```

**Test case array + check function pattern** (eval-observer.js lines 66-90):
```javascript
const testCases = [];

testCases.push({
  name: 'OBSV-04/memory_md_entry_format',
  check: () => {
    const re = /^- \[(HIGH|MED|LOW)\] [a-z][-a-z]*: .+ \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
    const valid = [/* ... */];
    const invalid = [/* ... */];
    for (const v of valid) {
      if (!re.test(v)) return false;
    }
    for (const inv of invalid) {
      if (re.test(inv)) return false;
    }
    return true;
  }
});
```

**Test with temp filesystem (try/finally cleanup)** (eval-observer.js lines 173-197):
```javascript
testCases.push({
  name: 'OBSV-07/cursor_rotation_detection',
  check: () => {
    const tmp = makeTmpProject();
    try {
      // ... test logic against temp filesystem ...
      return true;
    } finally { cleanTmpProject(tmp); }
  }
});
```

**Test runner pattern** (eval-observer.js lines 302-318):
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

---

### `.claude/tests/fixtures/evolve/` (test fixtures)

**Analog:** `.claude/tests/fixtures/observer/`

The observer fixtures directory contains `.jsonl` fixture files for test input. The evolve fixtures need `.md` files instead -- sample MEMORY.md, insights.md, and PLAYBOOK.md files with populated `## Pending Review` sections for testing scan/promote/revert operations.

**Fixture file pattern:** Create minimal markdown files that contain:
1. A MEMORY.md with entries in `## Pending Review` (and optionally `## Permanent` for revert testing)
2. An insights.md with entries in `## Pending Review`
3. A PLAYBOOK.md with entries in both `## Pending Review` and `## Permanent`

Use the actual entry formats from the codebase:
```
MEMORY.md/PLAYBOOK.md: - [HIGH] researcher: insight text (2026-04-18T10:22)
insights.md:           - [2026-04-20] [MED] insight text (from: researcher, 2026-04-20T10:15)
```

---

## Shared Patterns

### CommonJS Module Structure
**Source:** `.claude/scripts/obs-summarize.js` (full file), `.claude/hooks/pipeline-observe.js` (full file)
**Apply to:** `evolve.js`, `eval-evolve.js`

All scripts in this project follow:
- `'use strict';` declaration
- `const fs = require('fs');` / `const path = require('path');` -- Node.js stdlib only, zero npm deps
- `if (require.main === module) main();` guard for direct execution
- `module.exports = { ... }` for testability from eval scripts
- `process.stderr.write()` for errors (not `console.error`)
- `process.stdout.write()` for structured output (not `console.log`)

### Entry Format Regex
**Source:** `.claude/tests/eval-observer.js` lines 71, 97
**Apply to:** `evolve.js` (for parsing entries), `eval-evolve.js` (for validation)

```javascript
// MEMORY.md / PLAYBOOK.md entry format
const memoryRe = /^- \[(HIGH|MED|LOW)\] [a-z][-a-z]*: .+ \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;

// insights.md entry format
const insightRe = /^- \[\d{4}-\d{2}-\d{2}\] \[(HIGH|MED|LOW)\] .+ \(from: [a-z][-a-z]*, \d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
```

### Evidence Pointer Stripping
**Source:** RESEARCH.md Pattern 3 (verified against observer.md and eval-observer.js)
**Apply to:** `evolve.js` promote subcommand

```javascript
// Strip trailing evidence pointer on promote (D-15)
// MEMORY.md/PLAYBOOK.md: " (YYYY-MM-DDThh:mm)" -> ""
const memoryPointerRe = / \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
// insights.md: " (from: agent-name, YYYY-MM-DDThh:mm)" -> ""
const insightPointerRe = / \(from: [a-z][-a-z]*, \d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
```

### Memory File Section Structure
**Source:** `.claude/agent-memory/researcher/MEMORY.md` (representative), `.claude/PLAYBOOK.md`, `.claude/skills/pipeline-design/insights.md`
**Apply to:** `evolve.js` (section parsing), test fixtures

Current confirmed structure:
- MEMORY.md: `## Key Files`, `## Decisions`, `## Patterns`, `## Observations`, `## Open Questions`, `## Pending Review` (no `## Permanent` yet)
- PLAYBOOK.md: `## Pending Review`, `## Permanent` (both exist)
- insights.md: preamble text, existing entries, `## Pending Review` (no `## Permanent` yet)

evolve.js must create `## Permanent` if absent, placing it immediately before `## Pending Review`.

### Test Structure (Temp Project + Try/Finally)
**Source:** `.claude/tests/eval-observer.js` lines 29-60
**Apply to:** `eval-evolve.js`

Tests that manipulate files use:
1. `fs.mkdtempSync()` to create an isolated temp directory
2. Bootstrap fixture files inside it
3. Run the function under test against the temp directory
4. Assert results
5. `fs.rmSync(tmp, { recursive: true, force: true })` in a `finally` block

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All 4 files have strong analogs in the codebase |

## Metadata

**Analog search scope:** `.claude/hooks/`, `.claude/scripts/`, `.claude/skills/`, `.claude/tests/`
**Files scanned:** 6 analogs examined (pipeline-observe.js, obs-summarize.js, pipeline-design/SKILL.md, agent-observability/SKILL.md, eval-observer.js, fixtures/observer/)
**Pattern extraction date:** 2026-04-21

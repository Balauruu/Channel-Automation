# Phase 2: Observer Agent - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 5 new + 19 modified = 24 total
**Analogs found:** 5 / 5 (new files only; modifications are section additions)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.claude/agents/observer.md` | agent-definition | prompt-driven | `.claude/agents/researcher.md` | exact |
| `.claude/PLAYBOOK.md` | memory-file | append-only | `.claude/agent-memory/researcher/MEMORY.md` | role-match |
| `.claude/tests/eval-observer.js` | test | unit-validation | `.claude/tests/smoke-test-observe.js` | exact |
| `.claude/tests/fixtures/observer/*.jsonl` | test-fixture | static-data | (synthetic from `pipeline-observe.js` event schema) | schema-match |
| `.claude/agent-memory/*/MEMORY.md` (11 files) | memory-file | append-only | `.claude/agent-memory/researcher/MEMORY.md` | self (add section) |
| `.claude/skills/*/insights.md` (8 files) | memory-file | append-only | `.claude/skills/autoresearch/insights.md` | self (add section) |

## Pattern Assignments

### `.claude/agents/observer.md` (agent-definition, prompt-driven)

**Analog:** `.claude/agents/researcher.md`

**Frontmatter pattern** (lines 1-21):
```yaml
---
name: researcher
description: >-
  Conducts deep documentary research on dark history, true crime, and unsolved
  mystery topics. Produces research dossiers with sourced claims and entity
  indexes. Invoke when the user asks to research a topic for a documentary.
model: sonnet
memory: project
color: blue
skills:
  - agent-protocols
  - crawl4ai-scraping
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - WebSearch
  - WebFetch
---
```
Observer adaptation: Change `name`, `description`, `color`; drop `crawl4ai-scraping` skill; drop `WebSearch`/`WebFetch` tools (observer reads local files only). Keep `memory: project` for auto-injection of observer's MEMORY.md.

**Second analog:** `.claude/agents/editorial-lead.md` (lines 1-17)

Demonstrates a more restricted tool set (read-only). Observer is write-capable but this shows the pattern of intentionally restricting tools by role:
```yaml
---
name: editorial-lead
description: >-
  Reviews research dossiers and scripts for quality, accuracy, and editorial
  standards. Gates content quality before downstream pipeline stages. Provides
  structured feedback. Invoke when research or scripts need quality review
  before proceeding.
tools:
  - Read
  - Grep
  - Glob
model: sonnet
memory: project
color: red
skills:
  - agent-protocols
---
```

**Body structure pattern** (researcher.md lines 23-35):
```markdown
# Documentary Researcher

## Identity

You are the documentary researcher for a dark mysteries YouTube channel. ...

## Channel Context

@channel/channel.md

## Research Output Structure
```
Observer adaptation: Replace with `# Observer`, `## Identity`, `## Processing Procedure`, `## Scope-Test Questions`, `## Entry Format`, `## Few-Shot Examples`, `## Guardrails` sections. The `@channel/channel.md` reference is NOT needed for observer -- it does not need channel voice context.

---

### `.claude/PLAYBOOK.md` (memory-file, append-only)

**Analog:** `.claude/agent-memory/researcher/MEMORY.md` (full file, 23 lines)

```markdown
# Researcher Memory

## Key Files
- Research dossier output: projects/*/research/Research.md
- Entity index output: projects/*/research/entity_index.json
- Source notes: projects/*/research/sources/
- Source manifest: projects/*/research/source_manifest.json
- Channel DNA: channel/channel.md
- Research CLI: editorial/researcher/cli.py (survey, deepen, write, status)

## Decisions


## Patterns


## Observations


## Open Questions


```
PLAYBOOK.md adaptation: Per D-06/D-07, minimal bootstrap with only `## Pending Review` and `## Permanent` sections. Do NOT replicate the 5-section MEMORY.md structure -- PLAYBOOK.md has its own layout. The analog shows the heading + empty section pattern only.

---

### `.claude/tests/eval-observer.js` (test, unit-validation)

**Analog:** `.claude/tests/smoke-test-observe.js`

**Module header + imports** (lines 1-11):
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
```
Observer eval adaptation: Keep `'use strict'`, `fs`, `path`, `os` imports. Drop `execFileSync` (observer tests don't shell out to hooks -- they validate format/regex, cursor logic, and fixture parsing).

**Temp directory helper** (lines 18-25):
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
Observer eval: Reuse `makeTmpProject` pattern, adapt directory structure for observer fixtures (`.claude/agent-memory/`, `.claude/skills/`, `.observer-cursor`).

**JSONL reader helper** (lines 37-41):
```javascript
function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .trim().split('\n').filter(Boolean)
    .map(l => JSON.parse(l));
}
```
Observer eval: Copy directly -- needed for parsing fixture obs.jsonl files and rejections.jsonl.

**Test case registration pattern** (lines 49-63):
```javascript
const testCases = [];

testCases.push({
  name: 'CAPT-01/main_conversation_captured',
  check: () => {
    const tmp = makeTmpProject();
    try {
      // ... test body ...
      return events.length === 1 && events[0].agent_id === '' && events[0].tool === 'Read';
    } finally { cleanTmpProject(tmp); }
  }
});
```
Observer eval: Same array-of-objects pattern. Name format: `'OBSV-04/memory_md_entry_format'`, `'OBSV-06/self_loop_filtered'`, etc.

**Test runner** (lines 292-308):
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
Observer eval: Copy verbatim. This is the project-standard test runner.

---

### `.claude/tests/fixtures/observer/*.jsonl` (test-fixture, static-data)

**Analog:** Event schema from `pipeline-observe.js`

**Tool event schema** (pipeline-observe.js lines 184-224):
```javascript
const event = {
  ts: new Date().toISOString().replace(/[:.]/g, '-'),
  epoch_ms: Date.now(),
  event: HOOK_EVENT,          // 'tool_pre' | 'tool_post' | 'tool_fail' | 'permission_denied'
  session_id: data.session_id || '',
  agent_id: data.agent_id || '',
  tool: tool,
  tool_use_id: data.tool_use_id || '',
  project: detectProject(data),
};
// tool_pre: event.input = truncated JSON string
// tool_post: event.output = truncated JSON string
// tool_fail: event.output + event.error
// permission_denied: event.input + event.reason
```

**Dispatch event schema** (pipeline-observe.js lines 310-320):
```javascript
const dispatchEvent = {
  ts: ts,
  epoch_ms: now,
  event: 'dispatch',
  session_id: sessionId,
  agent_id: agentId,
  agent_type: agentType,
  project: project,
  prompt: truncate(firstUserPrompt, PROMPT_CAP),
  cwd: data.cwd || '',
};
```

**Assistant message event schema** (pipeline-observe.js lines 324-336):
```javascript
const amEvent = {
  ts: ts,
  epoch_ms: now,
  event: 'assistant_message',
  session_id: sessionId,
  agent_id: agentId,
  project: project,
  text: turn.text,
  thinking: turn.thinking,
  input_tokens: turn.inputTokens,
  output_tokens: turn.outputTokens,
  stop_reason: turn.stopReason,
};
```

**Complete event schema** (pipeline-observe.js lines 342-358):
```javascript
const completeEvent = {
  ts: ts,
  epoch_ms: now,
  event: 'complete',
  session_id: sessionId,
  agent_id: agentId,
  agent_type: agentType,
  project: project,
  outcome: data.outcome || 'completed',
  tool_calls: toolCalls,
  tool_fails: toolFails,
  permission_denials: permDenials,
  total_output_tokens: totalOutputTokens || (data.total_output_tokens || 0),
  durations: durations,
};
```

Fixture construction: Build synthetic JSONL files using these schemas. Each fixture represents a complete run (dispatch + N tool events + N assistant_messages + complete). Include at least: (1) a normal researcher run, (2) an observer run (for self-loop testing), (3) a run with errors/failures, (4) main-conversation events (no dispatch/complete), (5) an empty/malformed-lines file.

---

### `.claude/agent-memory/*/MEMORY.md` -- Section Addition (11 files)

**Current structure** (researcher/MEMORY.md, full file):
```markdown
# Researcher Memory

## Key Files
- ...

## Decisions


## Patterns


## Observations


## Open Questions


```

**Modification:** Add `## Pending Review` section at the end, after `## Open Questions`. Insert after last existing content with a blank line separator. Observer will write entries here in format: `- [HIGH] researcher: insight text (2026-04-18T10:22)`.

---

### `.claude/skills/*/insights.md` -- Section Addition (8 files)

**Current structure** (autoresearch/insights.md, full file):
```markdown
# Insights

Accumulated learnings from skill runs. Read at the start of every run.

## Lifecycle
- **Append:** One insight per run (never skip the reflection phase)
- **Merge:** Consolidate duplicates at 20+ entries
- **Promote:** Extract to SKILL.md when 3+ entries converge on same pattern

<!-- Append new insights below this line -->
- [2026-04-17] For well-documented cold cases, ...
```

**Modification:** Add `## Pending Review` section AFTER the last existing insight entry (below the marker comment and any existing entries). Observer will write entries here in format: `- [2026-04-20] [HIGH] insight text (from: agent-name, 2026-04-20T10:15)`.

Note: insights.md uses date-first format (`- [YYYY-MM-DD]`), distinct from MEMORY.md format (`- [CONFIDENCE] agent:`).

---

## Shared Patterns

### CommonJS Module Convention
**Source:** All `.claude/hooks/*.js` and `.claude/tests/*.js` files
**Apply to:** `eval-observer.js`, any utility scripts
```javascript
'use strict';

const fs = require('fs');
const path = require('path');
```
Rule: Zero npm dependencies. Node.js stdlib only (fs, path, os, child_process).

### JSONL Append Pattern
**Source:** `.claude/hooks/pipeline-observe.js` (lines 399-402)
**Apply to:** Observer rejection logging (in observer.md prompt instructions), eval test helpers
```javascript
function appendEvent(filePath, eventObj) {
  const line = JSON.stringify(eventObj) + '\n';
  fs.appendFileSync(filePath, line, 'utf8');
}
```

### File Rotation Pattern
**Source:** `.claude/hooks/pipeline-observe.js` (lines 111-126)
**Apply to:** Rejection log rotation (observer.md must instruct reuse of this pattern)
```javascript
function rotateIfNeeded(obsFile, archiveDir) {
  try {
    const stat = fs.statSync(obsFile);
    if (stat.size >= MAX_SIZE) {
      fs.mkdirSync(archiveDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveName = 'obs-' + ts + '-' + process.pid + '.jsonl';
      fs.renameSync(obsFile, path.join(archiveDir, archiveName));
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      process.stderr.write('[pipeline-observe] rotation error: ' + err.message + '\n');
    }
  }
}
```
Note: Observer is an LLM subagent, not a JS script. It cannot call this function directly. The observer prompt must instruct it to check file size via Bash (`wc -c`) and perform rotation via Bash (`mv`) using the same naming convention.

### Agent Frontmatter Convention
**Source:** `.claude/agents/researcher.md` (lines 1-21), `.claude/agents/editorial-lead.md` (lines 1-17)
**Apply to:** `observer.md`

Required fields: `name`, `description`, `model`, `memory`, `color`, `skills`, `tools`.
- `model: sonnet` -- per AI-SPEC, observer uses Sonnet 4.6
- `memory: project` -- enables auto-injection of observer's MEMORY.md
- `skills: [agent-protocols]` -- injects shared behavioral protocols
- `tools:` list determines what the subagent can call

### Hook Stdin Pattern
**Source:** `.claude/hooks/check-memory-limit.js` (lines 8-20)
**Apply to:** Reference only (observer is a subagent, not a hook)
```javascript
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    // ... process ...
  } catch (err) {
    process.stderr.write('Error: ' + err.message + '\n');
  }
  process.exit(0);
});
```
This is the hook pattern. The observer is NOT a hook -- it is a subagent. Included here for completeness since the eval test may reference hook mechanics.

### Project Slug Detection
**Source:** `.claude/hooks/pipeline-observe.js` (lines 94-107)
**Apply to:** Observer prompt instructions (observer needs to find the right obs.jsonl)
```javascript
function detectProject(data) {
  const sources = [
    data.cwd || '',
    JSON.stringify(data.tool_input || {}),
    data.prompt || '',
    data.agent_transcript_path || '',
  ];
  const re = /projects[/\\]([a-z0-9][a-z0-9-]*)/i;
  for (const s of sources) {
    const m = s.match(re);
    if (m) return m[1].toLowerCase();
  }
  return '_channel';
}
```
Observer receives the project path in its dispatch prompt from /evolve. It does not need to replicate this detection logic, but it must understand the directory naming convention.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.claude/logs/observations/<project>/.observer-cursor` | state-file | JSON read/write | No cursor-based incremental processing exists yet. Simple JSON format (`{byte_offset, last_epoch_ms, last_run_id}`) -- no complex analog needed. Observer creates/updates this at runtime via Write tool. |

---

## Metadata

**Analog search scope:** `.claude/agents/`, `.claude/hooks/`, `.claude/tests/`, `.claude/agent-memory/`, `.claude/skills/`
**Files scanned:** 35 (11 MEMORY.md + 8 insights.md + 12 agents + 3 hooks + 1 test)
**Pattern extraction date:** 2026-04-20

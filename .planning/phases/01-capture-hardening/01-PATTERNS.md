# Phase 1: Capture Hardening - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 3 (new/modified)
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.claude/hooks/pipeline-observe.js` | hook (event processor) | event-driven | `.claude/hooks/check-memory-limit.js` | exact (same role, same data flow, same project) |
| `.claude/settings.json` | config | -- | `.claude/settings.json` (self -- modify existing) | exact |
| `.claude/tests/smoke-test-observe.js` | test | request-response (stdin/stdout) | `.claude/tests/smoke-test-observability.js` (deleted, recovered from git) | exact |

## Pattern Assignments

### `.claude/hooks/pipeline-observe.js` (hook, event-driven)

**Analog:** `.claude/hooks/check-memory-limit.js` (52 lines)

**Imports pattern** (lines 1-6):
```javascript
// .claude/hooks/check-memory-limit.js
const fs = require('fs');
const path = require('path');
```

**Stdin buffering pattern** (lines 8-11):
```javascript
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
```

**Project root resolution pattern** (lines 23-25):
```javascript
const projectDir = data.cwd
  || process.env.CLAUDE_PROJECT_DIR
  || path.resolve(__dirname, '..', '..');
```

**Error handling pattern** (lines 46-50):
```javascript
  } catch (err) {
    // Never block agent completion due to check failure
    process.stderr.write('Memory limit check error: ' + err.message + '\n');
  }
  process.exit(0);
});
```

**Key structural observations:**
- Top-level try/catch wraps all logic inside `on('end')` callback
- Early-exit with `process.exit(0); return;` for skip conditions
- Errors go to stderr only, never stdout (stdout surfaces in conversation)
- Always exits 0 regardless of success/failure

---

**Secondary Analog (logic to port):** `.claude/hooks/pipeline-observe.sh` (342 lines)

**Project slug detection** (lines 77-91):
```bash
# Port this regex logic to JS:
PROJECT_SLUG=$(printf '%s' "$INPUT_JSON" | "$PY" -c "
import json, sys, re
d = json.load(sys.stdin)
sources = [
    d.get('cwd','') or '',
    json.dumps(d.get('tool_input', {}) or {}),
    d.get('prompt','') or '',
    d.get('agent_transcript_path','') or '',
]
for s in sources:
    m = re.search(r'projects[/\\\\]([a-z0-9][a-z0-9\\-]*)', s, re.IGNORECASE)
    if m:
        print(m.group(1).lower()); sys.exit(0)
print('_channel')
")
```

**File rotation** (lines 97-106):
```bash
MAX_SIZE_MB=10
if [ -f "$OBS_FILE" ]; then
  size_mb=$(du -m "$OBS_FILE" 2>/dev/null | cut -f1)
  if [ "${size_mb:-0}" -ge "$MAX_SIZE_MB" ]; then
    arch="${PROJECT_DIR}/obs.archive"
    mkdir -p "$arch"
    mv "$OBS_FILE" "${arch}/obs-$(date +%Y%m%d-%H%M%S)-$$.jsonl" 2>/dev/null || true
  fi
fi
```

**Auto-purge** (lines 108-113):
```bash
PURGE_MARK="${PROJECT_DIR}/.last-purge"
if [ ! -f "$PURGE_MARK" ] || [ "$(find "$PURGE_MARK" -mtime +1 2>/dev/null)" ]; then
  find "$PROJECT_DIR/obs.archive" -name "obs-*.jsonl" -mtime +30 -delete 2>/dev/null || true
  touch "$PURGE_MARK" 2>/dev/null || true
fi
```

**Tool event handler** (lines 119-169 -- building the event object):
```python
# Port this field extraction pattern to JS:
obs = {
    'ts':         os.environ['TIMESTAMP'],
    'event':      ev,
    'session_id': d.get('session_id','') or '',
    'agent_id':   os.environ['AGENT_ID'],
    'agent_type': d.get('agent_type','') or '',
    'tool':       d.get('tool_name', d.get('tool','')) or '',
    'tool_use_id': d.get('tool_use_id','') or '',
    'project':    os.environ['PROJECT_SLUG'],
}
ti = d.get('tool_input', d.get('input', {}))
to = d.get('tool_response', d.get('tool_output', d.get('output','')))

if ev == 'tool_pre':
    obs['input'] = json.dumps(ti)[:5000]
elif ev == 'tool_post':
    obs['output'] = json.dumps(to)[:5000]
elif ev == 'tool_fail':
    obs['output'] = json.dumps(to)[:2000]
    obs['error'] = str(d.get('error',''))[:2000]
elif ev == 'permission_denied':
    obs['input'] = json.dumps(ti)[:2000]
    obs['reason'] = str(d.get('reason',''))[:1000]
```

**SubagentStop transcript parsing** (lines 204-256 -- user prompt + assistant turns):
```python
# Port this transcript JSONL parsing to JS:
if tpath and os.path.exists(tpath):
    with open(tpath, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try: obj = json.loads(line)
            except Exception: continue
            msg = obj.get('message') or {}
            role = msg.get('role')
            if role == 'user' and not first_user_prompt:
                c = msg.get('content')
                if isinstance(c, str):
                    first_user_prompt = c
                elif isinstance(c, list):
                    parts = [b.get('text','') for b in c if isinstance(b, dict) and b.get('type') == 'text']
                    first_user_prompt = ''.join(parts)
            elif role == 'assistant':
                text = ''
                thinking = ''
                for b in msg.get('content', []) or []:
                    if not isinstance(b, dict): continue
                    if b.get('type') == 'text': text += b.get('text','')
                    elif b.get('type') == 'thinking': thinking += b.get('thinking','')
                # ... build assistant_message event
```

**SubagentStop obs.jsonl scan for aggregates** (lines 260-279):
```python
# Port this pattern: scan obs.jsonl for agent's prior events to count tool_calls, tool_fails, etc.
agent_type = ''
first_event_ts = None
tool_calls = tool_fails = perm_denials = 0
if os.path.exists(obs_file):
    with open(obs_file, encoding='utf-8') as f:
        for line in f:
            try: ev = json.loads(line)
            except Exception: continue
            if ev.get('agent_id') != agent_id: continue
            if not first_event_ts: first_event_ts = ev.get('ts')
            if not agent_type and ev.get('agent_type'): agent_type = ev['agent_type']
            e = ev.get('event')
            if e in ('tool_post', 'tool_fail'): tool_calls += 1
            if e == 'tool_fail': tool_fails += 1
            if e == 'permission_denied': perm_denials += 1
```

**SubagentStop event synthesis and append** (lines 327-333):
```python
# Port: multiple events appended as JSONL lines
with open(obs_file, 'a', encoding='utf-8') as out:
    out.write(json.dumps(dispatch_event) + '\n')
    for t in turns:
        out.write(json.dumps(t) + '\n')
    out.write(json.dumps(complete_event) + '\n')
```

---

### `.claude/settings.json` (config, modification)

**Analog:** Self (current file, lines 1-72)

**Current hook registration pattern** (lines 6-12 -- one PreToolUse entry):
```json
{
  "matcher": "*",
  "hooks": [
    {
      "type": "command",
      "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pipeline-observe.sh tool_pre",
      "timeout": 5,
      "async": true
    }
  ]
}
```

**Target pattern (node invocation, referencing check-memory-limit.js at line 65):**
```json
{
  "type": "command",
  "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pipeline-observe.js tool_pre",
  "timeout": 5,
  "async": true
}
```

**Key change:** Replace `bash ... pipeline-observe.sh <event>` with `node ... pipeline-observe.js <event>` for all 5 event types. SubagentStop timeout stays at 15 (transcript parsing takes longer).

---

### `.claude/tests/smoke-test-observe.js` (test, request-response)

**Analog:** `.claude/tests/smoke-test-observability.js` (deleted, recovered from git HEAD)

**Test runner pattern** (same as smoke-test-pipeline.js, lines at end):
```javascript
// Run all tests
let passed = 0;
const total = testCases.length;

for (const tc of testCases) {
  try {
    const ok = tc.check();
    console.log(ok ? 'PASS' : 'FAIL', tc.name);
    if (ok) passed++;
    else if (!ok) console.log('  Expected: true, Got: false');
  } catch (e) {
    console.log('FAIL', tc.name);
    console.log('  Error:', e.message);
  }
}

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
```

**Imports and setup pattern:**
```javascript
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const obsScript = path.join(projectRoot, '.claude', 'hooks', 'pipeline-observe.js');
```

**Test case declaration pattern:**
```javascript
const testCases = [];

testCases.push({
  name: 'category/test_description',
  check: () => { /* return boolean */ }
});
```

**Hook execution in tests (stdin piping via execFileSync):**
```javascript
function runHook(event, stdinJson, projectDir) {
  execFileSync('node', [obsScript, event], {
    input: JSON.stringify(stdinJson),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    stdio: ['pipe', 'pipe', 'pipe']
  });
}
```

**Temp directory pattern for test isolation:**
```javascript
function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'obs-test-'));
  fs.mkdirSync(path.join(tmp, '.claude', 'logs', 'observations'), { recursive: true });
  return tmp;
}
```

**JSONL reading helper:**
```javascript
function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .trim().split('\n').filter(Boolean)
    .map(l => JSON.parse(l));
}
```

---

## Shared Patterns

### Stdin JSON Parsing (all hooks)
**Source:** `.claude/hooks/check-memory-limit.js` lines 8-11, 13
**Apply to:** `pipeline-observe.js`
```javascript
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    // ... process data
  } catch (err) {
    process.stderr.write('[hook-name] ' + err.message + '\n');
  }
  process.exit(0);
});
```

### Error Handling (never block)
**Source:** `.claude/hooks/check-memory-limit.js` lines 46-50
**Apply to:** `pipeline-observe.js` (top-level and per-function)
```javascript
// Top-level: wrap entire on('end') body in try/catch
// Per-function: individual try/catch for file operations
// ALWAYS: process.exit(0) at the end, unconditionally
// NEVER: throw from hook code
// ERRORS: stderr only (process.stderr.write), never stdout (surfaces in conversation)
```

### CommonJS Module Convention
**Source:** `.claude/hooks/check-memory-limit.js` lines 5-6
**Apply to:** `pipeline-observe.js`, `smoke-test-observe.js`
```javascript
'use strict';  // (optional -- check-memory-limit.js doesn't use it but RESEARCH.md skeleton does)

const fs = require('fs');
const path = require('path');
```

### Timestamp Format (Windows-safe)
**Source:** `.claude/hooks/pipeline-observe.sh` line 116 and CONVENTIONS.md
**Apply to:** `pipeline-observe.js` (all event timestamps and archive filenames)
```javascript
// Display timestamp: ISO 8601 with dashes replacing colons/dots (Windows filename safe)
const ts = new Date().toISOString().replace(/[:.]/g, '-');
// Result: "2026-04-20T10-00-00-000Z"

// Numeric epoch for duration math:
const epochMs = Date.now();
```

### Settings.json Hook Registration
**Source:** `.claude/settings.json` lines 6-12 (PreToolUse) and line 65 (check-memory-limit)
**Apply to:** `settings.json` modification
```json
{
  "type": "command",
  "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/<script>.js <event_arg>",
  "timeout": 5,
  "async": true
}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| -- | -- | -- | All files have strong analogs in this codebase |

## Metadata

**Analog search scope:** `.claude/hooks/`, `.claude/tests/`, `.claude/settings.json`, git history
**Files scanned:** 4 (check-memory-limit.js, pipeline-observe.sh, settings.json, smoke-test-observability.js from git)
**Pattern extraction date:** 2026-04-20

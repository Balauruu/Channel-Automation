# Testing Patterns

**Analysis Date:** 2026-04-22

## Test Framework

**JavaScript smoke tests (structural validation):**
- Runner: Node.js built-in (no framework). Raw ``node`` execution with custom test harness.
- No assertion library -- tests use boolean ``check()`` functions returning ``true``/``false``.
- Config: None. Tests are standalone scripts.

**JavaScript evaluation scripts (quality validation):**
- Runner: Node.js built-in. Evaluation harnesses for observer and evolve quality.
- Located alongside smoke tests in ``.claude/tests/``.

**Python tests (strategy package only):**
- Runner: pytest (evidence from ``__pycache__`` bytecode files)
- Config: Not detected at project root. Likely pytest defaults.
- Location: ``.claude/scripts/strategy/tests/`` (source files may need restoration)

**Run Commands:**
```bash
# Run smoke tests (pipeline structure validation)
node .claude/tests/smoke-test-observe.js
node .claude/tests/smoke-test-evolve.js

# Run evaluation scripts (quality checks)
node .claude/tests/eval-observer.js
node .claude/tests/eval-evolve.js

# Python strategy tests (if sources exist)
PYTHONPATH=.claude/scripts/strategy python -m pytest .claude/scripts/strategy/tests/ -v
```

## Test File Organization

**Location:** Centralized in ``.claude/tests/`` (not co-located with source).

**Naming:**
- JavaScript smoke tests: ``smoke-test-<domain>.js`` -- structural/existence validation
- JavaScript eval scripts: ``eval-<domain>.js`` -- quality/correctness evaluation
- Python: ``test_<module>.py`` (standard pytest naming)

**Structure:**
```
.claude/tests/
    smoke-test-observe.js         # pipeline-observe.js hook validation (CAPT-01..CAPT-07)
    smoke-test-evolve.js          # /evolve workflow validation
    eval-observer.js              # @observer agent quality evaluation
    eval-evolve.js                # /evolve workflow quality evaluation
    fixtures/
        observer/
            run-researcher-success.jsonl   # Normal researcher run obs.jsonl
            run-with-errors.jsonl          # Run with tool failures
            run-observer-selfloop.jsonl    # Observer dispatching itself (scope test)
            orphan-tool-events.jsonl       # Tool events without dispatch context
            malformed-lines.jsonl          # Malformed JSONL lines (robustness)
            README                         # Fixture documentation
        evolve/
            memory.md                      # Sample MEMORY.md with pending entries
            insights.md                    # Sample insights.md with pending entries
            playbook.md                    # Sample PLAYBOOK.md with open entries
```

## Test Structure

**Suite organization (JavaScript smoke tests):**
```javascript
const testCases = [];

// Per-entity checks (loop generates N test cases per entity)
for (const entity of entities) {
  testCases.push({
    name: `${entity}/check_name`,
    check: () => {
      // Boolean assertion -- return true for pass, false for fail
      return someCondition;
    }
  });
}

// Global checks (cross-cutting validations)
testCases.push({
  name: 'global/no_legacy_paths',
  check: () => { /* ... */ }
});

// Runner
let passed = 0;
const total = testCases.length;
for (const tc of testCases) {
  try {
    const ok = tc.check();
    console.log(ok ? 'PASS' : 'FAIL', tc.name);
    if (ok) passed++;
    else console.log('  Expected: true, Got: false');
  } catch (e) {
    console.log('FAIL', tc.name, e.message);
  }
}
console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
```

**Test naming convention:** ``entity/property_being_checked`` using slash-separated namespacing:
- ``hook/writes_tool_pre_event``
- ``hook/rotates_at_10mb``
- ``evolve/presents_pending_entries``
- ``global/no_legacy_obs_js_references``

**Patterns:**
- Setup: Inline within ``check()`` function or using ``makeTmpProject()`` helper.
- Teardown: Manual cleanup (``fs.rmSync``) inside ``check()``
- Assertions: Pure boolean returns. On failure, the runner prints ``Expected: true, Got: false``.

## Mocking

**Framework:** None. No mocking library used.

**Approach:** Tests are primarily structural/integration -- they validate file existence, content patterns, and hook behavior by running real code against temp directories with fixture data.

**Temp directory pattern for hook tests:**
```javascript
function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'obs-test-'));
  fs.mkdirSync(path.join(tmp, '.claude', 'logs', 'observations'), { recursive: true });
  return tmp;
}

function cleanTmpProject(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function runHook(event, stdinJson, projectDir) {
  execFileSync('node', [obsScript, event], {
    input: JSON.stringify(stdinJson),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    stdio: ['pipe', 'pipe', 'pipe']
  });
}
```
Used in: ``.claude/tests/smoke-test-observe.js``

**What to mock:** Nothing is mocked -- tests exercise real file I/O and process execution.

**What NOT to mock:**
- File system operations (tests create/read/delete real temp files)
- Hook subprocess execution (tests run hooks via ``execFileSync``)
- JSONL parsing (tests validate actual output format)

## Fixtures and Factories

**Test data (JSONL fixtures for observer tests):**
```jsonl
{"ts":"2026-04-17T10-00-00-000Z","epoch_ms":1713348000000,"event":"tool_pre","session_id":"s1","agent_id":"a1","tool":"Bash","tool_use_id":"t1","input":{"command":"ls"}}
{"ts":"2026-04-17T10-00-01-000Z","epoch_ms":1713348001000,"event":"tool_post","session_id":"s1","agent_id":"a1","tool":"Bash","tool_use_id":"t1","output":"file1.md"}
```
Located in: ``.claude/tests/fixtures/observer/``

**Test data (Markdown fixtures for evolve tests):**
- ``memory.md`` -- Sample MEMORY.md with ``## Pending Review`` section containing HIGH/MED/LOW tagged entries
- ``insights.md`` -- Sample insights.md with pending entries for promotion
- ``playbook.md`` -- Sample PLAYBOOK.md with open cross-agent entries
Located in: ``.claude/tests/fixtures/evolve/``

**Synthetic data generation (in-test):**
```javascript
// Generate a large obs.jsonl for performance testing
const lines = [];
for (let i = 0; i < 500; i++) {
  lines.push(JSON.stringify({
    ts: `2026-04-17T10-00-${String(i).padStart(2,'0')}-000Z`,
    epoch_ms: 1713348000000 + i * 1000,
    event: 'tool_pre',
    session_id: 's1',
    agent_id: 'a1',
    tool: 'Read',
    tool_use_id: `t${i}`
  }));
}
```

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

**View Coverage:** Not applicable -- no coverage infrastructure.

## Test Types

**Smoke tests (primary -- structural validation):**
- Validate file existence, JSONL output format, hook behavior, content patterns
- 2 test files covering the unified memory system components
- Run time: seconds (file I/O + subprocess execution, no network)

**Evaluation scripts (secondary -- quality validation):**
- Validate observer learning extraction quality, evolve promotion workflow correctness
- 2 evaluation scripts (`eval-observer.js`, `eval-evolve.js`)

**Categories by test file:**

| File | What it validates | Domain |
|------|-------------------|--------|
| ``smoke-test-observe.js`` | pipeline-observe.js hook: event capture, JSONL format, rotation, secret scrubbing | CAPT-01..07 |
| ``smoke-test-evolve.js`` | /evolve workflow: pending entry presentation, promote, revert, git integration | Evolve |
| ``eval-observer.js`` | @observer quality: learning extraction accuracy, scope classification, PLAYBOOK routing | Observer |
| ``eval-evolve.js`` | /evolve quality: correct entry parsing, git diff generation, confirmation flow | Evolve |

**Hook integration tests (in smoke-test-observe.js):**
- Run actual hook script via ``execFileSync`` against temp directories
- Validate JSONL output format, event sequencing
- Environment variable overrides: ``PIPELINE_OBSERVE_DISABLED``, ``PIPELINE_SKIP_OBSERVE``

**Unit tests:** Not used for JavaScript. Python ``test_*.py`` files (strategy package) follow pytest conventions.

**E2E tests:** Not used. Smoke tests serve as the closest equivalent -- they validate pipeline structure end-to-end without executing agent dispatch.

## Common Patterns

**File existence testing:**
```javascript
{
  name: 'hook_file_exists',
  check: () => fs.existsSync(path.join(projectRoot, '.claude', 'hooks', 'pipeline-observe.js'))
}
```

**Content pattern testing (regex + includes):**
```javascript
{
  name: 'hook/writes_epoch_ms_field',
  check: () => {
    // run hook, read output
    const lines = readJsonl(obsFile);
    return lines.every(l => typeof l.epoch_ms === 'number');
  }
}
```

**JSONL parsing helper (reused across observability tests):**
```javascript
function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .trim().split('\n').filter(Boolean)
    .map(l => JSON.parse(l));
}
```

**Negative testing (ensure legacy patterns are absent):**
```javascript
{
  name: 'global/no_logs_runs_dir_references',
  check: () => {
    const content = fs.readFileSync(hookFile, 'utf8');
    return !content.includes('logs/runs');
  }
}
```

**Loop-generated test cases (parametric testing without framework):**
```javascript
for (const event of ['tool_pre', 'tool_post', 'tool_fail', 'permission_denied']) {
  testCases.push({
    name: `hook/handles_${event}_event`,
    check: () => {
      // run hook with event, validate output
      return true;
    }
  });
}
```

## Adding New Tests

**To add a new smoke test suite:**
1. Create ``.claude/tests/smoke-test-<domain>.js``
2. Follow the ``testCases`` array + runner pattern from existing files
3. Use ``path.resolve(__dirname, '..', '..')`` for project root (two levels up from ``.claude/tests/``)
4. Add to the run command documentation in the header comment
5. Exit with ``process.exit(passed === total ? 0 : 1)``

**To add an evaluation script:**
1. Create ``.claude/tests/eval-<domain>.js``
2. Evaluation scripts may have softer pass/fail criteria than smoke tests
3. Document what "quality" means for the domain being evaluated

**To add fixture data:**
1. Place JSONL/JSON/Markdown fixtures in ``.claude/tests/fixtures/<domain>/``
2. Reference via ``path.join(projectRoot, '.claude', 'tests', 'fixtures', '<domain>', '<file>')``
3. Update the ``README`` in the fixture directory if one exists

**To add Python tests:**
1. Place in ``.claude/scripts/<domain>/tests/``
2. Add ``conftest.py`` for shared fixtures
3. Use standard pytest naming: ``test_<module>.py``
4. Run with: ``PYTHONPATH=.claude/scripts/<domain> python -m pytest .claude/scripts/<domain>/tests/ -v``

---

*Testing analysis: 2026-04-22*

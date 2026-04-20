# Testing Patterns

**Analysis Date:** 2026-04-20

## Test Framework

**JavaScript smoke tests (primary test suite):**
- Runner: Node.js built-in (no framework). Raw ``node`` execution with custom test harness.
- No assertion library -- tests use boolean ``check()`` functions returning ``true``/``false``.
- Config: None. Tests are standalone scripts.

**Python tests (strategy package only):**
- Runner: pytest 9.0.2 (evidence from ``__pycache__`` bytecode files)
- Config: Not detected at project root. Likely pytest defaults.
- Location: ``.claude/scripts/strategy/tests/`` (``__pycache__`` contains compiled test files but source ``.py`` files are not present on disk -- possibly generated or cleaned)

**Run Commands:**
```bash
# Run all JavaScript smoke tests (full pipeline validation)
node .claude/tests/smoke-test-paths.js && node .claude/tests/smoke-test-skills.js && node .claude/tests/smoke-test-agents.js && node .claude/tests/smoke-test-pipeline.js && node .claude/tests/smoke-test-feedback.js && node .claude/tests/smoke-test-observability.js

# Run individual smoke test suites
node .claude/tests/smoke-test-paths.js          # Windows paths + Phase 1 deliverables
node .claude/tests/smoke-test-skills.js         # Skills library validation
node .claude/tests/smoke-test-agents.js         # Agent definitions + memory
node .claude/tests/smoke-test-pipeline.js       # Pipeline triggers + hooks
node .claude/tests/smoke-test-feedback.js       # Feedback signal system
node .claude/tests/smoke-test-observability.js  # Observability hook + merge logic

# Python strategy tests (if sources exist)
PYTHONPATH=.claude/scripts/strategy python -m pytest .claude/scripts/strategy/tests/ -v
```

## Test File Organization

**Location:** Centralized in ``.claude/tests/`` (not co-located with source).

**Naming:**
- JavaScript: ``smoke-test-<domain>.js`` where domain maps to a pipeline phase
- Python: ``test_<module>.py`` (standard pytest naming, seen in ``__pycache__``)

**Structure:**
```
.claude/tests/
    smoke-test-paths.js           # Phase 1: Windows paths + file existence
    smoke-test-skills.js          # Phase 2: Skills library structure
    smoke-test-agents.js          # Phase 3: Agent definitions + memory
    smoke-test-pipeline.js        # Phase 4: Pipeline triggers + hook registration
    smoke-test-feedback.js        # Phase 5: Feedback signal system
    smoke-test-observability.js   # Phase 6: Observability hooks + merge/finalize
    fixtures/
        observability/
            tool-events.jsonl     # Pre-built tool event sequences
            transcript.jsonl      # Normal agent transcript
            transcript-stopped.jsonl   # max_tokens transcript
            transcript-errored.jsonl   # Unknown stop reason transcript
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
- ``researcher/frontmatter_has_name``
- ``global/no_v5_paths_in_any_agent``
- ``dispatch/creates_run_file_and_pointer``
- ``merge/chronological_order_and_durations``

**Patterns:**
- Setup: Inline within ``check()`` function. No shared setup/teardown.
- Teardown: Manual cleanup (``fs.unlinkSync``, ``fs.rmdirSync``) inside ``check()``
- Assertions: Pure boolean returns. On failure, the runner prints ``Expected: true, Got: false``.

## Mocking

**Framework:** None. No mocking library used.

**Approach:** Tests are primarily structural/integration -- they validate file existence, content patterns, and hook behavior by running real code against temp directories.

**Temp directory pattern for hook tests:**
```javascript
function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'obs-test-'));
  fs.mkdirSync(path.join(tmp, '.claude', 'logs', 'runs', '.active'), { recursive: true });
  return tmp;
}

function runHook(event, stdinJson, projectDir) {
  execFileSync('node', [obsScript, event], {
    input: JSON.stringify(stdinJson),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    stdio: ['pipe', 'pipe', 'pipe']
  });
}
```
Used in: ``.claude/tests/smoke-test-observability.js``

**What to mock:** Nothing is mocked -- tests exercise real file I/O and process execution.

**What NOT to mock:**
- File system operations (tests create/read/delete real temp files)
- Hook subprocess execution (tests run hooks via ``execFileSync``)
- JSONL parsing (tests validate actual output format)

## Fixtures and Factories

**Test data (JSONL fixtures):**
```jsonl
{"ts":"2026-04-17T10-00-00-000Z","event":"dispatch","session_id":"s","agent_type":"researcher","agent_id":"a1","cwd":"/tmp","prompt":"find X"}
{"ts":"2026-04-17T10-00-01-000Z","event":"tool_pre","tool":"Bash","tool_use_id":"t1","input":{"command":"ls"}}
```
Located in: ``.claude/tests/fixtures/observability/``

**Fixture files:**
- ``tool-events.jsonl`` -- Pre-built sequence of dispatch + tool_pre + tool_post + tool_fail events
- ``transcript.jsonl`` -- Normal 3-turn assistant transcript (tool_use + tool_use + end_turn)
- ``transcript-stopped.jsonl`` -- Transcript ending with max_tokens stop reason
- ``transcript-errored.jsonl`` -- Transcript ending with unknown stop reason

**Synthetic data generation (in-test):**
```javascript
// Generate a 500-turn transcript for perf testing
const lines = [];
for (let i = 0; i < 500; i++) {
  lines.push(JSON.stringify({
    timestamp: `2026-04-17T10:0${Math.floor(i/60)}:${String(i%60).padStart(2,'0')}.500Z`,
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: `Turn ${i} output.` }],
      stop_reason: i === 499 ? 'end_turn' : 'tool_use',
      usage: { input_tokens: 1000 + i, output_tokens: 10, ... }
    }
  }));
}
```
Used in: ``smoke-test-observability.js`` ``merge/large_transcript_completes_under_budget`` test

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

**View Coverage:** Not applicable -- no coverage infrastructure.

## Test Types

**Smoke tests (primary):**
- Validate structural integrity of the pipeline: file existence, frontmatter fields, content patterns, cross-reference consistency
- 6 test files covering all pipeline phases
- Total test cases: ~170+ across all suites
- Run time: seconds (pure file I/O, no network)

**Categories by test file:**

| File | What it validates | Test count (approx) |
|------|-------------------|---------------------|
| ``smoke-test-paths.js`` | Windows path handling, Phase 1 file existence, content validation | 20 |
| ``smoke-test-skills.js`` | Skill directory structure, SKILL.md frontmatter, Phase 0/Reflection sections | 82 |
| ``smoke-test-agents.js`` | Agent definitions, frontmatter fields, memory file structure | 137 |
| ``smoke-test-pipeline.js`` | Pipeline skill structure, agent dispatch refs, hook registration | 90 |
| ``smoke-test-feedback.js`` | Signals.yaml structure, agent-protocols feedback lifecycle | 25 |
| ``smoke-test-observability.js`` | Hook dispatch/tool events, merge/finalize, summarizer, perf budget | 30 |

**Hook integration tests (in smoke-test-observability.js):**
- Run actual hook scripts via ``execFileSync`` against temp directories
- Validate JSONL output format, event sequencing, pointer file lifecycle
- Performance budget test: 500-turn transcript must merge under 3000ms
- Environment variable overrides: ``OBS_TRUNCATE_KB``, ``OBS_MAX_RUN_MB``

**Optional integration test:**
```javascript
if (process.env.OBS_TEST_INTEGRATION === '1') {
  testCases.push({
    name: 'integration/live_dispatch_produces_run_file',
    check: () => { /* requires manual Claude Code dispatch */ }
  });
}
```
Gated behind ``OBS_TEST_INTEGRATION=1`` env var. Requires manual interaction.

**Unit tests:** Not used for JavaScript. Python ``test_*.py`` files (strategy package) follow pytest conventions but source files are not currently on disk.

**E2E tests:** Not used. The smoke tests serve as the closest equivalent -- they validate the full pipeline structure end-to-end without executing agent dispatch.

## Common Patterns

**File existence testing:**
```javascript
{
  name: 'researcher_agent_exists',
  check: () => fs.existsSync(path.join(projectRoot, '.claude', 'agents', 'researcher.md'))
}
```

**Content pattern testing (regex + includes):**
```javascript
{
  name: 'researcher/frontmatter_has_name',
  check: () => {
    const content = fs.readFileSync(agentFile, 'utf8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return false;
    return fmMatch[1].includes(`name: ${agent}`);
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
  name: 'global/no_v5_paths_in_any_agent',
  check: () => {
    for (const agent of agents) {
      const content = fs.readFileSync(agentFile, 'utf8');
      if (content.includes('.pi/multi-team/')) return false;
    }
    return true;
  }
}
```

**Performance budget testing:**
```javascript
{
  name: 'merge/large_transcript_completes_under_budget',
  check: () => {
    const t0 = Date.now();
    mergeAndFinalize({ runFile, transcriptPath, stopHookInput });
    const elapsed = Date.now() - t0;
    if (elapsed >= 3000) {
      console.log(`  [perf] ${elapsed}ms exceeds 3000ms budget`);
      return false;
    }
    return true;
  }
}
```

**Loop-generated test cases (parametric testing without framework):**
```javascript
for (const skill of pipelineSkills) {
  testCases.push({
    name: `${skill}/directory_exists`,
    check: () => fs.existsSync(skillDir)
  });
  testCases.push({
    name: `${skill}/has_disable_model_invocation`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes('disable-model-invocation: true');
    }
  });
}
```

## Adding New Tests

**To add a new smoke test suite:**
1. Create ``.claude/tests/smoke-test-<domain>.js``
2. Follow the ``testCases`` array + runner pattern from existing files
3. Use ``path.resolve(__dirname, '..')`` or ``path.resolve(__dirname, '..', '..')`` for project root (check existing files -- some use one level, pipeline/observability use two)
4. Add to the full-suite command chain in the header comment
5. Exit with ``process.exit(passed === total ? 0 : 1)``

**To add fixture data:**
1. Place JSONL/JSON fixtures in ``.claude/tests/fixtures/<domain>/``
2. Reference via ``path.join(projectRoot, '.claude', 'tests', 'fixtures', '<domain>', '<file>')``

**To add Python tests:**
1. Place in ``.claude/scripts/<domain>/tests/``
2. Add ``conftest.py`` for shared fixtures
3. Use standard pytest naming: ``test_<module>.py``
4. Run with: ``PYTHONPATH=.claude/scripts/<domain> python -m pytest .claude/scripts/<domain>/tests/ -v``

---

*Testing analysis: 2026-04-20*

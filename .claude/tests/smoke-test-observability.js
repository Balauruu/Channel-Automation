// .claude/tests/smoke-test-observability.js
// Static + fixture-based tests for the agent observability hook.
// Pattern matches .claude/tests/smoke-test-pipeline.js (testCases array).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const obsScript = path.join(projectRoot, '.claude', 'hooks', 'obs.js');

const testCases = [];

testCases.push({
  name: 'obs/script_exists',
  check: () => fs.existsSync(obsScript)
});

testCases.push({
  name: 'obs/script_parses',
  check: () => {
    try {
      execFileSync('node', ['--check', obsScript], { stdio: 'pipe' });
      return true;
    } catch { return false; }
  }
});

testCases.push({
  name: 'obs/unknown_event_exits_zero',
  check: () => {
    try {
      execFileSync('node', [obsScript, 'unknown_event'], {
        input: '{}',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return true;
    } catch { return false; }
  }
});

// --- Helpers for hook-subprocess tests ---

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

function listRunFiles(projectDir) {
  const d = path.join(projectDir, '.claude', 'logs', 'runs');
  return fs.readdirSync(d).filter(f => f.endsWith('.jsonl'));
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .trim().split('\n').filter(Boolean)
    .map(l => JSON.parse(l));
}

// --- Dispatch tests ---

testCases.push({
  name: 'dispatch/creates_run_file_and_pointer',
  check: () => {
    const tmp = makeTmpProject();
    runHook('dispatch', {
      session_id: 'sess-1',
      agent_id: 'a1',
      cwd: tmp,
      tool_input: { subagent_type: 'researcher', prompt: 'hello' }
    }, tmp);
    const files = listRunFiles(tmp);
    if (files.length !== 1) return false;
    if (!/__researcher__a1\.jsonl$/.test(files[0])) return false;
    const events = readJsonl(path.join(tmp, '.claude', 'logs', 'runs', files[0]));
    if (events.length !== 1 || events[0].event !== 'dispatch') return false;
    if (events[0].agent_type !== 'researcher' || events[0].prompt !== 'hello') return false;
    const ptr = path.join(tmp, '.claude', 'logs', 'runs', '.active', 'a1.ptr');
    if (!fs.existsSync(ptr)) return false;
    const ptrPath = fs.readFileSync(ptr, 'utf8').trim();
    return ptrPath === path.join(tmp, '.claude', 'logs', 'runs', files[0]);
  }
});

testCases.push({
  name: 'dispatch/skips_when_no_agent_id',
  check: () => {
    const tmp = makeTmpProject();
    runHook('dispatch', { session_id: 's', tool_input: { subagent_type: 'researcher' } }, tmp);
    return listRunFiles(tmp).length === 0;
  }
});

testCases.push({
  name: 'dispatch/skips_builtin_agents',
  check: () => {
    const tmp = makeTmpProject();
    runHook('dispatch', {
      agent_id: 'a2',
      cwd: tmp,
      tool_input: { subagent_type: 'general-purpose', prompt: 'x' }
    }, tmp);
    return listRunFiles(tmp).length === 0;
  }
});

testCases.push({
  name: 'tool_pre/appends_event_via_pointer',
  check: () => {
    const tmp = makeTmpProject();
    runHook('dispatch', {
      agent_id: 'a1', cwd: tmp,
      tool_input: { subagent_type: 'researcher', prompt: 'x' }
    }, tmp);
    runHook('tool_pre', {
      agent_id: 'a1', cwd: tmp,
      tool_name: 'Bash',
      tool_use_id: 'toolu_01',
      tool_input: { command: 'ls' }
    }, tmp);
    const file = path.join(tmp, '.claude', 'logs', 'runs', listRunFiles(tmp)[0]);
    const events = readJsonl(file);
    if (events.length !== 2) return false;
    const e = events[1];
    return e.event === 'tool_pre' && e.tool === 'Bash'
      && e.tool_use_id === 'toolu_01'
      && e.input.command === 'ls';
  }
});

testCases.push({
  name: 'tool_pre/silent_exit_when_no_pointer',
  check: () => {
    const tmp = makeTmpProject();
    // No dispatch — pointer does not exist
    runHook('tool_pre', {
      agent_id: 'a1', cwd: tmp,
      tool_name: 'Bash', tool_use_id: 't', tool_input: {}
    }, tmp);
    return listRunFiles(tmp).length === 0;
  }
});

testCases.push({
  name: 'tool_post/appends_event_without_duration',
  check: () => {
    const tmp = makeTmpProject();
    runHook('dispatch', {
      agent_id: 'a1', cwd: tmp,
      tool_input: { subagent_type: 'researcher', prompt: 'x' }
    }, tmp);
    runHook('tool_pre', {
      agent_id: 'a1', cwd: tmp,
      tool_name: 'Bash', tool_use_id: 't1', tool_input: { command: 'ls' }
    }, tmp);
    runHook('tool_post', {
      agent_id: 'a1', cwd: tmp,
      tool_name: 'Bash', tool_use_id: 't1',
      tool_response: { stdout: 'ok', exit_code: 0 }
    }, tmp);
    const events = readJsonl(path.join(tmp, '.claude', 'logs', 'runs', listRunFiles(tmp)[0]));
    const post = events.find(e => e.event === 'tool_post');
    // duration_ms is computed at rewrite time, not here — expect it absent/null
    return post && post.tool_use_id === 't1' && post.output.stdout === 'ok'
      && (post.duration_ms === undefined || post.duration_ms === null);
  }
});

testCases.push({
  name: 'tool_fail/appends_event',
  check: () => {
    const tmp = makeTmpProject();
    runHook('dispatch', {
      agent_id: 'a1', cwd: tmp,
      tool_input: { subagent_type: 'researcher', prompt: 'x' }
    }, tmp);
    runHook('tool_pre', {
      agent_id: 'a1', cwd: tmp,
      tool_name: 'Bash', tool_use_id: 'tf', tool_input: { command: 'sleep 999' }
    }, tmp);
    runHook('tool_fail', {
      agent_id: 'a1', cwd: tmp,
      tool_name: 'Bash', tool_use_id: 'tf',
      error: 'Command timed out after 120000ms',
      interrupted: false
    }, tmp);
    const events = readJsonl(path.join(tmp, '.claude', 'logs', 'runs', listRunFiles(tmp)[0]));
    const f = events.find(e => e.event === 'tool_fail');
    return f && f.tool_use_id === 'tf' && f.error.includes('timed out')
      && f.interrupted === false;
  }
});

// Run
let pass = 0, fail = 0;
for (const tc of testCases) {
  const ok = (() => { try { return !!tc.check(); } catch { return false; } })();
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${tc.name}`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

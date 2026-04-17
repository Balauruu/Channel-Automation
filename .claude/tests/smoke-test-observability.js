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

testCases.push({
  name: 'permission_denied/appends_event',
  check: () => {
    const tmp = makeTmpProject();
    runHook('dispatch', {
      agent_id: 'a1', cwd: tmp,
      tool_input: { subagent_type: 'researcher', prompt: 'x' }
    }, tmp);
    runHook('permission_denied', {
      agent_id: 'a1', cwd: tmp,
      tool_name: 'Bash',
      tool_use_id: 'pd1',
      tool_input: { command: 'rm -rf /' },
      reason: 'classifier: destructive'
    }, tmp);
    const events = readJsonl(path.join(tmp, '.claude', 'logs', 'runs', listRunFiles(tmp)[0]));
    const p = events.find(e => e.event === 'permission_denied');
    return p && p.reason === 'classifier: destructive'
      && p.input.command === 'rm -rf /';
  }
});

const { mergeAndFinalize } = require(obsScript);

const fixtures = path.join(projectRoot, '.claude', 'tests', 'fixtures', 'observability');

function prepareRunFile(tmp, fixtureToolEvents) {
  fs.mkdirSync(path.join(tmp, '.claude', 'logs', 'runs', '.active'), { recursive: true });
  const runFile = path.join(tmp, '.claude', 'logs', 'runs', 'fixture.jsonl');
  fs.copyFileSync(fixtureToolEvents, runFile);
  return runFile;
}

testCases.push({
  name: 'merge/chronological_order_and_durations',
  check: () => {
    const tmp = makeTmpProject();
    const runFile = prepareRunFile(tmp, path.join(fixtures, 'tool-events.jsonl'));
    mergeAndFinalize({
      runFile,
      transcriptPath: path.join(fixtures, 'transcript.jsonl'),
      stopHookInput: { stop_hook_active: false }
    });
    const events = readJsonl(runFile);
    // dispatch + 2 tool_pre + 1 tool_post + 1 tool_fail + 3 assistant_message + 1 complete = 9
    if (events.length !== 9) return false;
    // Chronological by ts
    for (let i = 1; i < events.length; i++) {
      if (events[i].ts < events[i-1].ts) return false;
    }
    // tool_post duration = 500ms, tool_fail duration = 200ms
    const post = events.find(e => e.event === 'tool_post' && e.tool_use_id === 't1');
    const fail = events.find(e => e.event === 'tool_fail' && e.tool_use_id === 't2');
    if (post.duration_ms !== 500) return false;
    if (fail.duration_ms !== 200) return false;
    // Last turn tokens
    const complete = events[events.length - 1];
    if (complete.event !== 'complete') return false;
    if (complete.last_turn_input_tokens !== 1500) return false;
    if (complete.total_output_tokens !== 65) return false;  // 20+30+15
    if (complete.tool_calls !== 2) return false;
    if (complete.tool_fails !== 1) return false;
    if (complete.outcome !== 'completed') return false;  // tool_fail does NOT force errored
    return true;
  }
});

testCases.push({
  name: 'merge/outcome_stopped_on_max_tokens',
  check: () => {
    const tmp = makeTmpProject();
    const runFile = prepareRunFile(tmp, path.join(fixtures, 'tool-events.jsonl'));
    mergeAndFinalize({
      runFile,
      transcriptPath: path.join(fixtures, 'transcript-stopped.jsonl'),
      stopHookInput: { stop_hook_active: false }
    });
    const events = readJsonl(runFile);
    return events[events.length - 1].outcome === 'stopped';
  }
});

testCases.push({
  name: 'merge/outcome_stopped_on_stop_hook_active',
  check: () => {
    const tmp = makeTmpProject();
    const runFile = prepareRunFile(tmp, path.join(fixtures, 'tool-events.jsonl'));
    mergeAndFinalize({
      runFile,
      transcriptPath: path.join(fixtures, 'transcript.jsonl'),
      stopHookInput: { stop_hook_active: true }
    });
    return readJsonl(runFile).slice(-1)[0].outcome === 'stopped';
  }
});

testCases.push({
  name: 'merge/outcome_errored_on_unknown_stop_reason',
  check: () => {
    const tmp = makeTmpProject();
    const runFile = prepareRunFile(tmp, path.join(fixtures, 'tool-events.jsonl'));
    mergeAndFinalize({
      runFile,
      transcriptPath: path.join(fixtures, 'transcript-errored.jsonl'),
      stopHookInput: { stop_hook_active: false }
    });
    return readJsonl(runFile).slice(-1)[0].outcome === 'errored';
  }
});

testCases.push({
  name: 'merge/assistant_message_preserves_stop_reason_and_thinking',
  check: () => {
    const tmp = makeTmpProject();
    const runFile = prepareRunFile(tmp, path.join(fixtures, 'tool-events.jsonl'));
    mergeAndFinalize({
      runFile,
      transcriptPath: path.join(fixtures, 'transcript.jsonl'),
      stopHookInput: { stop_hook_active: false }
    });
    const events = readJsonl(runFile);
    const messages = events.filter(e => e.event === 'assistant_message');
    if (messages.length !== 3) return false;
    if (messages[0].thinking !== null) return false;
    if (messages[1].thinking !== 'The listing succeeded.') return false;
    if (messages[0].stop_reason !== 'tool_use') return false;
    if (messages[2].stop_reason !== 'end_turn') return false;
    return true;
  }
});

testCases.push({
  name: 'merge/atomic_rewrite_leaves_no_tmp_on_success',
  check: () => {
    const tmp = makeTmpProject();
    const runFile = prepareRunFile(tmp, path.join(fixtures, 'tool-events.jsonl'));
    mergeAndFinalize({
      runFile,
      transcriptPath: path.join(fixtures, 'transcript.jsonl'),
      stopHookInput: { stop_hook_active: false }
    });
    return !fs.existsSync(runFile + '.tmp');
  }
});

testCases.push({
  name: 'subagent_stop/handler_removes_pointer_and_sweeps_orphans',
  check: () => {
    const tmp = makeTmpProject();
    // Dispatch + one tool round
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
      tool_name: 'Bash', tool_use_id: 't1', tool_response: { stdout: 'ok' }
    }, tmp);
    // Plant an orphan .tmp to confirm sweep
    const runsD = path.join(tmp, '.claude', 'logs', 'runs');
    fs.writeFileSync(path.join(runsD, 'stale.jsonl.tmp'), 'junk');
    // Stop
    const transcript = path.join(fixtures, 'transcript.jsonl');
    runHook('subagent_stop', {
      agent_id: 'a1', cwd: tmp,
      agent_type: 'researcher',
      agent_transcript_path: transcript,
      stop_hook_active: false
    }, tmp);
    const ptr = path.join(runsD, '.active', 'a1.ptr');
    if (fs.existsSync(ptr)) return false;
    if (fs.existsSync(path.join(runsD, 'stale.jsonl.tmp'))) return false;
    const runFile = path.join(runsD, listRunFiles(tmp)[0]);
    const last = readJsonl(runFile).slice(-1)[0];
    return last.event === 'complete';
  }
});

testCases.push({
  name: 'settings/registers_all_six_events',
  check: () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(projectRoot, '.claude', 'settings.json'), 'utf8')
    );
    const expected = [
      ['PreToolUse', 'Agent', 'obs.js dispatch'],
      ['PreToolUse', '*', 'obs.js tool_pre'],
      ['PostToolUse', '*', 'obs.js tool_post'],
      ['PostToolUseFailure', '*', 'obs.js tool_fail'],
      ['PermissionDenied', '*', 'obs.js permission_denied'],
      ['SubagentStop', null, 'obs.js subagent_stop']
    ];
    for (const [event, matcher, cmdFragment] of expected) {
      const groups = settings.hooks?.[event] || [];
      const hit = groups.some(g =>
        (matcher === null || g.matcher === matcher) &&
        (g.hooks || []).some(h => h.command && h.command.includes(cmdFragment))
      );
      if (!hit) return false;
    }
    return true;
  }
});

if (process.env.OBS_TEST_INTEGRATION === '1') {
  testCases.push({
    name: 'integration/live_dispatch_produces_run_file',
    check: () => {
      const runsD = path.join(projectRoot, '.claude', 'logs', 'runs');
      const before = new Set(fs.existsSync(runsD) ? fs.readdirSync(runsD) : []);
      console.log('  [integration] Dispatch a trivial subagent in Claude Code, then press ENTER here.');
      require('child_process').execSync('node -e "process.stdin.once(\'data\', () => process.exit(0))"', { stdio: 'inherit' });
      const after = fs.readdirSync(runsD).filter(f => f.endsWith('.jsonl') && !before.has(f));
      if (after.length === 0) return false;
      const events = readJsonl(path.join(runsD, after[0]));
      const hasDispatch = events.some(e => e.event === 'dispatch');
      const hasComplete = events.some(e => e.event === 'complete');
      fs.unlinkSync(path.join(runsD, after[0]));
      return hasDispatch && hasComplete;
    }
  });
}

// Run
let pass = 0, fail = 0;
for (const tc of testCases) {
  const ok = (() => { try { return !!tc.check(); } catch { return false; } })();
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${tc.name}`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

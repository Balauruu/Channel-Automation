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

// ── Helper functions ────────────────────────────────────────────────────────

function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-test-'));
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
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .trim().split('\n').filter(Boolean)
    .map(l => JSON.parse(l));
}

function getObsFile(tmpDir, project) {
  return path.join(tmpDir, '.claude', 'logs', 'observations', project, 'obs.jsonl');
}

// ── Test cases ──────────────────────────────────────────────────────────────

const testCases = [];

// ── CAPT-01: Main + subagent capture ────────────────────────────────────────

testCases.push({
  name: 'CAPT-01/main_conversation_captured',
  check: () => {
    const tmp = makeTmpProject();
    try {
      runHook('tool_post', { tool_name: 'Read', tool_use_id: 'toolu_01', session_id: 's1', agent_id: '', tool_response: 'file content' }, tmp);
      const events = readJsonl(getObsFile(tmp, '_channel'));
      return events.length === 1 && events[0].agent_id === '' && events[0].tool === 'Read';
    } finally { cleanTmpProject(tmp); }
  }
});

testCases.push({
  name: 'CAPT-01/subagent_event_captured',
  check: () => {
    const tmp = makeTmpProject();
    try {
      runHook('tool_pre', { tool_name: 'Bash', tool_use_id: 'toolu_02', session_id: 's1', agent_id: 'agent-abc', tool_input: { command: 'ls' } }, tmp);
      const events = readJsonl(getObsFile(tmp, '_channel'));
      return events.length === 1 && events[0].agent_id === 'agent-abc';
    } finally { cleanTmpProject(tmp); }
  }
});

testCases.push({
  name: 'CAPT-01/project_routing_from_cwd',
  check: () => {
    const tmp = makeTmpProject();
    try {
      runHook('tool_post', { tool_name: 'Read', tool_use_id: 'toolu_pr', session_id: 's1', agent_id: '', tool_response: 'x', cwd: '/some/path/projects/my-doc-project/src' }, tmp);
      const obsFile = path.join(tmp, '.claude', 'logs', 'observations', 'my-doc-project', 'obs.jsonl');
      return fs.existsSync(obsFile) && readJsonl(obsFile).length === 1;
    } finally { cleanTmpProject(tmp); }
  }
});

// ── CAPT-02: Main event fields ──────────────────────────────────────────────

testCases.push({
  name: 'CAPT-02/tool_post_has_required_fields',
  check: () => {
    const tmp = makeTmpProject();
    try {
      runHook('tool_post', { tool_name: 'Bash', tool_use_id: 'toolu_03', session_id: 's1', agent_id: '', tool_response: 'output here' }, tmp);
      const ev = readJsonl(getObsFile(tmp, '_channel'))[0];
      return ev.tool === 'Bash'
        && ev.output !== undefined
        && ev.ts !== undefined
        && ev.epoch_ms > 0
        && ev.event === 'tool_post';
    } finally { cleanTmpProject(tmp); }
  }
});

testCases.push({
  name: 'CAPT-02/tool_pre_has_input',
  check: () => {
    const tmp = makeTmpProject();
    try {
      runHook('tool_pre', { tool_name: 'Write', tool_use_id: 'toolu_04', session_id: 's1', agent_id: '', tool_input: { file_path: '/tmp/x.js', content: 'hello' } }, tmp);
      const ev = readJsonl(getObsFile(tmp, '_channel'))[0];
      return ev.tool === 'Write'
        && ev.input !== undefined
        && ev.input.includes('file_path')
        && ev.event === 'tool_pre';
    } finally { cleanTmpProject(tmp); }
  }
});

// ── CAPT-03: SubagentStop detail ────────────────────────────────────────────

testCases.push({
  name: 'CAPT-03/subagent_stop_synthesizes_events',
  check: () => {
    const tmp = makeTmpProject();
    try {
      // Create a mock transcript file
      const transcriptDir = path.join(tmp, '.claude', 'transcripts');
      fs.mkdirSync(transcriptDir, { recursive: true });
      const transcriptPath = path.join(transcriptDir, 'agent-test.jsonl');
      const transcript = [
        JSON.stringify({ message: { role: 'user', content: [{ type: 'text', text: 'Research topic X' }] }, timestamp: '2026-04-20T10:00:00Z' }),
        JSON.stringify({ message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'Let me think...' }, { type: 'text', text: 'I found...' }] }, timestamp: '2026-04-20T10:00:05Z', outputTokens: 500 }),
      ].join('\n') + '\n';
      fs.writeFileSync(transcriptPath, transcript, 'utf8');

      runHook('subagent_stop', { agent_id: 'agent-xyz', agent_type: 'researcher', session_id: 's1', agent_transcript_path: transcriptPath, cwd: tmp }, tmp);
      const events = readJsonl(getObsFile(tmp, '_channel'));
      const dispatch = events.find(e => e.event === 'dispatch');
      const am = events.find(e => e.event === 'assistant_message');
      const complete = events.find(e => e.event === 'complete');
      return dispatch !== undefined && dispatch.prompt.includes('Research topic X')
        && am !== undefined && am.thinking.includes('Let me think') && am.text.includes('I found')
        && complete !== undefined && complete.agent_type === 'researcher';
    } finally { cleanTmpProject(tmp); }
  }
});

testCases.push({
  name: 'CAPT-03/missing_transcript_no_crash',
  check: () => {
    const tmp = makeTmpProject();
    try {
      runHook('subagent_stop', { agent_id: 'agent-miss', agent_type: 'writer', session_id: 's1', agent_transcript_path: '/nonexistent/path.jsonl', cwd: tmp }, tmp);
      const events = readJsonl(getObsFile(tmp, '_channel'));
      // Should still produce dispatch + complete (with empty fields)
      return events.some(e => e.event === 'dispatch') && events.some(e => e.event === 'complete');
    } finally { cleanTmpProject(tmp); }
  }
});

// ── CAPT-04: Valid JSON / atomic writes ─────────────────────────────────────

testCases.push({
  name: 'CAPT-04/every_line_valid_json',
  check: () => {
    const tmp = makeTmpProject();
    try {
      // Write multiple events rapidly
      for (let i = 0; i < 10; i++) {
        runHook('tool_post', { tool_name: 'Read', tool_use_id: 'toolu_' + i, session_id: 's1', agent_id: '', tool_response: 'x'.repeat(500) }, tmp);
      }
      const obsFile = getObsFile(tmp, '_channel');
      const lines = fs.readFileSync(obsFile, 'utf8').trim().split('\n');
      return lines.length === 10 && lines.every(l => { try { JSON.parse(l); return true; } catch (e) { return false; } });
    } finally { cleanTmpProject(tmp); }
  }
});

testCases.push({
  name: 'CAPT-04/truncation_caps_applied',
  check: () => {
    const tmp = makeTmpProject();
    try {
      const bigOutput = 'A'.repeat(10000);
      runHook('tool_post', { tool_name: 'Read', tool_use_id: 'toolu_tr', session_id: 's1', agent_id: '', tool_response: bigOutput }, tmp);
      const ev = readJsonl(getObsFile(tmp, '_channel'))[0];
      // Read output cap is 1024 bytes (applied after JSON.stringify of tool_response)
      return ev.output.length <= 1024;
    } finally { cleanTmpProject(tmp); }
  }
});

// ── CAPT-05: Duration computation ───────────────────────────────────────────

testCases.push({
  name: 'CAPT-05/duration_computed_from_pre_post_pairs',
  check: () => {
    const tmp = makeTmpProject();
    try {
      // Write a tool_pre event directly to obs.jsonl to simulate prior capture
      const obsDir = path.join(tmp, '.claude', 'logs', 'observations', '_channel');
      fs.mkdirSync(obsDir, { recursive: true });
      const obsFile = path.join(obsDir, 'obs.jsonl');
      const preEvent = { ts: '2026-04-20T10-00-00-000Z', epoch_ms: 1000, event: 'tool_pre', session_id: 's1', agent_id: 'agent-dur', tool: 'Bash', tool_use_id: 'toolu_dur1', project: '_channel', input: '{}' };
      const postEvent = { ts: '2026-04-20T10-00-01-200Z', epoch_ms: 2200, event: 'tool_post', session_id: 's1', agent_id: 'agent-dur', tool: 'Bash', tool_use_id: 'toolu_dur1', project: '_channel', output: 'done' };
      fs.writeFileSync(obsFile, JSON.stringify(preEvent) + '\n' + JSON.stringify(postEvent) + '\n', 'utf8');

      // Create mock transcript
      const transcriptDir = path.join(tmp, '.claude', 'transcripts');
      fs.mkdirSync(transcriptDir, { recursive: true });
      const tpath = path.join(transcriptDir, 'agent-dur.jsonl');
      fs.writeFileSync(tpath, JSON.stringify({ message: { role: 'user', content: 'test' }, timestamp: '2026-04-20T10:00:00Z' }) + '\n', 'utf8');

      runHook('subagent_stop', { agent_id: 'agent-dur', agent_type: 'researcher', session_id: 's1', agent_transcript_path: tpath, cwd: tmp }, tmp);
      const events = readJsonl(obsFile);
      const complete = events.find(e => e.event === 'complete');
      return complete !== undefined && complete.durations && complete.durations['toolu_dur1'] === 1200;
    } finally { cleanTmpProject(tmp); }
  }
});

// ── CAPT-06: Rotation + purge ───────────────────────────────────────────────

testCases.push({
  name: 'CAPT-06/rotation_at_10MB',
  check: () => {
    const tmp = makeTmpProject();
    try {
      const obsDir = path.join(tmp, '.claude', 'logs', 'observations', '_channel');
      fs.mkdirSync(obsDir, { recursive: true });
      const obsFile = path.join(obsDir, 'obs.jsonl');
      // Create a file just over 10MB
      const bigContent = 'x'.repeat(10 * 1024 * 1024 + 100);
      fs.writeFileSync(obsFile, bigContent, 'utf8');

      runHook('tool_post', { tool_name: 'Read', tool_use_id: 'toolu_rot', session_id: 's1', agent_id: '', tool_response: 'y' }, tmp);

      // Old file should be moved to archive, new obs.jsonl should exist with the new event
      const archiveDir = path.join(obsDir, 'obs.archive');
      const archives = fs.existsSync(archiveDir) ? fs.readdirSync(archiveDir) : [];
      const newExists = fs.existsSync(obsFile);
      return archives.length === 1 && archives[0].startsWith('obs-') && archives[0].endsWith('.jsonl') && newExists;
    } finally { cleanTmpProject(tmp); }
  }
});

testCases.push({
  name: 'CAPT-06/purge_old_archives',
  check: () => {
    const tmp = makeTmpProject();
    try {
      const obsDir = path.join(tmp, '.claude', 'logs', 'observations', '_channel');
      const archiveDir = path.join(obsDir, 'obs.archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      // Create an old archive file (fake 31 days old via mtime)
      const oldFile = path.join(archiveDir, 'obs-old.jsonl');
      fs.writeFileSync(oldFile, '{}', 'utf8');
      const oldTime = Date.now() - (31 * 24 * 60 * 60 * 1000);
      fs.utimesSync(oldFile, new Date(oldTime), new Date(oldTime));
      // Remove .last-purge if exists (so purge runs)
      const purgeMarker = path.join(obsDir, '.last-purge');
      if (fs.existsSync(purgeMarker)) fs.unlinkSync(purgeMarker);

      runHook('tool_post', { tool_name: 'Read', tool_use_id: 'toolu_purge', session_id: 's1', agent_id: '', tool_response: 'z' }, tmp);

      return !fs.existsSync(oldFile);
    } finally { cleanTmpProject(tmp); }
  }
});

// ── CAPT-07: Path with spaces ───────────────────────────────────────────────

testCases.push({
  name: 'CAPT-07/path_with_spaces_works',
  check: () => {
    const baseDir = path.join(os.tmpdir(), 'obs test spaces dir');
    fs.mkdirSync(path.join(baseDir, '.claude', 'logs', 'observations'), { recursive: true });
    try {
      runHook('tool_post', { tool_name: 'Grep', tool_use_id: 'toolu_sp', session_id: 's1', agent_id: '', tool_response: 'found' }, baseDir);
      const obsFile = path.join(baseDir, '.claude', 'logs', 'observations', '_channel', 'obs.jsonl');
      const events = readJsonl(obsFile);
      return events.length === 1 && events[0].tool === 'Grep';
    } finally { fs.rmSync(baseDir, { recursive: true, force: true }); }
  }
});

// ── Test runner ─────────────────────────────────────────────────────────────

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

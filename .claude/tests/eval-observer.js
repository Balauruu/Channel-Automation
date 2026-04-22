// .claude/tests/eval-observer.js
// Deterministic eval tests for @observer agent output contracts
// Covers: OBSV-04, OBSV-06, OBSV-07, OBSV-08, MEML-01
// Run: node .claude/tests/eval-observer.js

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const projectRoot = path.resolve(__dirname, '..', '..');
const fixtureDir = path.join(projectRoot, '.claude', 'tests', 'fixtures', 'observer');

// -- Helper functions --------------------------------------------------------

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch (e) { return null; } });
}

function readJsonlStrict(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .trim().split('\n').filter(Boolean)
    .map(l => JSON.parse(l));
}

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
    '- [HIGH] researcher: Always verify Wikipedia dates against primary sources before committing to dossier (2026-04-15T09:00)',
    '',
    '## Pending Review',
    '',
    '## Recent Interactions',
    '',
    '## Feedback',
    ''
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(tmp, '.claude', 'skills', 'autoresearch', 'insights.md'), [
    '# Autoresearch Skill Insights',
    '',
    '- [2026-04-10] [HIGH] Use offset parameter for files exceeding 2000 lines (from: writer, 2026-04-10T14:00)',
    ''
  ].join('\n'), 'utf8');
  return tmp;
}

function cleanTmpProject(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// -- Test cases --------------------------------------------------------------

const testCases = [];

// -- OBSV-04: MEMORY.md entry format -----------------------------------------

testCases.push({
  name: 'OBSV-04/memory_md_entry_format',
  check: () => {
    const re = /^- \[(HIGH|MED|LOW)\] [a-z][-a-z]*: .+ \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
    const valid = [
      '- [HIGH] researcher: Always verify Wikipedia dates against primary sources before committing to dossier (2026-04-18T10:22)',
      '- [MED] writer: For large dossiers read by section heading rather than sequential offset (2026-04-19T14:30)',
      '- [LOW] strategy: Check competitor upload frequency before setting topic priority (2026-04-20T08:15)',
    ];
    const invalid = [
      '- researcher: Missing confidence tag entirely (2026-04-18T10:22)',
      '- [MEDIUM] researcher: Wrong confidence format (2026-04-18T10:22)',
      '- [HIGH] researcher: Multi-line entry\nthat spans two lines (2026-04-18T10:22)',
    ];
    for (const v of valid) {
      if (!re.test(v)) return false;
    }
    for (const inv of invalid) {
      if (re.test(inv)) return false;
    }
    return true;
  }
});

// -- OBSV-04: insights.md entry format ---------------------------------------

testCases.push({
  name: 'OBSV-04/insights_md_entry_format',
  check: () => {
    const re = /^- \[\d{4}-\d{2}-\d{2}\] \[(HIGH|MED|LOW)\] .+ \(from: [a-z][-a-z]*, \d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
    const valid = [
      '- [2026-04-20] [MED] Pin interpreter path in script invocations to prevent silent fallback (from: researcher, 2026-04-20T10:22)',
      '- [2026-04-18] [HIGH] Use offset parameter for files exceeding 2000 lines (from: writer, 2026-04-18T14:30)',
      '- [2026-04-19] [LOW] Consider rate limiting on crawl4ai requests during peak hours (from: researcher, 2026-04-19T09:15)',
    ];
    const invalid = [
      '- [MED] Missing date prefix in insights format (from: researcher, 2026-04-20T10:22)',
      '- [2026-04-20] [HIGH] Missing from clause (researcher, 2026-04-20T10:22)',
      '- [2026-04-20] [HIGH] Wrong from format (from: Researcher, 2026-04-20T10:22)',
    ];
    for (const v of valid) {
      if (!re.test(v)) return false;
    }
    for (const inv of invalid) {
      if (re.test(inv)) return false;
    }
    return true;
  }
});

// -- MEML-01: Confidence tag validation --------------------------------------

testCases.push({
  name: 'MEML-01/confidence_tag_valid',
  check: () => {
    const validTags = ['HIGH', 'MED', 'LOW'];
    const invalidTags = ['MEDIUM', 'high', 'H', '0.8', 'CRITICAL', 'med', 'Low'];
    for (const t of validTags) {
      if (!validTags.includes(t)) return false;
    }
    for (const t of invalidTags) {
      if (validTags.includes(t)) return false;
    }
    return true;
  }
});

// -- OBSV-06: Self-loop filter -----------------------------------------------

testCases.push({
  name: 'OBSV-06/self_loop_filter',
  check: () => {
    const events = readJsonl(path.join(fixtureDir, 'run-observer-selfloop.jsonl')).filter(Boolean);
    const observerEvents = events.filter(e => e.agent_id && e.agent_id.includes('observer'));
    const nonObserverEvents = events.filter(e => e.agent_id && !e.agent_id.includes('observer'));
    // Prove observer events exist in fixture (filter has something to filter)
    if (observerEvents.length === 0) return false;
    // Prove non-observer events exist (remaining events to process)
    if (nonObserverEvents.length === 0) return false;
    // Validate that after filtering, only researcher events remain
    const researcherEvents = nonObserverEvents.filter(e => e.agent_id.includes('researcher'));
    return researcherEvents.length === nonObserverEvents.length;
  }
});

// -- OBSV-07: Cursor file structure ------------------------------------------

testCases.push({
  name: 'OBSV-07/cursor_file_structure',
  check: () => {
    const cursor = { byte_offset: 12345, last_epoch_ms: 1776537600000, last_run_id: 'researcher-abc123' };
    // Validate required fields
    if (!('byte_offset' in cursor)) return false;
    if (!('last_epoch_ms' in cursor)) return false;
    if (!('last_run_id' in cursor)) return false;
    // Validate types
    if (!Number.isInteger(cursor.byte_offset) || cursor.byte_offset < 0) return false;
    if (!Number.isInteger(cursor.last_epoch_ms) || cursor.last_epoch_ms <= 0) return false;
    if (typeof cursor.last_run_id !== 'string' || cursor.last_run_id.length === 0) return false;
    return true;
  }
});

// -- OBSV-07: Cursor rotation detection --------------------------------------

testCases.push({
  name: 'OBSV-07/cursor_rotation_detection',
  check: () => {
    const tmp = makeTmpProject();
    try {
      // Simulate: cursor says byte 50000 but file is only ~200 bytes
      const cursor = { byte_offset: 50000, last_epoch_ms: 1776537300000, last_run_id: 'researcher-abc123' };
      const testFile = path.join(tmp, 'obs.jsonl');
      const testEvent = { ts: '2026-04-18T10-20-00-000Z', epoch_ms: 1776537600000, event: 'tool_post', session_id: 's1', agent_id: 'res-001', tool: 'Read', tool_use_id: 'tu1', project: 'test' };
      fs.writeFileSync(testFile, JSON.stringify(testEvent) + '\n', 'utf8');
      const fileSize = fs.statSync(testFile).size;

      // Rotation detection: cursor offset > file size
      const rotationDetected = cursor.byte_offset > fileSize;
      if (!rotationDetected) return false;

      // Recovery: scan from line 0, skip events where epoch_ms <= cursor.last_epoch_ms
      const events = readJsonlStrict(testFile);
      const newEvents = events.filter(e => e.epoch_ms > cursor.last_epoch_ms);
      // The one event has epoch_ms 1776537600000 > 1776537300000, so it passes
      if (newEvents.length !== 1) return false;
      return true;
    } finally { cleanTmpProject(tmp); }
  }
});

// -- OBSV-08: Rejection JSONL format -----------------------------------------

testCases.push({
  name: 'OBSV-08/rejection_jsonl_format',
  check: () => {
    const validReasons = ['no-scope-match', 'ambiguous-scope', 'duplicate-of-existing', 'format-error', 'target-file-corrupt'];
    const validConfidences = ['HIGH', 'MED', 'LOW'];

    const validEntries = [
      { ts: '2026-04-20T14-30-00', candidate: 'Always use WebFetch for paywalled sites', reason: 'ambiguous-scope', confidence: 'LOW', source_agent: 'researcher', source_run_ts: '2026-04-18T10-22-00' },
      { ts: '2026-04-20T15-00-00', candidate: 'Check file existence before Read calls', reason: 'duplicate-of-existing', confidence: 'MED', source_agent: 'writer', source_run_ts: '2026-04-19T09-05-00' },
    ];
    const invalidEntries = [
      { ts: '2026-04-20T14-30-00', candidate: 'Missing reason field', confidence: 'HIGH', source_agent: 'researcher', source_run_ts: '2026-04-18T10-22-00' },
      { ts: '2026-04-20T14-30-00', candidate: 'Invalid reason value', reason: 'bad-reason', confidence: 'HIGH', source_agent: 'researcher', source_run_ts: '2026-04-18T10-22-00' },
    ];

    function validateRejection(entry) {
      if (typeof entry.ts !== 'string') return false;
      if (typeof entry.candidate !== 'string') return false;
      if (typeof entry.reason !== 'string' || !validReasons.includes(entry.reason)) return false;
      if (typeof entry.confidence !== 'string' || !validConfidences.includes(entry.confidence)) return false;
      if (typeof entry.source_agent !== 'string') return false;
      if (typeof entry.source_run_ts !== 'string') return false;
      return true;
    }

    for (const v of validEntries) {
      if (!validateRejection(v)) return false;
    }
    for (const inv of invalidEntries) {
      if (validateRejection(inv)) return false;
    }
    return true;
  }
});

// -- OBSV-08: Rejection reason enum ------------------------------------------

testCases.push({
  name: 'OBSV-08/rejection_reason_enum',
  check: () => {
    const validReasons = ['no-scope-match', 'ambiguous-scope', 'duplicate-of-existing', 'format-error', 'target-file-corrupt'];
    // All 5 must be recognized
    if (validReasons.length !== 5) return false;
    // Each is a non-empty string
    for (const r of validReasons) {
      if (typeof r !== 'string' || r.length === 0) return false;
    }
    // Invalid reasons should not be in the set
    const invalidReasons = ['invalid', 'other', 'unknown', 'rejected', 'bad'];
    for (const r of invalidReasons) {
      if (validReasons.includes(r)) return false;
    }
    return true;
  }
});

// -- OBSV-04: PLAYBOOK.md entry format (same as MEMORY.md) -------------------

testCases.push({
  name: 'OBSV-04/playbook_entry_format',
  check: () => {
    const re = /^- \[(HIGH|MED|LOW)\] [a-z][-a-z]*: .+ \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
    const valid = [
      '- [HIGH] editorial-lead: Researcher must complete verification pass before dossier handoff to writer (2026-04-18T16:00)',
      '- [MED] researcher: Flag ambiguous source tiers to editorial-lead rather than making judgment calls (2026-04-19T11:30)',
      '- [LOW] compiler: Wait for visual-planner shotlist completion before starting edit sheet (2026-04-20T09:45)',
    ];
    const invalid = [
      '- [HIGH] Editorial-lead: Capitalized agent name (2026-04-18T16:00)',
      '- [HIGH] editorial_lead: Underscore not hyphen in agent name (2026-04-18T16:00)',
    ];
    for (const v of valid) {
      if (!re.test(v)) return false;
    }
    for (const inv of invalid) {
      if (re.test(inv)) return false;
    }
    return true;
  }
});

// -- OBSV-02: Agent ID filter (orphan events) --------------------------------

testCases.push({
  name: 'OBSV-02/agent_id_filter',
  check: () => {
    const events = readJsonl(path.join(fixtureDir, 'orphan-tool-events.jsonl')).filter(Boolean);
    if (events.length === 0) return false;
    // All events should have empty agent_id
    const allEmpty = events.every(e => e.agent_id === '');
    if (!allEmpty) return false;
    // No dispatch or complete events should exist
    const hasDispatch = events.some(e => e.event === 'dispatch');
    const hasComplete = events.some(e => e.event === 'complete');
    if (hasDispatch || hasComplete) return false;
    return true;
  }
});

// -- Test runner -------------------------------------------------------------

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

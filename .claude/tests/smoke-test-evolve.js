// .claude/tests/smoke-test-evolve.js
// Covers: MEML-02, EVLV-04
// Run: node .claude/tests/smoke-test-evolve.js

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const evolveScript = path.join(projectRoot, '.claude', 'scripts', 'memory', 'evolve.js');

// ── Helper functions ────────────────────────────────────────────────────────

function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evolve-test-'));
  const agentMemDir = path.join(tmp, '.claude', 'agent-memory', 'test-agent');
  fs.mkdirSync(agentMemDir, { recursive: true });
  return tmp;
}

function cleanTmpProject(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/**
 * Write a MEMORY.md file with ## Pending Review and ## Permanent sections.
 * permanentEntries: array of entry strings (each starting with "- ")
 * pendingEntries: array of entry strings (each starting with "- ")
 */
function writeMemoryFile(tmpDir, agentName, permanentEntries, pendingEntries) {
  const dir = path.join(tmpDir, '.claude', 'agent-memory', agentName);
  fs.mkdirSync(dir, { recursive: true });
  const pending = pendingEntries && pendingEntries.length > 0
    ? ['## Pending Review', '', ...pendingEntries, '']
    : ['## Pending Review', ''];
  const permanent = permanentEntries && permanentEntries.length > 0
    ? ['## Permanent', '', ...permanentEntries, '']
    : ['## Permanent', ''];
  const content = [...pending, ...permanent].join('\n');
  fs.writeFileSync(path.join(dir, 'MEMORY.md'), content, 'utf8');
}

/**
 * Return an ISO timestamp string (YYYY-MM-DDThh:mm) for N days ago.
 */
function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

/**
 * Run evolve.js subcommand and return parsed JSON output.
 */
function runEvolve(subcommand, args, projectDir) {
  const result = execFileSync('node', [evolveScript, subcommand, ...args], {
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });
  return JSON.parse(result.toString('utf8'));
}

// ── Test cases ──────────────────────────────────────────────────────────────

const testCases = [];

// ── MEML-02: LOW entries older than 14 days are flagged ─────────────────────

testCases.push({
  name: 'MEML-02/decay_low_14d',
  check: () => {
    const tmp = makeTmpProject();
    try {
      const ts = daysAgo(15);
      writeMemoryFile(tmp, 'test-agent', [
        `- [LOW] test-agent: old insight (${ts})`
      ], []);
      const result = runEvolve('decay', [], tmp);
      return (
        result.expired &&
        result.expired.length === 1 &&
        result.expired[0].confidence === 'LOW' &&
        result.expired[0].age_days >= 14
      );
    } finally { cleanTmpProject(tmp); }
  }
});

// ── MEML-02: MED entries older than 30 days are flagged ─────────────────────

testCases.push({
  name: 'MEML-02/decay_med_30d',
  check: () => {
    const tmp = makeTmpProject();
    try {
      const ts = daysAgo(31);
      writeMemoryFile(tmp, 'test-agent', [
        `- [MED] test-agent: aging insight (${ts})`
      ], []);
      const result = runEvolve('decay', [], tmp);
      return (
        result.expired &&
        result.expired.length === 1 &&
        result.expired[0].confidence === 'MED' &&
        result.expired[0].age_days >= 30
      );
    } finally { cleanTmpProject(tmp); }
  }
});

// ── MEML-02: HIGH entries are never flagged regardless of age ────────────────

testCases.push({
  name: 'MEML-02/decay_high_never',
  check: () => {
    const tmp = makeTmpProject();
    try {
      const ts = daysAgo(60);
      writeMemoryFile(tmp, 'test-agent', [
        `- [HIGH] test-agent: permanent insight (${ts})`
      ], []);
      const result = runEvolve('decay', [], tmp);
      return result.total_expired === 0;
    } finally { cleanTmpProject(tmp); }
  }
});

// ── MEML-02: Entries without parseable timestamps are skipped ────────────────

testCases.push({
  name: 'MEML-02/decay_no_timestamp',
  check: () => {
    const tmp = makeTmpProject();
    try {
      writeMemoryFile(tmp, 'test-agent', [
        '- [LOW] test-agent: no timestamp entry'
      ], []);
      const result = runEvolve('decay', [], tmp);
      return result.total_expired === 0;
    } finally { cleanTmpProject(tmp); }
  }
});

// ── EVLV-04: Files at 180+ lines trigger capacity warning ───────────────────

testCases.push({
  name: 'EVLV-04/capacity_warning_180',
  check: () => {
    const tmp = makeTmpProject();
    try {
      // Build a MEMORY.md with enough lines to hit the 180-line threshold.
      // Structure: ## Pending Review (2 lines) + ## Permanent (2 lines) + 176 filler entries = 180 total
      const fillerEntries = [];
      for (let i = 0; i < 176; i++) {
        fillerEntries.push(`- [HIGH] test-agent: filler entry ${i} (${daysAgo(1)})`);
      }
      writeMemoryFile(tmp, 'test-agent', fillerEntries, []);
      const result = runEvolve('decay', [], tmp);
      return (
        result.capacity_warnings &&
        result.capacity_warnings.length === 1 &&
        result.capacity_warnings[0].lines >= 180
      );
    } finally { cleanTmpProject(tmp); }
  }
});

// ── EVLV-04: decay-remove deletes the correct entries by global index ────────

testCases.push({
  name: 'EVLV-04/decay_remove_correct_entries',
  check: () => {
    const tmp = makeTmpProject();
    try {
      const ts1 = daysAgo(15);
      const ts2 = daysAgo(16);
      writeMemoryFile(tmp, 'test-agent', [
        `- [LOW] test-agent: first expired entry (${ts1})`,
        `- [LOW] test-agent: second expired entry (${ts2})`
      ], []);

      // Get the expired global indices
      const decayResult = runEvolve('decay', [], tmp);
      if (!decayResult.expired || decayResult.expired.length !== 2) return false;

      const firstIndex = String(decayResult.expired[0].global_index);

      // Remove only the first expired entry
      runEvolve('decay-remove', [firstIndex], tmp);

      // Re-read the file and verify first is gone, second still present
      const memPath = path.join(tmp, '.claude', 'agent-memory', 'test-agent', 'MEMORY.md');
      const content = fs.readFileSync(memPath, 'utf8');
      return (
        !content.includes('first expired entry') &&
        content.includes('second expired entry')
      );
    } finally { cleanTmpProject(tmp); }
  }
});

// ── EVLV-04: decay-upgrade replaces [LOW]/[MED] confidence with [HIGH] ──────

testCases.push({
  name: 'EVLV-04/decay_upgrade_to_high',
  check: () => {
    const tmp = makeTmpProject();
    try {
      const ts = daysAgo(31);
      writeMemoryFile(tmp, 'test-agent', [
        `- [MED] test-agent: aging insight (${ts})`
      ], []);

      // Get the expired global index
      const decayResult = runEvolve('decay', [], tmp);
      if (!decayResult.expired || decayResult.expired.length !== 1) return false;

      const globalIndex = String(decayResult.expired[0].global_index);

      // Upgrade the entry
      runEvolve('decay-upgrade', [globalIndex], tmp);

      // Re-read the file and verify [MED] replaced with [HIGH]
      const memPath = path.join(tmp, '.claude', 'agent-memory', 'test-agent', 'MEMORY.md');
      const content = fs.readFileSync(memPath, 'utf8');
      return content.includes('[HIGH]') && !content.includes('[MED]');
    } finally { cleanTmpProject(tmp); }
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

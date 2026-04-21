// .claude/tests/eval-evolve.js
// Deterministic eval tests for evolve.js output contracts
// Covers: EVLV-02, EVLV-03
// Run: node .claude/tests/eval-evolve.js

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const projectRoot = path.resolve(__dirname, '..', '..');
const fixtureDir = path.join(projectRoot, '.claude', 'tests', 'fixtures', 'evolve');
const evolveScript = path.join(projectRoot, '.claude', 'scripts', 'memory', 'evolve.js');

// -- Helper functions --------------------------------------------------------

function loadEvolve() {
  // Set PROJECT_ROOT via env before requiring
  const mod = require(evolveScript);
  return mod;
}

function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evolve-eval-'));

  // Create insights.md fixture
  fs.mkdirSync(path.join(tmp, '.claude', 'skills', 'test-skill'), { recursive: true });
  fs.copyFileSync(
    path.join(fixtureDir, 'insights.md'),
    path.join(tmp, '.claude', 'skills', 'test-skill', 'insights.md')
  );

  // Create MEMORY.md fixture
  fs.mkdirSync(path.join(tmp, '.claude', 'agent-memory', 'test-agent'), { recursive: true });
  fs.copyFileSync(
    path.join(fixtureDir, 'memory.md'),
    path.join(tmp, '.claude', 'agent-memory', 'test-agent', 'MEMORY.md')
  );

  // Create PLAYBOOK.md fixture
  fs.copyFileSync(
    path.join(fixtureDir, 'playbook.md'),
    path.join(tmp, '.claude', 'PLAYBOOK.md')
  );

  return tmp;
}

function makeTmpProjectEmpty() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evolve-eval-'));

  // Create insights.md with NO Pending Review entries
  fs.mkdirSync(path.join(tmp, '.claude', 'skills', 'test-skill'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.claude', 'skills', 'test-skill', 'insights.md'), [
    '# Test Skill Insights',
    '',
    '## Pending Review',
    ''
  ].join('\n'), 'utf8');

  // Create MEMORY.md with NO Pending Review entries
  fs.mkdirSync(path.join(tmp, '.claude', 'agent-memory', 'test-agent'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.claude', 'agent-memory', 'test-agent', 'MEMORY.md'), [
    '# Test Agent Memory',
    '',
    '## Pending Review',
    ''
  ].join('\n'), 'utf8');

  return tmp;
}

function cleanTmpProject(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// -- Test cases --------------------------------------------------------------

const testCases = [];

// -- EVLV-02: scan ordering --------------------------------------------------

testCases.push({
  name: 'EVLV-02/scan_ordering',
  check: () => {
    const { scan } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      const result = scan();
      // insights type must come before memory type before playbook type
      const types = result.files.map(f => f.type);
      const insightsIdx = types.indexOf('insights');
      const memoryIdx = types.indexOf('memory');
      const playbookIdx = types.indexOf('playbook');
      if (insightsIdx === -1 || memoryIdx === -1 || playbookIdx === -1) return false;
      return insightsIdx < memoryIdx && memoryIdx < playbookIdx;
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-02/scan_entry_count',
  check: () => {
    const { scan } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      const result = scan();
      // Fixture has: 2 insights entries + 2 memory entries + 1 playbook entry = 5 total
      return result.total === 5;
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-02/scan_empty',
  check: () => {
    const { scan } = loadEvolve();
    const tmp = makeTmpProjectEmpty();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      const result = scan();
      return result.total === 0;
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

// -- EVLV-03: promote --------------------------------------------------------

testCases.push({
  name: 'EVLV-03/promote_creates_permanent',
  check: () => {
    const { promote } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      promote();
      const memContent = fs.readFileSync(
        path.join(tmp, '.claude', 'agent-memory', 'test-agent', 'MEMORY.md'), 'utf8'
      );
      return memContent.includes('## Permanent');
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-03/promote_moves_entries',
  check: () => {
    const { promote } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      promote();
      const memContent = fs.readFileSync(
        path.join(tmp, '.claude', 'agent-memory', 'test-agent', 'MEMORY.md'), 'utf8'
      );
      const lines = memContent.split('\n');
      const pendingIdx = lines.findIndex(l => l === '## Pending Review');
      const permanentIdx = lines.findIndex(l => l === '## Permanent');
      // Permanent section must have entries
      const permanentEntries = [];
      for (let i = permanentIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## ')) break;
        if (lines[i].startsWith('- ')) permanentEntries.push(lines[i]);
      }
      // Pending Review section must be empty
      const pendingEntries = [];
      for (let i = pendingIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## ')) break;
        if (lines[i].startsWith('- ')) pendingEntries.push(lines[i]);
      }
      return permanentEntries.length === 2 && pendingEntries.length === 0;
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-03/promote_strips_memory_pointer',
  check: () => {
    const { promote } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      promote();
      const memContent = fs.readFileSync(
        path.join(tmp, '.claude', 'agent-memory', 'test-agent', 'MEMORY.md'), 'utf8'
      );
      // After promote, entries should NOT have the timestamp pointer
      return !memContent.includes('(2026-04-18T10:22)') && !memContent.includes('(2026-04-19T14:30)');
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-03/promote_strips_insight_pointer',
  check: () => {
    const { promote } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      promote();
      const insContent = fs.readFileSync(
        path.join(tmp, '.claude', 'skills', 'test-skill', 'insights.md'), 'utf8'
      );
      // After promote, entries should NOT have the "(from: researcher," pointer
      return !insContent.includes('(from: researcher, 2026-04-21T10:22)') &&
             !insContent.includes('(from: researcher, 2026-04-21T11:05)');
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-03/promote_global_index',
  check: () => {
    const { promote } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      const result = promote();
      // Should have sequential 1-based global indices across all files
      const allIndices = [];
      for (const file of result.promoted) {
        for (const entry of file.entries) {
          allIndices.push(entry.global_index);
        }
      }
      // 5 total entries, indices 1-5
      if (allIndices.length !== 5) return false;
      for (let i = 0; i < allIndices.length; i++) {
        if (allIndices[i] !== i + 1) return false;
      }
      return true;
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

// -- EVLV-03: revert ---------------------------------------------------------

testCases.push({
  name: 'EVLV-03/revert_removes_entry',
  check: () => {
    const { promote, revert } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      promote();
      // Revert entry with global_index 1 (first insights entry)
      const result = revert(['1']);
      if (result.total !== 1) return false;
      // Verify entry is gone from file
      const insContent = fs.readFileSync(
        path.join(tmp, '.claude', 'skills', 'test-skill', 'insights.md'), 'utf8'
      );
      const lines = insContent.split('\n');
      const permIdx = lines.findIndex(l => l === '## Permanent');
      const permEntries = [];
      for (let i = permIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## ')) break;
        if (lines[i].startsWith('- ')) permEntries.push(lines[i]);
      }
      // Was 2 entries, now should be 1
      return permEntries.length === 1;
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-03/revert_preserves_others',
  check: () => {
    const { promote, revert } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      promote();
      // Revert global_index 2 (second insights entry)
      revert(['2']);
      // Verify first insights entry (index 1) is still there
      const insContent = fs.readFileSync(
        path.join(tmp, '.claude', 'skills', 'test-skill', 'insights.md'), 'utf8'
      );
      // The first entry should remain (Pin interpreter)
      return insContent.includes('Pin interpreter to venv path in all scripts');
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-03/revert_multi',
  check: () => {
    const { promote, revert } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      promote();
      // Revert indices 1 and 3 (first insight entry and first memory entry)
      const result = revert(['1', '3']);
      if (result.total !== 2) return false;
      // Entry 2 (second insight) should remain
      const insContent = fs.readFileSync(
        path.join(tmp, '.claude', 'skills', 'test-skill', 'insights.md'), 'utf8'
      );
      const hasSecondInsight = insContent.includes('Use wait_for selector for BAnQ pages');
      // Entry 4 (second memory) should remain
      const memContent = fs.readFileSync(
        path.join(tmp, '.claude', 'agent-memory', 'test-agent', 'MEMORY.md'), 'utf8'
      );
      const hasSecondMemory = memContent.includes('Read large dossiers by section heading not full file');
      return hasSecondInsight && hasSecondMemory;
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
  }
});

testCases.push({
  name: 'EVLV-03/promote_playbook_existing_permanent',
  check: () => {
    const { promote } = loadEvolve();
    const tmp = makeTmpProject();
    try {
      process.env.CLAUDE_PROJECT_DIR = tmp;
      promote();
      const pbContent = fs.readFileSync(path.join(tmp, '.claude', 'PLAYBOOK.md'), 'utf8');
      // Should NOT have duplicate ## Permanent headings
      const permanentCount = (pbContent.match(/^## Permanent$/gm) || []).length;
      if (permanentCount !== 1) return false;
      // Should have the existing entry plus the promoted entry
      const lines = pbContent.split('\n');
      const permIdx = lines.findIndex(l => l === '## Permanent');
      const permEntries = [];
      for (let i = permIdx + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## ')) break;
        if (lines[i].startsWith('- ')) permEntries.push(lines[i]);
      }
      // Original entry + 1 promoted entry = 2
      return permEntries.length === 2;
    } finally {
      delete process.env.CLAUDE_PROJECT_DIR;
      cleanTmpProject(tmp);
    }
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

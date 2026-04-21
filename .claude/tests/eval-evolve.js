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

// -- Helper functions --------------------------------------------------------

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
  fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
  fs.copyFileSync(
    path.join(fixtureDir, 'playbook.md'),
    path.join(tmp, '.claude', 'PLAYBOOK.md')
  );

  return tmp;
}

function cleanTmpProject(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// -- Test cases --------------------------------------------------------------

const testCases = [];

// Tests will be added after evolve.js exports are available (Task 2)

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

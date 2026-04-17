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

// Run
let pass = 0, fail = 0;
for (const tc of testCases) {
  const ok = (() => { try { return !!tc.check(); } catch { return false; } })();
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${tc.name}`);
  ok ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

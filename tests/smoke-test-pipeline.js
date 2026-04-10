// tests/smoke-test-pipeline.js
// Phase 4 Pipeline Triggers validation -- checks PIPE-01 through PIPE-08, HOOK-03, HOOK-04
// Run: node tests/smoke-test-pipeline.js
// Full suite: node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js && node tests/smoke-test-pipeline.js

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const pipelineSkills = [
  'strategy', 'strategy-scrape', 'strategy-analyze', 'strategy-topics',
  'research', 'write-script', 'visual-plan',
  'process-assets', 'assets-download', 'assets-embed', 'assets-search', 'assets-score',
  'compile'
];

const testCases = [];

// Per-skill structural checks (13 skills x 4 checks = 52 test cases)
for (const skill of pipelineSkills) {
  const skillDir = path.join(projectRoot, '.claude', 'skills', skill);
  const skillMd = path.join(skillDir, 'SKILL.md');

  // 1. Skill directory exists
  testCases.push({
    name: `${skill}/directory_exists`,
    check: () => fs.existsSync(skillDir)
  });

  // 2. SKILL.md exists
  testCases.push({
    name: `${skill}/SKILL.md_exists`,
    check: () => fs.existsSync(skillMd)
  });

  // 3. Has disable-model-invocation: true in frontmatter
  testCases.push({
    name: `${skill}/has_disable_model_invocation`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes('disable-model-invocation: true');
    }
  });

  // 4. Has name: field matching directory name
  testCases.push({
    name: `${skill}/has_name_field`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes(`name: ${skill}`);
    }
  });
}

// Agent dispatch checks
testCases.push({
  name: 'strategy/dispatches_strategy_agent',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'strategy', 'SKILL.md'), 'utf8');
    return content.includes('@strategy');
  }
});

testCases.push({
  name: 'research/dispatches_researcher_agent',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'research', 'SKILL.md'), 'utf8');
    return content.includes('@researcher');
  }
});

testCases.push({
  name: 'write-script/dispatches_writer_agent',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'write-script', 'SKILL.md'), 'utf8');
    return content.includes('@writer');
  }
});

testCases.push({
  name: 'visual-plan/dispatches_visual_researcher',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'visual-plan', 'SKILL.md'), 'utf8');
    return content.includes('@visual-researcher');
  }
});

testCases.push({
  name: 'visual-plan/dispatches_visual_planner',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'visual-plan', 'SKILL.md'), 'utf8');
    return content.includes('@visual-planner');
  }
});

testCases.push({
  name: 'process-assets/dispatches_asset_processor',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'process-assets', 'SKILL.md'), 'utf8');
    return content.includes('@asset-processor');
  }
});

testCases.push({
  name: 'compile/dispatches_compiler_agent',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'compile', 'SKILL.md'), 'utf8');
    return content.includes('@compiler');
  }
});

// Checkpoint checks
testCases.push({
  name: 'strategy/has_checkpoint_stop',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'strategy', 'SKILL.md'), 'utf8');
    return /STOP|WAIT/i.test(content);
  }
});

testCases.push({
  name: 'process-assets/has_checkpoint_stop',
  check: () => {
    const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'process-assets', 'SKILL.md'), 'utf8');
    return /STOP|WAIT/i.test(content);
  }
});

// Pre-Phase 6 check: no Python references in any pipeline skill (13 checks)
for (const skill of pipelineSkills) {
  testCases.push({
    name: `${skill}/no_python_references`,
    check: () => {
      const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', skill, 'SKILL.md'), 'utf8');
      return !/\.py\b|python/i.test(content);
    }
  });
}

// Output path convention: each skill references projects/ (13 checks)
for (const skill of pipelineSkills) {
  testCases.push({
    name: `${skill}/references_projects_dir`,
    check: () => {
      const content = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', skill, 'SKILL.md'), 'utf8');
      return content.includes('projects/');
    }
  });
}

// Hook checks (stubs for Plan 02)
testCases.push({
  name: 'hooks/dispatch_script_exists',
  check: () => fs.existsSync(path.join(projectRoot, '.claude', 'hooks', 'log-agent-dispatch.js'))
});

testCases.push({
  name: 'hooks/complete_script_exists',
  check: () => fs.existsSync(path.join(projectRoot, '.claude', 'hooks', 'log-agent-complete.js'))
});

testCases.push({
  name: 'hooks/settings_has_pretooluse',
  check: () => {
    const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
    if (!fs.existsSync(settingsPath)) return false;
    const content = fs.readFileSync(settingsPath, 'utf8');
    return content.includes('PreToolUse');
  }
});

testCases.push({
  name: 'hooks/settings_has_subagentstop',
  check: () => {
    const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
    if (!fs.existsSync(settingsPath)) return false;
    const content = fs.readFileSync(settingsPath, 'utf8');
    return content.includes('SubagentStop');
  }
});

// Audit checks (stubs for Plan 03)
testCases.push({
  name: 'audit/skill_exists',
  check: () => fs.existsSync(path.join(projectRoot, '.claude', 'skills', 'audit-agents', 'SKILL.md'))
});

testCases.push({
  name: 'audit/script_exists',
  check: () => fs.existsSync(path.join(projectRoot, '.claude', 'scripts', 'audit-agents.js'))
});

// Run all tests
let passed = 0;
const total = testCases.length;

for (const tc of testCases) {
  try {
    const ok = tc.check();
    console.log(ok ? 'PASS' : 'FAIL', tc.name);
    if (ok) passed++;
    else if (!ok) console.log('  Expected: true, Got: false');
  } catch (e) {
    console.log('FAIL', tc.name);
    console.log('  Error:', e.message);
  }
}

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);

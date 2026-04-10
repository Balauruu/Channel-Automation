// tests/smoke-test-skills.js
// Phase 2 Skills Library validation -- checks SKIL-09 through SKIL-12
// Run: node tests/smoke-test-skills.js
// Full suite: node tests/smoke-test-paths.js && node tests/smoke-test-skills.js

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const skills = [
  'documentary-research', 'archive-search', 'crawl4ai-scraping',
  'visual-narrative', 'media-evaluation', 'data-analysis',
  'autoresearch', 'structured-output'
];

const testCases = [];

// Per-skill checks (8 skills x 10 checks = 80 test cases)
for (const skill of skills) {
  const skillDir = path.join(projectRoot, '.claude', 'skills', skill);
  const skillMd = path.join(skillDir, 'SKILL.md');
  const insightsMd = path.join(skillDir, 'insights.md');

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

  // 3. insights.md exists
  testCases.push({
    name: `${skill}/insights.md_exists`,
    check: () => fs.existsSync(insightsMd)
  });

  // 4. SKILL.md has valid frontmatter with name: and user-invocable: true
  testCases.push({
    name: `${skill}/frontmatter_name_and_invocable`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes(`name: ${skill}`) && content.includes('user-invocable: true');
    }
  });

  // 5. SKILL.md has description: in frontmatter
  testCases.push({
    name: `${skill}/frontmatter_description`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes('description:');
    }
  });

  // 6. SKILL.md name in frontmatter matches directory name
  testCases.push({
    name: `${skill}/frontmatter_name_matches_dir`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      if (!nameMatch) return false;
      return nameMatch[1].trim() === skill;
    }
  });

  // 7. SKILL.md contains Phase 0 section (SKIL-11)
  testCases.push({
    name: `${skill}/has_phase_0`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes('Phase 0');
    }
  });

  // 8. SKILL.md contains Reflection Phase section (SKIL-10)
  testCases.push({
    name: `${skill}/has_reflection_phase`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes('Reflection Phase');
    }
  });

  // 9. SKILL.md contains [HEURISTIC] tag (SKIL-12)
  testCases.push({
    name: `${skill}/has_heuristic_tag`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes('[HEURISTIC]');
    }
  });

  // 10. SKILL.md contains [DETERMINISTIC] tag (SKIL-12)
  testCases.push({
    name: `${skill}/has_deterministic_tag`,
    check: () => {
      const content = fs.readFileSync(skillMd, 'utf8');
      return content.includes('[DETERMINISTIC]');
    }
  });
}

// Global checks (2 test cases)

// 11. No SKILL.md contains V5 paths (.pi/multi-team/)
testCases.push({
  name: 'global/no_v5_paths_in_any_skill',
  check: () => {
    for (const skill of skills) {
      const skillMd = path.join(projectRoot, '.claude', 'skills', skill, 'SKILL.md');
      const content = fs.readFileSync(skillMd, 'utf8');
      if (content.includes('.pi/multi-team/')) return false;
    }
    return true;
  }
});

// 12. insights.md files all contain the lifecycle template marker
testCases.push({
  name: 'global/insights_have_lifecycle_marker',
  check: () => {
    for (const skill of skills) {
      const insightsMd = path.join(projectRoot, '.claude', 'skills', skill, 'insights.md');
      const content = fs.readFileSync(insightsMd, 'utf8');
      if (!content.includes('Append new insights below this line')) return false;
    }
    return true;
  }
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
    console.log('FAIL', tc.name, e.message);
  }
}

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);

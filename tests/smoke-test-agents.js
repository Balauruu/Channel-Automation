// tests/smoke-test-agents.js
// Phase 3 Agent Migration & Memory validation -- checks AGNT and MEMO requirements
// Run: node tests/smoke-test-agents.js
// Full suite: node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const agents = [
  'researcher', 'writer', 'strategy', 'style-extractor', 'editorial-lead',
  'visual-researcher', 'visual-planner', 'asset-processor', 'asset-curator',
  'meta', 'code-reviewer', 'compiler'
];

const testCases = [];

// Per-agent checks (12 agents x 11 checks)
for (const agent of agents) {
  const agentFile = path.join(projectRoot, '.claude', 'agents', `${agent}.md`);
  const memoryFile = path.join(projectRoot, '.claude', 'agent-memory', agent, 'MEMORY.md');

  // 1. Agent file exists
  testCases.push({
    name: `${agent}/agent_file_exists`,
    check: () => fs.existsSync(agentFile)
  });

  // 2. Frontmatter contains name: {name}
  testCases.push({
    name: `${agent}/frontmatter_has_name`,
    check: () => {
      const content = fs.readFileSync(agentFile, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) return false;
      return fmMatch[1].includes(`name: ${agent}`);
    }
  });

  // 3. Frontmatter contains model: sonnet
  testCases.push({
    name: `${agent}/frontmatter_has_model_sonnet`,
    check: () => {
      const content = fs.readFileSync(agentFile, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) return false;
      return fmMatch[1].includes('model: sonnet');
    }
  });

  // 4. Frontmatter contains memory: project
  testCases.push({
    name: `${agent}/frontmatter_has_memory_project`,
    check: () => {
      const content = fs.readFileSync(agentFile, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) return false;
      return fmMatch[1].includes('memory: project');
    }
  });

  // 5. Frontmatter contains tools: field (AGNT-15 tool scoping)
  testCases.push({
    name: `${agent}/frontmatter_has_tools`,
    check: () => {
      const content = fs.readFileSync(agentFile, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) return false;
      return fmMatch[1].includes('tools:');
    }
  });

  // 6. Frontmatter skills: contains agent-protocols (MEMO-03)
  testCases.push({
    name: `${agent}/skills_has_agent_protocols`,
    check: () => {
      const content = fs.readFileSync(agentFile, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) return false;
      return fmMatch[1].includes('agent-protocols');
    }
  });

  // 7. Agent body contains <project_context> block
  testCases.push({
    name: `${agent}/body_has_project_context`,
    check: () => {
      const content = fs.readFileSync(agentFile, 'utf8');
      return content.includes('<project_context>');
    }
  });

  // 8. Agent body contains ## Identity section
  testCases.push({
    name: `${agent}/body_has_identity_section`,
    check: () => {
      const content = fs.readFileSync(agentFile, 'utf8');
      return content.includes('## Identity');
    }
  });

  // 9. MEMORY.md exists
  testCases.push({
    name: `${agent}/memory_file_exists`,
    check: () => fs.existsSync(memoryFile)
  });

  // 10. MEMORY.md contains all 5 sections (MEMO-02)
  testCases.push({
    name: `${agent}/memory_has_all_5_sections`,
    check: () => {
      const content = fs.readFileSync(memoryFile, 'utf8');
      const requiredSections = [
        '## Key Files',
        '## Decisions',
        '## Patterns',
        '## Observations',
        '## Open Questions'
      ];
      return requiredSections.every(s => content.includes(s));
    }
  });

  // 11. MEMORY.md Key Files section is seeded (not empty) (MEMO-04)
  testCases.push({
    name: `${agent}/memory_key_files_seeded`,
    check: () => {
      const content = fs.readFileSync(memoryFile, 'utf8');
      const keyFilesMatch = content.match(/## Key Files\r?\n([\s\S]*?)(?=\r?\n## |\r?\n$|$)/);
      if (!keyFilesMatch) return false;
      const section = keyFilesMatch[1].trim();
      // Must have content that is not just "(none yet)"
      return section.length > 0 && !section.match(/^\(none yet\)$/);
    }
  });
}

// Global checks

// 12. No agent file contains .pi/multi-team/ (V5 path leak detection)
testCases.push({
  name: 'global/no_v5_paths_in_any_agent',
  check: () => {
    for (const agent of agents) {
      const agentFile = path.join(projectRoot, '.claude', 'agents', `${agent}.md`);
      if (!fs.existsSync(agentFile)) continue;
      const content = fs.readFileSync(agentFile, 'utf8');
      if (content.includes('.pi/multi-team/')) return false;
    }
    return true;
  }
});

// 13. No agent file contains V5 template variables
testCases.push({
  name: 'global/no_v5_template_variables',
  check: () => {
    const patterns = ['{{SESSION_DIR}}', '{{CONVERSATION_LOG}}', '{{EXPERTISE_BLOCK}}'];
    for (const agent of agents) {
      const agentFile = path.join(projectRoot, '.claude', 'agents', `${agent}.md`);
      if (!fs.existsSync(agentFile)) continue;
      const content = fs.readFileSync(agentFile, 'utf8');
      for (const pattern of patterns) {
        if (content.includes(pattern)) return false;
      }
    }
    return true;
  }
});

// 14. No agent file contains delegation language
testCases.push({
  name: 'global/no_delegation_language',
  check: () => {
    const delegationPatterns = [/delegate to/i, /\bDelegate\b/];
    for (const agent of agents) {
      const agentFile = path.join(projectRoot, '.claude', 'agents', `${agent}.md`);
      if (!fs.existsSync(agentFile)) continue;
      const content = fs.readFileSync(agentFile, 'utf8');
      for (const pattern of delegationPatterns) {
        if (pattern.test(content)) {
          // Allow "the user may delegate" style usage -- only flag "delegate to <agent>"
          // Check specifically for delegation commands, not general usage
          if (/delegate to\s+\w/i.test(content)) return false;
          if (/\bDelegate\s+(?:this|the|work|task)/i.test(content)) return false;
        }
      }
    }
    return true;
  }
});

// 15. CLAUDE.md agent reference table has no "(Phase 3)" markers remaining
testCases.push({
  name: 'global/claude_md_no_phase3_markers',
  check: () => {
    const claudeMd = path.join(projectRoot, 'CLAUDE.md');
    const content = fs.readFileSync(claudeMd, 'utf8');
    return !content.includes('(Phase 3)');
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
    console.log('FAIL', tc.name);
    console.log('  Error:', e.message);
  }
}

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);

// tests/smoke-test-paths.js
// Windows path validation + Phase 1 deliverable checks
// Run: node tests/smoke-test-paths.js

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const testCases = [
  // Windows Path Handling
  {
    name: 'project_root_exists',
    check: () => fs.existsSync(projectRoot)
  },
  {
    name: 'project_root_has_spaces_and_periods',
    check: () => {
      const cwd = projectRoot;
      return cwd.includes('D. Mysteries') && cwd.includes('V0.6');
    }
  },
  {
    name: 'write_read_delete_in_project_root',
    check: () => {
      const p = path.join(projectRoot, '.test-smoke-temp');
      fs.writeFileSync(p, 'smoke-test-ok', 'utf8');
      const content = fs.readFileSync(p, 'utf8');
      fs.unlinkSync(p);
      return content === 'smoke-test-ok';
    }
  },
  {
    name: 'nested_dir_with_spaces',
    check: () => {
      const d = path.join(projectRoot, 'tests', 'temp test dir');
      fs.mkdirSync(d, { recursive: true });
      const p = path.join(d, 'test file.md');
      fs.writeFileSync(p, 'ok', 'utf8');
      const exists = fs.existsSync(p);
      fs.unlinkSync(p);
      fs.rmdirSync(d);
      return exists;
    }
  },
  {
    name: 'path_resolve_handles_cwd',
    check: () => path.resolve('.') === projectRoot
  },

  // Phase 1 File Existence
  {
    name: 'claude_md_exists',
    check: () => fs.existsSync(path.join(projectRoot, 'CLAUDE.md'))
  },
  {
    name: 'settings_json_exists',
    check: () => fs.existsSync(path.join(projectRoot, '.claude', 'settings.json'))
  },
  {
    name: 'researcher_agent_exists',
    check: () => fs.existsSync(path.join(projectRoot, '.claude', 'agents', 'researcher.md'))
  },
  {
    name: 'writer_agent_exists',
    check: () => fs.existsSync(path.join(projectRoot, '.claude', 'agents', 'writer.md'))
  },
  {
    name: 'agent_protocols_skill_exists',
    check: () => fs.existsSync(path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'))
  },
  {
    name: 'skill_crafting_guide_exists',
    check: () => fs.existsSync(path.join(projectRoot, '.claude', 'references', 'skill-crafting-guide.md'))
  },
  {
    name: 'researcher_memory_exists',
    check: () => fs.existsSync(path.join(projectRoot, '.claude', 'agent-memory', 'researcher', 'MEMORY.md'))
  },
  {
    name: 'writer_memory_exists',
    check: () => fs.existsSync(path.join(projectRoot, '.claude', 'agent-memory', 'writer', 'MEMORY.md'))
  },
  {
    name: 'channel_md_exists',
    check: () => fs.existsSync(path.join(projectRoot, 'channel', 'channel.md'))
  },
  {
    name: 'voice_profile_exists',
    check: () => fs.existsSync(path.join(projectRoot, 'channel', 'voice-profile.md'))
  },
  {
    name: 'visual_style_guide_exists',
    check: () => fs.existsSync(path.join(projectRoot, 'channel', 'VISUAL_STYLE_GUIDE.md'))
  },

  // Content Validation
  {
    name: 'claude_md_has_agent_reference',
    check: () => {
      const c = fs.readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf8');
      return c.includes('Agent Reference') && c.includes('@researcher') && c.includes('@writer');
    }
  },
  {
    name: 'researcher_has_memory_project',
    check: () => {
      const c = fs.readFileSync(path.join(projectRoot, '.claude', 'agents', 'researcher.md'), 'utf8');
      return c.includes('memory: project');
    }
  },
  {
    name: 'writer_has_voice_profile_ref',
    check: () => {
      const c = fs.readFileSync(path.join(projectRoot, '.claude', 'agents', 'writer.md'), 'utf8');
      return c.includes('@channel/voice-profile.md');
    }
  },
  {
    name: 'agent_protocols_has_memory_lifecycle',
    check: () => {
      const c = fs.readFileSync(path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'), 'utf8');
      return c.includes('Memory Lifecycle') && c.includes('Read your complete MEMORY.md');
    }
  },
  {
    name: 'channel_md_has_channel_dna',
    check: () => {
      const c = fs.readFileSync(path.join(projectRoot, 'channel', 'channel.md'), 'utf8');
      return c.includes('Channel DNA');
    }
  },
];

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

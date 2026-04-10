// .claude/scripts/audit-agents.js
// Agent Audit Script -- validates all 12 agent definitions across 4 dimensions + cross-consistency
// Run: node .claude/scripts/audit-agents.js
// Auto-fix: node .claude/scripts/audit-agents.js --fix

const fs = require('fs');
const path = require('path');

// Setup and constants
const projectRoot = path.resolve(__dirname, '..', '..');
const agentsDir = path.join(projectRoot, '.claude', 'agents');
const skillsDir = path.join(projectRoot, '.claude', 'skills');
const memoryDir = path.join(projectRoot, '.claude', 'agent-memory');
const configPath = path.join(projectRoot, '.planning', 'config.json');
const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');

const autoFix = process.argv.includes('--fix');

// Valid tools list (complete, from official docs)
const VALID_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Agent',
  'WebFetch', 'WebSearch', 'NotebookEdit', 'Monitor', 'PowerShell',
  'Skill', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode',
  'CronCreate', 'CronDelete', 'CronList', 'LSP',
  'TodoWrite', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate', 'TaskStop',
  'ToolSearch', 'ListMcpResourcesTool', 'ReadMcpResourceTool',
  'SendMessage', 'TeamCreate', 'TeamDelete',
  'EnterWorktree', 'ExitWorktree'
];

// Expected agents list
const EXPECTED_AGENTS = [
  'researcher', 'writer', 'strategy', 'style-extractor', 'editorial-lead',
  'visual-researcher', 'visual-planner', 'asset-processor', 'asset-curator',
  'meta', 'code-reviewer', 'compiler'
];

// Frontmatter parser function
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let inArray = false;
  let multiLineStr = false;

  for (const line of lines) {
    // Continuation of multi-line string (>- format)
    if (multiLineStr && currentKey) {
      if (line.match(/^\s+\S/)) {
        fm[currentKey] = ((fm[currentKey] || '') + ' ' + line.trim()).trim();
        continue;
      } else {
        multiLineStr = false;
      }
    }

    // Array item
    if (line.match(/^\s+-\s+/) && inArray && currentKey) {
      fm[currentKey].push(line.replace(/^\s+-\s+/, '').trim());
    }
    // Key with empty value (start of array)
    else if (line.match(/^(\w[\w-]*):\s*$/)) {
      currentKey = line.match(/^(\w[\w-]*):/)[1];
      fm[currentKey] = [];
      inArray = true;
      multiLineStr = false;
    }
    // Key with inline value
    else if (line.match(/^(\w[\w-]*):\s+(.+)/)) {
      const m = line.match(/^(\w[\w-]*):\s+(.*)/);
      fm[m[1]] = m[2].trim();
      currentKey = m[1];
      inArray = false;
      multiLineStr = false;
    }
    // Key with multi-line string indicator (>- or >)
    else if (line.match(/^(\w[\w-]*):\s*>-?\s*$/)) {
      const m = line.match(/^(\w[\w-]*):/);
      fm[m[1]] = '';
      currentKey = m[1];
      inArray = false;
      multiLineStr = true;
    }
  }
  return fm;
}

// Results tracking
const results = { pass: [], fail: [], warn: [] };
function pass(check) { results.pass.push(check); }
function fail(check, fix) { results.fail.push({ check, fix }); }
function warn(check) { results.warn.push(check); }

// Track auto-fix actions
const fixes = [];

// Per-agent dimension checks
const dim1Results = [];
const dim2Results = [];
const dim3Results = [];
const dim4Results = [];

for (const agent of EXPECTED_AGENTS) {
  const agentFile = path.join(agentsDir, agent + '.md');

  // Check file exists
  if (!fs.existsSync(agentFile)) {
    fail(agent + ': agent file missing', 'Create agent file at .claude/agents/' + agent + '.md');
    dim1Results.push({ agent, status: 'FAIL', msg: 'agent file missing' });
    continue;
  }

  let content;
  try {
    content = fs.readFileSync(agentFile, 'utf8');
  } catch (e) {
    fail(agent + ': cannot read agent file', 'Check file permissions for .claude/agents/' + agent + '.md');
    dim1Results.push({ agent, status: 'FAIL', msg: 'cannot read file' });
    continue;
  }

  const fm = parseFrontmatter(content);

  if (!fm) {
    fail(agent + ': cannot parse frontmatter', 'Add valid YAML frontmatter to .claude/agents/' + agent + '.md');
    dim1Results.push({ agent, status: 'FAIL', msg: 'cannot parse frontmatter' });
    continue;
  }

  // Dimension 1: Required fields
  let dim1Ok = true;
  const requiredFields = ['name', 'description', 'model', 'memory'];

  for (const field of requiredFields) {
    if (!fm[field] || (typeof fm[field] === 'string' && fm[field].length === 0)) {
      dim1Ok = false;
      const defaultVal = field === 'model' ? 'sonnet' : field === 'memory' ? 'project' : '<' + field + '>';
      fail(agent + ': missing ' + field + ' field', 'Add ' + field + ': ' + defaultVal + ' to .claude/agents/' + agent + '.md frontmatter');
      if (autoFix && (field === 'model' || field === 'memory')) {
        fixes.push({ agent, field, value: defaultVal });
      }
    }
  }

  // Check name matches filename
  if (fm.name && fm.name !== agent) {
    dim1Ok = false;
    fail(agent + ': name field does not match filename', 'Change name: to ' + agent + ' in .claude/agents/' + agent + '.md');
  }

  // Check skills is an array with at least one entry
  if (!fm.skills || !Array.isArray(fm.skills) || fm.skills.length === 0) {
    dim1Ok = false;
    fail(agent + ': skills must be a non-empty array', 'Add skills: array with at least agent-protocols to .claude/agents/' + agent + '.md');
  }

  if (dim1Ok) {
    pass(agent + ': all required fields present');
  }
  dim1Results.push({
    agent,
    status: dim1Ok ? 'PASS' : 'FAIL',
    msg: dim1Ok ? 'all required fields present' : 'missing fields (see failures)'
  });

  // Dimension 2: Tool scoping validity
  let dim2Ok = true;
  let tools = [];

  if (fm.tools) {
    if (Array.isArray(fm.tools)) {
      tools = fm.tools.map(function(t) { return t.trim(); });
    } else if (typeof fm.tools === 'string') {
      tools = fm.tools.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });
    }
  }

  if (tools.length === 0) {
    warn(agent + ': no tools: field -- agent has access to all tools (no scoping)');
    dim2Results.push({ agent, status: 'WARN', msg: 'no tools field' });
  } else {
    const invalidTools = tools.filter(function(t) { return !VALID_TOOLS.includes(t); });
    if (invalidTools.length > 0) {
      dim2Ok = false;
      for (const t of invalidTools) {
        fail(agent + ': invalid tool ' + t, 'Remove invalid tool ' + t + ' from tools: field in .claude/agents/' + agent + '.md');
      }
    }
    if (dim2Ok) {
      pass(agent + ': all ' + tools.length + ' tools valid');
    }
    dim2Results.push({
      agent,
      status: dim2Ok ? 'PASS' : 'FAIL',
      msg: dim2Ok ? 'all ' + tools.length + ' tools valid' : 'invalid tools found'
    });
  }

  // Dimension 3: Skill references
  let dim3Ok = true;
  const skills = Array.isArray(fm.skills) ? fm.skills : [];

  for (const skill of skills) {
    const skillDirPath = path.join(skillsDir, skill);
    const skillMd = path.join(skillDirPath, 'SKILL.md');

    if (!fs.existsSync(skillDirPath)) {
      dim3Ok = false;
      fail(agent + ': skill ' + skill + ' directory not found', 'Skill ' + skill + ' referenced by ' + agent + ' does not exist at .claude/skills/' + skill + '/');
    } else if (!fs.existsSync(skillMd)) {
      dim3Ok = false;
      fail(agent + ': skill ' + skill + ' has no SKILL.md', 'Create SKILL.md at .claude/skills/' + skill + '/SKILL.md');
    }
  }

  if (dim3Ok) {
    pass(agent + ': all ' + skills.length + ' skills exist');
  }
  dim3Results.push({
    agent,
    status: dim3Ok ? 'PASS' : 'FAIL',
    msg: dim3Ok ? 'all ' + skills.length + ' skills exist' : 'missing skills (see failures)'
  });

  // Dimension 4: Memory setup
  let dim4Ok = true;

  if (fm.memory === 'project') {
    const memoryFile = path.join(memoryDir, agent, 'MEMORY.md');
    if (!fs.existsSync(memoryFile)) {
      dim4Ok = false;
      fail(agent + ': MEMORY.md missing', 'Create MEMORY.md at .claude/agent-memory/' + agent + '/MEMORY.md');
    }
  }

  if (dim4Ok) {
    pass(agent + ': memory setup correct');
  }
  dim4Results.push({
    agent,
    status: dim4Ok ? 'PASS' : 'FAIL',
    msg: dim4Ok ? 'memory setup correct' : 'MEMORY.md missing'
  });
}

// Cross-consistency: CLAUDE.md agent reference table
const crossResults = [];

if (fs.existsSync(claudeMdPath)) {
  const claudeMd = fs.readFileSync(claudeMdPath, 'utf8');
  const tableAgents = [];
  const tableLines = claudeMd.split(/\r?\n/);
  for (const line of tableLines) {
    const tableMatch = line.match(/\|\s*@([\w-]+)\s*\|/);
    if (tableMatch) {
      tableAgents.push(tableMatch[1]);
    }
  }

  let claudeOk = true;

  for (const agent of EXPECTED_AGENTS) {
    if (!tableAgents.includes(agent)) {
      claudeOk = false;
      fail('CLAUDE.md table: missing @' + agent, 'Add @' + agent + ' to CLAUDE.md agent reference table');
    }
  }

  for (const tableAgent of tableAgents) {
    if (!EXPECTED_AGENTS.includes(tableAgent)) {
      const agentFile = path.join(agentsDir, tableAgent + '.md');
      if (!fs.existsSync(agentFile)) {
        claudeOk = false;
        fail('CLAUDE.md table: @' + tableAgent + ' has no agent file', 'Remove @' + tableAgent + ' from CLAUDE.md table -- no agent file exists');
      }
    }
  }

  if (claudeOk) {
    pass('CLAUDE.md table matches agent files');
  }
  crossResults.push({
    check: claudeOk ? 'CLAUDE.md table matches agent files' : 'CLAUDE.md table has mismatches',
    status: claudeOk ? 'PASS' : 'FAIL'
  });
} else {
  warn('CLAUDE.md not found -- skipping table cross-check');
  crossResults.push({ check: 'CLAUDE.md not found', status: 'WARN' });
}

// Cross-consistency: config.json agent_skills
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const agentSkills = config.agent_skills || {};

    let configOk = true;

    for (const agent of EXPECTED_AGENTS) {
      if (!agentSkills[agent]) {
        configOk = false;
        fail('config.json missing entry for ' + agent, 'Add ' + agent + ' entry to agent_skills in .planning/config.json');
        if (autoFix) {
          fixes.push({ type: 'config', agent });
        }
      }
    }

    if (configOk) {
      pass('config.json agent_skills has all 12 agents');
    }
    crossResults.push({
      check: configOk ? 'config.json has all 12 agents' : 'config.json has missing entries',
      status: configOk ? 'PASS' : 'FAIL'
    });
  } catch (e) {
    fail('config.json parse error', 'Fix JSON syntax in .planning/config.json: ' + e.message);
    crossResults.push({ check: 'config.json parse error', status: 'FAIL' });
  }
} else {
  warn('config.json not found -- skipping agent_skills cross-check');
  crossResults.push({ check: 'config.json not found', status: 'WARN' });
}

// Cross-consistency: Orphan detection
if (fs.existsSync(agentsDir)) {
  const agentFiles = fs.readdirSync(agentsDir).filter(function(f) { return f.endsWith('.md'); });
  for (const file of agentFiles) {
    const agentName = file.replace('.md', '');
    if (!EXPECTED_AGENTS.includes(agentName)) {
      warn('Orphan agent file: .claude/agents/' + file);
    }
  }
}

if (fs.existsSync(memoryDir)) {
  const memDirs = fs.readdirSync(memoryDir).filter(function(d) {
    return fs.statSync(path.join(memoryDir, d)).isDirectory();
  });
  for (const dir of memDirs) {
    if (!EXPECTED_AGENTS.includes(dir)) {
      warn('Orphan memory directory: .claude/agent-memory/' + dir + '/');
    }
  }
}

// Report output
console.log('');
console.log('=== Agent Audit Report ===');
console.log('');

console.log('--- Dimension 1: Required Fields ---');
for (const r of dim1Results) {
  console.log(r.status + '  ' + r.agent + ': ' + r.msg);
}
console.log('');

console.log('--- Dimension 2: Tool Scoping ---');
for (const r of dim2Results) {
  console.log(r.status + '  ' + r.agent + ': ' + r.msg);
}
console.log('');

console.log('--- Dimension 3: Skill References ---');
for (const r of dim3Results) {
  console.log(r.status + '  ' + r.agent + ': ' + r.msg);
}
console.log('');

console.log('--- Dimension 4: Memory Setup ---');
for (const r of dim4Results) {
  console.log(r.status + '  ' + r.agent + ': ' + r.msg);
}
console.log('');

console.log('--- Cross-Consistency ---');
for (const r of crossResults) {
  console.log(r.status + '  ' + r.check);
}

if (results.warn.length > 0) {
  console.log('');
  for (const w of results.warn) {
    console.log('WARN  ' + w);
  }
}

console.log('');
console.log('=== Summary ===');
console.log('Passed: ' + results.pass.length + '  Failed: ' + results.fail.length + '  Warnings: ' + results.warn.length);

if (results.fail.length > 0) {
  console.log('');
  console.log('--- Suggested Fixes ---');
  results.fail.forEach(function(f, i) {
    console.log((i + 1) + '. ' + f.fix);
  });
  console.log('');
  console.log('To auto-fix, re-run with --fix flag or tell Claude: "Apply audit fixes"');
}

// Exit code (without auto-fix)
if (!autoFix) {
  process.exit(results.fail.length > 0 ? 1 : 0);
}

// Auto-fix mode
if (autoFix && fixes.length > 0) {
  console.log('');
  console.log('=== Applying Auto-Fixes ===');
  let fixCount = 0;

  for (const fix of fixes) {
    if (fix.field) {
      const agentFile = path.join(agentsDir, fix.agent + '.md');
      if (!fs.existsSync(agentFile)) continue;

      let fileContent = fs.readFileSync(agentFile, 'utf8');
      const fmMatch = fileContent.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
      if (fmMatch) {
        const newFm = fmMatch[2] + '\n' + fix.field + ': ' + fix.value;
        fileContent = fmMatch[1] + newFm + fmMatch[3] + fileContent.slice(fmMatch[0].length);
        fs.writeFileSync(agentFile, fileContent, 'utf8');
        console.log('FIXED  ' + fix.agent + ': added ' + fix.field + ': ' + fix.value);
        fixCount++;
      }
    } else if (fix.type === 'config') {
      if (!fs.existsSync(configPath)) continue;
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.agent_skills) config.agent_skills = {};
        if (!config.agent_skills[fix.agent]) {
          config.agent_skills[fix.agent] = ['agent-protocols'];
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
          console.log('FIXED  config.json: added ' + fix.agent + ' to agent_skills');
          fixCount++;
        }
      } catch (e) {
        console.log('ERROR  config.json fix failed: ' + e.message);
      }
    }
  }

  console.log('');
  console.log('Applied ' + fixCount + ' fixes. Re-run audit to verify.');
} else if (autoFix) {
  console.log('');
  console.log('No auto-fixable issues found.');
}

process.exit(results.fail.length > 0 ? 1 : 0);

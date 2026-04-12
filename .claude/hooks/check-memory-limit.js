// .claude/hooks/check-memory-limit.js
// SubagentStop hook -- warns if agent MEMORY.md exceeds 200 lines
// Registered in .claude/settings.json alongside log-agent-complete.js

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Only check custom agents (skip built-in types)
    const agentType = data.agent_type || '';
    const builtIn = ['Explore', 'Plan', 'general-purpose', 'Bash'];
    if (!agentType || builtIn.includes(agentType)) {
      process.exit(0);
      return;
    }

    const projectDir = data.cwd
      || process.env.CLAUDE_PROJECT_DIR
      || path.resolve(__dirname, '..', '..');

    const memoryFile = path.join(
      projectDir, '.claude', 'agent-memory', agentType, 'MEMORY.md'
    );

    if (!fs.existsSync(memoryFile)) {
      process.exit(0);
      return;
    }

    const content = fs.readFileSync(memoryFile, 'utf8');
    const lineCount = content.split('\n').length;

    if (lineCount > 200) {
      // stdout output surfaces in the conversation context
      console.log(
        `WARNING: ${agentType} MEMORY.md is ${lineCount} lines (limit: 200). `
        + 'Content beyond line 200 is not auto-injected. Manual cleanup recommended.'
      );
    }
  } catch (err) {
    // Never block agent completion due to check failure
    process.stderr.write('Memory limit check error: ' + err.message + '\n');
  }
  process.exit(0);
});

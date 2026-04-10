// .claude/hooks/log-agent-dispatch.js
// PreToolUse hook on Agent tool -- logs dispatch start event
// Registered in .claude/settings.json with matcher: "Agent", async: true

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Only log custom agent dispatches (skip built-in types)
    const agentType = data.tool_input?.subagent_type || 'unknown';
    const builtIn = ['Explore', 'Plan', 'general-purpose', 'Bash'];
    if (builtIn.includes(agentType)) {
      process.exit(0);
      return;
    }

    const entry = {
      event: 'dispatch',
      timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
      session_id: data.session_id || null,
      agent_name: agentType,
      task: (data.tool_input?.prompt || '').slice(0, 200),
      agent_id: data.agent_id || null
    };

    // Use cwd from hook input, fall back to CLAUDE_PROJECT_DIR, then __dirname
    const projectDir = data.cwd
      || process.env.CLAUDE_PROJECT_DIR
      || path.resolve(__dirname, '..', '..');
    const logDir = path.resolve(projectDir, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'sessions.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // Never block agent dispatch due to logging failure
    process.stderr.write('Session log dispatch error: ' + err.message + '\n');
  }
  process.exit(0);
});

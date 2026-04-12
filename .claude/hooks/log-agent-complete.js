// .claude/hooks/log-agent-complete.js
// SubagentStop hook -- logs agent completion event
// Registered in .claude/settings.json (no matcher needed for SubagentStop)

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Only log custom agent completions (skip built-in types)
    const agentType = data.agent_type || 'unknown';
    const builtIn = ['Explore', 'Plan', 'general-purpose', 'Bash'];
    if (builtIn.includes(agentType)) {
      process.exit(0);
      return;
    }

    const entry = {
      event: 'complete',
      timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
      session_id: data.session_id || null,
      agent_name: agentType,
      agent_id: data.agent_id || null,
      outcome_summary: (data.last_assistant_message || '').slice(0, 300)
    };

    const projectDir = data.cwd
      || process.env.CLAUDE_PROJECT_DIR
      || path.resolve(__dirname, '..', '..');
    const logDir = path.resolve(projectDir, '.claude', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'sessions.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    process.stderr.write('Session log complete error: ' + err.message + '\n');
  }
  process.exit(0);
});

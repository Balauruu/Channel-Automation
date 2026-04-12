// .claude/hooks/check-definition-signals.js
// SubagentStop hook -- surfaces unresolved promotion:definition signals
// These signals require human review for agent definition changes
// Registered in .claude/settings.json alongside other SubagentStop hooks

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Only check after custom agent completions
    const agentType = data.agent_type || '';
    const builtIn = ['Explore', 'Plan', 'general-purpose', 'Bash'];
    if (!agentType || builtIn.includes(agentType)) {
      process.exit(0);
      return;
    }

    const projectDir = data.cwd
      || process.env.CLAUDE_PROJECT_DIR
      || path.resolve(__dirname, '..', '..');

    const signalsFile = path.join(projectDir, '.claude', 'feedback', 'signals.yaml');

    if (!fs.existsSync(signalsFile)) {
      process.exit(0);
      return;
    }

    const content = fs.readFileSync(signalsFile, 'utf8');

    // Parse signals using regex -- format is predictable YAML
    // Match blocks that have promotion: definition AND resolved: false
    const signalBlocks = content.split(/(?=^\s*- id:)/m).filter(b => b.trim());
    const unresolved = [];

    for (const block of signalBlocks) {
      const isDefinition = /promotion:\s*definition/.test(block);
      const isUnresolved = /resolved:\s*false/.test(block);

      if (isDefinition && isUnresolved) {
        const idMatch = block.match(/id:\s*(SIG-\d+)/);
        const insightMatch = block.match(/insight:\s*"?(.+?)"?\s*$/m);
        const sourceMatch = block.match(/source_agent:\s*(\S+)/);
        const domainMatch = block.match(/domain:\s*(\S+)/);

        if (idMatch && insightMatch) {
          unresolved.push({
            id: idMatch[1],
            insight: insightMatch[1],
            source: sourceMatch ? sourceMatch[1] : 'unknown',
            domain: domainMatch ? domainMatch[1] : 'unknown'
          });
        }
      }
    }

    if (unresolved.length > 0) {
      const lines = unresolved.map(
        s => `  ${s.id} (from ${s.source} -> ${s.domain}): ${s.insight}`
      );
      console.log(
        `PENDING DEFINITION SIGNALS: ${unresolved.length} unresolved signal(s) `
        + 'require agent definition changes. Review and resolve:\n'
        + lines.join('\n')
      );
    }
  } catch (err) {
    process.stderr.write('Definition signal check error: ' + err.message + '\n');
  }
  process.exit(0);
});

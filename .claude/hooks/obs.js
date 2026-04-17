// .claude/hooks/obs.js
// Single hook entrypoint for agent observability.
// Usage: node obs.js <event>
// where <event> ∈ {dispatch, tool_pre, tool_post, tool_fail, permission_denied, subagent_stop}

const fs = require('fs');
const path = require('path');

const BUILTIN_AGENT_TYPES = new Set(['Explore', 'Plan', 'general-purpose', 'Bash']);

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function resolveProjectDir(data) {
  return data.cwd
    || process.env.CLAUDE_PROJECT_DIR
    || path.resolve(__dirname, '..', '..');
}

function runsDir(projectDir) {
  const d = path.resolve(projectDir, '.claude', 'logs', 'runs');
  fs.mkdirSync(path.join(d, '.active'), { recursive: true });
  return d;
}

function pointerPath(projectDir, agentId) {
  return path.join(runsDir(projectDir), '.active', `${agentId}.ptr`);
}

function readPointer(projectDir, agentId) {
  const p = pointerPath(projectDir, agentId);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').trim();
}

function appendEvent(runFile, obj) {
  fs.appendFileSync(runFile, JSON.stringify(obj) + '\n', 'utf8');
}

function shouldSkip(data) {
  if (!data.agent_id) return true;
  const type = data.tool_input?.subagent_type || data.agent_type;
  if (type && BUILTIN_AGENT_TYPES.has(type)) return true;
  return false;
}

// --- Handlers (stubs — filled in subsequent tasks) ---

function handleDispatch(data) { /* Task 2 */ }
function handleToolPre(data) { /* Task 3 */ }
function handleToolPost(data) { /* Task 4 */ }
function handleToolFail(data) { /* Task 5 */ }
function handlePermissionDenied(data) { /* Task 6 */ }
function handleSubagentStop(data) { /* Task 7 */ }

const HANDLERS = {
  dispatch: handleDispatch,
  tool_pre: handleToolPre,
  tool_post: handleToolPost,
  tool_fail: handleToolFail,
  permission_denied: handlePermissionDenied,
  subagent_stop: handleSubagentStop
};

function main() {
  const event = process.argv[2];
  const handler = HANDLERS[event];

  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    try {
      const data = input ? JSON.parse(input) : {};
      if (!handler) { process.exit(0); return; }
      if (shouldSkip(data)) { process.exit(0); return; }
      handler(data);
    } catch (err) {
      process.stderr.write(`obs.js ${event || '?'} error: ${err.message}\n`);
    }
    process.exit(0);
  });
}

if (require.main === module) main();

module.exports = {
  // Exported for unit tests (populated in Task 7)
};

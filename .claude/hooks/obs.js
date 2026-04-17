// .claude/hooks/obs.js
// Single hook entrypoint for agent observability.
// Usage: node obs.js <event>
// where <event> ∈ {dispatch, tool_pre, tool_post, tool_fail, permission_denied, subagent_stop}

const fs = require('fs');
const path = require('path');

// Built-in agent types from Claude Code — skip logging for these.
// Note: 'Bash' is a tool name, not an agent type, so it's not included.
// The !data.agent_id guard in shouldSkip handles main-agent tool calls anyway.
const BUILTIN_AGENT_TYPES = new Set(['Explore', 'Plan', 'general-purpose']);

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

// Per-run hard size cap (takeaway #5). Default 100MB; tune via OBS_MAX_RUN_MB.
// Once exceeded, a single log_capped event is appended (via sidecar marker) and
// subsequent appends are silently dropped until a new run.
const MAX_RUN_BYTES = Math.max(1, parseInt(process.env.OBS_MAX_RUN_MB || '100', 10)) * 1024 * 1024;

function appendEvent(runFile, obj) {
  const capMarker = runFile + '.capped';
  if (fs.existsSync(capMarker)) return;
  try {
    const st = fs.statSync(runFile);
    if (st.size > MAX_RUN_BYTES) {
      fs.writeFileSync(capMarker, '');
      fs.appendFileSync(runFile,
        JSON.stringify({ ts: isoStamp(), event: 'log_capped', size_bytes: st.size, max_bytes: MAX_RUN_BYTES }) + '\n',
        'utf8');
      return;
    }
  } catch {}
  fs.appendFileSync(runFile, JSON.stringify(obj) + '\n', 'utf8');
}

// Annotate large string fields with `<key>_len` hints (takeaway #4) and
// optionally truncate them with head+tail preservation when OBS_TRUNCATE_KB is
// set (takeaway #3). Default: no truncation, hints only.
const LARGE_STRING_THRESHOLD = 10_000; // 10KB — threshold for _len annotation
const TRUNCATE_BYTES = Math.max(0, parseInt(process.env.OBS_TRUNCATE_KB || '0', 10)) * 1024;

function annotateLargeStrings(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(annotateLargeStrings);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.length >= LARGE_STRING_THRESHOLD) {
      if (TRUNCATE_BYTES > 0 && v.length > TRUNCATE_BYTES) {
        out[k] = v.slice(0, 200) + `...(${v.length} chars truncated)...` + v.slice(-50);
      } else {
        out[k] = v;
      }
      out[`${k}_len`] = v.length;
    } else if (v && typeof v === 'object') {
      out[k] = annotateLargeStrings(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function shouldSkip(data) {
  if (!data.agent_id) return true;
  const type = data.tool_input?.subagent_type || data.agent_type;
  if (type && BUILTIN_AGENT_TYPES.has(type)) return true;
  return false;
}

// --- Handlers (stubs — filled in subsequent tasks) ---

// Schema version — bump on breaking changes so consumers can handle migrations.
const SCHEMA_VER = 1;

function handleDispatch(data) {
  const projectDir = resolveProjectDir(data);
  const agentType = data.tool_input?.subagent_type || 'unknown';
  const agentId = data.agent_id;
  const ts = isoStamp();
  const runId = `${ts}__${agentType}__${agentId}`;
  const runFile = path.join(runsDir(projectDir), `${runId}.jsonl`);

  // Exclusive create — ms timestamp + agent_id makes collisions effectively impossible
  const fd = fs.openSync(runFile, 'ax');
  try {
    fs.writeSync(fd, JSON.stringify({
      ver: SCHEMA_VER,
      ts,
      event: 'dispatch',
      session_id: data.session_id || null,
      agent_type: agentType,
      agent_id: agentId,
      cwd: projectDir,
      prompt: data.tool_input?.prompt || ''
    }) + '\n');
  } finally {
    fs.closeSync(fd);
  }
  // Tool inputs/outputs may contain secrets. Restrict access. POSIX-only effect;
  // Windows ignores the mode but the call is harmless.
  try { fs.chmodSync(runFile, 0o600); } catch {}

  fs.writeFileSync(pointerPath(projectDir, agentId), runFile, 'utf8');
}
function handleToolPre(data) {
  const projectDir = resolveProjectDir(data);
  const runFile = readPointer(projectDir, data.agent_id);
  if (!runFile) return;  // silent per §6.2
  appendEvent(runFile, {
    ts: isoStamp(),
    event: 'tool_pre',
    tool: data.tool_name,
    tool_use_id: data.tool_use_id,
    input: annotateLargeStrings(data.tool_input || {})
  });
}
function handleToolPost(data) {
  const projectDir = resolveProjectDir(data);
  const runFile = readPointer(projectDir, data.agent_id);
  if (!runFile) return;
  appendEvent(runFile, {
    ts: isoStamp(),
    event: 'tool_post',
    tool: data.tool_name,
    tool_use_id: data.tool_use_id,
    duration_ms: null,  // populated by mergeAndFinalize in Task 7
    output: annotateLargeStrings(data.tool_response || {})
  });
}
function handleToolFail(data) {
  const projectDir = resolveProjectDir(data);
  const runFile = readPointer(projectDir, data.agent_id);
  if (!runFile) return;
  appendEvent(runFile, {
    ts: isoStamp(),
    event: 'tool_fail',
    tool: data.tool_name,
    tool_use_id: data.tool_use_id,
    duration_ms: null,
    error: data.error || data.tool_response?.error || '',
    interrupted: data.interrupted === true
  });
}
function handlePermissionDenied(data) {
  const projectDir = resolveProjectDir(data);
  const runFile = readPointer(projectDir, data.agent_id);
  if (!runFile) return;
  appendEvent(runFile, {
    ts: isoStamp(),
    event: 'permission_denied',
    tool: data.tool_name,
    tool_use_id: data.tool_use_id,
    input: annotateLargeStrings(data.tool_input || {}),
    reason: data.reason || ''
  });
}
function parseTranscriptAssistantTurns(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) return [];
  const lines = fs.readFileSync(transcriptPath, 'utf8')
    .split('\n').filter(Boolean);
  const turns = [];
  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    const msg = obj.message;
    if (!msg || msg.role !== 'assistant') continue;
    let text = '';
    let thinking = null;
    const content = Array.isArray(msg.content) ? msg.content : [];
    for (const block of content) {
      if (block.type === 'text') text += block.text || '';
      else if (block.type === 'thinking') {
        thinking = (thinking ?? '') + (block.thinking || '');
      }
    }
    turns.push({
      ts: (obj.timestamp || '').replace(/[:.]/g, '-'),
      text,
      thinking,
      usage: msg.usage || {},
      stop_reason: msg.stop_reason || null
    });
  }
  return turns;
}

const TERMINAL_STOP_REASONS = new Set(['tool_use', 'end_turn', 'stop_sequence', 'max_tokens']);

function classifyOutcome({ lastStopReason, stopHookActive, transcriptReadable }) {
  if (!transcriptReadable) return 'errored';
  if (stopHookActive === true) return 'stopped';
  if (lastStopReason === 'max_tokens') return 'stopped';
  if (lastStopReason && !TERMINAL_STOP_REASONS.has(lastStopReason)) return 'errored';
  return 'completed';
}

function tsDiffMs(aIso, bIso) {
  // Both are our colon-replaced ISO strings: 2026-04-17T10-00-01-500Z
  // Re-assemble into parseable form: 2026-04-17T10:00:01.500Z
  const reassemble = s => {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
    if (!m) return null;
    return `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`;
  };
  const a = Date.parse(reassemble(aIso));
  const b = Date.parse(reassemble(bIso));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return b - a;
}

function mergeAndFinalize({ runFile, transcriptPath, stopHookInput }) {
  // 1. Read tool events
  const rawLines = fs.readFileSync(runFile, 'utf8').split('\n').filter(Boolean);
  const toolEvents = rawLines.map(l => JSON.parse(l));

  // 2. Parse transcript into assistant_message events
  const turns = parseTranscriptAssistantTurns(transcriptPath);
  const transcriptReadable = fs.existsSync(transcriptPath) && turns.length > 0;
  const messages = turns.map(t => ({
    ts: t.ts,
    event: 'assistant_message',
    text: t.text,
    thinking: t.thinking,
    input_tokens: t.usage.input_tokens ?? null,
    output_tokens: t.usage.output_tokens ?? null,
    cache_read_input_tokens: t.usage.cache_read_input_tokens ?? null,
    cache_creation_input_tokens: t.usage.cache_creation_input_tokens ?? null,
    stop_reason: t.stop_reason
  }));

  // 3. Merge sort — stable by ts, ties preserve original order
  const tagged = [
    ...toolEvents.map((e, i) => ({ e, order: i, group: 0 })),
    ...messages.map((e, i) => ({ e, order: i, group: 1 }))
  ];
  tagged.sort((a, b) => {
    if (a.e.ts < b.e.ts) return -1;
    if (a.e.ts > b.e.ts) return 1;
    if (a.group !== b.group) return a.group - b.group;
    return a.order - b.order;
  });
  const merged = tagged.map(t => t.e);

  // 4. Compute durations — match tool_post/tool_fail to preceding tool_pre by tool_use_id
  const preTs = new Map();
  for (const ev of merged) {
    if (ev.event === 'tool_pre') {
      preTs.set(ev.tool_use_id, ev.ts);
    } else if (ev.event === 'tool_post' || ev.event === 'tool_fail') {
      const start = preTs.get(ev.tool_use_id);
      ev.duration_ms = start ? tsDiffMs(start, ev.ts) : null;
    }
  }

  // 5. Aggregates
  const toolCalls = merged.filter(e => e.event === 'tool_post' || e.event === 'tool_fail').length;
  const toolFails = merged.filter(e => e.event === 'tool_fail').length;
  const permissionDenials = merged.filter(e => e.event === 'permission_denied').length;
  const logCapped = merged.some(e => e.event === 'log_capped');
  const lastTurn = messages[messages.length - 1] || null;
  const lastStopReason = lastTurn?.stop_reason || null;
  const totalOutputTokens = messages.reduce((s, m) => s + (m.output_tokens || 0), 0);
  const dispatch = merged.find(e => e.event === 'dispatch');
  const completeTs = isoStamp();
  const duration_ms = dispatch ? tsDiffMs(dispatch.ts, completeTs) : null;

  const outcome = classifyOutcome({
    lastStopReason,
    stopHookActive: stopHookInput?.stop_hook_active === true,
    transcriptReadable
  });

  merged.push({
    ts: completeTs,
    event: 'complete',
    duration_ms,
    tool_calls: toolCalls,
    tool_fails: toolFails,
    permission_denials: permissionDenials,
    last_turn_input_tokens: lastTurn?.input_tokens ?? null,
    last_turn_output_tokens: lastTurn?.output_tokens ?? null,
    total_output_tokens: totalOutputTokens,
    log_capped: logCapped,
    outcome
  });

  // 6. Atomic rewrite: tmp + rename
  const tmp = runFile + '.tmp';
  fs.writeFileSync(tmp, merged.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  fs.renameSync(tmp, runFile);
}

// §6.8: sweeps orphan .tmp files left by crashed previous runs.
// Uses a time-based filter: anything with mtime older than ORPHAN_STALE_MS is
// definitely orphaned (a live rewrite completes in milliseconds). This is
// race-safe under §6.6 parallel dispatch — a parallel agent's in-flight .tmp
// is always very recent and is never swept.
const ORPHAN_STALE_MS = 60_000;
function sweepOrphanTmpFiles(projectDir) {
  const d = runsDir(projectDir);
  const now = Date.now();
  for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.jsonl.tmp')) continue;
    const full = path.join(d, f);
    try {
      const stat = fs.statSync(full);
      if (now - stat.mtimeMs > ORPHAN_STALE_MS) fs.unlinkSync(full);
    } catch {}
  }
}

function handleSubagentStop(data) {
  const projectDir = resolveProjectDir(data);
  const runFile = readPointer(projectDir, data.agent_id);
  if (!runFile || !fs.existsSync(runFile)) return;
  sweepOrphanTmpFiles(projectDir);
  mergeAndFinalize({
    runFile,
    transcriptPath: data.agent_transcript_path || '',
    stopHookInput: { stop_hook_active: data.stop_hook_active === true }
  });
  try { fs.unlinkSync(pointerPath(projectDir, data.agent_id)); } catch {}
  try { fs.unlinkSync(runFile + '.capped'); } catch {}
}

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
  mergeAndFinalize,
  classifyOutcome,
  parseTranscriptAssistantTurns
};

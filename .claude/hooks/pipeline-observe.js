// .claude/hooks/pipeline-observe.js
// Captures Claude Code tool events to per-project obs.jsonl files.
// Registered in .claude/settings.json for: PreToolUse, PostToolUse,
// PostToolUseFailure, PermissionDenied, SubagentStop
// Run: node pipeline-observe.js <event_type>
//
// Atomicity: uses fs.appendFileSync() for single-write-syscall JSONL lines.
// On NTFS (Windows 10.0.14393+), single writes up to 1MB are atomic.
// If ported to POSIX, cap lines at 4KB (PIPE_BUF) or use flock.

'use strict';

const fs = require('fs');
const path = require('path');

// ── Constants ────────────────────────────────────────────────────────────────

const HOOK_EVENT = process.argv[2] || 'unknown';
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const OBS_BASE = path.join(PROJECT_ROOT, '.claude', 'logs', 'observations');
const MAX_SIZE = 10 * 1024 * 1024; // 10MB rotation threshold
const PURGE_DAYS = 30;
const PURGE_MS = PURGE_DAYS * 24 * 60 * 60 * 1000;

// ── SubagentStop caps per D-09, D-10 ────────────────────────────────────────

const THINKING_CAP = 10240; // 10KB per turn for thinking blocks (D-10)
const TEXT_CAP = 10240;     // 10KB per turn for assistant text
const PROMPT_CAP = 2048;    // 2KB for dispatch prompt (D-09 Agent input cap)

// ── Truncation caps per D-09 ─────────────────────────────────────────────────

const TRUNCATION_CAPS = {
  Read:  { input: 1024, output: 1024 },
  Grep:  { input: 1024, output: 1024 },
  Glob:  { input: 1024, output: 1024 },
  Bash:  { input: 5120, output: 5120 },
  Write: { input: 5120, output: 5120 },
  Edit:  { input: 5120, output: 5120 },
  Agent: { input: 2048, output: 5120 },
};
const DEFAULT_CAP = { input: 2048, output: 2048 };

// ── Stdin buffering ──────────────────────────────────────────────────────────

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    if (!input.trim()) {
      process.exit(0);
      return;
    }
    const data = JSON.parse(input);
    main(data);
  } catch (err) {
    process.stderr.write('[pipeline-observe] ' + err.message + '\n');
  }
  process.exit(0);
});

// ── Main entry ───────────────────────────────────────────────────────────────

function main(data) {
  const project = detectProject(data);
  const projectDir = path.join(OBS_BASE, project);
  fs.mkdirSync(projectDir, { recursive: true });

  const obsFile = path.join(projectDir, 'obs.jsonl');
  const archiveDir = path.join(projectDir, 'obs.archive');

  rotateIfNeeded(obsFile, archiveDir);
  purgeOldArchives(projectDir);

  switch (HOOK_EVENT) {
    case 'tool_pre':
    case 'tool_post':
    case 'tool_fail':
    case 'permission_denied':
      handleToolEvent(data, obsFile);
      break;
    case 'subagent_stop':
      handleSubagentStop(data, obsFile, project);
      break;
    default:
      // Unknown event -- no-op, never block
      break;
  }
}

// ── Project slug detection ───────────────────────────────────────────────────

function detectProject(data) {
  const sources = [
    data.cwd || '',
    JSON.stringify(data.tool_input || {}),
    data.prompt || '',
    data.agent_transcript_path || '',
  ];
  const re = /projects[/\\]([a-z0-9][a-z0-9-]*)/i;
  for (const s of sources) {
    const m = s.match(re);
    if (m) return m[1].toLowerCase();
  }
  return '_channel';
}

// ── File rotation (10MB) ─────────────────────────────────────────────────────

function rotateIfNeeded(obsFile, archiveDir) {
  try {
    const stat = fs.statSync(obsFile);
    if (stat.size >= MAX_SIZE) {
      fs.mkdirSync(archiveDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveName = 'obs-' + ts + '-' + process.pid + '.jsonl';
      fs.renameSync(obsFile, path.join(archiveDir, archiveName));
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      process.stderr.write('[pipeline-observe] rotation error: ' + err.message + '\n');
    }
    // ENOENT: file doesn't exist yet -- nothing to rotate
  }
}

// ── Archive purge (30 days, throttled to once per day) ───────────────────────

function purgeOldArchives(projectDir) {
  try {
    const purgeMarker = path.join(projectDir, '.last-purge');
    const archiveDir = path.join(projectDir, 'obs.archive');

    // Throttle: skip if marker was touched less than 24 hours ago
    try {
      const markerStat = fs.statSync(purgeMarker);
      if (Date.now() - markerStat.mtimeMs < 24 * 60 * 60 * 1000) {
        return;
      }
    } catch (e) {
      // Marker doesn't exist -- proceed with purge
    }

    // Scan archive directory for old files
    let entries;
    try {
      entries = fs.readdirSync(archiveDir);
    } catch (e) {
      // Archive directory doesn't exist -- nothing to purge
      // Touch marker so we don't re-check until tomorrow
      fs.writeFileSync(purgeMarker, '', 'utf8');
      return;
    }

    const cutoff = Date.now() - PURGE_MS;
    for (const entry of entries) {
      if (!entry.endsWith('.jsonl')) continue;
      const filePath = path.join(archiveDir, entry);
      try {
        const fileStat = fs.statSync(filePath);
        if (fileStat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // File removed by another process or permission error -- skip
      }
    }

    // Touch marker
    fs.writeFileSync(purgeMarker, '', 'utf8');
  } catch (err) {
    // Purge failure must never block hook execution
    process.stderr.write('[pipeline-observe] purge error: ' + err.message + '\n');
  }
}

// ── Tool event handler ───────────────────────────────────────────────────────

function handleToolEvent(data, obsFile) {
  const tool = data.tool_name || data.tool || 'unknown';
  const caps = TRUNCATION_CAPS[tool] || DEFAULT_CAP;

  const event = {
    ts: new Date().toISOString().replace(/[:.]/g, '-'),
    epoch_ms: Date.now(),
    event: HOOK_EVENT,
    session_id: data.session_id || '',
    agent_id: data.agent_id || '',
    tool: tool,
    tool_use_id: data.tool_use_id || '',
    project: detectProject(data),
  };

  switch (HOOK_EVENT) {
    case 'tool_pre':
      event.input = truncate(
        JSON.stringify(data.tool_input || {}),
        caps.input
      );
      break;
    case 'tool_post':
      event.output = truncate(
        JSON.stringify(data.tool_response || data.tool_output || data.output || ''),
        caps.output
      );
      break;
    case 'tool_fail':
      event.output = truncate(
        JSON.stringify(data.tool_response || data.tool_output || ''),
        caps.output
      );
      event.error = truncate(String(data.error || ''), 2048);
      break;
    case 'permission_denied':
      event.input = truncate(
        JSON.stringify(data.tool_input || {}),
        caps.input
      );
      event.reason = truncate(String(data.reason || ''), 1024);
      break;
  }

  appendEvent(obsFile, event);
}

// ── SubagentStop handler (CAPT-03) ──────────────────────────────────────────

function handleSubagentStop(data, obsFile, project) {
  const agentId = data.agent_id || '';
  const agentType = data.agent_type || '';
  const sessionId = data.session_id || '';
  const tpath = data.agent_transcript_path || '';
  const now = Date.now();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');

  // --- Parse transcript ---
  let firstUserPrompt = '';
  const assistantTurns = [];

  if (tpath && fs.existsSync(tpath)) {
    try {
      const lines = fs.readFileSync(tpath, 'utf8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        let obj;
        try { obj = JSON.parse(line); } catch (e) { continue; }
        const msg = obj.message || {};
        const role = msg.role;

        if (role === 'user' && !firstUserPrompt) {
          const content = msg.content;
          if (typeof content === 'string') {
            firstUserPrompt = content;
          } else if (Array.isArray(content)) {
            firstUserPrompt = content
              .filter(b => b && b.type === 'text')
              .map(b => b.text || '')
              .join('');
          }
        } else if (role === 'assistant') {
          let text = '';
          let thinking = '';
          for (const block of (msg.content || [])) {
            if (!block || typeof block !== 'object') continue;
            if (block.type === 'text') text += (block.text || '');
            else if (block.type === 'thinking') thinking += (block.thinking || '');
          }
          assistantTurns.push({
            text: truncate(text, TEXT_CAP),
            thinking: truncate(thinking, THINKING_CAP),
            inputTokens: obj.inputTokens || 0,
            outputTokens: obj.outputTokens || 0,
            stopReason: obj.stopReason || '',
          });
        }
      }
    } catch (err) {
      process.stderr.write('[pipeline-observe] transcript read error: ' + err.message + '\n');
    }
  }

  // --- Compute durations (CAPT-05) ---
  const durations = computeDurations(obsFile, agentId);

  // --- Scan obs.jsonl for agent's prior events (aggregates) ---
  let toolCalls = 0;
  let toolFails = 0;
  let permDenials = 0;
  let totalOutputTokens = 0;
  try {
    if (fs.existsSync(obsFile)) {
      const existingLines = fs.readFileSync(obsFile, 'utf8').split('\n');
      for (const l of existingLines) {
        if (!l.trim()) continue;
        try {
          const ev = JSON.parse(l);
          if (ev.agent_id !== agentId) continue;
          if (ev.event === 'tool_post' || ev.event === 'tool_fail') toolCalls++;
          if (ev.event === 'tool_fail') toolFails++;
          if (ev.event === 'permission_denied') permDenials++;
        } catch (e) { /* skip invalid lines */ }
      }
    }
  } catch (err) {
    process.stderr.write('[pipeline-observe] aggregate scan error: ' + err.message + '\n');
  }

  // --- Synthesize dispatch event ---
  const dispatchEvent = {
    ts: ts,
    epoch_ms: now,
    event: 'dispatch',
    session_id: sessionId,
    agent_id: agentId,
    agent_type: agentType,
    project: project,
    prompt: truncate(firstUserPrompt, PROMPT_CAP),
    cwd: data.cwd || '',
  };
  appendEvent(obsFile, dispatchEvent);

  // --- Synthesize assistant_message events ---
  for (const turn of assistantTurns) {
    const amEvent = {
      ts: ts,
      epoch_ms: now,
      event: 'assistant_message',
      session_id: sessionId,
      agent_id: agentId,
      project: project,
      text: turn.text,
      thinking: turn.thinking,
      input_tokens: turn.inputTokens,
      output_tokens: turn.outputTokens,
      stop_reason: turn.stopReason,
    };
    appendEvent(obsFile, amEvent);
    totalOutputTokens += turn.outputTokens;
  }

  // --- Synthesize complete event ---
  const completeEvent = {
    ts: ts,
    epoch_ms: now,
    event: 'complete',
    session_id: sessionId,
    agent_id: agentId,
    agent_type: agentType,
    project: project,
    outcome: data.outcome || 'completed',
    tool_calls: toolCalls,
    tool_fails: toolFails,
    permission_denials: permDenials,
    total_output_tokens: totalOutputTokens || (data.total_output_tokens || 0),
    durations: durations,
  };
  appendEvent(obsFile, completeEvent);
}

// ── Per-tool duration computation (CAPT-05) ─────────────────────────────────

function computeDurations(obsFile, agentId) {
  const durations = {};
  try {
    if (!fs.existsSync(obsFile)) return durations;
    const lines = fs.readFileSync(obsFile, 'utf8').split('\n');
    const preEvents = {}; // tool_use_id -> epoch_ms

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.agent_id !== agentId) continue;
        if (ev.event === 'tool_pre') {
          preEvents[ev.tool_use_id] = ev.epoch_ms;
        } else if (ev.event === 'tool_post' && preEvents[ev.tool_use_id]) {
          durations[ev.tool_use_id] = ev.epoch_ms - preEvents[ev.tool_use_id];
          delete preEvents[ev.tool_use_id];
        }
      } catch (e) { /* skip invalid lines */ }
    }
  } catch (err) {
    process.stderr.write('[pipeline-observe] duration compute error: ' + err.message + '\n');
  }
  return durations;
}

// ── Truncation utility ───────────────────────────────────────────────────────

function truncate(str, maxBytes) {
  if (!str) return '';
  if (typeof str !== 'string') str = String(str);
  return str.length > maxBytes ? str.slice(0, maxBytes) : str;
}

// ── Atomic JSONL append (CAPT-04) ────────────────────────────────────────────

function appendEvent(filePath, eventObj) {
  const line = JSON.stringify(eventObj) + '\n';
  fs.appendFileSync(filePath, line, 'utf8');
}

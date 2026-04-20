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
      // SubagentStop handler added in Plan 02
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

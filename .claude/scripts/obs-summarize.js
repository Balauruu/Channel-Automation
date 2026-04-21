#!/usr/bin/env node
// .claude/scripts/obs-summarize.js
// Compress a single agent-observability run file into a ~2-5KB markdown summary.
//
// Usage:
//   node .claude/scripts/obs-summarize.js <run-file-or-agent-id-prefix>
//
// When given a full path, summarizes that file. When given a prefix that
// matches uniquely one file in .claude/logs/observations/<project>/obs.jsonl, summarizes that. When
// called with no args and the observations dir exists, summarizes the most recent.
//
// Output sections:
//   - Header (agent, outcome, duration, totals)
//   - Top 5 slowest tool calls
//   - All failures
//   - All permission denials
//   - Agent reasoning timeline (one-line summary per turn)
//   - Extended thinking (first 200 chars of each turn that has it)
//   - Warnings (log_capped, errored)
//
// Budget: target <5KB markdown regardless of input size. Use truncation +
// "N more" footers rather than dumping the whole file.

const fs = require('fs');
const path = require('path');

const REASON_MAX_CHARS = 120;   // one-line summary per assistant turn
const THINKING_MAX_CHARS = 200; // per turn
const LIST_MAX = 10;            // cap per list section

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function resolveObsFile(arg) {
  const obsDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || '.', '.claude', 'logs', 'observations');
  if (!arg) {
    if (!fs.existsSync(obsDir)) throw new Error(`no observations dir at ${obsDir}`);
    const projects = fs.readdirSync(obsDir).filter(f => fs.statSync(path.join(obsDir, f)).isDirectory());
    if (!projects.length) throw new Error(`no project dirs in ${obsDir}`);
    // Pick the most recently modified project subdirectory
    projects.sort((a, b) => fs.statSync(path.join(obsDir, b, 'obs.jsonl')).mtimeMs - fs.statSync(path.join(obsDir, a, 'obs.jsonl')).mtimeMs);
    return path.join(obsDir, projects[0], 'obs.jsonl');
  }
  if (fs.existsSync(arg) && fs.statSync(arg).isFile()) return path.resolve(arg);
  if (!fs.existsSync(obsDir)) throw new Error(`no observations dir at ${obsDir}`);
  const matches = fs.readdirSync(obsDir).filter(f => f.includes(arg) && fs.existsSync(path.join(obsDir, f, 'obs.jsonl')));
  if (matches.length === 0) throw new Error(`no project matches "${arg}" in ${obsDir}`);
  if (matches.length > 1) throw new Error(`"${arg}" matches ${matches.length} projects; be more specific`);
  return path.join(obsDir, matches[0], 'obs.jsonl');
}

function firstLine(s, max) {
  if (!s) return '';
  const clean = s.split(/\r?\n/).map(l => l.trim()).find(l => l.length > 0) || '';
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1) + '…';
}

function prettyMs(ms) {
  if (ms === null || ms === undefined) return '?';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`;
  return `${Math.floor(ms/60000)}m${Math.floor((ms%60000)/1000)}s`;
}

function inputPreview(tool, input) {
  if (!input || typeof input !== 'object') return '';
  if (tool === 'Bash') return (input.command || '').slice(0, 80);
  if (tool === 'Read' || tool === 'Edit' || tool === 'Write') return input.file_path || '';
  if (tool === 'Grep') return (input.pattern || '').slice(0, 60);
  if (tool === 'Glob') return (input.pattern || '').slice(0, 60);
  // fallback: first string-valued field
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' && v.length > 0) return `${k}=${v.slice(0, 60)}`;
  }
  return '';
}

function summarize(runFile) {
  const events = readJsonl(runFile);
  if (!events.length) {
    return `# Empty run file\n\nFile: \`${runFile}\`\n`;
  }

  const dispatch = events.find(e => e.event === 'dispatch') || {};
  const complete = events.find(e => e.event === 'complete') || {};
  const messages = events.filter(e => e.event === 'assistant_message');
  const toolPre = events.filter(e => e.event === 'tool_pre');
  const toolPost = events.filter(e => e.event === 'tool_post');
  const toolFail = events.filter(e => e.event === 'tool_fail');
  const permDenied = events.filter(e => e.event === 'permission_denied');
  const capped = events.some(e => e.event === 'log_capped');

  // Pair tool_post/tool_fail back to tool_pre inputs by tool_use_id
  const preByUse = new Map();
  for (const p of toolPre) preByUse.set(p.tool_use_id, p);

  const out = [];

  // --- Header ---
  const outcome = complete.outcome || '(in progress)';
  const outcomeIcon = outcome === 'completed' ? 'OK'
                    : outcome === 'stopped' ? 'STOPPED'
                    : outcome === 'errored' ? 'ERRORED'
                    : outcome;
  out.push(`# Run summary`);
  out.push('');
  out.push(`- **Agent:** \`${dispatch.agent_type || '?'}\` (id: \`${dispatch.agent_id || '?'}\`)`);
  out.push(`- **Outcome:** ${outcomeIcon}`);
  out.push(`- **Duration:** ${prettyMs(complete.duration_ms)}`);
  out.push(`- **Tool calls:** ${complete.tool_calls ?? toolPost.length + toolFail.length} (fails: ${complete.tool_fails ?? toolFail.length}, denied: ${complete.permission_denials ?? permDenied.length})`);
  out.push(`- **Tokens:** last_input=${complete.last_turn_input_tokens ?? '?'}, total_output=${complete.total_output_tokens ?? '?'}`);
  out.push(`- **File:** \`${path.basename(runFile)}\``);
  if (capped || complete.log_capped) out.push(`- **WARNING:** log was capped — events after the cap are missing`);
  if (outcome === 'errored') out.push(`- **WARNING:** outcome is errored — see failures + last assistant turn`);
  out.push('');

  // --- Dispatch prompt (truncated) ---
  if (dispatch.prompt) {
    out.push(`## Dispatch prompt`);
    out.push('');
    const lines = dispatch.prompt.split('\n').slice(0, 3);
    out.push('```');
    for (const l of lines) out.push(l.length > 140 ? l.slice(0, 140) + '…' : l);
    if (dispatch.prompt.split('\n').length > 3) out.push('...');
    out.push('```');
    out.push('');
  }

  // --- Top 5 slowest tools ---
  const byDuration = [...toolPost, ...toolFail]
    .filter(e => typeof e.duration_ms === 'number')
    .sort((a, b) => b.duration_ms - a.duration_ms)
    .slice(0, 5);
  if (byDuration.length) {
    out.push(`## Slowest tool calls`);
    out.push('');
    for (const e of byDuration) {
      const pre = preByUse.get(e.tool_use_id);
      const preview = pre ? inputPreview(e.tool, pre.input) : '';
      const tag = e.event === 'tool_fail' ? ' [FAILED]' : '';
      out.push(`- \`${e.tool}\` ${prettyMs(e.duration_ms)}${tag} — ${preview}`);
    }
    out.push('');
  }

  // --- Failures ---
  if (toolFail.length) {
    out.push(`## Failures (${toolFail.length})`);
    out.push('');
    for (const f of toolFail.slice(0, LIST_MAX)) {
      const pre = preByUse.get(f.tool_use_id);
      const preview = pre ? inputPreview(f.tool, pre.input) : '';
      const err = firstLine(f.error, 100);
      out.push(`- \`${f.tool}\` — ${err}${preview ? ` (${preview})` : ''}`);
    }
    if (toolFail.length > LIST_MAX) out.push(`- ...and ${toolFail.length - LIST_MAX} more`);
    out.push('');
  }

  // --- Permission denials ---
  if (permDenied.length) {
    out.push(`## Permission denials (${permDenied.length})`);
    out.push('');
    for (const p of permDenied.slice(0, LIST_MAX)) {
      const preview = inputPreview(p.tool, p.input);
      out.push(`- \`${p.tool}\` — ${p.reason || '(no reason)'}${preview ? ` — ${preview}` : ''}`);
    }
    if (permDenied.length > LIST_MAX) out.push(`- ...and ${permDenied.length - LIST_MAX} more`);
    out.push('');
  }

  // --- Agent reasoning timeline ---
  if (messages.length) {
    out.push(`## Reasoning timeline (${messages.length} turns)`);
    out.push('');
    const shown = messages.slice(0, 15);
    for (let i = 0; i < shown.length; i++) {
      const m = shown[i];
      out.push(`${i + 1}. [${m.stop_reason}] ${firstLine(m.text, REASON_MAX_CHARS)}`);
    }
    if (messages.length > 15) out.push(`_(...${messages.length - 15} more turns)_`);
    out.push('');
  }

  // --- Extended thinking (if any) ---
  const withThinking = messages.filter(m => m.thinking && m.thinking.length > 0);
  if (withThinking.length) {
    out.push(`## Extended thinking (${withThinking.length} turns)`);
    out.push('');
    for (let i = 0; i < Math.min(withThinking.length, 5); i++) {
      const m = withThinking[i];
      const idx = messages.indexOf(m) + 1;
      out.push(`**Turn ${idx}:** ${firstLine(m.thinking, THINKING_MAX_CHARS)}`);
      out.push('');
    }
    if (withThinking.length > 5) out.push(`_(...${withThinking.length - 5} more turns with thinking)_`);
    out.push('');
  }

  return out.join('\n');
}

function main() {
  const arg = process.argv[2];
  try {
    const runFile = resolveObsFile(arg);
    process.stdout.write(summarize(runFile));
  } catch (err) {
    process.stderr.write(`obs-summarize error: ${err.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { summarize, resolveObsFile };

---
name: agent-observability
description: Use when debugging a subagent run — "why did agent X produce wrong output", "which tool call was slow", "what permission was denied", or "what did the agent reason about before calling that tool". Reads logs from .claude/logs/runs/.
---

# Agent Observability

## Overview

Every custom subagent dispatch writes one JSONL file to `.claude/logs/runs/`. Read it top-to-bottom for a chronological replay of the full run: tool calls with inputs, outputs, and durations; failures; permission denials; the agent's own assistant text and extended thinking — all interleaved in timestamp order.

**Primary use case:** open `.claude/logs/runs/<run>.jsonl` and find out exactly what the agent did and why it produced a given output.

## When to Use

- "Why did @researcher return X instead of Y?"
- "Which tool call took the most time in that run?"
- "What permission was denied and why did the agent stop?"
- "What was the agent reasoning about just before it called that tool?"
- Any post-mortem on a subagent run that produced unexpected output

**Not for:** top-level (non-subagent) tool call tracing — only dispatched custom subagents are logged.

## What Gets Logged

| Event | When emitted |
|-------|-------------|
| `dispatch` | First line — agent type, session ID, full dispatch prompt |
| `tool_pre` | Before every tool call — tool name, input, `tool_use_id` |
| `tool_post` | After tool success — output, `duration_ms` |
| `tool_fail` | After tool failure — error message, `interrupted` flag, `duration_ms` |
| `permission_denied` | When a tool call is blocked — tool input, denial reason |
| `assistant_message` | Merged from agent transcript at SubagentStop — text, thinking, per-turn token usage, `stop_reason` |
| `complete` | Last line — aggregated counts, token summary, `outcome` |

## Schema

Every line is a self-contained JSON object. Base fields on every event: `ts` (colon-replaced ISO, e.g. `2026-04-17T14-22-30-123Z`), `event`.

### dispatch
```json
{
  "ts": "2026-04-17T14-22-30-123Z",
  "event": "dispatch",
  "session_id": "bb5cdf28-...",
  "agent_type": "researcher",
  "agent_id": "a3f67b0",
  "cwd": "D:/Youtube/...",
  "prompt": "<full dispatch prompt text>"
}
```

### tool_pre
```json
{
  "ts": "...",
  "event": "tool_pre",
  "tool": "Bash",
  "tool_use_id": "toolu_01ABC...",
  "input": { "command": "ls -la" }
}
```

### tool_post
```json
{
  "ts": "...",
  "event": "tool_post",
  "tool": "Bash",
  "tool_use_id": "toolu_01ABC...",
  "duration_ms": 2310,
  "output": { "stdout": "...", "exit_code": 0 }
}
```
`duration_ms` is computed at SubagentStop by matching `tool_use_id` against the preceding `tool_pre`. `null` if the matching `tool_pre` was not recorded.

### tool_fail
```json
{
  "ts": "...",
  "event": "tool_fail",
  "tool": "Bash",
  "tool_use_id": "toolu_01ABC...",
  "duration_ms": 180,
  "error": "Command timed out after 120000ms",
  "interrupted": false
}
```

### permission_denied
```json
{
  "ts": "...",
  "event": "permission_denied",
  "tool": "Bash",
  "tool_use_id": "toolu_01XYZ...",
  "input": { "command": "rm -rf /" },
  "reason": "classifier: write to .env"
}
```

### assistant_message
```json
{
  "ts": "...",
  "event": "assistant_message",
  "text": "I'll start by reading the metadata file...",
  "thinking": null,
  "input_tokens": 12034,
  "output_tokens": 487,
  "cache_read_input_tokens": 10200,
  "cache_creation_input_tokens": 0,
  "stop_reason": "tool_use"
}
```
`thinking` is a string when extended thinking is present for that turn, `null` otherwise. `stop_reason` is the SDK field preserved verbatim (`tool_use`, `end_turn`, `stop_sequence`, `max_tokens`, or any non-standard value).

### complete
```json
{
  "ts": "...",
  "event": "complete",
  "duration_ms": 318500,
  "tool_calls": 14,
  "tool_fails": 0,
  "permission_denials": 0,
  "last_turn_input_tokens": 184321,
  "last_turn_output_tokens": 9842,
  "total_output_tokens": 28140,
  "outcome": "completed"
}
```

## Reading Token Numbers Correctly

`complete` does NOT report `total_input_tokens`. Summing `input_tokens` across turns double-counts the cached context prefix that appears every turn — the number would be misleading.

Use instead:
- `last_turn_input_tokens` — the final assistant turn's `input_tokens`. Answers "how large did the context window get?"
- `total_output_tokens` — summed across all turns. Output tokens don't overlap; this is the billed new-content figure.

## Outcome Values

`outcome` in `complete` is one of:

| Value | Meaning |
|-------|---------|
| `completed` | Agent finished normally (`end_turn` or `stop_sequence`) |
| `stopped` | Hit `max_tokens` OR `stop_hook_active: true` at SubagentStop |
| `errored` | Unreadable/empty transcript, or last `stop_reason` is not in `{tool_use, end_turn, stop_sequence, max_tokens}` |

**Important:** transient `tool_fail` events do NOT force `errored`. An agent that hit a timeout, retried, and finished is `completed`. The `tool_fails` count in `complete` exposes the failure count for anyone who cares.

## File Layout

```
.claude/logs/runs/
├── .active/                        # ephemeral; cleared at SubagentStop
│   └── <agent_id>.ptr              # absolute path to the in-progress run file
└── <iso_ts>__<agent_type>__<agent_id>.jsonl
```

Files are created at dispatch and finalized (chronologically rewritten, `complete` appended) when the agent's `SubagentStop` hook fires. The rewrite is atomic: a `.tmp` file is written then renamed.

## Canonical settings.json Hook Block

This is the source of truth for Task 9. Six registrations, all pointing at `obs.js` with the event as `argv[2]`.

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": [{
          "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/obs.js dispatch",
          "timeout": 5,
          "async": true
        }]
      },
      {
        "matcher": "*",
        "hooks": [{
          "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/obs.js tool_pre",
          "timeout": 5,
          "async": true
        }]
      }
    ],
    "PostToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/obs.js tool_post",
        "timeout": 5,
        "async": true
      }]
    }],
    "PostToolUseFailure": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/obs.js tool_fail",
        "timeout": 5,
        "async": true
      }]
    }],
    "PermissionDenied": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/obs.js permission_denied",
        "timeout": 5,
        "async": true
      }]
    }],
    "SubagentStop": [{
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/obs.js subagent_stop",
        "timeout": 15
      }]
    }]
  }
}
```

`subagent_stop` is **synchronous** (no `async: true`). The chronological rewrite must complete before the run file is considered final. All other hooks are async.

## Debug Recipes

### Wrong output — cross-reference tool outputs with agent reasoning

Find the `tool_post` that returned unexpected data, then read the `assistant_message` that follows it to see what the agent concluded from that output.

```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/runs/<run>.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.event === 'tool_post' || e.event === 'assistant_message')
  .forEach(e => console.log(e.ts, e.event,
    e.event === 'tool_post'
      ? JSON.stringify(e.output).slice(0, 100)
      : e.text.slice(0, 120)
  ));
"
```

### Slow run — find the expensive tool calls

Sort `tool_post` events by `duration_ms` descending. The top entries are the bottleneck.

```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/runs/<run>.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.event === 'tool_post')
  .sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0))
  .slice(0, 5)
  .forEach(e => console.log(e.duration_ms + 'ms', e.tool, JSON.stringify(e.input).slice(0, 80)));
"
```

### Permission walls — what was denied and why

```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/runs/<run>.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.event === 'permission_denied')
  .forEach(e => console.log(e.ts, e.tool, e.reason, JSON.stringify(e.input).slice(0, 100)));
"
```

## Extending the Schema

Fields are additive. Unknown fields on existing events are ignored. To add a new event type: add a handler in `.claude/hooks/obs.js`, add the event name to the dispatch table, and document the shape here.

## Opt-Out (Forward-Looking, Not v1)

Built-in agents (`Explore`, `Plan`, `general-purpose`) are excluded by default. To log a specific built-in ad hoc, open `.claude/hooks/obs.js` and remove its name from `BUILTIN_AGENT_TYPES`. An `OBS_INCLUDE_BUILTIN=1` env var to toggle this globally is planned but not implemented in v1.

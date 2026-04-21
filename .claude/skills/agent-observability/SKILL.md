---
name: agent-observability
description: >-
  Observation pipeline reference. Use when debugging agent runs ("why did
  agent X produce wrong output", "which tool call was slow", "what was
  denied"), understanding the memory system ("how does the observer work",
  "what does /evolve do", "how are learnings classified"), or querying
  obs.jsonl event logs. Covers capture, observer, evolve, PLAYBOOK routing,
  scope tests, and debug recipes.
user-invocable: true
---

# Agent Observability

The observation pipeline captures every tool call, agent dispatch, and reasoning turn to `.claude/logs/observations/<project>/obs.jsonl`, then provides tools to analyze, extract learnings, and route insights to the correct memory tier.

Components:
1. **pipeline-observe.js** -- PostToolUse/SubagentStop hook that writes events to obs.jsonl
2. **@observer agent** -- Sonnet-class subagent that reads obs.jsonl, extracts learnings, classifies via scope tests
3. **/evolve command** -- User-invoked skill that dispatches observer and manages memory promotion
4. **PLAYBOOK.md** -- Observer-managed routing log for cross-agent coordination insights

## When to Use

**Debugging (post-mortem on agent runs):**
- "Why did @researcher return X instead of Y?"
- "Which tool call took the most time in that run?"
- "What permission was denied and why did the agent stop?"
- "What was the agent reasoning about before calling that tool?"

**System understanding (how the memory pipeline works):**
- "How does the observer classify learnings?"
- "What does /evolve do?"
- "How are insights routed through PLAYBOOK.md?"
- "What are the scope-test questions?"

**Not for:** Direct memory file edits (use /evolve), pipeline-observe.js code changes (use pipeline-design skill).

## Event Schema

Events are written to `.claude/logs/observations/<project>/obs.jsonl` -- one JSON object per line (JSONL format). Rotation at 10MB with timestamped archive; files older than 30 days are purged.

### Base Fields

Every event contains these fields:

| Field | Type | Description |
|-------|------|-------------|
| `ts` | string | ISO timestamp with colons replaced (Windows filename safe, e.g. `2026-04-17T14-22-30-123Z`) |
| `epoch_ms` | number | Unix milliseconds for duration computation |
| `event` | string | Event type (see table below) |
| `session_id` | string | Claude Code session ID |
| `agent_id` | string | Empty string for main conversation; populated for subagent dispatches |
| `project` | string | Project slug derived from path detection |

### Event Types

| Event | When Emitted |
|-------|-------------|
| `tool_pre` | Before every tool call -- tool name, input |
| `tool_post` | After tool success -- output, `duration_ms` |
| `tool_fail` | After tool failure -- error message, `duration_ms` |
| `permission_denied` | When a tool call is blocked -- tool input, denial reason |
| `dispatch` | When a subagent is dispatched -- agent type, dispatch prompt |
| `assistant_message` | Agent reasoning turn -- text, thinking blocks, token usage, `stop_reason` |
| `complete` | Final event for a run -- aggregated counts, token summary, `outcome` |

### Truncation Caps

Input and output fields are truncated to prevent log bloat. Caps defined in pipeline-observe.js:

| Tool | Input Cap | Output Cap |
|------|-----------|------------|
| Read, Grep, Glob | 1 KB | 1 KB |
| Bash, Write, Edit | 5 KB | 5 KB |
| Agent | 2 KB | 5 KB |
| Thinking blocks | 10 KB/turn | -- |
| Assistant text | 10 KB/turn | -- |
| Dispatch prompt | 2 KB | -- |

Default cap for unlisted tools: 2 KB input, 2 KB output.

### agent_id Semantics

- **Empty string** (`""`) -- event originated from the main conversation (user's direct Claude Code session)
- **Populated** (e.g. `"a3f67b0"`) -- event originated from a subagent dispatch. The observer uses this field to group events into runs.

## Observer System

The `@observer` agent (Sonnet, dispatched by /evolve only) processes obs.jsonl incrementally via a 10-step pipeline:

1. **Load cursor** -- reads byte offset from `.observer-cursor`
2. **Read events** -- reads obs.jsonl from cursor position
3. **Group by run** -- segments events by agent_id
4. **Filter self** -- skips runs where agent_id contains "observer"
5. **Classify candidates** -- applies scope-test questions (see below)
6. **Score confidence** -- assigns [HIGH], [MED], or [LOW]
7. **Deduplicate** -- checks target files for existing entries
8. **Write entries** -- appends to target file's Pending Review (or PLAYBOOK Open for Q3)
9. **Log rejections** -- writes rejected candidates to rejections.jsonl
10. **Update cursor** -- advances byte offset after successful writes

Maximum 3 candidates per run. Exactly one scope-test question must pass per candidate.

### Confidence Levels

| Level | Criteria |
|-------|----------|
| **[HIGH]** | Unambiguous evidence: clear error-recovery loop, documented workaround, repeated pattern across turns/runs |
| **[MED]** | Single-instance evidence: observed once, sound reasoning suggests recurrence but unconfirmed |
| **[LOW]** | Speculative: plausible from limited data, inference without tool-level confirmation |

### Entry Formats

**MEMORY.md entries:**
```
- [CONFIDENCE] source-agent: distilled insight text (YYYY-MM-DDThh:mm)
```

**insights.md entries:**
```
- [YYYY-MM-DD] [CONFIDENCE] distilled insight text (from: source-agent, YYYY-MM-DDThh:mm)
```

### Rejections

Rejected candidates are logged to `.claude/logs/observations/<project>/rejections.jsonl` with reasons: `no-scope-match`, `ambiguous-scope`, `duplicate-of-existing`, `format-error`, `target-file-corrupt`. Same 10MB rotation and 30-day purge as obs.jsonl.

## /evolve Command

User-invoked skill that orchestrates the learning cycle:

1. Dispatch @observer to process new obs.jsonl events
2. Scan all memory files for ## Pending Review entries (`evolve.js scan`)
3. Auto-promote all entries to ## Permanent (`evolve.js promote`)
4. Display grouped numbered summary (insights files first, then MEMORY files, then PLAYBOOK)
5. Offer revert by number -- user can undo specific promotions
6. Commit changes

PLAYBOOK.md is excluded from evolve.js scan/promote (its Open/Resolved lifecycle is managed by the observer, not /evolve).

Helper script: `.claude/scripts/memory/evolve.js` with subcommands: `scan`, `promote <file> <entry>`, `revert <file> <entry>`

## PLAYBOOK Routing

`.claude/PLAYBOOK.md` is an observer-managed routing log for cross-agent coordination insights (scope-test Q3 passes). Agents do not read or write it directly.

**Lifecycle:**
1. Observer writes entry to `## Open`: `- [CONF] agent: insight (timestamp)`
2. Observer identifies routing target (specific agent MEMORY.md or skill insights.md)
3. Observer writes insight to target file's `## Pending Review`
4. Observer updates PLAYBOOK entry to `## Resolved`: `- [Resolved] agent: insight -> routed to <path> (date)`

If the routing target is unclear, the entry remains in ## Open for manual review during /evolve.

## 3-Layer Scope Tests

Every candidate must pass exactly one of these three questions:

| # | Question | YES means | Target |
|---|----------|-----------|--------|
| Q1 | Does this change how a specific skill or method runs? | Tool technique, library pattern, script convention, procedural step | `.claude/skills/<skill>/insights.md` |
| Q2 | Would a fresh instance of this agent need this to do its job? | Agent behavior, decision, cross-task pattern | `.claude/agent-memory/<agent>/MEMORY.md` |
| Q3 | Does this change how agents hand off or coordinate? | Inter-agent protocol, handoff, resource conflict, workflow sequencing | `.claude/PLAYBOOK.md` (routed to target) |

Zero passes = reject ("no-scope-match"). Multiple passes = reject ("ambiguous-scope").

## Debug Recipes

Direct obs.jsonl queries. Replace `<project>` with project slug.

**List all runs (unique agent_ids):**
```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/observations/<project>/obs.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
const ids = [...new Set(lines.map(e => e.agent_id || '(main)'))];
ids.forEach(id => console.log(id));
"
```

**Find slowest tool calls in a run:**
```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/observations/<project>/obs.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.event === 'tool_post' && e.agent_id === '<agent-id>')
  .sort((a,b) => (b.duration_ms||0) - (a.duration_ms||0))
  .slice(0, 5)
  .forEach(e => console.log(e.duration_ms+'ms', e.tool_name, (e.input||'').slice(0,80)));
"
```

**Find all failures:**
```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/observations/<project>/obs.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.event === 'tool_fail')
  .forEach(e => console.log(e.ts, e.agent_id||'(main)', e.tool_name, (e.error||'').slice(0,120)));
"
```

**Find permission denials:**
```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/observations/<project>/obs.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.event === 'permission_denied')
  .forEach(e => console.log(e.ts, e.agent_id||'(main)', e.tool_name));
"
```

**Filter events by agent:**
```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/observations/<project>/obs.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.agent_id === '<agent-id>')
  .forEach(e => console.log(e.ts, e.event, e.tool_name || ''));
"
```

**Get agent reasoning timeline:**
```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/observations/<project>/obs.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.event === 'assistant_message' && e.agent_id === '<agent-id>')
  .forEach(e => console.log(e.ts, (e.text||'').slice(0,120)));
"
```

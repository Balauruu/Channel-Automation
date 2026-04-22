# Phase 1: Capture Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 01-capture-hardening
**Areas discussed:** Script architecture, Main conversation capture scope, Output detail level

---

## Script Architecture

### Language Choice

| Option | Description | Selected |
|--------|-------------|----------|
| Pure Python | Rewrite as pipeline-observe.py. All logic in one testable language. | |
| Bash dispatcher + Python module | Thin bash script + importable Python modules. | |
| Keep bash + inline Python | Fix and extend current approach. | |
| Pure JS (Node.js CommonJS) | Rewrite as pipeline-observe.js. Matches hook convention. | ✓ |

**User's choice:** Pure JS — initially selected Pure Python, then challenged the recommendation ("Why not pure bash?", "Why python and not .js?"). After reviewing CONVENTIONS.md (hooks are JS territory) and existing patterns (check-memory-limit.js), switched to JS.
**Notes:** User valued consistency with existing hook conventions over following the inline Python inertia.

### File Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single file | One pipeline-observe.js, self-contained | ✓ |
| Main + helper module | Entry point + lib module for reusable logic | |

**User's choice:** Single file
**Notes:** Matches check-memory-limit.js pattern

### Filter Layers

| Option | Description | Selected |
|--------|-------------|----------|
| Global disable | Kill switch via file/env var | |
| Hook profile | PIPELINE_HOOK_PROFILE=minimal skip | |
| Cooperative skip | PIPELINE_SKIP_OBSERVE=1 opt-out | |
| Path exclusions | PIPELINE_OBSERVE_SKIP_PATHS filter | |

**User's choice:** None — all legacy filter layers dropped
**Notes:** Clean slate approach

### Secret Scrubbing

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it | Port regex scrubber to JS | |
| Drop it | No secret scrubbing | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Drop it
**Notes:** Simplicity over safety — obs.jsonl is local-only

### Project Routing

| Option | Description | Selected |
|--------|-------------|----------|
| Keep project routing | Per-project obs.jsonl directories | ✓ |
| Single obs.jsonl | One file for everything | |
| You decide | Claude's discretion | |

**User's choice:** Keep project routing
**Notes:** Clarified that PROJECT.md "one file" decision was about not splitting user/subagent events, not about eliminating per-project directories. Project routing is about pipeline runs being useful context.

### Testing

**User's choice:** Old tests deleted (deprecated version). Fresh tests at Claude's discretion.

---

## Main Conversation Capture Scope

### Capture Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Capture everything | Log every tool call | ✓ |
| Exclude high-volume tools | Skip Read, Grep, Glob | |
| Configurable whitelist | Default capture-all + env var filter | |

**User's choice:** Capture everything
**Notes:** Observer in Phase 2 decides what's valuable. Volume managed by rotation.

### Event Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Empty agent_id field | Main = empty string, subagent = populated | ✓ |
| Explicit source field | Add source: 'main' or 'subagent' | |

**User's choice:** Lean with just agent_id
**Notes:** User asked whether explicit source field would be beneficial. After discussion of redundancy and sync risk, chose lean approach. No redundant fields.

---

## Output Detail Level

### Truncation Caps

| Option | Description | Selected |
|--------|-------------|----------|
| Same 5KB cap for all | Uniform 5KB for inputs and outputs | |
| Smaller cap (1-2KB) | Tighter truncation for all events | |
| Tool-specific caps | Different limits per tool type | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Tool-specific caps — Read/Grep/Glob at 1KB, Bash/Write/Edit at 5KB, Agent at 2KB
**Notes:** Better signal-to-noise: navigation tools get small caps, mutation tools get larger caps

### Thinking Blocks

| Option | Description | Selected |
|--------|-------------|----------|
| Keep thinking blocks | 10KB cap per turn in SubagentStop | ✓ |
| Drop thinking blocks | Skip thinking content entirely | |
| You decide | Claude's discretion | |

**User's choice:** Keep thinking blocks
**Notes:** Essential for observer to learn WHY agents made decisions

## Claude's Discretion

- Test coverage scope and approach
- Exact event schema field names
- Atomic write implementation (CAPT-04)
- Per-tool duration computation (CAPT-05)
- Error handling strategy

## Deferred Ideas

None

# Phase 2: Observer Agent - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 02-observer-agent
**Areas discussed:** Learning signal types, Entry format for review, PLAYBOOK.md bootstrap, Rejection logging

---

## Learning Signal Types

| Option | Description | Selected |
|--------|-------------|----------|
| Broad extraction | All signal types: errors, recoveries, strategies, anti-patterns, decision rationale, coordination issues. Confidence scoring filters. | ✓ |
| Outcome-focused only | Only learnings tied to observable outcomes (failures recovered, retries, rejected output). | |
| Failures and anti-patterns only | Only negative signals: errors, retries, rejected outputs, tool misuse. | |

**User's choice:** Broad extraction
**Notes:** None — straightforward selection.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full analysis with thinking | Reads thinking blocks (10KB cap) for decision rationale — WHY agents chose approach A over B. | ✓ |
| Tool events only | Only tool names, inputs, outputs, durations. Surface-level patterns. | |

**User's choice:** Full analysis with thinking
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Batch by run | Groups events by run (same agent_id). Analyzes each run as unit, 0-3 learnings per run. | ✓ |
| Sliding window | N events at a time regardless of run boundaries. | |
| Full dump | All unprocessed events at once into 1M context. | |

**User's choice:** Batch by run
**Notes:** None.

---

## Entry Format for Review

| Option | Description | Selected |
|--------|-------------|----------|
| Distilled + evidence pointer | 1-2 sentence insight + confidence tag + source agent + timestamp pointer. | ✓ |
| Dense with inline evidence | Insight + 2-3 lines of quoted evidence from events. | |
| Minimal one-liner | Bare insight + confidence tag only. No source pointer. | |

**User's choice:** Distilled + evidence pointer
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Strip pointer on promote | Remove evidence pointer when promoted. Clean entries only. | ✓ |
| HTML comment | Wrap pointer in <!-- --> on promote. Invisible but traceable. | |

**User's choice:** Strip pointer on promote
**Notes:** User asked for comparison between the two. After analysis showing HTML comment was simpler, user still preferred strip approach for cleaner memory files.

---

## PLAYBOOK.md Bootstrap

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal bootstrap now | Bare PLAYBOOK.md with ## Pending Review + ## Permanent. Phase 4 redesigns. | ✓ |
| Skip PLAYBOOK.md in Phase 2 | Only write to insights.md and MEMORY.md. Hold orchestration candidates. | |
| Full PLAYBOOK.md design now | Complete Open/Resolved structure. Pulls Phase 4 scope forward. | |

**User's choice:** Minimal bootstrap now
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| .claude/PLAYBOOK.md | Top-level in .claude/ as cross-agent coordination file. | ✓ |
| .claude/agent-memory/PLAYBOOK.md | Inside agent-memory/ directory. | |
| .claude/skills/agent-protocols/PLAYBOOK.md | Inside agent-protocols skill. | |

**User's choice:** .claude/PLAYBOOK.md
**Notes:** None.

---

## Rejection Logging

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated rejections file | `.claude/logs/observations/<project>/rejections.jsonl`. JSONL with candidate, reason, confidence, source. | ✓ |
| Append to obs.jsonl | Rejection events mixed into main capture file. | |
| Ephemeral (stdout only) | Visible during /evolve but not persisted. | |

**User's choice:** Dedicated rejections file
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same rotation as obs.jsonl | 10MB cap, timestamped archive, 30-day purge. Reuse rotation logic. | ✓ |
| No rotation | Grows indefinitely, manual cleanup. | |
| Fixed line cap (500) | Keep last 500 entries, truncate old. | |

**User's choice:** Same rotation as obs.jsonl
**Notes:** None.

---

## Claude's Discretion

- Observer agent definition structure
- Cursor storage mechanism
- Deduplication algorithm
- Self-loop prevention implementation
- Observer prompt engineering
- Entry formatting details

## Deferred Ideas

None — discussion stayed within phase scope.

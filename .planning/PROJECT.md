# Unified Memory System

## What This Is

A unified memory system for the documentary pipeline that captures learnings from both main conversations and subagent dispatches, analyzes them via an @observer subagent (Sonnet 4.6), and routes them through scope-enforced 3-layer memory with confidence scoring and human review. Replaces the current broken memory implementation where information bleeds between layers and no logging occurs.

## Core Value

Agents learn from past runs and don't repeat mistakes — knowledge persists across sessions with clear scope boundaries enforced by scope-test questions, not LLM judgment alone.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Single capture hook (pipeline-observe.sh) handles both main conversation and subagent events
- [ ] All events written to single `obs.jsonl` per project — observer filters by `agent_id` presence
- [ ] File at `.claude/logs/observations/<project>/obs.jsonl` with 10MB rotation
- [ ] @observer subagent (Sonnet 4.6) reads both streams and extracts learnings
- [ ] Observer classifies candidates against 3 scope-test questions as enforcement checklist
- [ ] Observer writes to ## Pending Review sections in memory files (lightweight staging)
- [ ] /evolve promotes Pending Review entries or reverts (git history as rollback)
- [ ] Categorical confidence tagging: HIGH/MED/LOW inline with decay (LOW=14d, MED=30d)
- [ ] Single `/evolve` command: dispatches observer + reviews recent additions (can revert)
- [ ] PLAYBOOK.md redesigned as cross-agent message bus (research needed for optimal shape)
- [ ] agent-protocols rewritten (thin — no signals, no project-memories, no scratchpad)
- [ ] agent-observability skill rewritten for new paths and schema

### Out of Scope

- Replacing the 3-layer memory structure (insights.md / MEMORY.md / PLAYBOOK.md) — LOCKED, not negotiable
- Background observer daemon — nice-to-have deferred; on-demand `/evolve` is sufficient
- Direct `api.anthropic.com` / `ANTHROPIC_API_KEY` calls — all LLM work inside Claude Code subagents (Max subscription)
- Auto-promotion of high-confidence candidates without human review (v1 requires human gate)
- Session-start-nudge hook — dropped; user runs `/evolve` when ready
- Separate `/learn` command — merged into `/evolve`
- `memory-candidates/` staging directory — observer writes directly to memory
- CLv2's 60K Python CLI, background daemons, and 6 commands — ideas borrowed, not implementation
- User-scoped `continuous-learning-v2` at `~/.claude/` — external system, not part of this project

## Context

### Current State (Broken)

- pipeline-observe.sh exists (342 lines) but only captures subagent events — main conversation is invisible
- No actual logging is happening in practice
- Information bleeds between layers: agent-specific knowledge ends up in PLAYBOOK.md
- agent-protocols skill still references deleted `project-memories/` directory and `signals.yaml`
- 11 agent MEMORY.md files and 8 skill insights.md files exist but aren't systematically maintained
- PLAYBOOK.md skeleton exists but isn't populated by any automated system

### What Failed (Prior Attempts)

- `obs.js` (Node.js hook): `shouldSkip()` gate on `agent_id` blocked dispatch events; pointer-file handoff between dispatch and tool_pre raced under `async: true` hooks
- Approaches A/B/C: disagreed on capture mechanism but converged on the same 3-layer memory structure
- Approach D spec: addresses capture but misses user-scoped learning entirely and over-engineers staging

### Prior Art Analyzed

- **Approach D spec** (`.../memory-system-d/2026-04-19-memory-system-approach-d-harmonized.md`): sound architecture for subagent observation, over-engineered staging and PLAYBOOK lifecycle, no user-scoped capture
- **continuous-learning-v2** (`.../continous-learning-v2/`): good ideas (confidence scoring, hook-based capture, instinct model) but too much infrastructure (60K Python, background daemons, 6 commands) and no subagent-specific learning

### 3-Layer Memory Scope Tests (LOCKED)

| Layer | File | Scope Test |
|-------|------|------------|
| Skills | `insights.md` | "Does this change how the skill/method runs?" |
| Agents | `MEMORY.md` | "Would a fresh instance of this agent need this to do its job?" |
| Orchestration | `PLAYBOOK.md` | "Does this change how agents hand off or coordinate?" |

The observer classifies every candidate against these three questions. If a candidate doesn't clearly pass exactly one test, it is rejected.

## Constraints

- **Billing**: All LLM analysis via Claude Code subagent dispatches only — no API keys, no metered billing, Max subscription covers everything
- **Platform**: Windows 11, bash via Git Bash
- **Observer model**: Sonnet 4.6, 1M context — full event detail including thinking blocks; don't prematurely filter
- **Single hook**: One `pipeline-observe.sh` script handles all capture, branching output by context (agent_id present → `agents.jsonl`, absent → `sessions.jsonl`)
- **Simplification mandate**: Complete rework approved; removal and merging of functionalities approved; reduce complexity relative to Approach D spec

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 3-layer memory structure locked | Proven concept across approaches A-D; scope tests are clear and correct | — Pending |
| Observer stays as Sonnet 4.6 subagent | Quality analysis, 1M context handles full event detail, subscription-covered | — Pending |
| Merge /learn into /evolve | /evolve already dispatches observer; separation adds UX overhead for no benefit | — Pending |
| Remove memory-candidates staging | Observer writes directly to memory; /evolve reviews and can revert. Eliminates directory tree and YAML frontmatter overhead | — Pending |
| One file (obs.jsonl) not two | NTFS locking issues documented in Claude Code issues; observer filters by agent_id presence; simpler hook logic | — Pending |
| Categorical confidence (HIGH/MED/LOW) | LLMs cannot calibrate numeric probabilities; consuming LLMs cannot use them; Features research flags numeric scoring as anti-feature at this scale | — Pending |
| Pending Review sections as lightweight staging | Direct write risk mitigated without directory tree; observer writes to ## Pending Review, /evolve promotes or reverts via git | — Pending |
| Drop session-start-nudge | User runs /evolve when ready; no hook-based nudging | — Pending |
| PLAYBOOK.md as cross-agent message bus | Not a ticket system; captures insights from one agent that affect another. Observer manages lifecycle. Optimal shape needs research | — Pending |
| Observer enforces scope via checklist | Classifies against 3 scope-test questions. Rejects candidates that don't clearly pass exactly one test | — Pending |
| Full capture for observer (no pre-filtering) | Thinking blocks, tool durations, all event types. Trust Sonnet 4.6 1M context to handle volume | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 after initialization*

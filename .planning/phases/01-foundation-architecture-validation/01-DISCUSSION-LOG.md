# Phase 1: Foundation & Architecture Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-foundation-architecture-validation
**Areas discussed:** Orchestrator design, Agent body vs skills vs rules, Channel identity integration, Memory initialization

---

## Orchestrator Design

### Q1: How should the orchestrator work in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| CLAUDE.md-as-orchestrator | Main session reads routing rules from CLAUDE.md and dispatches @agent-name | ✓ (initial) |
| --agent orchestrator | Dedicated orchestrator.md agent run via `claude --agent orchestrator` | |
| Hybrid | Start CLAUDE.md, add agent later | |

**User's choice:** CLAUDE.md-as-orchestrator (initially selected, later revised — see Q4)
**Notes:** Initially chose this before deep research. Revised after learning that major repos don't use orchestrators.

### Q2: Should CLAUDE.md include routing for ALL future agents or just Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Full routing table now | Include complete routing for all ~10 agents | ✓ |
| Vertical slice only | Only researcher + writer | |

**User's choice:** Full routing table now
**Notes:** Later refined to "full agent reference table" (docs only, no enforcement) after orchestrator was dropped.

### Q3: How should human checkpoints behave?

| Option | Description | Selected |
|--------|-------------|----------|
| Instruction-based | CLAUDE.md says "WAIT for user selection" | ✓ |
| Hook-enforced | PostToolUse hook injects blocking prompt | |
| You decide | Claude picks | |

**User's choice:** Instruction-based

### Q4: Invocation model (after deep research)

*User requested extensive research on: (1) IndyDevDan's 6 pillars and harness engineering, (2) official Anthropic guidance from 2026, (3) popular repos with 10k+ stars, (4) GSD framework agent patterns, (5) user-invoked-only vs orchestrator comparison. Three parallel research agents dispatched.*

| Option | Description | Selected |
|--------|-------------|----------|
| User-invoked only | User types @agent directly, no auto-dispatch | ✓ |
| Hybrid — reference table + future slash commands | Lightweight routing reference, user can bypass | |
| CLAUDE.md orchestrator (original plan) | CLAUDE.md routing table auto-dispatches | |

**User's choice:** User-invoked only
**Notes:** Chose after seeing that anthropics/claude-code (111k stars), vercel/next.js (130k), wshobson/agents (33k) all use no orchestrator. The dominant production pattern is user-invoked.

---

## Agent Body vs Skills vs Rules

*User requested additional research before answering. Two rounds of parallel research agents dispatched covering: (1) agent+skills patterns in industry, (2) skill crafting best practices, (3) real repo analysis, (4) IndyDevDan's approach, (5) Anthropic official 2026 guidance, (6) shared meta-skills pattern.*

### Key research findings that shaped decisions:
- Subagents do NOT inherit CLAUDE.md (GitHub issue #8395 closed NOT_PLANNED)
- `skills:` frontmatter is the ONLY confirmed injection mechanism for subagents
- GSD uses ultra-fat agents (up to 1,381 lines) with zero skills/memory usage
- IndyDevDan uses empty CLAUDE.md + deterministic hooks
- No major repo uses `memory:` or `skills:` frontmatter in practice (early adoption)
- 1M context makes token cost of skill injection negligible (<1.5%)

### Q5: Agent architecture pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Fat body + shared skills | ~120-200 line body + 2-3 shared behavioral skills via skills: field | ✓ |
| Fat body + @file refs only (GSD pattern) | Everything in body, duplicate shared protocols | |
| Fat body + many skills (leverage 1M) | Thin body + 4-6 injected skills | |

**User's choice:** Fat body + shared skills
**Notes:** Hybrid of GSD's fat-agent pattern with shared skills for the one thing that MUST be injected (subagents can't see CLAUDE.md). User explicitly dismissed "3 skills max" rule given 1M context.

---

## Channel Identity Integration

### Q6: How should channel docs be available to agents?

| Option | Description | Selected |
|--------|-------------|----------|
| @file refs in agent body | Each agent includes only relevant channel docs via @file | ✓ |
| Shared skill (channel-identity) | All docs in one skill, injected into all agents | |
| CLAUDE.md @imports (main session only) | Available to main session but not subagents | |

**User's choice:** @file refs in agent body
**Notes:** Each agent gets only the docs relevant to its domain. Writer gets voice-profile, visual-planner gets style guide, etc.

### Q7: Where should channel identity source files live?

| Option | Description | Selected |
|--------|-------------|----------|
| channel/ at project root | Clean separation from .claude/ | ✓ |
| .claude/rules/ | Path-scoped rules, but subagents can't see them | |
| You decide | | |

**User's choice:** channel/ at project root

---

## Memory Initialization

### Q8: Seed MEMORY.md from V5 or start empty?

| Option | Description | Selected |
|--------|-------------|----------|
| Seed from V5 expertise | Convert V5 YAML mental models to MEMORY.md | ✓ |
| Empty memory — validate lifecycle first | Blank MEMORY.md, test accumulation | |
| Minimal seed — structure only | Headers + 1-2 entries | |

**User's choice:** Seed from V5 expertise
**Notes:** V5 project at `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5`

### Q9: Memory update protocol

| Option | Description | Selected |
|--------|-------------|----------|
| Structured append | Timestamped entries under appropriate section | ✓ |
| Reflective summary | Narrative reflection after each task | |
| You decide | | |

**User's choice:** Structured append

### Q10: Memory size cap

| Option | Description | Selected |
|--------|-------------|----------|
| 200-line cap with manual pruning | Match Claude Code's 200-line auto-injection limit | |
| Unbounded — agent reads full file | No cap, explicit Read at task start | ✓ |
| You decide | | |

**User's choice:** Unbounded
**Notes:** 1M context makes full file reads feasible. Agent explicitly Reads MEMORY.md rather than relying on auto-injection.

---

## Claude's Discretion

- Exact agent body line counts
- agent-protocols skill internal structure
- CLAUDE.md reference table format
- Windows smoke test implementation
- Agent frontmatter field choices (model, color, maxTurns, permissionMode)

## Deferred Ideas

- Slash-command pipeline skills — Phase 4
- Hook-based feedback propagation — Phase 5
- Domain enforcement hooks — Phase 4
- Session logging hooks — Phase 4
- Agent consolidation (17 → ~10) — Phase 3
- Observability dashboard (IndyDevDan pattern) — backlog

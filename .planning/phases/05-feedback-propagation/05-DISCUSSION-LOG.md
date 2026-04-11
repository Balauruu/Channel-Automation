# Phase 5: Feedback Propagation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 05-feedback-propagation
**Areas discussed:** Signal schema & routing, Signal injection mechanism, Verification gates, Feedback loop scope

---

## Signal Schema & Routing

### Routing Model

| Option | Description | Selected |
|--------|-------------|----------|
| Domain-tagged | Signals tagged by domain (editorial, visual, strategy) — any agent in that domain reads relevant signals | ✓ |
| Direct agent-to-agent | Keep current from:agent to:agent format. Each signal names its target explicitly | |
| Both: direct + domain | Signals can target a specific agent OR a domain | |

**User's choice:** Domain-tagged
**Notes:** More resilient than naming specific agents

### Signal Categories

| Option | Description | Selected |
|--------|-------------|----------|
| Yes: type tags | Add type field: quality, content, technical, process | ✓ |
| Severity only | Just high/medium/low severity | |
| You decide | Claude's discretion | |

**User's choice:** Type tags
**Notes:** Helps agents filter what's relevant to their current task

### Signal File Format

| Option | Description | Selected |
|--------|-------------|----------|
| YAML | feedback/signals.yaml — structured data in a structured format | ✓ |
| JSONL | feedback/signals.jsonl — append-only JSON lines | |
| Markdown | feedback/SIGNALS.md — keep current convention | |

**User's choice:** YAML
**Notes:** User questioned why structured data was in markdown when the header was YAML-like. Led to format redesign from markdown to YAML.

### Signal Location

| Option | Description | Selected |
|--------|-------------|----------|
| Global only | Single feedback/signals.yaml at project root | ✓ |
| Both global + per-project | Global file for durable patterns, plus per-video signals | |
| You decide | Claude's discretion | |

**User's choice:** Global only

---

## Signal Injection Mechanism

### How Agents Receive Signals

| Option | Description | Selected |
|--------|-------------|----------|
| Pipeline skills inject | Pipeline skills read signals.yaml, filter by domain, include in dispatch prompt | |
| Agents always self-read | Every agent reads feedback/signals.yaml at task start via agent-protocols | |
| You decide | Claude's discretion | |

**User's choice:** Neither — user rejected prompt injection entirely
**Notes:** "The signals shouldn't be injected in the dispatch prompt, but used to permanently alter the behavior of the agent." This was the key design insight for the phase. Signals are a feedback inbox, not runtime context.

### Signal Promotion Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: self + flagged | Agents self-promote to MEMORY.md via agent-protocols (most signals). Definition changes flagged for meta/human review. | ✓ |
| Self-promotion only | All signals self-promoted into MEMORY.md. Agent definitions never change via signals. | |
| Meta agent only | All signals processed by @meta agent. | |

**User's choice:** Hybrid: self-promote + flagged
**Notes:** User initially considered meta agent or a dedicated agent for signal processing, then leaned toward a universal skill approach. Final decision: agent-protocols upgrade for self-promotion to MEMORY.md, with high-impact signals flagged for definition changes via meta/human.

---

## Verification Gates

### Gate Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inside pipeline skills | Each pipeline skill checks previous stage output before dispatch | ✓ |
| Standalone gate commands | Separate /verify-* commands user runs explicitly | |
| Editorial-lead as gatekeeper | @editorial-lead reviews before next stage | |
| You decide | Claude's discretion | |

**User's choice:** Inside pipeline skills

### Gate Check Type

| Option | Description | Selected |
|--------|-------------|----------|
| Structural + completeness | Check required files exist, contain expected sections, meet content thresholds | ✓ |
| Quality assessment | AI-powered quality review | |
| Both: structural then quality | Fast structural check first, then AI quality if passes | |

**User's choice:** Structural + completeness

### Gate Failure Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Block + guide | Refuse to dispatch, tell user exactly what's missing | ✓ |
| Warn + proceed | Warn about gaps but dispatch anyway | |
| Auto-fix attempt | Try to fix minor gaps before dispatch | |

**User's choice:** Block + guide

---

## Feedback Loop Scope

### Signal Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-agent actionable only | Only write signals that would change how another agent works | |
| Broad: any pipeline insight | Write signals for any pipeline observation | ✓ (modified) |
| You decide | Claude's discretion | |

**User's choice:** Broad pipeline insights with cross-agent focus
**Notes:** "Broad: any pipeline insight, but make sure it also and mainly focuses on cross agent actions." Hybrid of the two options.

### Signal Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Resolve on promotion | Signals marked resolved once promoted. Prune at ~50 entries. | ✓ |
| Time-based expiry | Signals older than N days auto-expire | |
| Manual pruning only | Accumulate until explicitly pruned | |

**User's choice:** Resolve on promotion

---

## Claude's Discretion

- Exact YAML schema field names and structure for signals.yaml
- Domain-to-agent mapping
- Specific structural checks per verification gate
- Signal pruning implementation details
- Agent-protocols upgrade wording
- How `promotion: definition` signals are surfaced

## Deferred Ideas

None — discussion stayed within phase scope

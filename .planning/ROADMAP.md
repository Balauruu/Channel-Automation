# Roadmap: Unified Memory System

## Overview

Transform the broken memory implementation into a functioning learn-from-runs pipeline. Data flows through five phases following strict dependency order: hardened capture produces reliable JSONL, the observer analyzes events and classifies learnings, /evolve gates human review, agent-protocols consume approved knowledge, and lifecycle management prevents unbounded growth. Each phase delivers a verifiable capability that the next phase depends on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Capture Hardening** - Battle-harden pipeline-observe.sh to produce reliably valid JSONL from both main conversations and subagent events
- [x] **Phase 2: Observer Agent** - Build @observer subagent that reads obs.jsonl, classifies learnings via scope-tests, and writes to memory with confidence tags (completed 2026-04-21)
- [ ] **Phase 3: Evolve Command** - Create /evolve human review gate that dispatches observer and presents pending entries for approve/edit/revert
- [ ] **Phase 4: Agent Consumption** - Rewrite agent-protocols and skills so pipeline agents read PLAYBOOK.md and use updated memory paths
- [ ] **Phase 5: Memory Lifecycle** - Add confidence decay, consolidation, and capacity management for long-running memory files

## Phase Details

### Phase 1: Capture Hardening
**Goal**: Pipeline-observe.sh reliably captures all conversation events (main + subagent) to valid JSONL without corruption or data loss
**Depends on**: Nothing (first phase)
**Requirements**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07
**Success Criteria** (what must be TRUE):
  1. Running a main conversation produces events in obs.jsonl with tool name, input/output, and timestamp (no agent_id field)
  2. Running a subagent dispatch produces events in obs.jsonl with full detail including thinking blocks, tool calls, and outcome classification (agent_id present)
  3. Every line in obs.jsonl is valid JSON parseable by `python -c "import json; json.loads(line)"` even after concurrent async hook writes
  4. obs.jsonl rotates cleanly at 10MB with timestamped archive; archive files older than 30 days are purged
  5. The hook works correctly when the project path contains spaces (Windows path safety verified)
**Plans:** 3 plans
Plans:
- [x] 01-01-PLAN.md — Core hook implementation (tool event capture, rotation, purge)
- [x] 01-02-PLAN.md — SubagentStop handler (transcript parsing, duration computation)
- [x] 01-03-PLAN.md — Smoke tests, settings.json wiring, old hook removal

### Phase 2: Observer Agent
**Goal**: @observer subagent reads captured events, extracts reusable learnings, classifies them to the correct memory tier via scope-test questions, and writes tagged entries to Pending Review sections
**Depends on**: Phase 1
**Requirements**: OBSV-01, OBSV-02, OBSV-03, OBSV-04, OBSV-05, OBSV-06, OBSV-07, OBSV-08, MEML-01
**Success Criteria** (what must be TRUE):
  1. After running /evolve, new entries appear in the correct memory file's ## Pending Review section (insights.md for skill learnings, MEMORY.md for agent learnings, PLAYBOOK.md for coordination insights)
  2. Each entry includes a categorical confidence tag ([HIGH], [MED], or [LOW]) and cites specific obs.jsonl evidence
  3. The observer does not produce entries for its own runs (no self-loop)
  4. Duplicate learnings already present in target memory files are not re-proposed
  5. On second invocation, the observer processes only new events (cursor-based incremental reads)
**Plans:** 3/3 plans complete
Plans:
- [x] 02-01-PLAN.md — Bootstrap write targets (PLAYBOOK.md, Pending Review sections, observer MEMORY.md)
- [x] 02-02-PLAN.md — Eval test scaffold and fixture data (format validation, self-loop, cursor, rejections)
- [x] 02-03-PLAN.md — Observer agent definition (system prompt, scope-test, few-shot examples, guardrails)

### Phase 3: Evolve Command
**Goal**: User can run /evolve to trigger observation and then review, approve, edit, or revert pending memory entries with full control
**Depends on**: Phase 2
**Requirements**: EVLV-01, EVLV-02, EVLV-03
**Success Criteria** (what must be TRUE):
  1. Running /evolve dispatches the observer for new runs, then presents all ## Pending Review entries grouped by target file (insights first, then MEMORY, then PLAYBOOK)
  2. For each entry, the user can promote (move to permanent section), edit then promote, or revert (delete entry with git revert if needed)
  3. After /evolve completes, promoted entries are in their final memory sections and reverted entries leave no trace in the working tree
**Plans:** 2 plans
Plans:
- [x] 03-01-PLAN.md — evolve.js helper script (scan/promote/revert subcommands) + eval tests
- [x] 03-02-PLAN.md — evolve SKILL.md (observer dispatch, summary display, revert interaction)

### Phase 4: Agent Consumption
**Goal**: All pipeline agents read PLAYBOOK.md at task start for cross-agent coordination, and supporting skills reflect the new memory system paths and schema
**Depends on**: Phase 3
**Requirements**: MEML-03, MEML-04, MEML-05, MEML-06
**Success Criteria** (what must be TRUE):
  1. The observer routes cross-agent coordination insights from PLAYBOOK.md to individual agent MEMORY.md files; agents consume insights passively via their injected memory (D-02: agents never read PLAYBOOK directly)
  2. PLAYBOOK.md uses Open/Resolved sections; the observer writes new cross-agent insights to Open and proposes resolution when the target agent absorbs the insight
  3. agent-observability skill documents the new obs.jsonl paths, event schema, and debug recipes (no references to old paths or schemas)
  4. agent-observability skill covers the full observation pipeline including observer system, /evolve command, event schema, and PLAYBOOK routing (D-11: pipeline-learning merged into agent-observability)
**Plans:** 3 plans
Plans:
- [x] 04-01-PLAN.md — PLAYBOOK.md redesign (Open/Resolved) + agent-protocols thin rewrite
- [x] 04-02-PLAN.md — Observer.md PLAYBOOK routing update + obs-summarize.js path fix
- [x] 04-03-PLAN.md — Agent-observability comprehensive rewrite (merged pipeline-learning) + cleanup audit

### Phase 5: Memory Lifecycle
**Goal**: Memory files stay healthy over time through confidence decay, consolidation, and capacity management
**Depends on**: Phase 4
**Requirements**: EVLV-04, MEML-02
**Success Criteria** (what must be TRUE):
  1. When /evolve runs, LOW-confidence entries older than 14 days and MED-confidence entries older than 30 days are flagged for removal or re-evaluation
  2. When a memory file approaches the 200-line cap, /evolve proposes merging related entries, removing stale ones, or promoting key insights -- not just deleting
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Capture Hardening | 3/3 | Complete | 2026-04-20 |
| 2. Observer Agent | 3/3 | Complete    | 2026-04-21 |
| 3. Evolve Command | 0/2 | Planning complete | - |
| 4. Agent Consumption | 0/3 | Planning complete | - |
| 5. Memory Lifecycle | 0/TBD | Not started | - |

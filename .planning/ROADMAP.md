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
- [x] **Phase 3: Evolve Command** - Create /evolve human review gate that dispatches observer and presents pending entries for approve/edit/revert (completed 2026-04-21)
- [x] **Phase 4: Agent Consumption** - Rewrite agent-protocols and skills so pipeline agents read PLAYBOOK.md and use updated memory paths (completed 2026-04-21)
- [x] **Phase 5: Memory Lifecycle** - Add confidence decay, consolidation, and capacity management for long-running memory files
- [x] **Phase 6: Old Memory Cleanup** - Remove all traces of the old broken memory system so the codebase only contains the new unified memory system (completed 2026-04-22)
- [ ] **Phase 7: Milestone Close-Out** - Fix integration gaps, verification gaps, and tracking drift identified by v1 audit

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
**Plans:** 2 plans
Plans:
- [x] 05-01-PLAN.md — Decay subcommands (decay/decay-remove/decay-upgrade) in evolve.js + smoke tests
- [x] 05-02-PLAN.md — Evolve SKILL.md lifecycle wiring (decay, consolidation, unified summary) + observer consolidation mode

### Phase 7: Milestone Close-Out
**Goal**: Fix all integration gaps, verification gaps, and tracking drift identified by the v1 milestone audit so the milestone can be completed
**Depends on**: Phase 6
**Requirements**: Gap closure (EVLV-03 acceptance, CLEANUP-01..03 verification, integration stale refs, tracking drift)
**Gap Closure:** Closes gaps from v1-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. observer.md contains no references to deleted entities (autoresearch skill, editorial-lead agent)
  2. agent-observability SKILL.md documents the current 10-step /evolve flow including decay/decay-remove/decay-upgrade commands from Phase 5
  3. 06-VERIFICATION.md exists and documents CLEANUP-01..05 verification results
  4. EVLV-03 override in 03-VERIFICATION.md has accepted_by/accepted_at filled in
  5. REQUIREMENTS.md checkboxes are `[x]` for all 8 verified requirements (EVLV-01, EVLV-02, MEML-03..06, EVLV-04, MEML-02)
  6. ROADMAP.md shows Phases 3, 4, 5 as complete with dates
**Plans:** 2 plans
Plans:
- [ ] 07-01-PLAN.md — Override acceptance, observer stale ref cleanup, agent-observability /evolve flow update
- [ ] 07-02-PLAN.md — REQUIREMENTS.md checkbox updates, ROADMAP.md completion dates, audit annotations

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Capture Hardening | 3/3 | Complete | 2026-04-20 |
| 2. Observer Agent | 3/3 | Complete    | 2026-04-21 |
| 3. Evolve Command | 2/2 | Complete | 2026-04-21 |
| 4. Agent Consumption | 3/3 | Complete | 2026-04-21 |
| 5. Memory Lifecycle | 2/2 | Complete | 2026-04-21 |
| 6. Old Memory Cleanup | 2/2 | Complete | 2026-04-22 |
| 7. Milestone Close-Out | 0/2 | Planned | - |

### Phase 6: Old Memory Cleanup
**Goal**: Remove all traces of the old broken memory system (project-memories/, signals.yaml, stale agent-memory references, deprecated skill insights, dead code in agent definitions) so the codebase only contains the new unified memory system
**Depends on**: Phase 5
**Requirements**: CLEANUP-01, CLEANUP-02, CLEANUP-03, CLEANUP-04, CLEANUP-05
**Success Criteria** (what must be TRUE):
  1. All 8 deprecated files (obs.js, check-definition-signals.js, autoresearch skill, old test fixtures) are removed from git tracking
  2. CLAUDE.md Folder Map has no dead entries and includes PLAYBOOK.md and observations/ paths
  3. PROJECT.md Current State describes the working unified memory system
  4. Codebase maps describe the new system with no old-system references
  5. Full grep audit confirms zero stale old-system references in any live file
**Plans:** 2 plans
Plans:
- [x] 06-01-PLAN.md — File deletions, CLAUDE.md/gitignore/PROJECT.md updates, cleanup commit
- [x] 06-02-PLAN.md — Codebase map regeneration, full grep audit, verification commit

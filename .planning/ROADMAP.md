# Roadmap: Channel-Automation V0.6

## Overview

This roadmap migrates the 17-agent documentary production pipeline from Pi CLI to Claude Code native agents. The approach is validation-first: prove the 2-tier delegation pattern works with a vertical slice (orchestrator + researcher + writer), then build out the skills library, migrate remaining agents, wire pipeline triggers and enforcement hooks, engineer the feedback propagation system (the project's core value), and validate end-to-end with a real pipeline run. Six phases, derived from 61 requirements across 7 categories, with each phase delivering a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Architecture Validation** - Directory structure, CLAUDE.md, channel identity, and 3 proof-of-concept agents validating the 2-tier delegation pattern
- [ ] **Phase 2: Skills Library** - All domain skills built with crafting guide compliance, reflection loops, and context-loading patterns
- [ ] **Phase 3: Agent Migration & Memory** - Remaining agents migrated with full tool scoping, per-agent persistent memory seeded from V5 expertise files
- [ ] **Phase 4: Pipeline Triggers & Hooks** - Slash-command skills for every pipeline stage, domain enforcement hook, session logging, and agent audit
- [ ] **Phase 5: Feedback Propagation** - SIGNALS.md cross-agent insight system, verification gates at pipeline boundaries, feedback flow validated
- [ ] **Phase 6: Integration & End-to-End Validation** - Full pipeline run from topic through edit sheet, Python script invocation, GPU conda access, database and library access

## Phase Details

### Phase 1: Foundation & Architecture Validation
**Goal**: The Claude Code project is structurally sound and the 2-tier delegation pattern is proven with a working orchestrator-researcher-writer vertical slice
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, AGNT-01, AGNT-03, AGNT-04, AGNT-13
**Success Criteria** (what must be TRUE):
  1. User can open the project in Claude Code and the orchestrator agent loads as the default agent with routing table and delegation instructions visible
  2. User can ask the orchestrator to delegate a research task and it dispatches the researcher subagent, which completes work and returns results to the main session
  3. User can ask the orchestrator to delegate a writing task and the writer subagent produces output with voice profile awareness
  4. Researcher and writer agents read their MEMORY.md at session start and update it after completing work (mental model lifecycle validated)
  5. A smoke test script confirms that file operations work correctly in the project path (spaces and periods in path: "D. Mysteries Channel", "V0.6")
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Directory scaffold, CLAUDE.md with agent reference table, channel docs migration from V5, skill crafting guide, agent-protocols shared skill
- [x] 01-02-PLAN.md — Researcher and writer agent definitions with fat bodies, MEMORY.md seeds from V5 expertise YAML
- [x] 01-03-PLAN.md — Windows path smoke test script, human verification of agent invocation

### Phase 2: Skills Library
**Goal**: Every domain skill is built as an independently usable Claude Code skill with consistent structure, reflection loops, and context-loading patterns
**Depends on**: Phase 1
**Requirements**: SKIL-01, SKIL-02, SKIL-03, SKIL-04, SKIL-05, SKIL-06, SKIL-07, SKIL-08, SKIL-09, SKIL-10, SKIL-11, SKIL-12
**Success Criteria** (what must be TRUE):
  1. User can invoke any skill via its slash command (e.g., `/documentary-research`, `/archive-search`) and it produces structured domain-specific output
  2. Every skill directory contains SKILL.md (no line cap per D-08), insights.md, and optional prompts/, scripts/, references/ directories
  3. Every skill reads insights.md at start (Phase 0 context loading) and appends a one-line insight after completion (reflection phase)
  4. Each skill explicitly tags heuristic vs. deterministic sections in its procedure
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Editorial/web research skills: documentary-research, archive-search, crawl4ai-scraping
- [ ] 02-02-PLAN.md — Visual/analytical skills: visual-narrative, media-evaluation, data-analysis
- [ ] 02-03-PLAN.md — Process skills: autoresearch, structured-output
- [ ] 02-04-PLAN.md — Validation, crafting guide update, REQUIREMENTS update, config agent_skills mapping

### Phase 3: Agent Migration & Memory
**Goal**: All consolidated agents exist with specialized personas, tool scoping restricts each agent to its domain, and every agent has persistent memory seeded from V5 expertise
**Depends on**: Phase 1, Phase 2
**Requirements**: AGNT-02, AGNT-05, AGNT-06, AGNT-07, AGNT-08, AGNT-09, AGNT-10, AGNT-11, AGNT-12, AGNT-15, MEMO-01, MEMO-02, MEMO-03, MEMO-04, MEMO-05, MEMO-06, MEMO-07
**Success Criteria** (what must be TRUE):
  1. User can invoke any agent by name (strategy, style-extractor, editorial-lead, visual-researcher, visual-planner, asset-processor, asset-curator, meta, compiler) and each responds with its specialized persona and domain knowledge
  2. Each agent's tools field restricts it to only the capabilities relevant to its domain (e.g., asset-processor can invoke CLIP scripts but not strategy scripts)
  3. Every agent has a MEMORY.md at `.claude/agent-memory/<name>/MEMORY.md` seeded with converted V5 YAML expertise content, structured with key_files, decisions, patterns, observations, open_questions
  4. Per-skill insights.md files accumulate entries across runs and trigger merge at 20+ entries, with promotion to SKILL.md when 3+ entries converge
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Pipeline Triggers & Hooks
**Goal**: Users can run every pipeline stage via slash commands, domain enforcement prevents agents from writing outside their scope, and delegations are logged
**Depends on**: Phase 3
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07, PIPE-08, HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):
  1. User can run `/strategy`, `/research`, `/write-script`, `/visual-plan`, `/process-assets`, and `/compile` and each triggers the correct agent(s) invoking existing Python scripts via Bash
  2. Human checkpoints pause the pipeline after `/strategy` (topic selection) and after `/process-assets` (asset review) requiring user approval before continuing
  3. An agent attempting to write outside its allowed directory is blocked by the PreToolUse domain enforcement hook with a clear error message
  4. Agent delegations are captured in a project-local JSONL session log by the PostToolUse hook
  5. User can run `/audit-agents` and it validates all agent definitions for required fields, valid tool scoping, skill references, and memory setup
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Feedback Propagation
**Goal**: Downstream agent insights flow back to influence upstream agent behavior in subsequent pipeline runs -- the pipeline gets smarter over time
**Depends on**: Phase 4
**Requirements**: AGNT-14, MEMO-08, MEMO-09, MEMO-10, SKIL-13
**Success Criteria** (what must be TRUE):
  1. After an agent completes work, it writes structured timestamped insights to SIGNALS.md that are tagged by source agent
  2. The orchestrator reads SIGNALS.md at delegation time and passes relevant insights to the target agent's delegation prompt
  3. Agents invoked directly (not via orchestrator) read SIGNALS.md themselves at session start
  4. Verification gates at pipeline stage boundaries (research-to-script, script-to-visual-plan, visual-plan-to-assets) check cross-stage quality before proceeding
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Integration & End-to-End Validation
**Goal**: The complete pipeline runs end-to-end from topic selection through DaVinci Resolve edit sheet, with all Python scripts, GPU operations, databases, and video library accessible
**Depends on**: Phase 5
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04, INTG-05
**Success Criteria** (what must be TRUE):
  1. A real topic can be taken through the full pipeline (strategy -> research -> script -> visual plan -> asset processing -> compilation) producing a DaVinci Resolve-ready edit sheet
  2. CLIP embedding and semantic search operations run successfully on the RTX 4070 via the conda perception-models environment
  3. Strategy and editorial agents can read/write the SQLite databases (channel_assistant.db, asset_catalog.db)
  4. Asset Curator agent can access and manage the global video library at D:/VideoLibrary/
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Architecture Validation | 0/3 | Planning complete | - |
| 2. Skills Library | 1/4 | In Progress|  |
| 3. Agent Migration & Memory | 0/3 | Not started | - |
| 4. Pipeline Triggers & Hooks | 0/3 | Not started | - |
| 5. Feedback Propagation | 0/2 | Not started | - |
| 6. Integration & End-to-End Validation | 0/2 | Not started | - |

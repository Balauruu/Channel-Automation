# Requirements: Unified Memory System

**Defined:** 2026-04-20
**Core Value:** Agents learn from past runs and don't repeat mistakes — knowledge persists across sessions with clear scope boundaries.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Capture

- [x] **CAPT-01**: Single pipeline-observe.sh hook captures both main conversation and subagent events to obs.jsonl
- [x] **CAPT-02**: Main conversation events (PreToolUse/PostToolUse without agent_id) are recorded with tool name, input/output, timestamp
- [x] **CAPT-03**: Subagent events include full detail: dispatch prompt, tool calls, thinking blocks, completions with outcome classification
- [x] **CAPT-04**: All writes are atomic (single os.write() call, <4KB per line) to prevent JSONL corruption under concurrent async hooks
- [x] **CAPT-05**: Per-tool duration computed at SubagentStop by matching tool_pre→tool_post pairs on tool_use_id
- [x] **CAPT-06**: File rotation at 10MB with timestamped archive; 30-day auto-purge of archive files
- [x] **CAPT-07**: Windows path safety — handle spaces in project path, avoid MSYS2 path mangling when passing to Python

### Observer

- [x] **OBSV-01**: @observer subagent (Sonnet 4.6) reads obs.jsonl and extracts reusable learnings from completed runs
- [x] **OBSV-02**: Observer filters runs by agent_id presence (subagent) vs absence (main conversation)
- [x] **OBSV-03**: Each candidate is classified against 3 scope-test questions; candidates that don't clearly pass exactly one test are rejected
- [x] **OBSV-04**: Observer writes entries to ## Pending Review section in target memory file with evidence citations
- [x] **OBSV-05**: Observer deduplicates against existing entries in target memory files before writing
- [x] **OBSV-06**: Observer does not observe its own runs (self-loop prevention via agent_id filtering)
- [x] **OBSV-07**: Observer tracks cursor position in obs.jsonl (knows where it left off between invocations)
- [x] **OBSV-08**: Rejected candidates are logged with reason so observer can improve signal-to-noise over time

### Evolve Command

- [x] **EVLV-01**: Single /evolve command dispatches observer for new runs then reviews ## Pending Review entries
- [x] **EVLV-02**: Review presents entries grouped by target file (insights.md files, then MEMORY.md files, then PLAYBOOK.md)
- [ ] **EVLV-03**: For each entry, user can: promote (move to final section), edit (modify then promote), revert (delete entry, git revert if needed)
- [x] **EVLV-04**: Memory consolidation: when a file approaches 200-line cap, /evolve proposes merging, removing, or promoting entries (not just deleting)

### Memory Layer

- [x] **MEML-01**: Entries include categorical confidence tag inline: `[HIGH]`, `[MED]`, or `[LOW]`
- [x] **MEML-02**: Decay rules: LOW entries expire after 14 days, MED after 30 days (HIGH entries persist indefinitely)
- [x] **MEML-03**: agent-protocols skill rewritten thin — no signals, no project-memories, no scratchpad; agents consume memory passively (D-02: observer routes PLAYBOOK entries to agent MEMORY.md instead of agents reading PLAYBOOK directly)
- [x] **MEML-04**: PLAYBOOK.md uses Open/Resolved sections; observer manages lifecycle (writes new entries, proposes resolution when absorbed)
- [x] **MEML-05**: agent-observability skill fully rewritten for new paths (obs.jsonl), new schema, new debug recipes
- [x] **MEML-06**: observation pipeline documented in agent-observability skill covering observer system, /evolve command, event schema, and PLAYBOOK routing (D-11: merged into agent-observability instead of separate skill)

### Cleanup

- [x] **CLEANUP-01**: All deprecated files removed from git (obs.js, check-definition-signals.js, autoresearch skill, old test fixtures)
- [x] **CLEANUP-02**: CLAUDE.md Folder Map accurate — no dead entries (project-memories/, feedback/), includes new system paths (PLAYBOOK.md, observations/)
- [x] **CLEANUP-03**: PROJECT.md Current State reflects working unified memory system, not broken state
- [x] **CLEANUP-04**: Codebase maps regenerated to describe new system (no old-system references)
- [x] **CLEANUP-05**: Full grep audit confirms zero stale old-system references in any live file

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhancements

- **ENH-01**: Background observer mode (daemon that auto-analyzes between sessions)
- **ENH-02**: Session-start-nudge hook (surfaces accumulated work counts)
- **ENH-03**: Auto-promotion of HIGH-confidence entries without human review
- **ENH-04**: Secret scrubbing on captured content (redact API keys, tokens from events)
- **ENH-05**: Observer learns from rejection patterns to auto-suppress low-value candidates

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing 3-layer memory (insights/MEMORY/PLAYBOOK) | LOCKED architecture decision |
| Direct API calls / ANTHROPIC_API_KEY | Billing constraint — Max subscription only |
| Vector stores / databases | File-based is correct at this scale (<2,200 lines total) |
| Numeric confidence scoring (0.3-0.9) | LLMs can't calibrate; categorical is sufficient |
| memory-candidates/ staging directory | Replaced by ## Pending Review sections |
| Separate /learn command | Merged into /evolve |
| CLv2's 60K Python CLI | Ideas borrowed, not implementation |
| Real-time coordination / pub-sub | Pipeline agents are non-concurrent; file mailbox is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAPT-01 | Phase 1 | Complete (01-01) |
| CAPT-02 | Phase 1 | Complete (01-01) |
| CAPT-03 | Phase 1 | Complete (01-02, verified 01-03) |
| CAPT-04 | Phase 1 | Complete (01-01) |
| CAPT-05 | Phase 1 | Complete (01-02, verified 01-03) |
| CAPT-06 | Phase 1 | Complete (01-01) |
| CAPT-07 | Phase 1 | Complete (01-01) |
| OBSV-01 | Phase 2 | Complete |
| OBSV-02 | Phase 2 | Complete |
| OBSV-03 | Phase 2 | Complete |
| OBSV-04 | Phase 2 | Complete |
| OBSV-05 | Phase 2 | Complete |
| OBSV-06 | Phase 2 | Complete |
| OBSV-07 | Phase 2 | Complete |
| OBSV-08 | Phase 2 | Complete |
| MEML-01 | Phase 2 | Complete |
| EVLV-01 | Phase 3 | Complete |
| EVLV-02 | Phase 3 | Complete |
| EVLV-03 | Phase 3 | Pending |
| MEML-03 | Phase 4 | Complete |
| MEML-04 | Phase 4 | Complete |
| MEML-05 | Phase 4 | Complete |
| MEML-06 | Phase 4 | Complete |
| EVLV-04 | Phase 5 | Complete |
| MEML-02 | Phase 5 | Complete |
| CLEANUP-01 | Phase 6 | Complete |
| CLEANUP-02 | Phase 6 | Complete |
| CLEANUP-03 | Phase 6 | Complete |
| CLEANUP-04 | Phase 6 | Complete |
| CLEANUP-05 | Phase 6 | Complete |

### Gap Closure (Phase 7)

Phase 7 closes audit gaps that are not implementation work but verification and tracking:
- EVLV-03 acceptance (D-04 override stamp)
- CLEANUP-01..03 verification (write 06-VERIFICATION.md)
- Integration stale refs (observer.md, agent-observability SKILL.md)
- Checkbox and traceability updates for 8 verified requirements

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-22 after Phase 7 milestone close-out*

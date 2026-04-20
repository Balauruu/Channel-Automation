# Requirements: Unified Memory System

**Defined:** 2026-04-20
**Core Value:** Agents learn from past runs and don't repeat mistakes — knowledge persists across sessions with clear scope boundaries.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Capture

- [ ] **CAPT-01**: Single pipeline-observe.sh hook captures both main conversation and subagent events to obs.jsonl
- [ ] **CAPT-02**: Main conversation events (PreToolUse/PostToolUse without agent_id) are recorded with tool name, input/output, timestamp
- [ ] **CAPT-03**: Subagent events include full detail: dispatch prompt, tool calls, thinking blocks, completions with outcome classification
- [ ] **CAPT-04**: All writes are atomic (single os.write() call, <4KB per line) to prevent JSONL corruption under concurrent async hooks
- [ ] **CAPT-05**: Per-tool duration computed at SubagentStop by matching tool_pre→tool_post pairs on tool_use_id
- [ ] **CAPT-06**: File rotation at 10MB with timestamped archive; 30-day auto-purge of archive files
- [ ] **CAPT-07**: Windows path safety — handle spaces in project path, avoid MSYS2 path mangling when passing to Python

### Observer

- [ ] **OBSV-01**: @observer subagent (Sonnet 4.6) reads obs.jsonl and extracts reusable learnings from completed runs
- [ ] **OBSV-02**: Observer filters runs by agent_id presence (subagent) vs absence (main conversation)
- [ ] **OBSV-03**: Each candidate is classified against 3 scope-test questions; candidates that don't clearly pass exactly one test are rejected
- [ ] **OBSV-04**: Observer writes entries to ## Pending Review section in target memory file with evidence citations
- [ ] **OBSV-05**: Observer deduplicates against existing entries in target memory files before writing
- [ ] **OBSV-06**: Observer does not observe its own runs (self-loop prevention via agent_id filtering)
- [ ] **OBSV-07**: Observer tracks cursor position in obs.jsonl (knows where it left off between invocations)
- [ ] **OBSV-08**: Rejected candidates are logged with reason so observer can improve signal-to-noise over time

### Evolve Command

- [ ] **EVLV-01**: Single /evolve command dispatches observer for new runs then reviews ## Pending Review entries
- [ ] **EVLV-02**: Review presents entries grouped by target file (insights.md files, then MEMORY.md files, then PLAYBOOK.md)
- [ ] **EVLV-03**: For each entry, user can: promote (move to final section), edit (modify then promote), revert (delete entry, git revert if needed)
- [ ] **EVLV-04**: Memory consolidation: when a file approaches 200-line cap, /evolve proposes merging, removing, or promoting entries (not just deleting)

### Memory Layer

- [ ] **MEML-01**: Entries include categorical confidence tag inline: `[HIGH]`, `[MED]`, or `[LOW]`
- [ ] **MEML-02**: Decay rules: LOW entries expire after 14 days, MED after 30 days (HIGH entries persist indefinitely)
- [ ] **MEML-03**: agent-protocols skill rewritten thin — no signals, no project-memories, no scratchpad; adds PLAYBOOK read at task start
- [ ] **MEML-04**: PLAYBOOK.md uses Open/Resolved sections; observer manages lifecycle (writes new entries, proposes resolution when absorbed)
- [ ] **MEML-05**: agent-observability skill fully rewritten for new paths (obs.jsonl), new schema, new debug recipes
- [ ] **MEML-06**: pipeline-learning skill created documenting the observer system, /evolve command, event schema

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
| CAPT-01 | Phase 1 | Pending |
| CAPT-02 | Phase 1 | Pending |
| CAPT-03 | Phase 1 | Pending |
| CAPT-04 | Phase 1 | Pending |
| CAPT-05 | Phase 1 | Pending |
| CAPT-06 | Phase 1 | Pending |
| CAPT-07 | Phase 1 | Pending |
| OBSV-01 | Phase 2 | Pending |
| OBSV-02 | Phase 2 | Pending |
| OBSV-03 | Phase 2 | Pending |
| OBSV-04 | Phase 2 | Pending |
| OBSV-05 | Phase 2 | Pending |
| OBSV-06 | Phase 2 | Pending |
| OBSV-07 | Phase 2 | Pending |
| OBSV-08 | Phase 2 | Pending |
| MEML-01 | Phase 2 | Pending |
| EVLV-01 | Phase 3 | Pending |
| EVLV-02 | Phase 3 | Pending |
| EVLV-03 | Phase 3 | Pending |
| MEML-03 | Phase 4 | Pending |
| MEML-04 | Phase 4 | Pending |
| MEML-05 | Phase 4 | Pending |
| MEML-06 | Phase 4 | Pending |
| EVLV-04 | Phase 5 | Pending |
| MEML-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 after roadmap phase mapping*

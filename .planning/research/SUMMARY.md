# Project Research Summary

**Project:** Unified Memory System (Channel-Automation V0.6)
**Domain:** File-based agent memory, observability, and cross-agent coordination
**Researched:** 2026-04-20
**Confidence:** HIGH (stack, architecture) / MEDIUM (confidence scoring, lifecycle)

## Executive Summary

This system is a file-based memory and observability layer for an 11-agent documentary production pipeline. The expert consensus across all four research streams is clear: at this scale (11 agents, <200 lines per memory file, sequential execution), markdown files read in full context decisively outperform vector databases, message buses, and every other enterprise pattern. The recommended build is a four-component pipeline -- capture hook (already implemented), observer subagent (Sonnet 4.6), `/evolve` review command, and agent-protocols consumption update -- connected by append-only JSONL event logs and three-tier markdown memory (insights.md, MEMORY.md, PLAYBOOK.md).

The key architectural insight is that the system constraints (sequential agent execution, human-in-the-loop, 200-line memory caps) eliminate entire categories of complexity. There is no concurrent write scenario in normal operation, no need for pub/sub coordination, and no retrieval problem that grep cannot solve. The hard problems are classification accuracy (routing observations to the correct memory tier), corruption resilience (the observer writes directly without staging), and confidence calibration (preventing score inflation over time). These three areas are where the researchers surfaced genuine disagreements that the roadmap must resolve.

The primary risk is the direct-write decision: the user eliminated staging buffers for simplicity, but the pitfalls research documents real corruption scenarios when an LLM observer writes directly to production memory files. The mitigation is a defense-in-depth strategy -- evidence-linked entries, explicit scope-test reasoning, git-based revert via `/evolve --revert`, and a `## Pending Review` visual separation within memory files. This is a reasonable tradeoff if implemented together; any single mitigation alone is insufficient.
## Key Findings

### Recommended Stack

The stack is locked and well-validated. Bash + inline Python for hooks (already deployed in `pipeline-observe.sh`), JSONL for event logs, markdown for memory, and Claude Sonnet 4.6 via subagent dispatch for analysis. No external dependencies. No npm packages. No databases. No API keys.

**Core technologies:**
- **Bash + inline Python** (hook runtime) -- already deployed and working; avoids the async race that killed the Node.js `obs.js` approach
- **JSONL append-only logs** (event capture) -- industry standard; line-oriented; git-friendly; streaming-readable
- **3-tier markdown memory** (insights.md / MEMORY.md / PLAYBOOK.md) -- human-readable, git-diffable, fits in context window; validated by Manus, coleam00, and multiple independent sources
- **Sonnet 4.6 subagent** (observer) -- 1M context handles full event detail; subscription-covered; no external API cost

### Expected Features

**Must have (table stakes) -- all implemented or nearly so:**
- Per-agent persistent memory (MEMORY.md) with 200-line cap
- Read-at-start injection via agent-protocols
- Timestamped, sectioned entries with append-only discipline
- Skill-level insights accumulation (insights.md)
- Event logging via pipeline-observe.sh hook
- Human review gate before memory promotion

**Should have (differentiators):**
- Cross-agent coordination inbox (PLAYBOOK.md) -- the file-based mailbox pattern, not pub/sub
- Observer-driven insight extraction -- separation of observation from action prevents self-reinforcing errors
- Confidence tagging on memory entries -- enables decay and triage
- Two-stream event capture (agent events + session events in obs.jsonl)
- Progressive trust / graduated autonomy for low-risk memory categories

**Defer (v2+) -- explicitly anti-features at this scale:**
- Vector/semantic search (grep suffices under 2,200 total entries)
- Real-time pub/sub coordination (agents never run simultaneously)
- Multi-dimensional numeric confidence scoring (A-MAC style)
- Automatic Ebbinghaus time-based decay
- Agent self-modification of definitions
- Per-project SQLite/vector databases
- Automated cross-agent insight routing without human review
### Architecture Approach

Four components with strict single-writer boundaries: `pipeline-observe.sh` captures events to obs.jsonl (never writes memory), `@observer` analyzes events and writes memory (never captures), `/evolve` provides human review and revert (the only path to mark PLAYBOOK entries resolved), and pipeline agents consume memory at task start (never write to each other's files). The build order follows data flow: capture (done) -> observer -> /evolve -> agent-protocols update.

**Major components:**
1. **pipeline-observe.sh** -- capture raw hook events to obs.jsonl; already implemented with 10MB rotation and 30-day purge
2. **@observer subagent** -- classify events, extract insights, route to correct memory tier using scope-test decision tree
3. **/evolve command** -- human-in-the-loop review; batch presentation of proposed entries grouped by destination; revert capability
4. **agent-protocols update** -- add PLAYBOOK.md reading at task start for all agents

### Critical Pitfalls

1. **JSONL concurrent write corruption** -- `async: true` hooks produce interleaved JSON lines; keep lines under 4KB; validate every line on read; use write-then-rename for subagent_stop batch events. Phase 1 blocker.
2. **Direct-write memory corruption** -- observer writes without staging buffer; mitigate with evidence-linked entries, `## Pending Review` section, and git-based revert. Phase 2 design constraint.
3. **Information bleeding between memory layers** -- scope-test classification is ambiguous in gray zones; require explicit scope-test reasoning from observer; reject candidates that arguably pass two tests. Phase 2 core challenge.
4. **Observer self-loop** -- observer generates hook events that it later re-processes; filter observer agent_type at both capture and analysis time. Phase 2 must-fix.
5. **Windows/Git Bash path mangling** -- MSYS2 path translation corrupts paths with spaces (the actual project path has spaces); normalize at script start; set `MSYS_NO_PATHCONV=1`. Phase 1 hardening.
## Key Tensions Between Research Streams

These disagreements are the most valuable findings. The roadmap must resolve each one.

### Tension 1: One Stream vs Two Streams (obs.jsonl)

- **STACK.md recommends:** Split into `agents.jsonl` + `sessions.jsonl` (two files, separated by event type)
- **ARCHITECTURE.md recommends:** Single unified `obs.jsonl` with agent_id filtering (one file, keep insertion order)
- **Resolution: Follow ARCHITECTURE.md.** The temporal interleaving argument is decisive -- the observer needs to correlate dispatch events with subsequent subagent behavior, and two files require merge-sort by timestamp. Agent_id filtering is a one-line predicate. One file also halves the NTFS locking surface area on Windows. The STACK.md two-file proposal adds complexity for zero analytical benefit.

### Tension 2: Confidence Scoring Model

- **STACK.md recommends:** 4-dimension weighted formula (Utility 0.30, Confidence 0.25, Novelty 0.25, Recency 0.20), threshold 0.55, derived from A-MAC
- **FEATURES.md recommends:** Single scalar 0.3-0.9, explicitly calls multi-dimensional scoring an anti-feature
- **ARCHITECTURE.md recommends:** Three categorical levels (HIGH/MED/LOW) with clear criteria, explicitly calls numeric scores an anti-pattern
- **PITFALLS.md flags:** Numeric scores inflate over time regardless of dimensionality (Pitfall 4)
- **Resolution: Follow ARCHITECTURE.md -- use categorical HIGH/MED/LOW.** Three reasons: (1) LLMs cannot produce calibrated numeric probabilities, so 0.72 vs 0.65 is noise; (2) the human reviewer during `/evolve` needs actionable categories, not numbers to interpret; (3) the pitfalls research shows even simple numeric scores inflate. The A-MAC formula is academically interesting but wrong for this system. Reserve numeric scoring as a v2 experiment after categorical proves insufficient.

### Tension 3: Direct Write Safety (No Staging)

- **PROJECT.md decided:** No staging directory; observer writes directly; `/evolve` reviews
- **PITFALLS.md flags:** This creates real corruption risk (Pitfall 2); LLM hallucination is nonzero; rubber-stamping during review is likely at scale
- **ARCHITECTURE.md validates:** No staging anti-pattern (Anti-Pattern 3); revert is cheaper than prevent
- **Resolution: Accept direct write but layer mitigations.** The user decision stands. Implement all four mitigations together: (1) observer must cite specific obs.jsonl timestamps as evidence, (2) `## Pending Review` visual section in memory files for entries added since last `/evolve`, (3) `/evolve` shows memory diff (what changed since last review), (4) `git revert` as escape hatch for bad batches. Do not implement any single mitigation in isolation.

### Tension 4: PLAYBOOK.md Lifecycle Complexity

- **STACK.md:** Flat Open/Resolved sections with PB-NNN entries, simple lifecycle
- **FEATURES.md:** Validates inbox pattern, warns against treating it as a message bus
- **ARCHITECTURE.md:** Open/Resolved is correct at current scale; switch to per-agent sections at 20+ entries
- **PITFALLS.md (Pitfall 12):** Warns about no delivery guarantees; suggests 4-state lifecycle (pending -> acknowledged -> resolved -> archived)
- **Resolution: Start simple (Open/Resolved), evolve if needed.** The 4-state lifecycle from PITFALLS.md is premature for <20 entries. Open/Resolved with observer-managed resolution (verify target agent MEMORY.md absorbed the insight) is sufficient. Add the per-agent section structure as a documented migration path, not an initial build requirement.
## Implications for Roadmap

### Phase 1: Capture Hook Hardening
**Rationale:** The observer cannot produce valid analysis from corrupted input. All three Phase 1 pitfalls (JSONL corruption, Windows paths, rotation races) must be resolved before any observer touches obs.jsonl.
**Delivers:** Battle-hardened pipeline-observe.sh producing reliably valid JSONL
**Addresses:** Table stakes (event logging integrity), differentiator (two-stream event capture via agent_id field)
**Avoids:** Pitfall 1 (JSONL corruption), Pitfall 5 (rotation TOCTOU), Pitfall 7 (Windows path mangling), Pitfall 10 (secret leakage)
**Key work:** Truncate JSON lines to <4KB; add per-line validation; write-then-rename for subagent_stop batches; normalize paths at script start; add observer agent_type to capture skip list; extend secret scrubbing for URL credentials

### Phase 2: Observer Agent + Direct Write
**Rationale:** The core value proposition. Once capture is reliable, the observer can analyze events and write to memory. This is the largest and most complex phase because it contains the scope-test classification logic, confidence tagging, and all direct-write safety mitigations.
**Delivers:** @observer agent definition; scope-test decision tree; confidence tagging (HIGH/MED/LOW); deduplication check; evidence-linked entries; cursor-based incremental processing
**Addresses:** Differentiators (observer-driven extraction, confidence scoring, cross-agent coordination)
**Avoids:** Pitfall 2 (direct-write corruption), Pitfall 3 (layer bleeding), Pitfall 6 (self-loop)
**Key work:** Observer agent definition with embedded classification logic; cursor file (.observer-cursor); self-loop filter at analysis time; `## Pending Review` section convention; entry format with [DATE] [CONF] text pattern

### Phase 3: /evolve Review Command
**Rationale:** The human gate. Without it, the observer writes unchecked. This phase connects the observer output to human judgment.
**Delivers:** /evolve skill or slash command; batch review UX (grouped by destination); approve/edit/discard per entry; memory diff view; revert capability
**Addresses:** Table stakes (human review gate), differentiator (structured review UX)
**Avoids:** Pitfall 2 (rubber-stamping via clear diff presentation), Pitfall 4 (confidence inflation via review of LOW entries older than 14 days)
**Key work:** /evolve skill definition; observer dispatch in review mode; git-based revert (`/evolve --revert`); review of existing entries (not just new ones); default-to-discard UX

### Phase 4: Agent Consumption + PLAYBOOK Lifecycle
**Rationale:** The final link in the chain. Agents must read PLAYBOOK.md at task start, and the resolution lifecycle must work end-to-end.
**Delivers:** agent-protocols update (add PLAYBOOK.md read step); PLAYBOOK Open/Resolved lifecycle; signals.yaml deprecation
**Addresses:** Differentiator (cross-agent coordination inbox)
**Avoids:** Pitfall 12 (unbounded PLAYBOOK growth via resolution lifecycle)
**Key work:** One-line addition to agent-protocols; observer resolution logic (verify absorption into target MEMORY.md); drop signals.yaml references; document migration path to per-agent sections at 20+ entries

### Phase 5: Memory Lifecycle Management
**Rationale:** Only needed once memory files approach capacity. This is optimization, not foundation.
**Delivers:** Consolidation pass (dedup, stale removal, contradiction resolution); archive mechanism (MEMORY.archive.md); confidence decay for LOW/MED entries
**Addresses:** Differentiator (structured consolidation), table stakes (deduplication)
**Avoids:** Pitfall 4 (confidence inflation), Pitfall 8 (stale entries)
**Key work:** Consolidation logic in /evolve or separate /dream command; LOW entries expire at 14 days, MED at 30 days; archive removed entries rather than delete; supersession tracking for contradictory entries
### Phase Ordering Rationale

- Capture before analysis: The observer cannot extract valid learnings from corrupted JSONL. Phase 1 is a hard prerequisite.
- Observer before review: `/evolve` has nothing to review until the observer produces entries. Phase 2 before Phase 3.
- Review before consumption: Agents should not read unreviewed PLAYBOOK entries. Phase 3 before Phase 4.
- Lifecycle last: Consolidation and decay are optimization for a system that has accumulated enough data to need them. Phase 5 can wait until memory files approach 100+ lines.
- Phases 2 and 3 are tightly coupled: The observer output format must match `/evolve` input expectations. Design them together even if built sequentially.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Observer):** The scope-test classification logic is the hardest design problem. The observer prompt must include positive and negative examples for each memory tier. Research the exact boundary between skill insights and agent memory for shared tools.
- **Phase 3 (/evolve UX):** The batch review presentation needs prototyping. How does the user approve/edit/discard within a subagent text output? This may require a structured output format that the main session can parse.

Phases with standard patterns (skip deep research):
- **Phase 1 (Capture hardening):** Well-documented; the pitfalls have specific fixes; the current code is the starting point.
- **Phase 4 (Agent consumption):** One-line protocol update; straightforward.
- **Phase 5 (Lifecycle):** Can be designed when needed; patterns from Claude Code Auto Dream and learnings.md are well-documented.
## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Ecosystem validated; existing implementation confirms choices; multiple independent sources converge on markdown-over-DB at this scale |
| Features | HIGH | Table stakes mapped against Claude Code, Copilot, Augment, Cursor; anti-features clearly justified; dependency chain documented |
| Architecture | HIGH | Four-component boundary is clean; data flow is unambiguous; build order follows dependency chain; all researchers agree on component responsibilities |
| Pitfalls | HIGH (identification) / MEDIUM (mitigations) | Pitfalls are well-documented with real issue numbers; specific mitigations for direct-write corruption need validation during implementation |
| Confidence Scoring | MEDIUM | Researchers disagree (formula vs categorical vs anti-feature); categorical chosen but untested in this domain; may need revision after Phase 2 |

**Overall confidence:** HIGH

### Gaps to Address

- **Scope-test boundary cases:** The decision tree for skill vs agent vs playbook classification needs worked examples from actual MEMORY.md and insights.md entries in this codebase. Use existing entries as test cases during Phase 2 design.
- **Observer prompt engineering:** The observer effectiveness depends entirely on its system prompt. No amount of architecture can compensate for a bad prompt. Budget time for iterating on the observer prompt with real obs.jsonl data.
- **/evolve interaction model:** How does the user approve/edit/discard entries in a CLI context? The features research proposes APPROVE/EDIT/DISCARD buttons, but Claude Code is text-based. The observer may need to present entries and wait for user input, or use a structured format the main session interprets.
- **Confidence decay parameters:** LOW entries expire at 14 days, MED at 30 days -- these numbers are borrowed from GitHub Copilot (28-day expiry) and A-MAC (decay lambda). They need empirical tuning against actual pipeline usage patterns.
- **PLAYBOOK entry volume:** The current assumption is <20 entries. If the observer generates more cross-agent insights than expected, the per-agent section migration becomes Phase 4 work rather than deferred.
## Sources

### Primary (HIGH confidence)
- Claude Code Hooks Reference -- event schemas, hook types, SubagentStop fields
- Claude Code Hooks Guide -- implementation patterns, async behavior
- Claude Code Memory Docs -- official memory architecture, 200-line limit
- Multi-agent Coordination Patterns (Anthropic) -- five patterns with when-to-use guidance
- Claude Code JSONL corruption issues #20992, #29198 -- concurrent write corruption
- Claude Code Windows path issues #2602, #29346 -- Git Bash path conversion failures

### Secondary (MEDIUM confidence)
- A-MAC: Adaptive Memory Admission Control (arxiv 2603.04549) -- 5-dimension scoring framework
- coleam00/claude-memory-compiler -- hook capture, LLM extraction, index-based retrieval
- Building Agentic Memory for GitHub Copilot -- architecture decisions
- Augment Code Memory Review -- inline review UX design
- Claude Code Auto Dream -- 4-phase consolidation
- Learnings Loop for Claude Code Skills -- 80-100 entry consolidation threshold
- Memory Triage for AI Agents (fazm.ai) -- 57% entry expiration rate at 30 days

### Tertiary (LOW confidence)
- AgentTrace Structured Logging -- three-surface taxonomy
- Memory for Autonomous LLM Agents (arxiv 2603.07670) -- comprehensive survey
- AI Agent Memory Management (dev.to) -- scaling thresholds

---
*Research completed: 2026-04-20*
*Ready for roadmap: yes*

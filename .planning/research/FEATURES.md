# Feature Landscape: Agent Memory System

**Domain:** File-based memory and learning system for multi-agent AI pipeline
**Researched:** 2026-04-20
**Context:** ~11 specialized agents, markdown-based memory, Sonnet 4.6 observer, /evolve review command

## Table Stakes

Features users expect. Missing = agents repeat mistakes, memory rots, or context is wasted.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-agent persistent memory (MEMORY.md) | Without it, agents restart from zero every session. Every major coding assistant has this: Claude Code auto-memory, Cursor rules, Copilot repository-scoped memories, Augment Code memories | Low | Already implemented. Append-only with 200-line cap matches Claude Code's own limit |
| Read-at-start injection | Memory is useless if not loaded into context. Claude Code auto-injects first 200 lines; Copilot validates memories against codebase at query time | Low | Already implemented via agent-protocols skill. The 200-line cap is critical -- exceeding it silently drops content |
| Timestamped entries | Without dates, you cannot distinguish stale patterns from current ones. Every system uses dates: Claude Code converts relative dates to absolute during Auto Dream; GitHub Copilot expires memories at 28 days | Low | Already implemented. Format: `- [YYYY-MM-DD] observation` |
| Sectioned memory structure | Flat bullet lists become unsearchable past ~30 entries. Claude Code uses topic files; the learnings.md pattern uses 5 sections (Patterns That Work, Mistakes to Avoid, Domain Knowledge, Open Questions, Consolidated Principles) | Low | Already implemented with 5 sections: Key Files, Decisions, Patterns, Observations, Open Questions |
| Append-only write discipline | Agents that edit their own history create self-reinforcing errors (context poisoning). Research shows this is the #1 failure mode in agent memory. Claude Code treats daily files as append-only logs | Low | Already enforced in agent-protocols. Write path must be strictly append; consolidation is a separate privileged operation |
| Skill-level insights (insights.md) | Skills that cannot accumulate learnings plateau after first use. The learnings loop pattern (read at start, append at end, consolidate at threshold) shows measurable improvement after 20-30 runs | Low | Already implemented. Lifecycle: append per run, merge at 20+ entries, promote to SKILL.md at 3+ convergent entries |
| Event logging (obs.jsonl) | Observer cannot extract learnings without raw data. This is the observability layer that feeds the memory system. LangSmith, Langfuse, and Arize Phoenix all provide this for production agents | Med | Already implemented via pipeline-observe.sh hook. Per-tool events + subagent transcripts. 10MB rotation with 30-day archive purge |
| Human review gate before memory promotion | Unsupervised memory writes create context poisoning. Augment Code's core insight: "The main challenge wasn't how to create memories -- it was how to surface them without breaking UX." GitHub Copilot validates memories against codebase; Claude Code Auto Dream lets humans skim and override | Med | Partially implemented -- /evolve dispatches observer + human review. The review step is the critical gate |
| Memory entry deduplication | Without it, the same insight appears 3-5 times after repeated runs. Claude Code Auto Dream merges duplicates; the learnings.md pattern consolidates at 80-100 entries | Med | Not yet implemented as automated step. Currently relies on manual discipline during append |

## Differentiators

Features that set this system apart from generic agent memory. Not expected, but high value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-agent coordination inbox (PLAYBOOK.md) | Multi-agent systems need a shared message space. The file-based mailbox pattern is the most practical coordination mechanism for async agents that don't run simultaneously. Most multi-agent frameworks (LangGraph, CrewAI) require runtime coordination; PLAYBOOK.md works across sessions | Med | Already designed. Open/Resolved lifecycle. PB-NNN entries with source_agent/target/evidence. Key differentiator: agents in this pipeline never run simultaneously, so pub/sub is unnecessary -- inbox pattern is correct |
| Observer-driven insight extraction | Instead of agents self-reporting (biased toward recent work), a dedicated observer analyzes logged events post-hoc and proposes learnings. This is architecturally similar to LangSmith's Insights Agent (GA Oct 2025) which clusters production traces to surface failure patterns. The key advantage: separation of observation from action prevents self-reinforcing errors | High | Core value proposition of the memory system. Sonnet 4.6 observer reads obs.jsonl, proposes entries for MEMORY.md, PLAYBOOK.md, and insights.md. Human approves via /evolve |
| Confidence scoring (0.3-0.9) on memory entries | Research shows LLM memory systems lack confidence calibration. A-MAC decomposes memory value into five dimensions (future utility, factual confidence, semantic novelty, temporal recency, content type prior). A simpler 0.3-0.9 score enables decay without the complexity of multi-dimensional scoring | Med | Proposed. Use confidence to prioritize during consolidation: low-confidence entries are candidates for removal when approaching the 200-line cap. Do NOT use confidence for retrieval filtering -- that creates blind spots |
| Structured consolidation (Dream-like compaction) | Claude Code Auto Dream runs 4 phases: orientation, signal gathering, consolidation, index optimization. The key operations are contradiction removal, duplicate merging, stale cleanup, and date normalization. Without periodic consolidation, memory files become junk drawers. The 80-100 entry threshold from learnings.md pattern is the right trigger | Med | Not yet implemented. Should be part of /evolve or a separate /dream command. Critical constraint: consolidation must not delete -- it should merge, deduplicate, and archive |
| Two-stream event capture (agents.jsonl + sessions.jsonl) | Separating subagent runs from main conversation events enables different analysis patterns. Agent stream captures tool usage, failures, permission denials; session stream captures user corrections, explicit saves, decisions. Observer can weight these differently | Low | Already designed. The pipeline-observe.sh hook captures per-project obs.jsonl with agent_id scoping |
| Progressive trust / graduated autonomy | Start with human review for all memory writes. As observer accuracy improves, selectively remove review gates for low-risk categories (e.g., Key Files updates can auto-promote, but Decisions always need review). Research shows graduated autonomy beats binary flip-the-switch | Low | Design-level decision. Implement as categories in /evolve: auto-approve (Key Files), review-required (Decisions, Patterns), human-only (PLAYBOOK cross-agent entries) |

## Anti-Features

Features to explicitly NOT build. These sound valuable but add complexity without proportional benefit.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Semantic / vector search over memories | Claude Code's memory uses grep (literal keyword matching) and this works fine under 200 lines. memsearch exists for 1000+ memory entries across months of history -- this pipeline has ~11 agent files at 200 lines each = ~2,200 lines total. Vector search adds an embedding model dependency, a database, and retrieval quality tuning for a problem that doesn't exist at this scale | Keep grep/Read. If memory files approach 200 lines consistently, consolidate more aggressively rather than adding search infrastructure |
| Real-time memory sharing / pub-sub message bus | Agents in this pipeline never run simultaneously. A message bus solves concurrent coordination problems this system doesn't have. The file-based mailbox (PLAYBOOK.md) handles async coordination perfectly. Adding Kafka/Redis/NATS for 11 agents that run sequentially is pure overhead | PLAYBOOK.md Open/Resolved lifecycle. Observer writes entries; target agents read at task start. No runtime coordination needed |
| Multi-dimensional confidence scoring (A-MAC style) | A-MAC's 5-dimension scoring (future utility, factual confidence, semantic novelty, temporal recency, content type prior) is designed for autonomous agents with thousands of memories. With 200-line caps and human review, a single scalar confidence (0.3-0.9) captures enough signal. Multi-dimensional scoring adds complexity to both the write path (observer must score 5 axes) and the read path (agents must interpret composite scores) | Single scalar confidence. Observer assigns 0.3-0.9 based on evidence strength. Human adjusts during /evolve review |
| Automatic memory decay / Ebbinghaus forgetting curves | MemoryBank's time-based decay (0.995 hourly factor) is designed for continuously-running agents. This pipeline runs episodically (per-documentary). Time-based decay would incorrectly penalize valid but infrequently-used patterns (e.g., a researcher pattern about CBC archives is valid months later). Decay should be usage-based, not time-based, and consolidation handles this better than continuous decay | Consolidation-time pruning. During /evolve or /dream, flag entries not referenced in N recent runs as candidates for archival. Human decides |
| Agent self-modification of definitions | Signals with `promotion: definition` exist in the protocol but require human/meta review. Letting agents modify their own system prompts creates feedback loops. Research consistently shows self-reinforcing errors as the #1 failure mode. GitHub Copilot explicitly rejects this -- memories are validated against current code, not used to modify agent behavior | Keep promotion: definition as human-only. Observer can propose, but agent definition changes must go through human review and @code-reviewer validation |
| Per-project memory databases (SQLite, Milvus) | Oracle and MongoDB both advocate for database-backed memory at scale, but this system's memory is inherently small (markdown files, 200-line caps). A database adds a dependency, migration burden, and query layer for data that fits in a single context window read. The file-system-as-database pattern works for this scale | Markdown files in git. Human-readable, diffable, version-controlled. If you can `cat` it and understand it, don't database it |
| Automated cross-agent insight routing | Automatically routing insights from one agent to another without human review creates noise. The shared documentation validation problem (agents write docs from their own perspective, creating inconsistency) means cross-agent insights need curation. Auto-routing skips the curation step | Observer proposes PLAYBOOK entries. Human reviews during /evolve. Target agent reads at next task start. Three-step handoff with human gate |
| Offline memory curation service | GitHub Copilot explicitly rejected offline deduplication and curation services as too complex at scale. For an 11-agent pipeline, the /evolve command (dispatched manually) is simpler, more controllable, and provides the human-in-the-loop gate naturally | /evolve command = the curation service. Manual trigger > scheduled cron. The human decides when to consolidate, not a timer |

## Feature Dependencies

```
Event Logging (obs.jsonl) --> Observer Analysis --> Proposed Entries
                                                        |
                                                        v
                                              /evolve Human Review
                                                        |
                                   +--------------------+--------------------+
                                   |                    |                    |
                                   v                    v                    v
                            MEMORY.md update    PLAYBOOK.md entry    insights.md append
                                   |                    |
                                   v                    v
                          Agent reads at start   Target agent reads
                                                  at next task start
                                                        |
                                                        v
                                              Absorb into MEMORY.md
                                                        |
                                                        v
                                              Move to ## Resolved
```

Key dependency chain:
- Logging must work before observer can analyze
- Observer must propose before human can review
- Human must approve before memory is written
- Memory must be written before agent can read it
- PLAYBOOK entry must be absorbed before it can be resolved

## PLAYBOOK.md as Cross-Agent Coordination

### The Pattern

PLAYBOOK.md implements the **file-based mailbox pattern** -- the simplest coordination mechanism that works for async, non-concurrent agents. Research confirms: "Most multi-agent systems only need Pattern 1 (Mailbox) + Pattern 4 (Handoff). Everything else is optimization for scale you probably don't have yet."

### How It Should Work

1. **Write path:** Observer analyzes obs.jsonl, identifies cross-agent patterns (e.g., researcher discovers a source strategy that would help writer's attribution). Observer proposes PB-NNN entry with source_agent, target, issue, body, evidence.

2. **Review gate:** Human reviews during /evolve. Approves, edits, or discards. This prevents the "agents write docs from their own perspective" problem.

3. **Delivery:** Target agent reads PLAYBOOK.md `## Open` section at task start (per agent-protocols). Agent absorbs actionable entries into its own MEMORY.md.

4. **Resolution:** Next /evolve pass confirms target agent's MEMORY.md covers the pattern. Entry moves from `## Open` to `## Resolved`.

### What Makes This Work

- **No runtime coordination needed** -- agents never run simultaneously
- **Human-curated quality** -- every entry passes through /evolve review
- **Evidence-linked** -- entries reference specific agent run IDs from obs.jsonl
- **Self-cleaning** -- resolved entries provide audit trail but don't consume attention
- **Bounded scope** -- one-line issue + multi-line body keeps entries scannable

### What Would Break This

- Auto-routing without review (noise accumulation)
- Entries without evidence references (unfounded claims)
- Target agent ignoring entries (protocol violation)
- No resolution lifecycle (unbounded growth of Open section)

## The /evolve Review UX

### Current Design

Single command dispatches: observer analyzes recent events, proposes additions, human reviews.

### How Similar Systems Handle This

| System | Review UX | Trigger | Batch vs Inline |
|--------|-----------|---------|-----------------|
| Claude Code Auto Dream | Post-hoc consolidation, human skims output | Automatic (24h / 5+ sessions) | Batch |
| Augment Code Memory Review | Inline modal in chat panel, approve/edit/discard per entry | Real-time (during conversation) | Inline |
| GitHub Copilot Memory | Transparent -- memories auto-created, validated at query time, expire at 28 days | Automatic | Neither -- no explicit review |
| Cursor learnings.md | Manual review + weekly consolidation pass | Manual or scheduled | Batch |
| This system (/evolve) | Observer proposes, human reviews batch | Manual command | Batch |

### Recommendation for /evolve UX

The batch review model is correct for this system. Reasons:

1. **Agents run episodically** -- there is no "conversation" to inline-review during. Observer runs post-hoc.

2. **Volume is manageable** -- with ~11 agents producing 1-3 insights per run, a typical /evolve batch is 5-15 proposed entries. This is well within human attention span.

3. **Quality requires context** -- cross-agent entries (PLAYBOOK) need the reviewer to understand both source and target agent domains. This requires focused review, not inline glancing.

### /evolve Output Structure

The observer should present proposed additions grouped by destination:

```
## Proposed Memory Additions

### MEMORY.md Updates (3 entries)
1. [researcher] Pattern: CBC archive URLs from 2004-2010 use new format
   Confidence: 0.7 | Evidence: run-2026-04-17-researcher-001
   > [APPROVE] [EDIT] [DISCARD]

2. [writer] Observation: Institutional scripts need custom arc structure
   Confidence: 0.8 | Evidence: run-2026-04-11-writer-001
   > [APPROVE] [EDIT] [DISCARD]

### PLAYBOOK.md Entries (1 entry)
3. [researcher -> writer] Source hierarchy affects attribution patterns
   Confidence: 0.6 | Evidence: run-2026-04-16-researcher-002
   > [APPROVE] [EDIT] [DISCARD]

### insights.md Appends (2 entries)
4. [autoresearch] 2-3 iteration budget confirmed for documented cold cases
   Confidence: 0.8 | Evidence: run-2026-04-17-researcher-001
   > [APPROVE] [EDIT] [DISCARD]
```

### Critical UX Principles

1. **Show evidence links** -- every proposed entry must reference the obs.jsonl events that support it. Without evidence, the reviewer cannot assess quality.

2. **Group by destination** -- reviewer needs to see MEMORY.md entries separately from PLAYBOOK.md entries and insights.md entries. These require different evaluation criteria.

3. **Default to discard** -- if the reviewer does not act on an entry, it should NOT be auto-approved. Research shows Review Fatigue leads to rubber-stamping; defaulting to discard forces active approval.

4. **Show confidence** -- the observer's confidence score helps the reviewer prioritize attention. Low-confidence entries deserve more scrutiny, not less.

5. **Diff-style for edits** -- when the reviewer edits a proposed entry, show what changed so the observer can learn from corrections in future runs.

## MVP Recommendation

### Phase 1: Foundation (already mostly built)

All table stakes features are implemented or nearly so. Remaining gap:

- **Deduplication logic** -- add to /evolve pipeline so observer flags potential duplicates when proposing entries that overlap existing MEMORY.md content

### Phase 2: Observer + Review Loop

The core differentiating value:

1. Observer reads obs.jsonl events for a project
2. Observer proposes entries with confidence scores and evidence links
3. /evolve presents grouped proposals for human review
4. Approved entries are written to MEMORY.md, PLAYBOOK.md, or insights.md
5. Discarded entries are logged (so observer can learn what gets rejected)

### Phase 3: Consolidation

Once memory files approach the 200-line cap:

1. /dream or integrated into /evolve
2. Merge duplicates, remove stale entries, normalize dates
3. Archive removed entries (don't delete -- move to `MEMORY.archive.md`)
4. Update section organization

### Defer: Everything in Anti-Features

Do not build vector search, real-time coordination, multi-dimensional scoring, time-based decay, agent self-modification, databases, auto-routing, or offline curation. These solve problems this system does not have.

## Sources

### High Confidence (official docs, authoritative sources)
- [Claude Code Memory Docs](https://code.claude.com/docs/en/memory) -- official memory architecture
- [GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/agents/copilot-memory) -- repository-scoped memory with 28-day expiry
- [Building Agentic Memory for GitHub Copilot](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/) -- architecture decisions, citation-based validation
- [Augment Code Memory Review](https://www.augmentcode.com/blog/how-we-built-memory-review) -- inline review UX design
- [Claude Code Auto Dream](https://claudefa.st/blog/guide/mechanics/auto-dream) -- 4-phase consolidation mechanism
- [Cursor Rules Docs](https://cursor.com/docs/rules) -- project rules architecture
- [Kiro Specs](https://kiro.dev/docs/specs/) -- steering files as memory

### Medium Confidence (verified with multiple sources)
- [Learnings Loop for Claude Code Skills](https://www.mindstudio.ai/blog/how-to-build-learnings-loop-claude-code-skills) -- 80-100 entry consolidation threshold, 20-30 runs to measurable improvement
- [Multi-Agent Coordination Patterns](https://dev.to/triqual/multi-agent-ai-5-coordination-patterns-i-learned-the-hard-way-kbk) -- file-based mailbox as primary pattern
- [Claude Code Memory Architecture](https://www.mindstudio.ai/blog/claude-code-source-leak-memory-architecture) -- three-layer design
- [memsearch](https://github.com/zilliztech/memsearch) -- semantic search over markdown memory (reference for what NOT to build at this scale)

### Low Confidence (single source or research papers, needs validation)
- [A-MAC: Adaptive Memory Admission Control](https://arxiv.org/html/2603.04549) -- 5-dimension memory scoring
- [Memory for Autonomous LLM Agents](https://arxiv.org/html/2603.07670v1) -- comprehensive survey, MemoryArena benchmark
- [State of AI Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026) -- industry overview (vendor source)

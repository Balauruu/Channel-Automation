# Architecture Patterns

**Domain:** Agent memory and observability for Claude Code pipelines
**Researched:** 2026-04-20

## System Overview

The memory system has four components connected by two data flows:

```
                       CAPTURE                         ANALYSIS                      CONSUMPTION
                    +-----------+                  +-------------+              +------------------+
  Hook events       |           |   obs.jsonl      |             |  memory      |                  |
  (tool_pre/post,   | pipeline- | --------------> |  @observer   | ----------> | agents read at   |
   subagent_stop)   | observe.sh|   (append-only)  |  (Sonnet 4.6)| files       | task start       |
                    |           |                  |             |              |                  |
                    +-----------+                  +------+------+              +--------+---------+
                                                         |                              |
                                                         v                              |
                                                   /evolve command                      |
                                                   reviews + reverts                    |
                                                                                        v
                                                                              +---------+---------+
                                                                              | 3 memory tiers:   |
                                                                              |  insights.md      |
                                                                              |  MEMORY.md        |
                                                                              |  PLAYBOOK.md      |
                                                                              +-------------------+
```

## Component Boundaries

| Component | Responsibility | Reads | Writes |
|-----------|---------------|-------|--------|
| `pipeline-observe.sh` | Capture raw events from hook lifecycle | Hook stdin JSON, agent transcripts | `obs.jsonl` (per-project, append-only) |
| `@observer` | Classify events, extract insights, route to correct memory tier | `obs.jsonl` | `insights.md`, `MEMORY.md`, `PLAYBOOK.md` |
| `/evolve` command | Human-in-the-loop review of observer outputs; can revert bad entries | All 3 memory files | Same files (revert = edit) |
| Pipeline agents | Consume memory at task start | Their own `MEMORY.md`, their skills' `insights.md` | Own `MEMORY.md` (append at task end, per agent-protocols) |

**Boundary rule:** `pipeline-observe.sh` never writes memory. `@observer` never captures events. Agents never write to each other's memory. These boundaries prevent feedback loops and maintain single-writer semantics on every file.

## Question 1: How Should the Observer Read Both Streams?

### Recommendation: Single unified stream, not two files

The current `pipeline-observe.sh` already writes to a single `obs.jsonl` per project. The original design proposal mentioned two files (`agents.jsonl` and `sessions.jsonl`), but the implemented hook writes everything to one file with an `agent_id` field that distinguishes subagent events from session-level events. This is the correct design. Do not split into two files.

**Rationale:**

1. **Temporal interleaving matters.** The observer needs to correlate main-session tool calls (e.g., the Agent tool call that dispatched a subagent) with the subagent's subsequent behavior. Two files require merge-sort by timestamp; one file preserves insertion order naturally.

2. **Agent ID filtering is trivial.** To get "subagent events only," filter `agent_id != ""`. To get "session events only," filter `agent_id == ""` (or absent). This is a one-line predicate, not an architectural concern.

3. **File locking on Windows.** Two concurrent appenders to two files doubles the surface area for NTFS locking conflicts. A single file with atomic `>>` appends (line-buffered) is safer.

**How the observer should read the stream:**

```
1. Read obs.jsonl tail (last N lines or since last-processed timestamp)
2. Group events by agent_id
3. For each agent run: reconstruct dispatch -> tool_calls -> complete lifecycle
4. Analyze each completed run as a unit
```

The observer should track a cursor (last-processed line number or timestamp) in a small state file (`.claude/logs/observations/<project>/.observer-cursor`) to avoid re-processing the full stream on every invocation.

### Event Windowing

The observer should process events in **completed-run windows**, not line-by-line. A run is complete when a `complete` event arrives for a given `agent_id`. Until then, events for that agent_id are buffered. This ensures the observer never writes memory entries based on partial runs.

```
Window boundary: complete event for agent_id X
Window contents: all events with agent_id == X since that agent_id's dispatch event
```

## Question 2: Optimal PLAYBOOK.md Shape

### Recommendation: Grouped by target agent, inbox pattern with Open/Resolved sections

The existing PLAYBOOK.md structure is correct. The key design choices:

**Why grouped by target, not flat list:**
- Agents read PLAYBOOK.md at task start (per agent-protocols). A flat list forces every agent to scan every entry. Grouping by target lets an agent jump to its section and ignore the rest.
- However, the current format uses Open/Resolved sections (not per-agent sections). This works at small scale (<20 entries). If entry volume grows, switch to per-agent sections.

**Recommended structure (current scale):**

```markdown
# Playbook -- Cross-Agent Coordination Inbox

## Open

### PB-001
- date: 2026-04-20
- source_agent: researcher
- target: writer
- confidence: HIGH
- issue: CBC archive URLs from 2004-2010 use broken path format
- body: Use cbc.ca/news/canada/... format, not /categories/society/ paths.
  Affects any script referencing CBC archival links.
- evidence: run af15a363

### PB-002
...

## Resolved

### PB-001
- resolved_by: writer
- resolved_date: 2026-04-22
- resolution: Added to writer MEMORY.md Patterns section
```

**Recommended structure (at scale, 20+ entries):**

```markdown
# Playbook

## @writer

### PB-001 (OPEN)
...

### PB-003 (RESOLVED)
...

## @visual-planner

### PB-002 (OPEN)
...
```

**Why not a message bus / pub-sub pattern:**
The system has 11 agents. Message bus patterns (publish/subscribe with topic routing) add architectural complexity justified only at scale (50+ agents, high-frequency events). At this scale, a flat file with grep-by-target is simpler, debuggable, and human-readable. The inbox pattern (Open -> agent reads -> Resolved) maps naturally to markdown sections.

**Key constraint:** PLAYBOOK.md is observer-managed. Agents read it but do not write to it. The `/evolve` command is the only path to mark entries Resolved. This prevents agents from silently acknowledging entries without actually absorbing them.

## Question 3: Confidence Scoring in Markdown Memory Files

### Recommendation: Inline confidence tag on each entry, three levels

Confidence scoring should be lightweight and embedded in the entry text, not a separate metadata structure. Memory files are markdown consumed by LLMs -- structured metadata (YAML frontmatter, JSON blocks) adds parsing complexity without proportional value.

**Format:**

```markdown
## Observations
- [2026-04-20] [HIGH] CBC archive URLs from 2004-2010 use broken path format -- use /news/canada/ paths
- [2026-04-20] [MED] CTV News article bodies appear to be JS-rendered based on single extraction attempt
- [2026-04-20] [LOW] Erudit.org may use bot detection -- saw Anubis page once, unconfirmed pattern
```

**Three confidence levels:**

| Level | Criteria | Observer should assign when... |
|-------|----------|-------------------------------|
| HIGH | Observed 2+ times across different runs, or directly caused a tool_fail/permission_denied with clear evidence | Pattern is reliable |
| MED | Observed once with clear causal chain (event A led to outcome B) | Pattern is plausible but single-observation |
| LOW | Inferred from incomplete data, or observed once with ambiguous causation | Pattern needs validation |

**Decay rule:** `/evolve` should review LOW-confidence entries older than 14 days. If no confirming evidence has appeared, remove them. MED entries get 30 days. HIGH entries persist indefinitely.

**Why not numeric scores (0.0-1.0):**
LLMs are bad at calibrated numeric confidence. "0.7 vs 0.65" is meaningless noise. Three discrete levels (HIGH/MED/LOW) force a categorical judgment that is more actionable and less likely to drift into false precision.

**Integration with existing entry format:**

The current `agent-protocols` skill prescribes `- [YYYY-MM-DD] observation text`. The confidence tag slots in naturally: `- [YYYY-MM-DD] [CONF] observation text`. No format break. The observer writes entries with tags; existing agent-written entries (which lack tags) are implicitly HIGH (agent self-reports are first-person observations).

## Question 4: Event Schema -- obs.jsonl

### Current Schema (Already Implemented)

The existing `pipeline-observe.sh` produces these event types:

| Event | Key Fields | Emitted By |
|-------|------------|------------|
| `dispatch` | `ts`, `session_id`, `agent_id`, `agent_type`, `project`, `prompt`, `cwd` | `subagent_stop` handler (synthesized, backdated to first tool_pre) |
| `tool_pre` | `ts`, `session_id`, `agent_id`, `agent_type`, `tool`, `tool_use_id`, `project`, `input` | `PreToolUse` hook |
| `tool_post` | `ts`, `session_id`, `agent_id`, `agent_type`, `tool`, `tool_use_id`, `project`, `output` | `PostToolUse` hook |
| `tool_fail` | Same as tool_post + `error`, `interrupted` | `PostToolUseFailure` hook |
| `permission_denied` | `ts`, `session_id`, `agent_id`, `tool`, `tool_use_id`, `project`, `input`, `reason` | `PermissionDenied` hook |
| `assistant_message` | `ts`, `session_id`, `agent_id`, `project`, `text`, `thinking`, token counts, `stop_reason` | `subagent_stop` handler (from transcript parse) |
| `complete` | `ts`, `session_id`, `agent_id`, `agent_type`, `project`, `tool_calls`, `tool_fails`, `permission_denials`, token counts, `outcome` | `subagent_stop` handler |

### Schema Sufficiency Assessment

This schema is sufficient for the observer's needs. The observer can derive:

- **What the agent did:** tool_pre/tool_post sequences
- **What went wrong:** tool_fail events with error messages
- **What was blocked:** permission_denied events
- **What the agent was thinking:** assistant_message with thinking field
- **How expensive the run was:** token counts in complete event
- **Whether the run succeeded:** outcome field (completed/stopped/errored)

### One Gap: No session-level events for non-subagent tool calls

The current Layer 4 filter (`agent_id` required for tool events) means main-thread tool calls are not captured. This is intentional -- the main thread is the human conversation, not pipeline behavior. The observer should focus on subagent runs only.

If session-level events are needed later (e.g., tracking which agent the user dispatched and when), the `dispatch` event already captures the prompt. No schema change needed.

## Question 5: Scope-Test Classification

### The Classification Problem

When the observer extracts an insight from an agent run, it must decide which memory tier receives the entry:

| Tier | File | Scope Test Question |
|------|------|-------------------|
| Skill | `.claude/skills/<skill>/insights.md` | "Does this change how the skill/method runs?" |
| Agent | `.claude/agent-memory/<agent>/MEMORY.md` | "Would a fresh instance of this agent need this?" |
| Playbook | `.claude/orchestration/PLAYBOOK.md` | "Does this change how agents hand off?" |

### Decision Tree for the Observer

```
Given: an observation O extracted from agent run R

1. Does O describe a tool/technique/source behavior?
   (e.g., "CBC URLs from 2004 use broken format")
   YES -> Is the tool/technique used by exactly one agent?
          YES -> Agent MEMORY.md
          NO  -> Which skill governs this technique?
                 -> That skill's insights.md
   NO  -> continue

2. Does O describe an agent-specific workflow pattern?
   (e.g., "researcher converges at 3 iterations for well-documented cases")
   YES -> Agent MEMORY.md
   NO  -> continue

3. Does O describe a handoff failure or cross-agent dependency?
   (e.g., "writer received research dossier missing entity_index.json")
   YES -> PLAYBOOK.md (target = downstream agent)
   NO  -> continue

4. Does O describe a recurring error pattern across multiple agents?
   (e.g., "permission denied on .env reads affects researcher and strategy")
   YES -> PLAYBOOK.md (target = all affected agents)
   NO  -> Discard (noise, not a pattern)
```

### Enforcement Mechanism

The observer should include a `scope_rationale` field in its internal reasoning before writing any entry. This is not persisted in the memory file -- it is part of the observer's thinking process. The `/evolve` command should verify that recent entries pass the scope test by checking whether the entry content matches the tier's question.

**Example bad classification (observer should catch):**
- Writing "CBC archive URLs use broken format" to PLAYBOOK.md -- this is a source behavior, not a handoff pattern. Belongs in researcher MEMORY.md or autoresearch insights.md.

**Example correct classification:**
- Writing "researcher dossier should include entity_index.json reference in frontmatter for writer consumption" to PLAYBOOK.md -- this describes a handoff contract between researcher and writer.

### Skill Identification

The observer needs to map tool behaviors to skills. The mapping comes from the skill's `description:` field in its YAML frontmatter. The observer should maintain an in-memory index of skills at startup:

```
skill_name -> description -> [agent_names that list this skill]
```

If an observation relates to behavior described in a skill's scope, and that skill is used by 2+ agents, the observation goes to that skill's insights.md. Otherwise, agent MEMORY.md.

## Question 6: Data Flow

### End-to-End Event Flow

```
Phase 1: CAPTURE (pipeline-observe.sh, synchronous with agent execution)
+------------------------------------------------------------------------+
| Hook fires (PreToolUse/PostToolUse/SubagentStop/etc.)                  |
|   |                                                                    |
|   v                                                                    |
| pipeline-observe.sh receives JSON on stdin                             |
|   |                                                                    |
|   v                                                                    |
| Layer filters (disabled? minimal profile? no agent_id? skip path?)     |
|   |                                                                    |
|   v                                                                    |
| Project detection (scan for projects/<slug>/ in paths/prompt)          |
|   |                                                                    |
|   v                                                                    |
| For tool events: append single JSON line to obs.jsonl                  |
| For subagent_stop: parse transcript, synthesize dispatch +             |
|   assistant_messages + complete, append all to obs.jsonl               |
+------------------------------------------------------------------------+

Phase 2: ANALYSIS (observer subagent, triggered by /observe or /evolve)
+------------------------------------------------------------------------+
| Observer dispatched with target project(s) and time window             |
|   |                                                                    |
|   v                                                                    |
| Read obs.jsonl from cursor to EOF                                      |
|   |                                                                    |
|   v                                                                    |
| Group events into completed runs (dispatch...complete windows)         |
|   |                                                                    |
|   v                                                                    |
| For each completed run:                                                |
|   1. Reconstruct timeline (tool calls, failures, reasoning)            |
|   2. Identify patterns: repeated failures, slow tools,                 |
|      permission walls, reasoning errors                                |
|   3. Extract candidate observations                                    |
|   |                                                                    |
|   v                                                                    |
| For each candidate observation:                                        |
|   1. Run scope-test classification (skill / agent / playbook)          |
|   2. Assign confidence (HIGH / MED / LOW)                              |
|   3. Check for duplicates against existing memory entries              |
|   4. Write to target file if novel                                     |
|   |                                                                    |
|   v                                                                    |
| Update cursor to current EOF position                                  |
+------------------------------------------------------------------------+

Phase 3: REVIEW (/evolve command, human-triggered)
+------------------------------------------------------------------------+
| Human runs /evolve                                                     |
|   |                                                                    |
|   v                                                                    |
| Observer re-reads recent additions to all 3 memory tiers               |
|   |                                                                    |
|   v                                                                    |
| For each recent entry:                                                 |
|   1. Re-validate scope classification                                  |
|   2. Check confidence against accumulated evidence                     |
|   3. Check for contradictions with existing entries                    |
|   4. Recommend: keep / revert / promote (LOW->MED, MED->HIGH)         |
|   |                                                                    |
|   v                                                                    |
| Present recommendations to user                                        |
| User approves or overrides                                             |
| Observer applies approved changes                                      |
+------------------------------------------------------------------------+

Phase 4: CONSUMPTION (agents at task start, per agent-protocols)
+------------------------------------------------------------------------+
| Agent starts task                                                      |
|   |                                                                    |
|   v                                                                    |
| Auto-injected: first 200 lines of own MEMORY.md                       |
|   |                                                                    |
|   v                                                                    |
| Agent reads skills' insights.md (per skill's Phase 0)                  |
|   |                                                                    |
|   v                                                                    |
| Agent reads PLAYBOOK.md, filters for entries targeting self            |
|   |                                                                    |
|   v                                                                    |
| Agent incorporates relevant entries into task behavior                 |
|   |                                                                    |
|   v                                                                    |
| At task end: agent appends own observations to MEMORY.md              |
| (These become input for the NEXT observer pass)                        |
+------------------------------------------------------------------------+
```

### File Ownership Matrix

| File | Writer(s) | Reader(s) | Contention Risk |
|------|-----------|-----------|-----------------|
| `obs.jsonl` | `pipeline-observe.sh` only | `@observer` | None (single writer, append-only) |
| `insights.md` | `@observer`, agent self-append | Owning agent, observer | LOW -- observer and agent rarely run simultaneously |
| `MEMORY.md` | `@observer`, owning agent | Owning agent, observer | LOW -- same reason |
| `PLAYBOOK.md` | `@observer` only | All agents (read), `/evolve` (edit) | None (single writer) |

### Contention Prevention

The system has natural serialization: subagents run sequentially within a session (Claude Code dispatches one at a time), and the observer runs after agent work completes (triggered by `/observe` or `/evolve`). There is no concurrent write scenario in normal operation.

Edge case: if the user runs `/observe` while an agent is still appending to its MEMORY.md, the observer might read a partially-written entry. Mitigation: the observer should ignore the last line of MEMORY.md if it does not end with a newline (incomplete write indicator).

## Build Order Implications

The components have clear dependency ordering:

```
1. pipeline-observe.sh        (capture layer -- already implemented)
      |
      v
2. obs.jsonl schema           (data contract -- already defined by capture layer)
      |
      v
3. @observer agent definition (analysis layer -- reads obs.jsonl, writes memory)
      |
      v
4. /evolve command             (review layer -- reads memory, presents to user)
      |
      v
5. agent-protocols update      (consumption layer -- add PLAYBOOK.md read step)
```

**Phase 1 (Capture) is done.** The `pipeline-observe.sh` hook is implemented and producing data in the correct schema.

**Phase 2 (Observer)** is the next build target. It requires:
- Observer agent definition (`.claude/agents/observer.md`)
- Scope-test classification logic (embedded in observer prompt, not code)
- Cursor tracking (`.observer-cursor` file)
- Confidence scoring rules (embedded in observer prompt)

**Phase 3 (/evolve command)** can be built as a skill (`.claude/skills/evolve/SKILL.md`) that dispatches the observer in review mode. Alternatively, it can be a user-invocable slash command that calls the observer with a "review recent entries" prompt.

**Phase 4 (Consumption)** requires a small update to `agent-protocols` SKILL.md to add PLAYBOOK.md reading at task start. This is a one-line addition to the existing protocol.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Observer writes to obs.jsonl
**What:** Observer records its own analysis back into the event stream.
**Why bad:** Creates feedback loops. Next observer pass re-analyzes its own analysis.
**Instead:** Observer writes only to memory files. obs.jsonl is capture-only.

### Anti-Pattern 2: Agents write to PLAYBOOK.md
**What:** Agents mark their own PLAYBOOK entries as resolved during task execution.
**Why bad:** Agent may "resolve" an entry by reading it without actually changing behavior. No verification that the insight was absorbed.
**Instead:** Only `/evolve` (with human approval) marks entries resolved, after verifying the target agent's MEMORY.md now covers the pattern.

### Anti-Pattern 3: Staging directory between observer and memory
**What:** Observer writes to a staging area, then a second process promotes to memory.
**Why bad:** Adds a component (the promoter) with no value. The observer is already an LLM that can make classification decisions. A staging directory just defers the decision to another LLM call, doubling cost.
**Instead:** Observer writes directly to memory files. `/evolve` is the review gate -- it can revert bad entries, which is cheaper than preventing them.

### Anti-Pattern 4: Numeric confidence scores
**What:** Assigning 0.0-1.0 confidence to memory entries.
**Why bad:** LLMs cannot produce calibrated numeric probabilities. "0.72 confidence" is meaningless noise. Consumers (other LLMs reading the memory file) cannot use the number meaningfully.
**Instead:** Three categorical levels (HIGH/MED/LOW) with clear assignment criteria.

### Anti-Pattern 5: Re-processing the full obs.jsonl on every observer invocation
**What:** Observer reads from line 1 every time.
**Why bad:** obs.jsonl grows with every agent run. At 10MB rotation threshold, re-processing burns context window on already-analyzed events.
**Instead:** Cursor file tracks last-processed position. Observer reads only new events since cursor.

## Scalability Considerations

| Concern | At 10 agent runs | At 100 agent runs | At 1000 agent runs |
|---------|-------------------|--------------------|--------------------|
| obs.jsonl size | ~100KB, trivial | ~2MB, fits in context | 10MB+ rotation kicks in. Observer needs cursor. |
| MEMORY.md size | ~20 lines, trivial | ~50 lines, within 200-line auto-inject limit | 200+ lines. Needs consolidation pass in /evolve. |
| insights.md size | ~5 entries, trivial | ~20 entries, merge phase triggers | 50+ entries. Promote converging entries to SKILL.md. |
| PLAYBOOK.md size | ~0-2 entries | ~5-10 entries | 20+ entries. Switch to per-agent sections. |
| Observer context cost | Small | Moderate (cursor essential) | High. Consider project-scoped observer runs. |

## Sources

- Existing codebase: `pipeline-observe.sh`, `agent-observability` skill, `agent-protocols` skill, `PLAYBOOK.md`
- [Anthropic: Multi-agent coordination patterns](https://claude.com/blog/multi-agent-coordination-patterns) -- five patterns; shared-state and message bus analysis
- [Inbox/Outbox pattern for agent coordination](https://earezki.com/ai-news/2026-03-09-the-inbox-outbox-pattern-how-ai-agents-coordinate-without-stepping-on-each-other/) -- file-based inbox architecture (403 at fetch time, summary from search)
- [AI Agent Memory in 2026: Auto Dream, Context Files](https://dev.to/max_quimby/ai-agent-memory-in-2026-auto-dream-context-files-and-what-actually-works-39m8) -- three-tier memory, consolidation patterns
- [Building Agent Memory That Survives Between Sessions](https://perevillega.com/posts/2026-03-24-building-agent-memory-that-survives-between-sessions/) -- memory categories, promotion rules
- [AI Agent Memory Management: When Markdown Files Are All You Need](https://dev.to/imaginex/ai-agent-memory-management-when-markdown-files-are-all-you-need-5ekk) -- markdown-first memory architecture
- [Mastering Confidence Scoring in AI Agents](https://sparkco.ai/blog/mastering-confidence-scoring-in-ai-agents) -- confidence level design
- [Memory for Autonomous LLM Agents](https://arxiv.org/html/2603.07670v1) -- three-dimensional taxonomy of agent memory
- [Searchable Agent Memory in a Single File](https://eric-tramel.github.io/blog/2026-02-07-searchable-agent-memory/) -- file-based memory indexing

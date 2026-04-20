# Technology Stack: Agent Memory & Observability System

**Project:** Unified Memory System (Channel-Automation V0.6)
**Researched:** 2026-04-20
**Mode:** Ecosystem research -- file-based agent memory, observability, cross-agent coordination

---

## Recommended Stack

### Capture Layer (Hook-Based Event Logging)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Bash (Git Bash) | 5.x | Hook script runtime | Already deployed (`pipeline-observe.sh`). Claude Code hooks pass JSON on stdin; bash + inline Python handles parsing. No Node.js dependency for the hot path. |
| JSONL (append-only) | N/A | Event log format | Industry standard for agent observability. Append-only prevents accidental overwrites. Line-oriented enables streaming reads and `tail -f`. Git-friendly (no merge conflicts on append). |
| Inline Python (stdlib) | 3.12+ | JSON parsing in hook | Avoids `jq` dependency on Windows. Python is already required for pipeline scripts. `json` + `re` stdlib modules handle parsing and secret scrubbing. |

**Schema: Two-file split (agents.jsonl + sessions.jsonl)**

Use the existing `pipeline-observe.sh` architecture but split output into two files under `.claude/logs/observations/<project>/`:

```
agents.jsonl   -- subagent events (tool_pre, tool_post, tool_fail, permission_denied, dispatch, assistant_message, complete)
sessions.jsonl -- main conversation events (lighter: prompt summaries, compaction events, session lifecycle)
```

**Confidence: HIGH** -- This architecture is validated by the existing 342-line `pipeline-observe.sh` and aligns with how disler/claude-code-hooks-multi-agent-observability, simple10/agents-observe, and coleam00/claude-memory-compiler all structure their capture layers. The two-file split is a project-specific decision that correctly separates high-detail subagent traces from lighter session-level events.

### Event Schema (JSONL Line Format)

| Field | Type | Present On | Purpose |
|-------|------|-----------|---------|
| `ts` | string | All | ISO 8601 UTC, colons replaced with hyphens (`2026-04-20T14-22-30-123Z`) for Windows filename safety |
| `event` | string | All | Event type: `dispatch`, `tool_pre`, `tool_post`, `tool_fail`, `permission_denied`, `assistant_message`, `complete`, `session_start`, `session_end`, `compact` |
| `session_id` | string | All | Correlation ID across events in one session |
| `agent_id` | string | Agent events | Unique subagent identifier |
| `agent_type` | string | Agent events | Agent name (researcher, writer, etc.) |
| `project` | string | All | Project slug for scoping |
| `tool` | string | Tool events | Tool name (Bash, Read, Write, etc.) |
| `tool_use_id` | string | Tool events | Links tool_pre to tool_post for duration calculation |
| `input` | string | tool_pre, permission_denied | Truncated tool input (max 5KB) |
| `output` | string | tool_post, tool_fail | Truncated tool output (max 5KB) |
| `error` | string | tool_fail | Error message (max 2KB) |
| `thinking` | string/null | assistant_message | Extended thinking content when present |
| `outcome` | string | complete | `completed`, `stopped`, or `errored` |

**Confidence: HIGH** -- This schema is already implemented in `pipeline-observe.sh` and matches structured logging best practices (consistent field names, correlation IDs, bounded field sizes). The AgentTrace research paper confirms this taxonomy (cognitive/operational/contextual surfaces) maps well to the existing event types.

### Memory Layer (3-Layer Markdown)

| Layer | File | Scope Test | Format |
|-------|------|-----------|--------|
| Skills | `.claude/skills/<skill>/insights.md` | "Does this change how the skill/method runs?" | Timestamped bullet entries |
| Agents | `.claude/agent-memory/<agent>/MEMORY.md` | "Would a fresh instance of this agent need this?" | 5-section markdown (Key Files, Decisions, Patterns, Observations, Open Questions) |
| Orchestration | `.claude/orchestration/PLAYBOOK.md` | "Does this change how agents hand off or coordinate?" | Numbered entries with source/target/issue/body/evidence |

**Why markdown, not a database:** At the scale of this system (11 agents, 8 skills, <200 lines per file), file-based memory outperforms vector retrieval. The agent reads its full MEMORY.md every session -- it fits in context. Multiple independent sources confirm this: Manus (acquired by Meta for $2B) used a three-file plain-text pattern; coleam00/claude-memory-compiler uses "a simple index file instead of RAG -- no vector database, no embeddings, just markdown" because "at personal knowledge base scale (50-500 articles), the LLM reading a structured index outperforms cosine similarity"; dev.to/imaginex recommends file-based memory up to ~5MB with grep/ripgrep retrieval.

**Confidence: HIGH** -- The 3-layer structure is locked per PROJECT.md. The scope-test questions are validated across Approaches A-D. The format recommendations are confirmed by multiple ecosystem sources.

### Confidence Scoring

| Approach | Source | Recommendation |
|----------|--------|----------------|
| Weighted multi-dimensional | A-MAC (arxiv 2603.04549), true-mem | **Use this.** Decompose confidence into interpretable dimensions. |
| Single scalar 0-1 | CLv2, basic agent systems | Too coarse. A 0.7 score tells you nothing about why. |
| LLM-only judgment | Ad hoc prompt-based | Unreliable. LLMs are poor at calibrated self-assessment. |

**Recommended: 4-dimension scoring model (simplified from A-MAC)**

Adapt A-MAC's five-dimension framework to four dimensions suited to file-based agent memory:

| Dimension | Weight | Computation | How |
|-----------|--------|-------------|-----|
| **Utility** | 0.30 | LLM-assessed | Observer rates "would this change future agent behavior?" on 0-1 scale |
| **Confidence** | 0.25 | Evidence-based | Count of supporting events / evidence references. 1 event = 0.3, 2-3 = 0.6, 4+ = 0.9 |
| **Novelty** | 0.25 | Rule-based | Does this duplicate or contradict an existing memory entry? 1.0 if new, 0.3 if overlaps, 0.0 if duplicate |
| **Recency** | 0.20 | Decay function | `exp(-0.01 * hours_since_observation)`. Half-life ~69 hours. Only applies to episodic observations, not decisions/patterns. |

**Composite score:** `S = 0.30*U + 0.25*C + 0.25*N + 0.20*R`

**Admission threshold:** `S >= 0.55` (from A-MAC's optimized threshold)

**What NOT to use:**
- Skip the Type Prior dimension from A-MAC. Our scope-test questions already handle content-type routing -- adding another layer would be redundant.
- Skip embedding-based novelty detection. At <200 entries per memory file, string matching (`grep -c`) against existing entries is sufficient. Embeddings add CUDA/model dependency for zero benefit at this scale.
- Skip temporal decay on decisions and patterns. Only episodic observations ("CBC archives use this URL format") should decay. Decisions ("3-pass pipeline") and patterns ("conflicting sources side-by-side") are permanent.

**Confidence: MEDIUM** -- A-MAC's framework is peer-reviewed (arxiv 2603.04549) and true-mem independently converged on similar weights. However, the specific weight values (0.30/0.25/0.25/0.20) need empirical tuning against actual observer output. The admission threshold of 0.55 is A-MAC's optimized value but may need adjustment for this domain.

### Cross-Agent Communication (PLAYBOOK.md as Coordination Inbox)

| Pattern | When To Use | Why Not Here |
|---------|-------------|-------------|
| Inbox/Outbox files per agent | Real-time multi-agent concurrent execution | Our agents don't run concurrently. Sequential pipeline with human-in-the-loop. |
| Pub/sub message bus (events.jsonl) | Event-driven systems with growing agent ecosystem | Over-engineered for 11 agents with clear handoff points. Adds subscription registry overhead. |
| Shared state document | Collaborative editing of same artifact | Agents don't co-edit; they produce artifacts consumed downstream. |
| **Centralized coordination inbox** | **Sequential pipeline, observer-mediated insights** | **This is the right fit.** |

**Recommended: PLAYBOOK.md as a flat coordination inbox**

The existing PLAYBOOK.md design (Open/Resolved sections with PB-NNN entries) is the correct pattern. It maps to the "message bus" pattern from Anthropic's multi-agent coordination guide, simplified for a sequential pipeline:

1. **Observer writes entries** after analyzing event logs
2. **Target agents read entries** at task start (via agent-protocols)
3. **Observer resolves entries** when target agent's MEMORY.md confirms absorption

**Schema per entry:**

```markdown
### PB-NNN
- date: YYYY-MM-DD
- source_agent: <who the insight came from>
- target: <agent-name who should absorb this>
- scope_test: orchestration  (always -- entries that pass agent/skill tests go directly to those files)
- issue: one-line description
- body: multi-line context with evidence
- evidence: agent_id references from agents.jsonl
- confidence: 0.XX (composite score from observer)
```

**What NOT to use:**
- Drop `signals.yaml` entirely. PLAYBOOK.md replaces it. Having two cross-agent communication channels (signals.yaml + PLAYBOOK.md) causes confusion about where to write insights. The current agent-protocols skill references signals.yaml but PLAYBOOK.md is the intended successor.
- Don't implement file-locking or atomic writes. Agents run sequentially; there are no concurrent write conflicts. The complexity of `lockfile` or `.lock` patterns is wasted.
- Don't implement a per-agent inbox directory. One file (PLAYBOOK.md) with clear entry IDs is simpler to scan and doesn't require directory-walking logic.

**Confidence: HIGH** -- The inbox pattern is well-established. Anthropic's own coordination guide recommends message bus for event-driven pipelines with growing ecosystems, but our pipeline is sequential with fixed agent count. A single coordination file matches the Manus pattern (three files: plan, notes, deliverable) and avoids the infrastructure overhead of a pub/sub system.

### Analysis Layer (Observer Subagent)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Claude Sonnet 4.6 | Current | LLM analysis of event logs | 1M context handles full event detail including thinking blocks. Subscription-covered via subagent dispatch. No API key needed. |
| `/evolve` command | N/A | User-triggered analysis cycle | Single command dispatches observer + reviews recent additions. Human gate before memory promotion. |

**Observer workflow:**

1. User runs `/evolve`
2. Observer reads `agents.jsonl` and `sessions.jsonl` (both streams)
3. Observer extracts learning candidates
4. For each candidate: score against 4 dimensions, classify against 3 scope-test questions
5. Candidates passing exactly one scope test AND scoring >= 0.55: write directly to target file
6. Observer reports what was written; user can revert via `/evolve --revert`

**What NOT to use:**
- No background daemon. CLv2's approach of running background analysis adds process management complexity (PID files, crash recovery, zombie processes) that is unnecessary when `/evolve` is sufficient.
- No staging directory (`memory-candidates/`). Eliminated per PROJECT.md. Observer writes directly; `/evolve` reviews.
- No separate `/learn` command. Merged into `/evolve` per PROJECT.md.

**Confidence: HIGH** -- This is the architecture specified in PROJECT.md with all key decisions already made. The observer-as-subagent pattern matches coleam00/claude-memory-compiler's approach (hook capture -> LLM extraction -> structured output).

### Supporting Infrastructure

| Technology | Purpose | Why |
|------------|---------|-----|
| `jq` (optional) | Quick JSONL queries from command line | Useful for debugging but not required. Python one-liners handle the same job. Don't add as a hard dependency since it requires separate install on Windows. |
| Node.js (stdlib) | `check-memory-limit.js` hook, `obs-summarize.js` | Already deployed. Keep for existing functionality but don't extend -- new logic goes in bash+Python for consistency. |
| Git | Memory file version control | Append-only markdown files are naturally git-friendly. `git diff` shows exactly what the observer added. `git revert` is the escape hatch for bad observer writes. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Event format | JSONL (append-only) | SQLite | SQLite requires binary tooling, isn't streamable, harder to inspect manually, and adds a dependency. JSONL is readable with `cat` and appendable with `>>`. |
| Event format | JSONL (append-only) | Structured markdown | Markdown isn't machine-parseable at scale. Regex-based extraction is fragile. JSONL gives reliable `JSON.parse()` per line. |
| Memory format | Markdown files | SQLite/JSON database | At <200 lines per file, markdown is human-editable, git-diffable, and directly injectable into LLM context. Database adds query layer for no benefit. |
| Memory format | Markdown files | Vector database (Pinecone, Chroma) | Massive overkill. 11 agents x 200 lines = 2,200 entries max. Full-context reading beats cosine similarity at this scale. Vector DB adds infrastructure, cost, and latency. |
| Confidence scoring | 4-dimension weighted | Single 0-1 scalar | Opaque. A score of 0.6 gives no information about why. Multi-dimensional scoring is auditable and tunable. |
| Confidence scoring | 4-dimension weighted | Full A-MAC (5 dimensions) | Type Prior is redundant with scope-test questions. Dropping it simplifies without losing discrimination. |
| Cross-agent comms | PLAYBOOK.md (flat file) | signals.yaml (existing) | Two inboxes causes routing confusion. PLAYBOOK.md is the designated successor. Consolidate to one. |
| Cross-agent comms | PLAYBOOK.md (flat file) | Per-agent inbox directories | Directory-per-agent adds filesystem overhead and requires walking logic. One file with entry IDs is simpler. |
| Cross-agent comms | PLAYBOOK.md (flat file) | JSONL message log | JSONL is machine-optimized. PLAYBOOK.md needs to be human-readable (reviewed during `/evolve`). Markdown is the right format for human-reviewed coordination. |
| Capture trigger | SubagentStop (batch) | Per-tool-call real-time | The existing approach of capturing per-tool events in real-time AND synthesizing at SubagentStop is correct. Don't change it. |
| Observer trigger | On-demand (`/evolve`) | Background daemon | Process management (PID files, crash recovery, zombies) adds complexity. `/evolve` is sufficient for v1. |
| Observer trigger | On-demand (`/evolve`) | SessionEnd hook auto-trigger | Automatic analysis without human review violates the "human gate" constraint. `/evolve` keeps the human in the loop. |
| Hook language | Bash + inline Python | Pure Node.js (`obs.js`) | `obs.js` failed (pointer-file races under `async: true`). Bash + inline Python is simpler, already working, and avoids the async race condition. |
| Hook language | Bash + inline Python | Pure Python script | Adds subprocess overhead per hook call. Inline Python via `-c` avoids module resolution and startup cost. |

---

## What NOT to Install

| Technology | Why Avoid |
|------------|-----------|
| LangChain / LangGraph | Massive dependency tree. This is a file-based system with no API calls. LangChain's memory abstractions target vector DBs and chat histories, not structured markdown files. |
| Pinecone / Chroma / Weaviate | Vector databases are overkill at <2,500 entries. Add retrieval latency and infrastructure for no benefit. |
| Redis / RabbitMQ | Message brokers for distributed systems. This is a single-user, single-machine, sequential pipeline. File-based coordination is sufficient. |
| OpenTelemetry SDK | Designed for distributed microservice tracing. This system has one process (Claude Code) with subagents. The JSONL schema already covers the needed observability primitives. |
| Any npm packages | The project has zero npm dependencies by design. Node.js scripts use only stdlib (`fs`, `path`). Don't introduce a `package.json`. |
| `crawl4ai` for observer | Observer reads local files only. No web scraping needed in the memory system. |
| Direct API calls (`ANTHROPIC_API_KEY`) | All LLM analysis runs through Claude Code subagent dispatches covered by Max subscription. Direct API calls are explicitly prohibited per CLAUDE.md billing rules. |

---

## Implementation Notes

### File Rotation (Already Implemented)

The existing `pipeline-observe.sh` rotates `obs.jsonl` at 10MB and auto-purges archives >30 days. This is correct and sufficient. The split to `agents.jsonl`/`sessions.jsonl` should preserve this rotation logic per-file.

### Secret Scrubbing (Already Implemented)

The existing regex-based scrubbing (`_SECRET_RE`) handles API keys, tokens, passwords, and authorization headers. This is correct. Extend to also scrub file paths containing user home directories if privacy is a concern.

### Windows Compatibility

- Timestamps use `-` instead of `:` (already handled) because colons are illegal in Windows filenames
- File paths use forward slashes in JSONL (Python's `json.dumps` handles this)
- `pipeline-observe.sh` runs via Git Bash (already configured)
- `mkdir -p` and `find` work in Git Bash (already used)
- No `jq` hard dependency (Python inline handles JSON parsing)

### Memory File Limits

| File | Limit | Enforcement |
|------|-------|------------|
| `MEMORY.md` | 200 lines | `check-memory-limit.js` hook warns at SubagentStop |
| `insights.md` | No formal limit | Observer should target <100 lines per skill |
| `PLAYBOOK.md` | No formal limit | Observer prunes resolved entries older than 30 days |
| `agents.jsonl` | 10MB per file | Rotation to `obs.archive/` directory |
| `sessions.jsonl` | 10MB per file | Same rotation logic |

---

## Sources

### High Confidence (Official Documentation, Peer-Reviewed)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- Full event schemas, SubagentStop input fields, decision control
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- Implementation patterns, hook types, limitations
- [Multi-agent Coordination Patterns](https://claude.com/blog/multi-agent-coordination-patterns) -- Five patterns with when-to-use guidance
- [A-MAC: Adaptive Memory Admission Control](https://arxiv.org/html/2603.04549) -- 5-dimension scoring: `S(m) = w1*U + w2*C + w3*N + w4*R + w5*T`, threshold 0.55, recency decay lambda=0.01/hour

### Medium Confidence (Community Projects, Verified Implementations)
- [coleam00/claude-memory-compiler](https://github.com/coleam00/claude-memory-compiler) -- SessionEnd hook capture, LLM extraction to daily logs, index-based retrieval over RAG
- [disler/claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) -- Real-time hook event capture, SQLite storage, WebSocket streaming
- [simple10/agents-observe](https://github.com/simple10/agents-observe) -- Agent hierarchy tracking, human-readable session slugs, event-stream-derived agent state
- [rizal72/true-mem](https://github.com/rizal72/true-mem) -- 7-feature scoring model (recency 0.20, frequency 0.15, importance 0.25, utility 0.20, novelty 0.10, confidence 0.10, interference -0.10), Ebbinghaus decay for episodic memories
- [Inbox/Outbox Pattern](https://earezki.com/ai-news/2026-03-09-the-inbox-outbox-pattern-how-ai-agents-coordinate-without-stepping-on-each-other/) -- File-based coordination with outbox.json for cross-agent messaging

### Low Confidence (Single Source, Unverified)
- [Building Agent Memory That Survives Between Sessions](https://perevillega.com/posts/2026-03-24-building-agent-memory-that-survives-between-sessions/) -- Three-layer architecture, JSONL for session logs, LLM outperforms embeddings at <500 articles
- [AI Agent Memory Management: When Markdown Files Are All You Need](https://dev.to/imaginex/ai-agent-memory-management-when-markdown-files-are-all-you-need-5ekk) -- Scaling thresholds (<1K files: grep, 1K-10K: BM25, >10K: hybrid vector), upgrade triggers at ~5MB
- [AgentTrace: Structured Logging Framework](https://openreview.net/attachment?id=xfdpqwikdR&name=pdf) -- Three-surface taxonomy (cognitive/operational/contextual) for agent observability

---

*Stack analysis: 2026-04-20*

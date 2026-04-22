# Phase 2: Observer Agent - Research

**Researched:** 2026-04-20
**Domain:** Claude Code Native Subagent (learning extraction and memory classification)
**Confidence:** HIGH

## Summary

The observer agent is a prompt-engineering-driven Claude Code subagent that reads obs.jsonl event logs, extracts actionable learnings from completed agent runs, classifies each learning to the correct memory tier via 3 scope-test questions, and writes tagged entries to Pending Review sections in target files. The implementation requires no external dependencies -- it runs entirely within the Claude Code harness as a `.claude/agents/observer.md` file using the standard tools (Read, Write, Edit, Bash, Grep, Glob).

The primary technical challenges are: (1) prompt engineering the observer's system prompt to produce consistently formatted, high-signal extractions with accurate scope classification; (2) implementing cursor-based incremental processing that survives file rotation; (3) adding `## Pending Review` sections to 19+ target files (11 MEMORY.md + 8 insights.md) that currently lack them; and (4) deduplication that is semantically aware without a vector store.

**Primary recommendation:** Structure implementation in 3-4 plans: (1) bootstrap infrastructure (PLAYBOOK.md, Pending Review sections, cursor mechanism), (2) observer agent definition with system prompt and few-shot examples, (3) eval test script with fixtures, (4) optional integration validation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Broad extraction -- observer looks for ALL signal types: error patterns & recoveries, successful strategies, tool usage anti-patterns, decision rationale from thinking blocks, and coordination issues between agents.
- **D-02:** Full analysis with thinking blocks -- observer reads thinking blocks (captured at 10KB cap per turn) to understand WHY agents made decisions.
- **D-03:** Batch by run -- observer groups events by run (contiguous events with same agent_id or session). Analyzes each run as a unit, extracts 0-3 learnings per run.
- **D-04:** Distilled + evidence pointer -- each Pending Review entry is a 1-2 sentence distilled insight with confidence tag, source agent name, and timestamp pointer.
- **D-05:** Strip pointer on promote -- when promoted from Pending Review to Permanent, evidence pointer is removed.
- **D-06:** Minimal bootstrap in Phase 2 -- create bare `.claude/PLAYBOOK.md` with just ## Pending Review and ## Permanent sections.
- **D-07:** Location is `.claude/PLAYBOOK.md` -- top-level in .claude/ as cross-agent coordination file.
- **D-08:** Dedicated rejections file at `.claude/logs/observations/<project>/rejections.jsonl`.
- **D-09:** Same rotation as obs.jsonl -- 10MB cap with timestamped archive, 30-day purge. Reuses rotation logic from pipeline-observe.js.

### Claude's Discretion
- Observer agent definition structure (frontmatter fields, tool selection, skill injection)
- Cursor storage mechanism and format (where the observer tracks its read position)
- Deduplication algorithm (how to compare new candidates against existing entries)
- Self-loop prevention implementation (agent_id filtering approach)
- Observer prompt engineering (the core prompt that drives learning extraction)
- Entry formatting details (exact markdown structure within Pending Review sections)

### Deferred Ideas (OUT OF SCOPE)
- Remove all files related to the old memory system (signals.yaml, project-memories/ references, old scratchpad paths, etc.) -- future cleanup phase after new system is operational
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OBSV-01 | @observer subagent (Sonnet 4.6) reads obs.jsonl and extracts reusable learnings from completed runs | Agent definition pattern verified via Context7; obs.jsonl structure confirmed with real data |
| OBSV-02 | Observer filters runs by agent_id presence (subagent) vs absence (main conversation) | obs.jsonl confirmed: `agent_id: ""` for main, populated for subagents; dispatch/complete bracket runs |
| OBSV-03 | Each candidate classified against 3 scope-test questions; exactly one must pass | Prompt engineering pattern; scope-test questions defined in AI-SPEC |
| OBSV-04 | Observer writes entries to ## Pending Review section in target memory file with evidence citations | Target files identified (11 MEMORY.md + 8 insights.md + 1 PLAYBOOK.md); none currently have Pending Review sections |
| OBSV-05 | Observer deduplicates against existing entries in target memory files before writing | Grep tool + LLM semantic comparison; target files have minimal content currently |
| OBSV-06 | Observer does not observe its own runs (self-loop prevention via agent_id filtering) | Filter on agent_id or agent_type containing "observer" in prompt instructions |
| OBSV-07 | Observer tracks cursor position in obs.jsonl (cursor-based incremental reads) | JSON cursor file at `.observer-cursor`; stores byte_offset + last_epoch_ms + last_run_id |
| OBSV-08 | Rejected candidates logged with reason to rejections.jsonl | JSONL append; rotation logic reusable from pipeline-observe.js |
| MEML-01 | Entries include categorical confidence tag inline: [HIGH], [MED], or [LOW] | Format defined in AI-SPEC examples; enforced via prompt few-shot |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Event log reading | Subagent (Read/Bash tools) | -- | Observer reads obs.jsonl via Claude Code tool calls |
| Learning extraction | Subagent (LLM reasoning) | -- | LLM classifies and distills insights from event data |
| Scope classification | Subagent (LLM reasoning) | -- | Prompt-driven 3-question scope test |
| Memory file writes | Subagent (Edit tool) | -- | Surgical append to ## Pending Review sections |
| Cursor persistence | Subagent (Write tool) | -- | JSON file updated after each processing batch |
| Rejection logging | Subagent (Bash/Write) | -- | JSONL append to rejections.jsonl |
| File rotation | pipeline-observe.js (existing hook) | -- | Observer reuses rotation logic only for rejections.jsonl |
| Dispatch orchestration | /evolve command (Phase 3) | -- | Phase 3 dispatches observer; Phase 2 just builds the agent |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | v24.13.0 | Runtime for hook scripts and eval tests | Already installed; Claude Code runtime dependency [VERIFIED: `node --version`] |
| Claude Code Harness | Current | Subagent dispatch, tool access, MEMORY.md injection | Project runtime -- all LLM calls through Claude Max [VERIFIED: settings.json] |
| Sonnet 4.6 | Current | Observer model (balanced reasoning, 200K context) | Per AI-SPEC: `model: sonnet` in frontmatter [CITED: 02-AI-SPEC.md Section 4] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fs (Node.js stdlib) | Built-in | File I/O for eval script, cursor management | Eval tests, fixture creation |
| path (Node.js stdlib) | Built-in | Cross-platform path handling | All file path operations |
| child_process (Node.js stdlib) | Built-in | Spawning hook script in eval tests | Test harness only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude Code subagent | Python script + API key | Would violate billing constraint (Claude Max only); loses tool access |
| LLM dedup judgment | Embedding similarity | No vector store in project; Grep + LLM judgment is simpler and sufficient at scale |
| External eval framework | Promptfoo / RAGAS | No HTTP endpoint to test; subagent dispatch is local-only |

**Installation:**
```bash
# No installation required.
# Everything runs on existing Node.js + Claude Code.
# Zero npm dependencies.
```

## Architecture Patterns

### System Architecture Diagram

```
/evolve (Phase 3)
    |
    v
@observer dispatch (Sonnet 4.6 subagent)
    |
    |--- 1. Read .observer-cursor (JSON: byte_offset, last_epoch_ms, last_run_id)
    |
    |--- 2. Load events from obs.jsonl (tail from cursor offset)
    |         |
    |         |--- Filter out: agent_id containing "observer"
    |         |--- Group by run: dispatch...complete bracket
    |
    |--- 3. For each run (max 8 per invocation):
    |         |
    |         |--- Extract 0-3 candidate learnings
    |         |      (thinking blocks -> WHY; tool events -> WHAT)
    |         |
    |         |--- Classify each via scope-test questions:
    |         |      Q1 YES only -> skills/<skill>/insights.md
    |         |      Q2 YES only -> agent-memory/<agent>/MEMORY.md
    |         |      Q3 YES only -> PLAYBOOK.md
    |         |      0 or 2+ pass -> REJECT
    |         |
    |         |--- Assign confidence: [HIGH] / [MED] / [LOW]
    |         |
    |         |--- Dedup: Grep target file -> LLM same-insight check
    |         |
    |         |--- WRITE: Edit ## Pending Review section (or append after marker)
    |         |--- or REJECT: append to rejections.jsonl
    |
    |--- 4. Update .observer-cursor
    |
    v
Observer completes -> returns summary to /evolve
```

### Recommended Project Structure
```
.claude/
├── agents/
│   └── observer.md              # NEW: Agent definition (YAML frontmatter + system prompt)
├── logs/
│   └── observations/
│       └── <project>/
│           ├── obs.jsonl         # INPUT: captured events (from Phase 1)
│           ├── obs.archive/      # Rotated obs files
│           ├── rejections.jsonl  # NEW: rejected candidates with reasons
│           └── .observer-cursor  # NEW: processing state (byte_offset, epoch_ms, run_id)
├── agent-memory/
│   └── <agent>/
│       └── MEMORY.md            # MODIFIED: add ## Pending Review section
├── skills/
│   └── <skill>/
│       └── insights.md          # MODIFIED: add ## Pending Review section (after marker)
├── PLAYBOOK.md                  # NEW: orchestration-layer insights (minimal bootstrap)
└── tests/
    ├── eval-observer.js         # NEW: deterministic eval checks
    └── fixtures/
        └── observer/            # NEW: curated obs.jsonl excerpts + expected outputs
```

### Pattern 1: Agent Definition (YAML Frontmatter + System Prompt)
**What:** Observer defined as `.claude/agents/observer.md` with YAML frontmatter specifying model, tools, skills, and the markdown body containing the full system prompt.
**When to use:** All agents in this project follow this pattern.
**Example:**
```yaml
# Source: Context7 /anthropics/claude-code agent-development SKILL.md
---
name: observer
description: >-
  Reads obs.jsonl event logs from completed agent runs, extracts reusable
  learnings, classifies each to the correct memory tier via scope-test
  questions, and writes tagged entries to Pending Review sections.
model: sonnet
color: yellow
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
skills:
  - agent-protocols
---
```
[VERIFIED: Context7 /anthropics/claude-code agent frontmatter format]

### Pattern 2: Cursor-Based Incremental Processing
**What:** JSON file stores read position; observer resumes from last position on each invocation.
**When to use:** Any time observer is dispatched (every /evolve call).
**Example:**
```json
{
  "byte_offset": 245789,
  "last_epoch_ms": 1776683020266,
  "last_run_id": "afc5b3391dd47f00a"
}
```
[VERIFIED: obs.jsonl confirmed to have epoch_ms and agent_id fields in real data]

### Pattern 3: Run Boundary Detection
**What:** A "run" is bracketed by `dispatch` (start) and `complete` (end) events sharing the same `agent_id`. Tool events between them belong to that run.
**When to use:** Grouping events for per-run analysis.
**Critical detail from real data:** The `_channel` project directory has tool events WITHOUT dispatch/complete brackets (tool_pre/tool_post only, 1784 events). Only the full project-path directory (`d--youtube-...`) has proper dispatch/complete brackets (61 runs). The observer must handle both patterns:
- Runs WITH dispatch/complete: standard processing
- Orphan tool events (no dispatch/complete): these are main conversation events or events where SubagentStop hasn't fired yet. Skip or batch by session_id.
[VERIFIED: Real obs.jsonl analysis of _channel and d--youtube project dirs]

### Pattern 4: Pending Review Section Format
**What:** Two different target formats depending on file type.
**MEMORY.md / PLAYBOOK.md format:**
```markdown
## Pending Review

- [HIGH] researcher: Always verify Wikipedia dates against primary sources before committing to dossier (2026-04-18T10:22)
- [MED] writer: For large dossiers (>2000 lines), read by section heading rather than sequential offset (2026-04-19T14:30)
```

**insights.md format** (appended after `<!-- Append new insights below this line -->` marker within a new `## Pending Review` subsection):
```markdown
## Pending Review

- [2026-04-20] [HIGH] Pin interpreter to venv path -- system Python lacks crawl4ai deps (from: researcher, 2026-04-20T10:15)
```
[VERIFIED: Existing insights.md uses `<!-- Append new insights below this line -->` marker]

### Anti-Patterns to Avoid
- **Processing ALL projects in one invocation:** Each project has its own obs.jsonl. Observer should process one project per dispatch (specified in the dispatch prompt from /evolve).
- **Reading entire obs.jsonl into context:** Even at 2.9MB (current _channel), this would consume excessive context. Use byte-offset + chunked reads.
- **Writing to files without reading first:** Must read target file to find exact `## Pending Review` section location before Edit.
- **Hardcoding project paths:** Use the project slug from the dispatch prompt; paths must handle the various project directory names found in the observations/ directory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rotation logic for rejections.jsonl | Custom rotation code | Copy pattern from pipeline-observe.js `rotateIfNeeded()` | Exact same 10MB threshold, archive naming, 30-day purge [D-09] |
| Semantic deduplication | Embedding similarity search | Grep (keyword match) + LLM judgment (same-insight check) | No vector store; at <20 entries per file, Grep + reading context is sufficient |
| Output validation | Custom parser | Regex on read-back + one retry | Claude Code has no Pydantic; self-check via Read after Edit is the established pattern |
| Agent memory injection | Manual Read at start | `memory: project` in frontmatter | Harness auto-injects first 200 lines of MEMORY.md [VERIFIED: Context7 docs] |

**Key insight:** The observer is fundamentally a prompt engineering problem, not a code problem. The "implementation" IS the system prompt -- everything else (cursor, rotation, sections) is scaffolding that a plan can handle in predictable tasks.

## Common Pitfalls

### Pitfall 1: Self-Loop Amplification
**What goes wrong:** Observer reads its own tool events from obs.jsonl and generates meta-observations about observing.
**Why it happens:** pipeline-observe.js captures ALL events including the observer's own Read/Write/Edit calls. The hook does NOT filter (captures everything for audit trail).
**How to avoid:** Agent_id filtering in the observer's prompt instruction (absolute priority #1). The observer checks `agent_id` or `agent_type` for "observer" substring and skips entirely.
**Warning signs:** Entries in Pending Review referencing "observation process", "observer", or meta-analysis of the observer's own behavior.

### Pitfall 2: Missing Pending Review Sections
**What goes wrong:** Observer tries to Edit a `## Pending Review` section that doesn't exist in the target file. Edit fails or corrupts the file.
**Why it happens:** None of the 19 target files (11 MEMORY.md + 8 insights.md) currently have `## Pending Review` sections. They were never created.
**How to avoid:** Phase 2 Plan 1 must bootstrap these sections into all target files before the observer runs. Observer also has a guardrail: if `## Pending Review` heading is absent, skip that target and log with reason "target-file-corrupt".
**Warning signs:** Observer reporting all targets as "corrupt" on first run.
[VERIFIED: Grep for "Pending Review" returned zero matches across agent-memory/ and skills/]

### Pitfall 3: Project Directory Fragmentation
**What goes wrong:** Observer processes the wrong project or misses events because they're in a different project directory.
**Why it happens:** There are 5 project directories under observations/ with different naming patterns: `_channel`, `duplessis-orphans`, `my-doc-project`, and the long `d--youtube-...` path. Dispatch/complete events only exist in the long-path directory.
**How to avoid:** /evolve dispatch prompt must specify which project to process (or "all"). Observer must be told the project path explicitly.
**Warning signs:** Zero runs found despite events existing in a different project directory.
[VERIFIED: ls of observations/ shows 5 directories; only 1 has dispatch/complete events]

### Pitfall 4: Cursor Drift After File Rotation
**What goes wrong:** After obs.jsonl rotates (10MB), cursor byte_offset points past the new (empty) file's end. Observer reads nothing or errors.
**Why it happens:** pipeline-observe.js renames the full file to archive and starts fresh.
**How to avoid:** On startup, check `byte_offset > file_size`. If true, rotation happened. Fall back to scanning from line 0 and skipping events where `epoch_ms <= cursor.last_epoch_ms`.
**Warning signs:** Observer reports "no events to process" when obs.jsonl is non-empty.

### Pitfall 5: Insights.md Format Mismatch
**What goes wrong:** Observer writes entries in MEMORY.md format to insights.md, or vice versa.
**Why it happens:** Two different formats exist: MEMORY.md/PLAYBOOK.md use `- [CONFIDENCE] agent: insight (timestamp)` while insights.md uses `- [YYYY-MM-DD] [CONFIDENCE] insight (from: agent, timestamp)`.
**How to avoid:** Prompt explicitly specifies format per target type. Few-shot examples cover both formats.
**Warning signs:** Format validation read-back detects wrong pattern.
[VERIFIED: insights.md uses date-first format; MEMORY.md uses section-based structure]

### Pitfall 6: Context Window Exhaustion
**What goes wrong:** Observer loads too many runs or events, exceeding Sonnet's 200K context, and reasoning quality degrades.
**Why it happens:** Heavy days (15+ agent runs) produce 2-5MB of events. Even one complex run with many thinking blocks can consume 15-20K tokens.
**How to avoid:** 8-run processing cap per invocation (prompt instruction). Context pressure detection instruction. Chunked reads (100KB at a time via Bash tail).
**Warning signs:** Observer reasoning becomes imprecise or repetitive in later runs of an invocation.

## Code Examples

### Observer Agent Frontmatter
```yaml
# Source: Pattern from existing agents (researcher.md, editorial-lead.md)
---
name: observer
description: >-
  Reads obs.jsonl event logs from completed agent runs, extracts reusable
  learnings, classifies each to the correct memory tier via scope-test
  questions, and writes tagged entries to Pending Review sections.
  Do NOT invoke manually -- dispatched by /evolve command only.
model: sonnet
color: yellow
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
skills:
  - agent-protocols
---
```
[VERIFIED: Pattern matches researcher.md and editorial-lead.md frontmatter structure]

### Cursor File Read/Write Pattern (Bash in observer)
```bash
# Read cursor
cat .claude/logs/observations/<project>/.observer-cursor 2>/dev/null || echo '{"byte_offset":0,"last_epoch_ms":0,"last_run_id":""}'

# Check file size vs cursor for rotation detection
wc -c < .claude/logs/observations/<project>/obs.jsonl

# Load events from cursor offset (100KB chunk)
tail -c +<byte_offset> .claude/logs/observations/<project>/obs.jsonl | head -c 100000
```
[ASSUMED: tail -c +N works in MSYS2 bash on Windows -- needs verification]

### Rejection Log Entry Format
```json
{"ts":"2026-04-20T14-30-00","candidate":"Always use WebFetch for paywalled sites","reason":"ambiguous-scope","confidence":"LOW","source_agent":"researcher","source_run_ts":"2026-04-20T10-22-00"}
```
[CITED: 02-AI-SPEC.md Section 4b.1]

### Eval Test Scaffold Pattern
```javascript
// Source: smoke-test-observe.js established pattern
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

function makeTmpProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-eval-'));
  // Create necessary directory structure
  return tmp;
}

// Test: format validation (OBSV-04, MEML-01)
testCases.push({
  name: 'format/memory_md_entry_valid',
  check: () => {
    const entry = '- [HIGH] researcher: Always verify dates (2026-04-18T10:22)';
    const re = /^- \[(HIGH|MED|LOW)\] [a-z-]+: .+ \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
    return re.test(entry);
  }
});
```
[VERIFIED: smoke-test-observe.js uses this exact pattern]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| signals.yaml cross-agent feedback | Observer + Pending Review sections | Phase 2 (now) | signals.yaml replaced by observer-driven classification |
| memory-candidates/ staging directory | ## Pending Review sections in-file | PROJECT.md decision | No separate staging files; entries live in target file |
| Numeric confidence (0.3-0.9) | Categorical [HIGH]/[MED]/[LOW] | PROJECT.md decision | LLMs cannot calibrate numbers; categorical is sufficient |
| pipeline-observe.sh (bash) | pipeline-observe.js (Node.js CJS) | Phase 1 | Cleaner, more reliable event capture |

**Deprecated/outdated:**
- `signals.yaml` -- being replaced by the observer system (deferred cleanup, out of scope for Phase 2)
- `.claude/project-memories/` -- being replaced by in-file Pending Review (deferred cleanup)
- `memory-candidates/` -- never existed; replaced before implementation by ## Pending Review

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tail -c +N` works correctly in MSYS2 bash for byte-offset reading of obs.jsonl | Architecture Patterns / Code Examples | Observer cannot resume from cursor; would need alternative approach (Node.js Read with offset) |
| A2 | Sonnet 4.6 reliably produces consistent format when given 3 few-shot examples | Architecture Patterns | Format errors in production; mitigation: read-back validation + retry |
| A3 | 8-run processing budget fits within Sonnet's 200K context per invocation | Common Pitfalls | Observer crashes or degrades on complex runs; mitigation: reduce to 5 runs |

## Open Questions

1. **Which project directory should /evolve process by default?**
   - What we know: There are 5 project directories. The long-path one (`d--youtube-...`) has the richest data (61 dispatch/complete runs).
   - What's unclear: Should /evolve process all projects, just the current one, or one specified in the command?
   - Recommendation: Default to current project (derived from `$CLAUDE_PROJECT_DIR`). Phase 3 (/evolve) decides this UX, but observer.md should accept project path as a parameter in the dispatch prompt.

2. **How should main conversation events (no dispatch/complete) be handled?**
   - What we know: `_channel` has 1784 events with no run boundaries (only tool_pre/tool_post). These are main conversation or unfinished subagent events.
   - What's unclear: Are these valuable for learning extraction? They lack thinking blocks (the richest signal source).
   - Recommendation: Skip events without dispatch/complete brackets in Phase 2. Main conversation events have no thinking blocks and no clear run boundaries. Revisit in Phase 5 if needed.

3. **Should the observer have its own MEMORY.md?**
   - What we know: `memory: project` in frontmatter triggers auto-injection of `.claude/agent-memory/observer/MEMORY.md`.
   - What's unclear: What would the observer write to its own memory? It should stay minimal to avoid consuming context.
   - Recommendation: Yes, create `observer/MEMORY.md` but keep it near-empty. The observer's "learning" happens via prompt refinement, not self-memory. Use it only for key files and path references.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Eval tests, cursor scripts | Yes | v24.13.0 | -- |
| Claude Code (Sonnet 4.6) | Observer subagent dispatch | Yes | Current | -- |
| MSYS2 Bash | Bash tool calls (tail, wc) | Yes | Bundled | Node.js fs.readSync with position param |
| Git | Version control for memory files | Yes | -- | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None -- all required tools are available.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom Node.js test script (no framework -- matches Phase 1 pattern) |
| Config file | None -- self-contained script |
| Quick run command | `node .claude/tests/eval-observer.js` |
| Full suite command | `node .claude/tests/eval-observer.js` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OBSV-04 | Entry format matches spec | unit (regex) | `node .claude/tests/eval-observer.js` | Wave 0 |
| OBSV-06 | Self-loop filter (no observer events processed) | unit (fixture) | `node .claude/tests/eval-observer.js` | Wave 0 |
| OBSV-07 | Cursor advances after processing | unit (fixture) | `node .claude/tests/eval-observer.js` | Wave 0 |
| OBSV-08 | Rejection log valid JSONL | unit (fixture) | `node .claude/tests/eval-observer.js` | Wave 0 |
| MEML-01 | Confidence tag present and valid | unit (regex) | `node .claude/tests/eval-observer.js` | Wave 0 |
| OBSV-01 | Observer extracts learnings from real obs.jsonl | integration (manual) | Manual: dispatch @observer against fixture data | Manual |
| OBSV-02 | Filter by agent_id presence | integration (manual) | Manual: verify observer skips main-conversation events | Manual |
| OBSV-03 | Scope-test exactly-one-pass rule | integration (manual) | Manual: verify rejections.jsonl has ambiguous-scope entries | Manual |
| OBSV-05 | Dedup against existing entries | integration (manual) | Manual: run observer twice, verify no duplicates | Manual |

### Sampling Rate
- **Per task commit:** `node .claude/tests/eval-observer.js`
- **Per wave merge:** Full eval suite
- **Phase gate:** Full suite green + manual integration check before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `.claude/tests/eval-observer.js` -- format validation, self-loop check, cursor logic, rejection format
- [ ] `.claude/tests/fixtures/observer/` -- curated obs.jsonl excerpts (5 fixtures minimum)
- [ ] `.claude/tests/fixtures/observer/README` -- labels and expected outputs per fixture

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- local-only, no external access |
| V3 Session Management | No | N/A -- stateless between invocations |
| V4 Access Control | No | N/A -- single user, no multi-tenancy |
| V5 Input Validation | Yes | JSONL parsing with try/catch; malformed lines skipped |
| V6 Cryptography | No | N/A -- no secrets processed |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed JSONL injection | Tampering | Parse each line in try/catch; skip invalid lines |
| Observer hallucinating evidence | Information Disclosure (internal) | Read-back validation; evidence pointer must match real event |
| Memory file corruption via bad Edit | Tampering | Read target first; validate ## Pending Review exists; read-back after write |

## Sources

### Primary (HIGH confidence)
- Context7 `/anthropics/claude-code` -- Agent frontmatter fields, model options, tools configuration, SubagentStop hook mechanics
- Context7 `/websites/code_claude` -- MEMORY.md auto-injection (first 200 lines), subagent persistent memory
- Real obs.jsonl data analysis -- Event schema, run boundaries, project directory structure
- Existing codebase: `pipeline-observe.js` (400 lines), `smoke-test-observe.js` (308 lines), `researcher.md`, `editorial-lead.md`

### Secondary (MEDIUM confidence)
- 02-AI-SPEC.md -- Implementation guidance, context window budget, evaluation strategy (authored by gsd-ai-integration tools in this project)
- 02-CONTEXT.md -- User decisions and canonical references

### Tertiary (LOW confidence)
- None -- all claims verified against codebase or Context7

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero dependencies; everything uses existing Node.js + Claude Code
- Architecture: HIGH -- obs.jsonl schema verified against real data; agent pattern verified via Context7
- Pitfalls: HIGH -- verified through actual codebase inspection (missing Pending Review sections, project fragmentation, event structure gaps)

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable -- no external dependencies that could change)

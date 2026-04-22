# Phase 4: Agent Consumption - Research

**Researched:** 2026-04-21
**Domain:** Skill rewrites, agent prompt updates, PLAYBOOK lifecycle redesign
**Confidence:** HIGH

## Summary

Phase 4 converts pipeline agents from active memory writers to passive memory consumers, rewrites the agent-observability skill to cover the full observation pipeline (merging pipeline-learning scope), and redesigns PLAYBOOK.md as an observer-managed routing log with Open/Resolved lifecycle. The observer prompt is updated to perform PLAYBOOK routing in a single /evolve pass.

This is entirely a markdown/prompt engineering phase. There are no new scripts, no dependencies, no runtime code. The deliverables are 4 file rewrites (agent-protocols SKILL.md, agent-observability SKILL.md, PLAYBOOK.md, observer.md) plus cleanup of old path references. The primary risk is cross-reference consistency -- every file in this phase touches state that other files reference, so edits must be coordinated.

**Primary recommendation:** Order deliverables as: (1) PLAYBOOK.md redesign, (2) observer.md update for PLAYBOOK routing, (3) agent-protocols rewrite, (4) agent-observability comprehensive rewrite, (5) cleanup verification. This sequence ensures each file's dependencies are in place before it is written.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Observer-only memory writes -- agents NEVER write to MEMORY.md or insights.md. Observer extracts learnings from runs and writes to Pending Review. /evolve promotes. Agents are pure consumers.
- **D-02:** Agents never read PLAYBOOK.md -- observer routes PLAYBOOK entries to the correct agent MEMORY.md or skill insights.md. Agents are unaware of PLAYBOOK.md entirely.
- **D-03:** Ultra-thin rewrite (~20 lines) -- two sections only: (1) Memory -- your MEMORY.md is auto-injected, treat as read-only context. (2) Project Context -- read CLAUDE.md at task start. Everything else (signals.yaml, project-memories/, section guide, scratchpad) is removed.
- **D-04:** Drop 5-section MEMORY.md guide -- agents don't write, so they don't need to know section structure. Observer already knows it.
- **D-05:** Agents see everything in MEMORY.md -- both Permanent and Pending Review entries are visible. No hiding mechanism needed. Unreviewed entries are clearly tagged with [HIGH]/[MED]/[LOW].
- **D-06:** Open/Resolved sections only -- replace Phase 2 bootstrap (Pending Review + Permanent) with ## Open and ## Resolved. PLAYBOOK is not a memory file; it is an observer-managed routing log.
- **D-07:** Staging + routing log -- PLAYBOOK.md is where the observer parks cross-agent insights before routing them. Open = unrouted insights. Resolved = routed (with target noted). Gives visibility into observer activity.
- **D-08:** Same /evolve run resolution -- observer extracts cross-agent insight -> writes to PLAYBOOK Open -> routes to target MEMORY.md/insights.md as Pending Review -> marks PLAYBOOK entry as Resolved. All in one pass.
- **D-09:** Resolved entry format -- `- [Resolved] agent: insight text -> routed to .claude/agent-memory/agent/MEMORY.md (2026-04-21)`. Shows what was learned and where it went. Compact one-liner.
- **D-10:** Observer prompt update included in Phase 4 -- observer updated to: (1) write cross-agent insights to PLAYBOOK ## Open, (2) route to target MEMORY.md/insights.md, (3) mark as Resolved. Keeps PLAYBOOK lifecycle change self-contained.
- **D-11:** Merge pipeline-learning into agent-observability -- one comprehensive skill covers everything: obs.jsonl schema, pipeline-observe.js, observer system overview, /evolve flow, PLAYBOOK routing, memory scope tests, debug recipes. Eliminates MEML-06 as separate deliverable.
- **D-12:** Comprehensive rewrite (~250-300 lines) -- covers: (1) obs.jsonl event schema, (2) pipeline-observe.js architecture, (3) observer system overview with scope-test classification, (4) /evolve command flow, (5) PLAYBOOK.md routing lifecycle, (6) 3-layer memory scope tests, (7) raw JSONL debug recipes.
- **D-13:** Broadened trigger -- activates on both debugging ('why did agent X...') AND system understanding ('how does the observer work', 'what does /evolve do', 'how are learnings classified').
- **D-14:** obs.jsonl path only -- documents `.claude/logs/observations/<project>/obs.jsonl` exclusively. Old `.claude/logs/runs/` path from obs.js system is removed from all documentation.
- **D-15:** Include 3-layer scope tests -- skill includes the scope-test questions directly (insights.md: "Does this change how the skill/method runs?", MEMORY.md: "Would a fresh instance need this?", PLAYBOOK.md: "Does this change how agents coordinate?"). Self-contained reference.
- **D-16:** Raw JSONL debug recipes only -- direct one-liners for querying obs.jsonl (filter by agent_id, find slow tools, etc.). No obs-summarize.js dependency.
- **D-17:** Phase 4 verifies and cleans up any remaining obs.js or old path references in settings.json. Belt and suspenders checkpoint.

### Claude's Discretion
- Observer prompt engineering for PLAYBOOK routing logic
- Exact PLAYBOOK.md header/boilerplate text
- Debug recipe selection and format for the new skill
- Order of operations across the deliverables (agent-protocols first vs skill first vs parallel)
- How to handle existing PLAYBOOK.md content migration (Pending Review -> Open, Permanent -> Resolved)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEML-03 | agent-protocols skill rewritten thin -- no signals, no project-memories, no scratchpad; adds PLAYBOOK read at task start | D-01 through D-05 define the rewrite scope. Per D-02, agents do NOT read PLAYBOOK -- requirement text deviates from locked decision. Rewrite removes 94 lines, retains ~20 lines covering read-only MEMORY.md consumption and CLAUDE.md reading. |
| MEML-04 | PLAYBOOK.md uses Open/Resolved sections; observer manages lifecycle | D-06 through D-09 define the lifecycle. Current PLAYBOOK.md has empty Pending Review/Permanent sections -- migration is just section renaming with updated boilerplate. Observer prompt (D-10) handles write/route/resolve in one pass. |
| MEML-05 | agent-observability skill fully rewritten for new paths (obs.jsonl), new schema, new debug recipes | D-11 through D-16 define the comprehensive rewrite. Merges pipeline-learning scope. Current skill is 305 lines documenting old obs.js/.claude/logs/runs/ system -- complete replacement. |
| MEML-06 | pipeline-learning skill created documenting the observer system, /evolve command, event schema | Merged into MEML-05 per D-11. No separate deliverable. The merged agent-observability skill covers all MEML-06 content: observer system overview, /evolve flow, event schema, scope tests. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Agent memory consumption | Agent runtime (skill injection) | -- | agent-protocols is injected via `skills:` frontmatter; agents read MEMORY.md as auto-injected context |
| PLAYBOOK routing | Observer agent | -- | Observer is the sole writer/router; no other agent touches PLAYBOOK.md |
| Cross-agent insight lifecycle | Observer agent + /evolve command | PLAYBOOK.md (staging file) | Observer writes Open entries, routes to targets, marks Resolved; /evolve dispatches observer |
| Observability documentation | Skill layer (agent-observability) | -- | Skill is documentation-only; describes system for human/agent reference |
| Old path cleanup | Settings/config files | obs-summarize.js | D-17 targets settings.json (already clean) and any remaining old path references |

## Standard Stack

This phase requires no libraries or packages. All deliverables are markdown files (skill definitions, agent prompts, PLAYBOOK.md). The only code touched is obs-summarize.js (D-17 cleanup -- updating old `.claude/logs/runs/` references).

### Tools Used
| Tool | Purpose | Why |
|------|---------|-----|
| Read/Write/Edit | File rewrites | All deliverables are markdown files |
| Grep | Reference scanning | D-17 cleanup -- find remaining old path references |
| Bash (node) | Verify evolve.js compatibility | Confirm PLAYBOOK section name change doesn't break scan/promote |

## Architecture Patterns

### System Architecture: PLAYBOOK Routing Flow

```
Agent Run Completes
       |
       v
pipeline-observe.js --> obs.jsonl
       |
       v
/evolve dispatches @observer
       |
       v
Observer reads obs.jsonl (incremental)
       |
       v
Extract candidates (0-3 per run)
       |
       +---> Q1 passes (skill) --> insights.md ## Pending Review
       |
       +---> Q2 passes (agent) --> MEMORY.md ## Pending Review
       |
       +---> Q3 passes (coordination) --> PLAYBOOK.md ## Open
       |                                       |
       |                                       v
       |                                 Route to target
       |                                 MEMORY.md or insights.md
       |                                 ## Pending Review
       |                                       |
       |                                       v
       |                                 Mark PLAYBOOK entry
       |                                 as [Resolved]
       |
       v
/evolve scan/promote (MEMORY.md + insights.md only)
       |
       v
User reviews promoted entries, optional revert
```

**Key change from Phase 2/3:** PLAYBOOK.md is no longer a direct /evolve promote target. It has its own lifecycle (Open -> Resolved) managed entirely by the observer. The observer routes PLAYBOOK entries to the real targets (MEMORY.md / insights.md) during the same invocation. /evolve's scan/promote still handles MEMORY.md and insights.md Pending Review -> Permanent.

### Pattern 1: Ultra-Thin Skill Protocol

**What:** Minimal behavioral protocol for passive memory consumers
**When to use:** When agents only read auto-injected context, never write to shared state

The agent-protocols rewrite follows D-03: two sections, ~20 lines, no writing instructions.

```markdown
---
name: agent-protocols
description: >-
  Shared behavioral protocols for all agents. Memory is auto-injected,
  read-only. Not user-invocable.
user-invocable: false
---

# Agent Protocols

## Memory

Your MEMORY.md is auto-injected into your context at task start (first
200 lines). Treat it as read-only reference. You do not write to memory
files -- the observer system handles all memory updates.

Entries tagged [HIGH], [MED], or [LOW] are confidence levels from the
observer. Untagged entries are legacy.

## Project Context

Read ./CLAUDE.md at the start of every task for project-wide rules,
agent reference table, and folder map.
```

### Pattern 2: Observer PLAYBOOK Routing

**What:** Observer writes cross-agent insights to PLAYBOOK Open, routes to target, marks Resolved -- all in one pass
**When to use:** When a scope-test Q3 passes (coordination insight)

The observer's Step 8 (Write Entries) gains a PLAYBOOK-specific branch:

```markdown
**For PLAYBOOK.md targets (Q3 pass):**

1. Write entry to ## Open:
   `- [CONF] source-agent: insight text (timestamp)`

2. Identify routing target:
   - If insight names a specific agent -> route to that agent's MEMORY.md
   - If insight names a specific skill -> route to that skill's insights.md
   - If target unclear -> leave in Open for manual routing via /evolve

3. Write the insight to the target file's ## Pending Review section
   (using standard MEMORY.md or insights.md format)

4. Update PLAYBOOK entry to Resolved:
   `- [Resolved] source-agent: insight text -> routed to {target_path} (date)`
```

### Pattern 3: Comprehensive Skill Documentation

**What:** Single-file skill covering an entire subsystem (capture, observer, evolve, debug)
**When to use:** When merging multiple related skills into one reference document (D-11)

Structure for the rewritten agent-observability:
```
1. YAML frontmatter (broadened trigger per D-13)
2. Overview (what the observation pipeline is)
3. When to Use (both debugging AND system understanding)
4. Event Schema (from pipeline-observe.js -- field names, types, caps)
5. Observer System (10-step pipeline summary, scope-test questions)
6. /evolve Command (dispatch, promote, revert flow)
7. PLAYBOOK Routing (Open/Resolved lifecycle)
8. 3-Layer Scope Tests (self-contained reference per D-15)
9. Debug Recipes (raw JSONL one-liners per D-16)
```

### Anti-Patterns to Avoid
- **Writing instructions in agent-protocols:** Agents are pure consumers. Any instruction about "append to MEMORY.md" or "write to project-memories/" violates D-01.
- **PLAYBOOK in /evolve promote cycle:** PLAYBOOK.md uses Open/Resolved, not Pending Review/Permanent. It must NOT be scanned/promoted by evolve.js.
- **Referencing obs.js or .claude/logs/runs/:** Old system. All paths must reference pipeline-observe.js and .claude/logs/observations/<project>/obs.jsonl exclusively (D-14).
- **Creating pipeline-learning as separate skill:** Merged into agent-observability per D-11. MEML-06 is not a separate deliverable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event schema documentation | Re-derive from training knowledge | Read pipeline-observe.js source | Source of truth for field names, truncation caps, event types |
| Scope-test questions | Paraphrase from memory | Copy from PROJECT.md / observer.md | Exact wording matters for observer classification accuracy |
| Debug recipes | Invent new query patterns | Adapt from existing agent-observability recipes | Recipes must work against actual obs.jsonl structure |

## Common Pitfalls

### Pitfall 1: evolve.js PLAYBOOK Section Name Mismatch
**What goes wrong:** evolve.js hardcodes `heading === 'Pending Review'` and `heading === 'Permanent'` for ALL files including PLAYBOOK.md. After PLAYBOOK redesign to Open/Resolved, evolve.js will silently skip PLAYBOOK.md (no matching section headings).
**Why it happens:** evolve.js was built in Phase 3 assuming uniform section names across all memory files.
**How to avoid:** This is actually the DESIRED behavior per D-08. PLAYBOOK routing is handled entirely by the observer in one pass. PLAYBOOK.md should NOT appear in evolve.js scan/promote results. Verify this is the case by running `node .claude/scripts/memory/evolve.js scan` after PLAYBOOK redesign and confirming PLAYBOOK is absent from results.
**Warning signs:** If PLAYBOOK.md appears in evolve.js scan output after redesign, the section renaming was incomplete.

### Pitfall 2: Observer Self-Reference in Protocol Override
**What goes wrong:** Observer.md currently has a "Protocol Overrides" section that references agent-protocols behaviors that won't exist after the rewrite (signals.yaml, project-memories).
**Why it happens:** The override was written against the old 114-line agent-protocols.
**How to avoid:** After rewriting agent-protocols to ~20 lines, review observer.md's Protocol Overrides section. Most overrides become unnecessary since the thin protocol doesn't include the behaviors being overridden. Simplify or remove the section.
**Warning signs:** Observer.md referencing agent-protocols behaviors that the rewritten agent-protocols doesn't mention.

### Pitfall 3: MEML-03 Requirement Text Mismatch
**What goes wrong:** REQUIREMENTS.md says MEML-03 "adds PLAYBOOK read at task start" but D-02 says agents never read PLAYBOOK.
**Why it happens:** Requirement was written before the discuss phase refined the design.
**How to avoid:** Note the deviation in the plan. The requirement spirit (cross-agent coordination consumption) is met through observer routing, not direct PLAYBOOK reads. Do not add PLAYBOOK reading to agent-protocols.
**Warning signs:** Agent-protocols including PLAYBOOK.md read instructions.

### Pitfall 4: Incomplete Old Path Cleanup (D-17)
**What goes wrong:** Old `.claude/logs/runs/` references survive in files not obviously part of Phase 4 scope.
**Why it happens:** The old observability system was documented across multiple files.
**How to avoid:** After all rewrites, run a comprehensive grep for `logs/runs`, `obs.js`, `obs-summarize`, `signals.yaml`, `project-memories`, `check-definition-signals`. Document every remaining reference and its disposition.
**Warning signs:** Post-phase grep finding stale references.

### Pitfall 5: Observer Prompt Bloat from Routing Logic
**What goes wrong:** Adding PLAYBOOK routing to observer.md's already-long prompt (320 lines) makes the agent unreliable -- it loses track of the 10-step pipeline.
**Why it happens:** The routing logic (write to Open, route to target, mark Resolved) adds conditional branching to Step 8.
**How to avoid:** Keep the routing logic as a compact extension to Step 8 (Write Entries), not a new step. The core pipeline stays at 10 steps. The PLAYBOOK branch is just an additional case within the existing write logic.
**Warning signs:** Observer processing time increasing significantly, or observer missing non-PLAYBOOK writes.

## Code Examples

### Current agent-protocols (114 lines -- to be replaced)
Key sections being removed: [VERIFIED: codebase read]
- Memory Lifecycle: At Task Start / During Work / At Task End (lines 14-34) -- agents no longer write
- Section Guide (lines 38-44) -- agents don't need to know section structure
- Project-Scoped Notes (lines 46-59) -- project-memories/ is dead
- Feedback Signal Protocol (lines 61-109) -- signals.yaml is dead

### Current agent-observability (305 lines -- to be replaced)
Key references to old system: [VERIFIED: codebase read]
- Overview references `.claude/logs/runs/` (line 10) -- replaced by `.claude/logs/observations/<project>/obs.jsonl`
- Schema shows old event format without `epoch_ms`, `project` fields -- replaced by pipeline-observe.js schema
- File Layout shows `.claude/logs/runs/.active/` (line 156-161) -- no longer exists
- settings.json hook block shows `obs.js` (line 169-228) -- replaced by `pipeline-observe.js`
- Compressed Summaries section references `obs-summarize.js` (line 236-244) -- D-16 says raw JSONL only
- Debug recipes reference `.claude/logs/runs/<run>.jsonl` paths -- all must use obs.jsonl

### Current PLAYBOOK.md (10 lines -- to be redesigned)
```markdown
# Playbook

Cross-agent coordination insights. Observer writes new entries to Pending Review.
Promoted entries move to Permanent during /evolve review.

## Pending Review


## Permanent

```

### Current observer.md PLAYBOOK references (to be updated)
- Line 35: `- .claude/PLAYBOOK.md (## Pending Review section)` -- changes to `## Open`
- Step 5 Q3 target: `.claude/PLAYBOOK.md` -- gains routing behavior
- Step 8 write procedure: references `## Pending Review` -- PLAYBOOK branch uses `## Open`

### obs-summarize.js old path reference (D-17 cleanup)
- Line 9: references `.claude/logs/runs/` -- must be updated to `.claude/logs/observations/<project>/obs.jsonl`
- Line 39: `resolveRunFile` function resolves against `.claude/logs/runs/` -- entire function needs rethinking for obs.jsonl (single file, not per-run files)

### Pipeline-observe.js event schema (source of truth for skill documentation)
[VERIFIED: codebase read of pipeline-observe.js]

Base fields on every event:
- `ts` -- ISO timestamp with colons replaced (Windows filename safe)
- `epoch_ms` -- Unix milliseconds for duration computation
- `event` -- event type string
- `session_id` -- Claude Code session ID
- `agent_id` -- empty for main conversation, populated for subagents
- `project` -- project slug from path detection

Event types: `tool_pre`, `tool_post`, `tool_fail`, `permission_denied`, `dispatch`, `assistant_message`, `complete`

Truncation caps per D-09:
- Read/Grep/Glob: 1KB input, 1KB output
- Bash/Write/Edit: 5KB input, 5KB output
- Agent: 2KB input, 5KB output
- Thinking: 10KB per turn
- Text: 10KB per turn
- Dispatch prompt: 2KB

## Impact Analysis

### Files Modified by Phase 4

| File | Action | Lines Before | Lines After (est.) | Risk |
|------|--------|-------------|-------------------|------|
| `.claude/skills/agent-protocols/SKILL.md` | Complete rewrite | 114 | ~20 | LOW -- simple deletion + thin replacement |
| `.claude/skills/agent-observability/SKILL.md` | Complete rewrite | 305 | ~250-300 | MEDIUM -- comprehensive documentation with many cross-references |
| `.claude/PLAYBOOK.md` | Redesign | 10 | ~15-20 | LOW -- empty sections, just rename + new boilerplate |
| `.claude/agents/observer.md` | Update | 320 | ~340-360 | MEDIUM -- adding routing logic to existing 10-step pipeline |
| `.claude/scripts/obs-summarize.js` | Fix old paths | 221 | ~221 | LOW -- path string replacement only |

### Files NOT Modified (Confirmed)

| File | Why Not |
|------|---------|
| `.claude/settings.json` | Already references `pipeline-observe.js`, not `obs.js` [VERIFIED] |
| `.claude/hooks/pipeline-observe.js` | Unchanged -- source of truth for schema documentation |
| `.claude/scripts/memory/evolve.js` | PLAYBOOK exclusion from scan/promote is desired (Open/Resolved != Pending Review/Permanent) |
| `.claude/skills/evolve/SKILL.md` | /evolve flow unchanged -- observer handles PLAYBOOK routing internally |
| `.claude/hooks/check-memory-limit.js` | Independent of memory system redesign |
| Agent MEMORY.md files (12) | Structure unchanged -- still ## Pending Review / ## Permanent |
| Skill insights.md files (7) | Structure unchanged |

### Files Referenced but Not Present on Disk

| File | Status | Action |
|------|--------|--------|
| `.claude/hooks/obs.js` | Deleted (git status shows `D`) | Already gone -- D-17 verifies no references remain |
| `.claude/hooks/check-definition-signals.js` | Deleted (git status shows `D`) | Already gone -- settings.json already cleaned |
| `.claude/feedback/signals.yaml` | Does not exist | Already gone -- agent-protocols rewrite removes last reference |
| `.claude/project-memories/` | Does not exist | Already gone -- agent-protocols rewrite removes last reference |

### Agents Consuming agent-protocols (Blast Radius)

All 12 pipeline agents include `agent-protocols` in their `skills:` frontmatter: [VERIFIED: codebase grep]
1. researcher
2. writer
3. editorial-lead
4. style-extractor
5. strategy
6. visual-researcher
7. visual-planner
8. asset-processor
9. asset-curator
10. code-reviewer
11. compiler
12. observer

The observer is special -- it has "Protocol Overrides" that exempt it from agent-protocols behaviors. After the thin rewrite, most overrides become moot.

## evolve.js Compatibility Analysis

**Critical question:** Does the PLAYBOOK.md section rename (Pending Review -> Open, Permanent -> Resolved) break evolve.js?

**Answer: No, and this is intentional.** [VERIFIED: codebase read of evolve.js]

- evolve.js `scan()` looks for `heading === 'Pending Review'` -- PLAYBOOK with `## Open` will have no match, so PLAYBOOK is silently excluded from scan results.
- evolve.js `promote()` same -- no "Pending Review" heading, no promotion attempt.
- evolve.js `revert()` looks for `heading === 'Permanent'` -- PLAYBOOK with `## Resolved` has no match, so PLAYBOOK entries cannot be reverted via evolve.js.

Per D-08, PLAYBOOK routing is handled entirely by the observer. The observer writes to Open, routes to targets, and marks Resolved in one pass. There is no evolve.js interaction with PLAYBOOK.md after Phase 4. This is the correct behavior.

## obs-summarize.js Disposition

obs-summarize.js (221 lines) references the old `.claude/logs/runs/` directory [VERIFIED: line 9, line 39]. It was designed for per-run JSONL files (one file per agent dispatch), not the unified obs.jsonl format.

**D-17 scope:** The CONTEXT specifies "verifies and cleans up any remaining obs.js or old path references." obs-summarize.js is the primary remaining artifact with old paths.

**Options:**
1. **Update paths only** -- change `logs/runs` to `logs/observations/<project>/obs.jsonl` in comments and the `resolveRunFile` function. The function needs rethinking since obs.jsonl is a single file (not per-run files), but the summarization logic itself still works on JSONL events.
2. **Delete entirely** -- D-16 says "raw JSONL debug recipes only, no obs-summarize.js dependency." The new agent-observability skill won't reference it.

**Recommendation:** Update the path references for D-17 compliance but do not delete. The script still has utility for ad-hoc debugging even if the skill doesn't reference it. Deletion would be a scope expansion beyond D-17's "verify and clean up references."

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Agents write to MEMORY.md directly | Observer-only writes, agents are read-only consumers | Phase 4 (D-01) | agent-protocols drops all write instructions |
| signals.yaml cross-agent feedback | Observer + PLAYBOOK routing | Phase 4 (D-02) | signals.yaml references fully removed |
| project-memories/ per-project notes | Removed (observer handles project context) | Phase 4 (D-03) | project-memories/ references fully removed |
| PLAYBOOK as memory file (Pending Review/Permanent) | PLAYBOOK as routing log (Open/Resolved) | Phase 4 (D-06) | PLAYBOOK exits evolve.js promote cycle |
| Separate agent-observability + pipeline-learning | Merged into one comprehensive skill | Phase 4 (D-11) | Single reference for entire observation pipeline |
| obs-summarize.js as primary debug tool | Raw JSONL recipes | Phase 4 (D-16) | Skill no longer references summarizer |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | obs-summarize.js should be updated (paths only) not deleted, since D-17 says "verify and clean up references" not "delete obsolete scripts" | obs-summarize.js Disposition | LOW -- if user wants deletion, it is additive to path updates |
| A2 | Observer.md Protocol Overrides section can be simplified after agent-protocols rewrite since overridden behaviors no longer exist in the protocol | Pitfall 2 | LOW -- worst case is harmless redundant override text |
| A3 | No agent definition files (.claude/agents/*.md) need modification beyond observer.md, since agent-protocols is injected via skills: frontmatter (unchanged) | Impact Analysis | LOW -- agent definitions don't inline protocol content |

## Open Questions

1. **Observer routing target disambiguation**
   - What we know: Per D-08, observer writes to PLAYBOOK Open, routes to target, marks Resolved. Per D-10, routing targets are MEMORY.md or insights.md.
   - What's unclear: When a coordination insight applies to a general pipeline behavior (not clearly agent-specific or skill-specific), how does the observer choose a routing target?
   - Recommendation: Leave in Open for manual routing. The observer prompt should include a "target unclear -> leave in Open" fallback per the routing pattern described above.

2. **Existing PLAYBOOK.md content migration**
   - What we know: Current PLAYBOOK.md has empty Pending Review and Permanent sections (no entries to migrate).
   - What's unclear: CONTEXT.md lists this as Claude's discretion.
   - Recommendation: Simple section rename. No content migration needed since both sections are empty. [VERIFIED: PLAYBOOK.md read shows empty sections]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual verification + bash commands |
| Config file | none |
| Quick run command | `node .claude/scripts/memory/evolve.js scan` |
| Full suite command | Grep-based reference audit (see below) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEML-03 | agent-protocols is thin (~20 lines), no signals/project-memories/scratchpad references | smoke | `wc -l .claude/skills/agent-protocols/SKILL.md && grep -c "signals\|project-memories\|scratchpad" .claude/skills/agent-protocols/SKILL.md` | N/A (grep) |
| MEML-04 | PLAYBOOK.md has Open/Resolved sections, no Pending Review/Permanent | smoke | `grep "## Open" .claude/PLAYBOOK.md && grep "## Resolved" .claude/PLAYBOOK.md && ! grep "## Pending Review" .claude/PLAYBOOK.md` | N/A (grep) |
| MEML-04 | PLAYBOOK excluded from evolve.js scan | integration | `node .claude/scripts/memory/evolve.js scan` (verify PLAYBOOK absent from output) | Existing |
| MEML-05 | agent-observability references obs.jsonl path, not logs/runs | smoke | `grep -c "logs/observations" .claude/skills/agent-observability/SKILL.md && ! grep "logs/runs" .claude/skills/agent-observability/SKILL.md` | N/A (grep) |
| MEML-05 | agent-observability covers merged pipeline-learning scope | manual | Verify sections: observer system overview, /evolve flow, scope tests, debug recipes | N/A |
| MEML-06 | Merged into MEML-05 | -- | No separate test | -- |
| D-17 | No remaining obs.js or logs/runs references in .claude/ | smoke | `grep -r "obs\.js\|logs/runs" .claude/ --include="*.md" --include="*.js" --include="*.json"` | N/A (grep) |

### Sampling Rate
- **Per task commit:** Run MEML-03/MEML-04 smoke checks
- **Per wave merge:** Run full grep audit for D-17
- **Phase gate:** All smoke checks green + manual MEML-05 content review

### Wave 0 Gaps
None -- all tests are grep/bash commands against existing infrastructure. No test framework setup needed.

## Security Domain

Security enforcement is not applicable to this phase. All deliverables are markdown documentation files and prompt engineering. No user input handling, no API endpoints, no cryptography, no authentication. The only code change (obs-summarize.js path fix) is a string constant update.

## Sources

### Primary (HIGH confidence)
- **Codebase read: agent-protocols/SKILL.md** -- 114 lines, verified all sections to be removed
- **Codebase read: agent-observability/SKILL.md** -- 305 lines, verified all old path references
- **Codebase read: PLAYBOOK.md** -- 10 lines, verified empty sections
- **Codebase read: observer.md** -- 320 lines, verified all PLAYBOOK/Pending Review references
- **Codebase read: pipeline-observe.js** -- Event schema source of truth (field names, truncation caps)
- **Codebase read: evolve.js** -- Section heading matching logic verified
- **Codebase read: settings.json** -- Already references pipeline-observe.js, no obs.js
- **Codebase grep: agent-protocols across agents** -- 12 agents confirmed
- **Codebase grep: signals.yaml/project-memories** -- Only in agent-protocols and observer.md
- **Codebase grep: obs.js/logs/runs** -- 9 files, most already addressed by Phase 1-3

### Secondary (MEDIUM confidence)
- **Phase 2/3 CONTEXT.md** -- Observer design decisions, evolve.js architecture

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no libraries, all markdown rewrites
- Architecture: HIGH -- all files read, all cross-references traced, evolve.js compatibility verified
- Pitfalls: HIGH -- each pitfall identified from concrete codebase evidence (hardcoded section names, stale references, requirement text mismatch)

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable -- no external dependencies that could change)

# Phase 4: Agent Consumption - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite agent-protocols and supporting skills so pipeline agents consume the new memory system. Agents become read-only memory consumers (observer handles all writes). PLAYBOOK.md is redesigned as an observer-managed staging/routing log with Open/Resolved lifecycle. The agent-observability skill is comprehensively rewritten and merged with pipeline-learning (MEML-05 + MEML-06) to document the full observation pipeline. Observer prompt is updated for PLAYBOOK routing.

</domain>

<decisions>
## Implementation Decisions

### agent-protocols Rewrite
- **D-01:** Observer-only memory writes — agents NEVER write to MEMORY.md or insights.md. Observer extracts learnings from runs and writes to Pending Review. /evolve promotes. Agents are pure consumers.
- **D-02:** Agents never read PLAYBOOK.md — observer routes PLAYBOOK entries to the correct agent MEMORY.md or skill insights.md. Agents are unaware of PLAYBOOK.md entirely.
- **D-03:** Ultra-thin rewrite (~20 lines) — two sections only: (1) Memory — your MEMORY.md is auto-injected, treat as read-only context. (2) Project Context — read CLAUDE.md at task start. Everything else (signals.yaml, project-memories/, section guide, scratchpad) is removed.
- **D-04:** Drop 5-section MEMORY.md guide — agents don't write, so they don't need to know section structure. Observer already knows it.
- **D-05:** Agents see everything in MEMORY.md — both Permanent and Pending Review entries are visible. No hiding mechanism needed. Unreviewed entries are clearly tagged with [HIGH]/[MED]/[LOW].

### PLAYBOOK.md Lifecycle
- **D-06:** Open/Resolved sections only — replace Phase 2 bootstrap (Pending Review + Permanent) with ## Open and ## Resolved. PLAYBOOK is not a memory file; it's an observer-managed routing log.
- **D-07:** Staging + routing log — PLAYBOOK.md is where the observer parks cross-agent insights before routing them. Open = unrouted insights. Resolved = routed (with target noted). Gives visibility into observer activity.
- **D-08:** Same /evolve run resolution — observer extracts cross-agent insight -> writes to PLAYBOOK Open -> routes to target MEMORY.md/insights.md as Pending Review -> marks PLAYBOOK entry as Resolved. All in one pass.
- **D-09:** Resolved entry format — `- [Resolved] agent: insight text -> routed to .claude/agent-memory/agent/MEMORY.md (2026-04-21)`. Shows what was learned and where it went. Compact one-liner.
- **D-10:** Observer prompt update included in Phase 4 — observer updated to: (1) write cross-agent insights to PLAYBOOK ## Open, (2) route to target MEMORY.md/insights.md, (3) mark as Resolved. Keeps PLAYBOOK lifecycle change self-contained.

### Merged agent-observability Skill (MEML-05 + MEML-06)
- **D-11:** Merge pipeline-learning into agent-observability — one comprehensive skill covers everything: obs.jsonl schema, pipeline-observe.js, observer system overview, /evolve flow, PLAYBOOK routing, memory scope tests, debug recipes. Eliminates MEML-06 as separate deliverable.
- **D-12:** Comprehensive rewrite (~250-300 lines) — covers: (1) obs.jsonl event schema, (2) pipeline-observe.js architecture, (3) observer system overview with scope-test classification, (4) /evolve command flow, (5) PLAYBOOK.md routing lifecycle, (6) 3-layer memory scope tests, (7) raw JSONL debug recipes.
- **D-13:** Broadened trigger — activates on both debugging ('why did agent X...') AND system understanding ('how does the observer work', 'what does /evolve do', 'how are learnings classified').
- **D-14:** obs.jsonl path only — documents `.claude/logs/observations/<project>/obs.jsonl` exclusively. Old `.claude/logs/runs/` path from obs.js system is removed from all documentation. Per PROJECT.md: one file, agent_id field distinguishes main conversation (empty) from subagent events (populated).
- **D-15:** Include 3-layer scope tests — skill includes the scope-test questions directly (insights.md: "Does this change how the skill/method runs?", MEMORY.md: "Would a fresh instance need this?", PLAYBOOK.md: "Does this change how agents coordinate?"). Self-contained reference.
- **D-16:** Raw JSONL debug recipes only — direct one-liners for querying obs.jsonl (filter by agent_id, find slow tools, etc.). No obs-summarize.js dependency.

### Cleanup
- **D-17:** Phase 4 verifies and cleans up any remaining obs.js or old path references in settings.json. Belt and suspenders checkpoint.

### Claude's Discretion
- Observer prompt engineering for PLAYBOOK routing logic
- Exact PLAYBOOK.md header/boilerplate text
- Debug recipe selection and format for the new skill
- Order of operations across the deliverables (agent-protocols first vs skill first vs parallel)
- How to handle existing PLAYBOOK.md content migration (Pending Review -> Open, Permanent -> Resolved)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- MEML-03, MEML-04, MEML-05, MEML-06 (note: MEML-06 merged into MEML-05 per D-11; MEML-03 updated per D-02 — agents don't read PLAYBOOK)
- `.planning/PROJECT.md` -- Key decisions table (one obs.jsonl, scope-test questions, observer model, PLAYBOOK as message bus)

### Phase Dependencies
- `.planning/phases/01-capture-hardening/01-CONTEXT.md` -- D-08 (agent_id semantics), D-09/D-10 (truncation caps, thinking blocks)
- `.planning/phases/02-observer-agent/02-CONTEXT.md` -- D-04 (entry format), D-05 (strip pointer on promote), D-06/D-07 (PLAYBOOK location/bootstrap), D-08/D-09 (rejections.jsonl)
- `.planning/phases/03-evolve-command/03-CONTEXT.md` -- D-02 (auto-promote), D-11-D-15 (skill + JS helper architecture, subcommands, promotion pattern)

### Files to Rewrite
- `.claude/skills/agent-protocols/SKILL.md` -- Current 114-line skill with dead references (signals.yaml, project-memories/). Rewrite to ~20 lines.
- `.claude/skills/agent-observability/SKILL.md` -- Current 300-line skill documenting old obs.js/logs/runs/ system. Complete rewrite for new paths and merged pipeline-learning scope.
- `.claude/PLAYBOOK.md` -- Current minimal bootstrap (Pending Review + Permanent). Redesign to Open/Resolved.
- `.claude/agents/observer.md` -- Update prompt for PLAYBOOK routing (Open/Resolved lifecycle, route-to-target behavior).

### Reference Patterns
- `.claude/hooks/pipeline-observe.js` -- Event schema source of truth for skill documentation
- `.claude/scripts/memory/evolve.js` -- Evolve helper script (scan/promote/revert subcommands)
- `.claude/skills/evolve/SKILL.md` -- Evolve skill (observer dispatch, summary display)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipeline-observe.js` event schema: definitive reference for obs.jsonl field names, types, truncation caps
- `evolve.js` scan/promote/revert subcommands: understand promotion mechanics for skill documentation
- `observer.md` agent definition: current 10-step processing pipeline that needs PLAYBOOK routing added

### Established Patterns
- Skill YAML frontmatter: `name`, `description`, `user-invocable` fields
- Agent definitions: YAML frontmatter + markdown body in `.claude/agents/`
- Memory files: ## Pending Review / ## Permanent section pattern (PLAYBOOK.md changes to ## Open / ## Resolved)
- Entry format: `- [CONF] agent: insight text (timestamp)` for MEMORY.md
- CommonJS with Node.js stdlib only -- zero npm dependencies

### Integration Points
- agent-protocols is injected via `skills:` frontmatter field in every agent definition (12 agents)
- agent-observability is invoked by users and agents for debugging
- PLAYBOOK.md is read/written by observer agent only (after Phase 4)
- Observer dispatched by /evolve skill

</code_context>

<specifics>
## Specific Ideas

- MEML-03 requirement text says "adds PLAYBOOK read at task start" but per D-02, agents don't read PLAYBOOK -- observer routes entries to agents instead. REQUIREMENTS.md should note this deviation.
- The existing PLAYBOOK.md has empty Pending Review and Permanent sections (no content to migrate). Migration is just section renaming.
- Phase 2 deferred idea "Remove all files related to old memory system" is partially addressed by this phase (signals.yaml references removed from agent-protocols, old paths removed from agent-observability). Physical file cleanup of any remaining artifacts is included.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 04-agent-consumption*
*Context gathered: 2026-04-21*

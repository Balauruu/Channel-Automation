# Phase 5: Feedback Propagation - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Downstream agent insights flow back to influence upstream agent behavior in subsequent pipeline runs. Delivers: YAML-based cross-agent signal system (`feedback/signals.yaml`), signal promotion mechanism (self-promotion to MEMORY.md via upgraded agent-protocols, flagged promotion for agent definition changes), structural verification gates inside pipeline skills at stage boundaries, and validated feedback flow across the pipeline.

</domain>

<decisions>
## Implementation Decisions

### Signal Schema & Routing
- **D-01:** Signal file format is **YAML** (`feedback/signals.yaml`), not markdown. Signals are structured data — the format should match. Replaces the agent-protocols stub reference to `feedback/SIGNALS.md`.
- **D-02:** Signals are **domain-tagged** (editorial, visual, strategy, meta), not direct agent-to-agent. Any agent in the relevant domain reads signals for that domain. More resilient than naming specific agents.
- **D-03:** Signals include a **type field** for categorization: quality, content, technical, process. Helps agents filter what's relevant to their current task.
- **D-04:** Signal location is **global only** — single `feedback/signals.yaml` at project root. Signals represent durable pipeline learnings, not per-video notes.

### Signal Injection & Promotion
- **D-05:** Signals are **not ephemeral prompt injections**. They permanently alter agent behavior. `signals.yaml` is a feedback inbox — a staging area where insights land, then get promoted into permanent agent changes.
- **D-06:** **Hybrid promotion model:**
  - **Self-promotion to MEMORY.md** (most signals, ~90%) — agents read signals for their domain via agent-protocols at task start, integrate actionable insights into their own MEMORY.md as patterns/decisions, then mark the signal resolved. Safe — agents already manage their own memory.
  - **Flagged promotion for agent definition changes** (rare, high-impact signals) — signals that should change core agent procedures/guardrails are tagged `promotion: definition` in signals.yaml. These are processed by @meta agent or human review. Protects agent definitions from self-editing risks.
- **D-07:** Agent-protocols skill gets **upgraded** with full signal processing logic: read signals → filter by domain → integrate into MEMORY.md → mark resolved. This replaces the current stub.
- **D-08:** Both pipeline-dispatched and directly-invoked agents receive signals via agent-protocols. No orchestrator needed (consistent with Phase 1 D-01). Pipeline skills do NOT inject signals into dispatch prompts.

### Verification Gates
- **D-09:** Verification gates live **inside pipeline skills** — each pipeline skill checks the previous stage's output before dispatching its agent. No extra user step required.
- **D-10:** Gates perform **structural + completeness checks** — verify required output files exist, contain expected sections, and meet minimum content thresholds. Fast, deterministic, catches obvious gaps. No AI-powered quality assessment.
- **D-11:** Gate failure behavior: **block + guide** — pipeline skill refuses to dispatch and tells the user exactly what's missing (e.g., "Research dossier missing source_manifest — run /research first"). No wasted tokens on incomplete inputs.
- **D-12:** Three gate boundaries implemented:
  1. Research → Script (`/write-script` checks research dossier)
  2. Script → Visual Plan (`/visual-plan` checks script output)
  3. Visual Plan → Assets (`/process-assets` checks visual plan output)

### Feedback Loop Scope
- **D-13:** Signal threshold is **broad pipeline insights with cross-agent focus** — agents write signals for any pipeline observation, but the primary emphasis is on insights that would change how another agent works. Self-only learnings go to MEMORY.md, not signals.
- **D-14:** Signal lifecycle follows **resolve-on-promotion** — signals marked `resolved: true` once promoted to MEMORY.md or agent definition. Resolved signals stay in file as history but agents skip them. Prune resolved entries when file exceeds ~50 entries.

### Claude's Discretion
- Exact YAML schema field names and structure for signals.yaml
- Domain-to-agent mapping (which agents belong to which domain)
- Specific structural checks per verification gate (what sections/files each gate validates)
- Signal pruning implementation (manual vs scripted)
- Agent-protocols upgrade — exact wording of signal processing instructions
- How `promotion: definition` signals are surfaced to meta/human

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing feedback system (upgrade target)
- `.claude/skills/agent-protocols/SKILL.md` — Current agent-protocols skill with Feedback Signal Protocol stub. This is the primary file to upgrade with full signal processing logic.

### Agent definitions (signal consumers)
- `.claude/agents/*.md` — All 12 agent definitions. All inject agent-protocols via `skills:` frontmatter. Signal domain mapping needs to be established for each agent.

### Agent memory (promotion target)
- `.claude/agent-memory/*/MEMORY.md` — Per-agent persistent memory files. Self-promoted signals become entries in patterns/decisions sections.

### Pipeline skills (verification gate targets)
- `.claude/skills/write-script/SKILL.md` — Needs research→script verification gate
- `.claude/skills/visual-plan/SKILL.md` — Needs script→visual-plan verification gate
- `.claude/skills/process-assets/SKILL.md` — Needs visual-plan→assets verification gate

### Session logging (existing hooks pattern)
- `.claude/hooks/log-agent-dispatch.js` — Existing PreToolUse hook pattern for reference
- `.claude/hooks/log-agent-complete.js` — Existing SubagentStop hook pattern for reference

### Prior phase context
- `.planning/phases/01-foundation-architecture-validation/01-CONTEXT.md` — User-invoked only (D-01), fat agent bodies (D-05/D-06), memory protocol (D-13-16)
- `.planning/phases/03-agent-migration-memory/03-CONTEXT.md` — 12 agent roster (D-01), agent persona depth (D-06-D-08), memory seeding (D-09-D-11)
- `.planning/phases/04-pipeline-triggers-hooks/04-CONTEXT.md` — Pipeline skill architecture (D-01-D-03), context flow (D-04-D-05), session logging (D-11-D-13)

### Project requirements
- `.planning/REQUIREMENTS.md` — AGNT-14, MEMO-08, MEMO-09, MEMO-10, SKIL-13
- `.planning/PROJECT.md` — Core value: cross-agent feedback propagation is the single most important capability

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `agent-protocols` skill — already injected into all 12 agents, has Feedback Signal Protocol stub ready for upgrade
- Session logging hooks — `log-agent-dispatch.js` and `log-agent-complete.js` demonstrate the hook pattern if needed
- `audit-agents.js` script — validation pattern that could inform signal schema validation

### Established Patterns
- Agent frontmatter `skills: [agent-protocols, ...]` — injection mechanism already working for all agents
- MEMORY.md structure: key_files, decisions, patterns, observations, open_questions (append-only with timestamps)
- Pipeline skills dispatch agents via Agent tool with context from `projects/<name>/` directory
- YAML used in agent frontmatter — familiar format within the system

### Integration Points
- `feedback/` directory — needs creation (doesn't exist yet)
- `feedback/signals.yaml` — new file, primary feedback inbox
- `.claude/skills/agent-protocols/SKILL.md` — upgrade signal stub to full processing logic
- `.claude/skills/write-script/SKILL.md` — add research→script gate
- `.claude/skills/visual-plan/SKILL.md` — add script→visual-plan gate
- `.claude/skills/process-assets/SKILL.md` — add visual-plan→assets gate

</code_context>

<specifics>
## Specific Ideas

- User explicitly rejected ephemeral signal injection ("signals shouldn't be injected in the dispatch prompt, but used to permanently alter the behavior of the agent") — this is the core design insight for the entire phase
- User suggested a universal skill approach for signal processing, which aligns with upgrading agent-protocols
- User chose YAML format after questioning why structured data was in markdown — pragmatic format choice
- Hybrid promotion model was chosen to balance agent autonomy (self-promote to MEMORY.md) with safety (definition changes need review)
- Signal threshold is broad but cross-agent focused — agents should write pipeline insights, not just strict cross-agent actions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-feedback-propagation*
*Context gathered: 2026-04-11*

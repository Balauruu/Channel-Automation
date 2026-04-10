# Phase 2: Skills Library - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Every domain skill is built as an independently usable Claude Code skill with consistent structure, reflection loops, and context-loading patterns. Delivers: 8 domain expertise skills (SKIL-01 through SKIL-08), all following the GSD agent-skill relationship pattern where skills provide reusable domain knowledge injected into agents via config — not duplicates of agent procedures.

</domain>

<decisions>
## Implementation Decisions

### Skill-Agent Relationship
- **D-01:** GSD pattern adopted — agents own their execution procedures (3-pass research, 4-step writing), skills inject supplementary domain expertise. Skills are NOT agent procedures. Skills are persistent, version-controlled knowledge that agents load on demand.
- **D-02:** Skills injected into agents via config-based mechanism (agent_skills mapping in config). Agents reference skills via `@file` syntax, not hardcoded in frontmatter. Zero overhead when a skill isn't configured for an agent.
- **D-03:** Skills serve multiple agents — a domain skill like archive-search can be injected into both researcher and visual-researcher. Reusability is the design goal.

### Script Infrastructure
- **D-04:** Skills contain domain expertise only — no Python script dependencies required. Script references are documented within skills but marked as "available after Phase 6 integration." Skills are valuable without scripts because agents use Claude's native capabilities (WebSearch, WebFetch, Read, Bash).
- **D-05:** Python scripts remain in V5 at `.pi/multi-team/scripts/` until Phase 6 migrates them to V0.6 directories (editorial/, media/, strategy/).

### Build Priority
- **D-06:** All 8 domain skills built in Phase 2. Skills that serve Phase 3 agents (visual narrative, media evaluation, archive search) are built now so agents can reference them immediately when created.
- **D-07:** Lead coordination logic (Editorial Lead, Strategy Lead) becomes pipeline skills in Phase 4 — NOT agents. The flat user-invoked agent model (D-01 from Phase 1) eliminates the lead tier. Pipeline skills tell the user which agents to invoke and in what order.

### Skill Structure
- **D-08:** No 200-line cap on skills. The 1M context window makes line limits unnecessary. Skills should be as long as needed for thorough domain coverage. Quality and completeness over brevity.
- **D-09:** `superpowers:writing-skills` is the PRIMARY reference for skill creation methodology (TDD for skills, CSO description optimization, rationalization resistance). The local crafting guide at `.claude/references/skill-crafting-guide.md` is a supplementary quick-reference, not the source of truth.
- **D-10:** Exemplar system is OPTIONAL — `references/` directory and exemplar files are not required. Skills CAN have exemplars if useful, but it is not a structural requirement. `insights.md` is the primary and sufficient learning mechanism.
- **D-11:** Skill directory structure:
  ```
  .claude/skills/skill-name/
      SKILL.md              # Skill definition (no line cap)
      prompts/              # Prompt templates (where applicable)
      scripts/              # Helper scripts (where applicable)
      insights.md           # Accumulated learnings from runs
      references/           # OPTIONAL exemplar outputs
  ```

### Requirements Updates Needed
- **D-12:** SKIL-09 must be updated: remove "SKILL.md < 200 lines" constraint, make "references/exemplar_*.md" optional instead of required. Updated structure: SKILL.md (no cap), prompts/, scripts/ (where applicable), insights.md, references/ (optional).
- **D-13:** SKIL-07 (exemplar curation slots) changes from required to optional — "2-3 max per skill" becomes guidance, not mandate.

### Claude's Discretion
- Skill internal organization (section ordering, subsection depth)
- Which skills need prompts/ vs. scripts/ directories (based on domain needs)
- insights.md initial content (can start empty)
- Exact skill names and slash-command naming (consistent with channel pipeline domain)
- How to structure the config-based skill injection mechanism

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Skill creation methodology
- `superpowers:writing-skills` (invoke via Skill tool) — PRIMARY reference for skill creation: TDD methodology, CSO description optimization, rationalization resistance, skill structure. Agents building skills MUST invoke this skill first.
- `.claude/references/skill-crafting-guide.md` — Supplementary quick-reference for skill directory structure and insight lifecycle

### Architecture patterns (from Phase 1 research)
- `.planning/research/ARCHITECTURE.md` — Full directory structure, agent definition templates, domain enforcement patterns
- `.planning/research/STACK.md` — Claude Code extension points (agents, hooks, MCP, skills, memory), frontmatter fields

### Phase 1 context
- `.planning/phases/01-foundation-architecture-validation/01-CONTEXT.md` — Prior decisions: user-invoked agents only (D-01), fat agent bodies with shared skills (D-05), agent-protocols skill pattern (D-06), channel identity integration (D-10/D-11)

### Project requirements
- `.planning/REQUIREMENTS.md` — SKIL-01 through SKIL-12 requirements (note: SKIL-09 and SKIL-07 modified by D-08, D-10, D-12, D-13)
- `.planning/PROJECT.md` — Project charter, constraints, V5 migration context

### Existing skills and agents
- `.claude/skills/agent-protocols/SKILL.md` — Existing behavioral protocol skill (non-user-invocable), pattern reference for shared skills
- `.claude/agents/researcher.md` — Researcher agent with embedded 3-pass procedure (skills supplement this, don't replace it)
- `.claude/agents/writer.md` — Writer agent with embedded 4-step procedure (skills supplement this, don't replace it)

### V5 source (domain knowledge reference)
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\scripts\` — V5 Python scripts organized by domain (editorial/, media/, strategy/). Scripts stay as-is; skills document the domain knowledge these scripts encode.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `agent-protocols` skill — pattern for non-user-invocable behavioral skills (memory lifecycle, feedback signals, project context loading)
- Skill crafting guide — structure reference at `.claude/references/skill-crafting-guide.md`
- Researcher agent body — contains domain-specific research procedures that skills will supplement with additional expertise
- Writer agent body — contains domain-specific writing procedures that skills will supplement with channel knowledge

### Established Patterns
- Skills use YAML frontmatter (name, description, user-invocable)
- Non-user-invocable skills injected via `skills:` frontmatter field in agent definitions
- `@file` syntax for referencing external documents in agent/skill bodies
- `<project_context>` block telling agents to read CLAUDE.md

### Integration Points
- Skills will be referenced by agents via config-based injection mechanism (to be designed during planning)
- Agent `skills:` frontmatter currently only references `agent-protocols` — new domain skills may use a different injection pattern (config-based per GSD pattern)
- Pipeline trigger skills in Phase 4 will coordinate which domain skills load for which pipeline stage

</code_context>

<specifics>
## Specific Ideas

- GSD is the golden standard for agent-skill architecture — research confirmed thin agents + injected skills pattern
- User explicitly overrode the 200-line skill cap — "skills are not limited to < 200 lines"
- User explicitly specified writing-skills superpowers as primary creation reference — "should reference the whole skill-creator skill"
- Lead agents (Editorial Lead, Strategy Lead) are replaced by pipeline skills that tell the user which agents to invoke — flat model throughout
- The insight lifecycle (append per run, merge at 20+, promote at 3+ convergence) is the core learning mechanism, not exemplars

</specifics>

<deferred>
## Deferred Ideas

- Lead coordination logic as pipeline skills (`/research`, `/write-script`, `/visual-plan`, etc.) — Phase 4
- REQUIREMENTS.md updates for SKIL-09 and SKIL-07 — should be done during Phase 2 planning, not context gathering
- Local crafting guide update to reflect new decisions — during Phase 2 execution
- Config-based skill injection mechanism design — Phase 2 planning/research
- Python script migration from V5 to V0.6 — Phase 6

### Reviewed Todos (not folded)
None — no pending todos matched Phase 2 scope.

</deferred>

---

*Phase: 02-skills-library*
*Context gathered: 2026-04-10*

# Phase 3: Agent Migration & Memory - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

All consolidated agents exist with specialized personas, tool scoping restricts each agent to its domain, and every agent has persistent memory seeded from V5 expertise. Delivers: 10 new agent definitions, updates to 2 existing agents (researcher, writer), per-agent MEMORY.md files seeded from V5 expertise YAML, and updated config.json agent_skills mapping for all 12 agents.

</domain>

<decisions>
## Implementation Decisions

### Agent Consolidation Roster
- **D-01:** Final roster is 12 agents (down from 17 in V5). 10 new agents to build, 2 existing agents to update.
- **D-02:** Media-lead dropped entirely — pure coordination role with no unique domain expertise. Coordination logic becomes a Phase 4 pipeline skill.
- **D-03:** Editorial-lead is a quality gating agent only — focused on research quality review and editorial standards. Pipeline coordination moves to Phase 4 pipeline skills. This aligns with Phase 2 D-07 (lead coordination → pipeline skills).
- **D-04:** Meta scope split into two agents: **meta** (meta-lead + pipeline-observer + ux-improver) and **code-reviewer** (standalone). Code review is distinct enough to warrant its own focused agent.
- **D-05:** Orchestrator dropped (Phase 1 D-01 — user-invoked only, no auto-dispatch).

**Full V5 → V0.6 mapping:**

| V0.6 Agent | V5 Source(s) | Status |
|---|---|---|
| researcher | researcher | Update (Phase 1) |
| writer | writer | Update (Phase 1) |
| strategy | strategy-lead + market-analyst | New |
| style-extractor | style-extractor | New |
| editorial-lead | editorial-lead (quality gating only) | New |
| visual-researcher | visual-researcher | New |
| visual-planner | visual-planner | New |
| asset-processor | asset-processor | New |
| asset-curator | asset-curator | New |
| meta | meta-lead + pipeline-observer + ux-improver | New |
| code-reviewer | code-reviewer | New |
| compiler | compiler | New |

**Dropped:** orchestrator, media-lead

### Agent Persona Depth
- **D-06:** Rich personas for ALL agents — distinct identity paragraph, domain boundaries, explicit "you do NOT do X" guardrails. Consistent with the researcher/writer pattern from Phase 1.
- **D-07:** Adapt V5 agent bodies as the PRIMARY source for V0.6 personas. Start from V5 `.md` files, adapt procedures/persona to Claude Code format. Preserve battle-tested domain expertise. Rewrite only what doesn't fit the new system.
- **D-08:** Consolidated agents present as unified experts — one coherent specialist per agent, no internal domain splits. The strategy agent IS a strategy expert, not "a strategy-lead wearing a market-analyst hat."

### Memory Seeding
- **D-09:** Merge all V5 expertise YAMLs for each agent, dedupe. Consolidated agents combine all source YAMLs into one MEMORY.md. Remove duplicates and contradictions across merged sources.
- **D-10:** Strip V5-specific content during conversion — remove Pi CLI references, `.pi/` paths, delegation chains, footer UI patterns, and other V5-only system artifacts. Keep domain knowledge (channel insights, research patterns, quality criteria, observations).
- **D-11:** Insight lifecycle rules (merge at 20+ entries, promote to SKILL.md at 3+ convergence) remain as behavioral instructions in agent-protocols only. Agent self-manages. No validation script or automation.

### Existing Agent Updates
- **D-12:** Phase 3 updates researcher and writer to inject domain skills from config.json into their `skills:` frontmatter. All 12 agents leave Phase 3 fully configured with their skill mappings.
- **D-13:** Researcher and writer MEMORY.md files reseeded from V5 expertise YAML using the same merge-all-dedupe-strip strategy. Replaces the current minimal seeds.
- **D-14:** config.json `agent_skills` mapping updated to include all 12 agents (adding editorial-lead, style-extractor, code-reviewer, compiler).

### Claude's Discretion
- Exact agent body line counts (target ~120-200 but adjust based on content needs)
- `tools:` field contents per agent (which tools each agent gets access to)
- Specific channel docs (`@file` references) per agent based on domain relevance
- Order of agent creation within plans
- MEMORY.md section content during V5 YAML conversion (judgment calls on what to keep/strip)
- Skill assignments for the 4 new config.json entries (editorial-lead, style-extractor, code-reviewer, compiler)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### V5 source (agent bodies for adaptation)
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\agents\` — All 17 V5 agent definition files. Primary source for adapting persona, procedures, tool usage, and output formats.

### V5 source (expertise YAMLs for memory seeding)
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\expertise\` — 17 mental model YAML files. Source for MEMORY.md seeding. Key files for consolidated agents:
  - `strategy-lead-mm.yaml` + `market-analyst-mm.yaml` → strategy MEMORY.md
  - `meta-lead-mm.yaml` + `pipeline-observer-mm.yaml` + `ux-improver-mm.yaml` → meta MEMORY.md
  - `code-reviewer-mm.yaml` → code-reviewer MEMORY.md (1:1)

### Architecture and stack reference
- `.planning/research/ARCHITECTURE.md` — Directory structure, agent definition templates, domain enforcement patterns
- `.planning/research/STACK.md` — Claude Code extension points (agents, hooks, MCP, skills, memory), all frontmatter fields

### Prior phase context
- `.planning/phases/01-foundation-architecture-validation/01-CONTEXT.md` — Agent architecture decisions: user-invoked only (D-01), fat bodies + shared skills (D-05/D-06), channel docs via @file (D-07/D-11), memory protocol (D-13-16)
- `.planning/phases/02-skills-library/02-CONTEXT.md` — Skill-agent relationship: skills provide expertise not procedures (D-01), config-based injection (D-02), leads become pipeline skills (D-07)

### Existing agents and skills (pattern reference)
- `.claude/agents/researcher.md` — Existing agent definition pattern (frontmatter, project_context block, persona, procedures)
- `.claude/agents/writer.md` — Existing agent definition pattern
- `.claude/skills/agent-protocols/SKILL.md` — Shared behavioral protocol (memory lifecycle, feedback signals)
- `.claude/agent-memory/researcher/MEMORY.md` — Existing MEMORY.md structure (key_files, decisions, patterns, observations, open_questions)

### Project requirements and config
- `.planning/REQUIREMENTS.md` — AGNT-02 through AGNT-15, MEMO-01 through MEMO-07
- `.planning/PROJECT.md` — Project charter, constraints, V5 migration context
- `.planning/config.json` — `agent_skills` mapping (current 8 agents, needs update to 12)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `researcher.md` and `writer.md` — established agent definition pattern with YAML frontmatter, `<project_context>` block, identity section, channel context via `@file`, procedures, output structure
- `agent-protocols` skill — shared behavioral protocol already injected via `skills:` frontmatter. New agents will use same injection pattern.
- 8 domain skills built in Phase 2 — ready for injection into new agents via `skills:` frontmatter per config.json mappings
- `config.json` `agent_skills` mapping — planning artifact with 8 agents mapped, serves as the skill-to-agent assignment reference

### Established Patterns
- Agent frontmatter: `name`, `description`, `model: sonnet`, `memory: project`, `color`, `skills: [agent-protocols]`
- Agent body structure: `<project_context>` block → Identity section → Channel Context (`@file`) → Procedures → Output Format
- MEMORY.md structure: key_files, decisions, patterns, observations, open_questions (all append-only with timestamps)
- Skills referenced in `skills:` frontmatter field (not just in config.json)

### Integration Points
- `.claude/agents/` — directory for all agent `.md` files
- `.claude/agent-memory/<name>/` — directory per agent for MEMORY.md
- `.claude/skills/` — domain skills directory (8 skills available)
- `channel/` — channel identity docs (`channel.md`, `voice-profile.md`, `VISUAL_STYLE_GUIDE.md`) referenced by agents via `@file`
- `CLAUDE.md` — agent reference table needs updating with new agents

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose to split meta and code-reviewer despite the recommended single-agent approach — code review is valued as a distinct, focused capability
- User wants V5 agent bodies adapted, not rewritten — the V5 domain expertise represents real production knowledge
- User wants MEMORY.md reseeded for researcher/writer (not kept minimal) — consistency across all agents matters more than preserving the Phase 1 minimal seeds
- All 12 agents should leave Phase 3 fully configured — no partial builds to clean up later

</specifics>

<deferred>
## Deferred Ideas

- Pipeline coordination skills (`/research`, `/write-script`, `/visual-plan`, `/process-assets`, `/compile`) — Phase 4
- Domain enforcement hooks (PreToolUse blocking unauthorized writes) — Phase 4
- Session logging hooks (PostToolUse capturing delegations) — Phase 4
- `/audit-agents` validation skill — Phase 4
- SIGNALS.md cross-agent feedback system — Phase 5
- Verification gates at pipeline boundaries — Phase 5
- Python script migration from V5 to V0.6 — Phase 6

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-agent-migration-memory*
*Context gathered: 2026-04-10*

# Phase 3: Agent Migration & Memory - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 03-agent-migration-memory
**Areas discussed:** Agent consolidation roster, Agent persona depth, Memory seeding strategy, Existing agent updates

---

## Agent Consolidation Roster

| Option | Description | Selected |
|--------|-------------|----------|
| Drop entirely (Recommended) | Media-lead was pure coordination — no unique domain expertise. Coordination becomes Phase 4 pipeline skill. | |
| Absorb into compiler | Give compiler media-lead's pipeline awareness. | |
| Absorb into visual-planner | Give visual-planner media-lead's pipeline awareness. | |

**User's choice:** Drop entirely
**Notes:** Same treatment as editorial-lead coordination per Phase 2 D-07.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Quality gating agent (Recommended) | Keep editorial-lead focused on research quality review and editorial standards. Pipeline coordination to Phase 4 skills. | |
| Drop agent, all to pipeline skill | Both quality gating and coordination become Phase 4 pipeline skill. | |
| Full editorial agent | Keep both quality gating AND coordination. Contradicts D-07. | |

**User's choice:** Quality gating agent
**Notes:** Aligns with Phase 2 D-07 (lead coordination logic → pipeline skills).

---

| Option | Description | Selected |
|--------|-------------|----------|
| One broad meta agent (Recommended) | All 4 V5 roles merge into one meta agent. Pipeline observation, code review, and UX improvement under one roof. | |
| Split: meta + code-reviewer | Code review gets its own agent. Meta handles pipeline observation and UX. | |

**User's choice:** Split: meta + code-reviewer
**Notes:** User chose against recommendation. Code review valued as a distinct, focused capability.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Roster confirmed | 12 agents as listed. 10 new + 2 updates. | |
| Need changes | Adjust the roster. | |

**User's choice:** Roster confirmed
**Notes:** None.

---

## Agent Persona Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Rich personas for all (Recommended) | Every agent gets distinct identity, domain boundaries, explicit exclusions. Consistent with Phase 1 pattern. | |
| Rich for editorial, lean for media/meta | Editorial agents get full personas, media/meta get functional instructions. | |
| Lean for all new agents | Concise functional instructions without character voice. | |

**User's choice:** Rich personas for all
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Adapt V5 bodies (Recommended) | Start from V5 agent .md files, adapt to Claude Code format. Preserve battle-tested domain expertise. | |
| Fresh write, V5 as reference | Write from scratch, consult V5 for domain knowledge only. | |
| You decide | Claude picks per agent based on V5 content reusability. | |

**User's choice:** Adapt V5 bodies
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Unified expert (Recommended) | One coherent specialist per agent, no internal domain splits. | |
| Multi-domain explicit | Agent explicitly lists its coverage areas as named domains. | |

**User's choice:** Unified expert
**Notes:** None.

---

## Memory Seeding Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Merge all, dedupe (Recommended) | Combine all sections from source YAMLs, remove duplicates and contradictions. | |
| Cherry-pick relevant only | Manually review each YAML, only bring forward relevant entries. | |
| Fresh start, V5 as reference | Start empty, let agents build fresh mental models. | |

**User's choice:** Merge all, dedupe
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Strip V5-specific content (Recommended) | Remove Pi CLI, .pi/ paths, delegation chains, footer UI references. Keep domain knowledge. | |
| Bring everything, let it age out | Convert all content as-is. V5-specific patterns naturally irrelevant. | |
| You decide per agent | Claude evaluates each YAML during conversion. | |

**User's choice:** Strip V5-specific content
**Notes:** None.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Instructions only (Recommended) | Merge-at-20 and promote-at-3 rules stay as behavioral instructions in agent-protocols. Agent self-manages. | |
| Validation script | Add a script that checks insights.md line counts and flags thresholds. | |
| You decide | Claude determines whether instructions are sufficient. | |

**User's choice:** Instructions only
**Notes:** None.

---

## Existing Agent Updates

| Option | Description | Selected |
|--------|-------------|----------|
| Update in Phase 3 (Recommended) | Phase 3 is the agent migration phase — natural place to align all agents with skill mappings. | |
| Defer to Phase 4 | Update when pipeline skills coordinate skill loading. | |
| Defer to Phase 6 | Update during end-to-end integration. Maximum deferral. | |

**User's choice:** Update in Phase 3
**Notes:** All 12 agents leave Phase 3 fully configured.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Reseed from V5 YAML (Recommended) | Apply merge-all-dedupe-strip strategy. Replace current minimal seeds. | |
| Keep current, add incrementally | Let agents build own mental models through use. | |
| Supplement, don't replace | Keep existing entries, append V5 content below. | |

**User's choice:** Reseed from V5 YAML
**Notes:** Consistency across all agents matters more than preserving Phase 1 minimal seeds.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, update config.json (Recommended) | Add skill mappings for editorial-lead, style-extractor, code-reviewer, compiler. All 12 agents documented. | |
| No, config.json is fine as-is | New agents may not need domain skills yet. | |

**User's choice:** Yes, update config.json
**Notes:** config.json stays single source of truth for agent-skill relationships.

---

## Claude's Discretion

- Exact agent body line counts
- `tools:` field contents per agent
- Channel docs `@file` references per agent
- Order of agent creation within plans
- MEMORY.md conversion judgment calls
- Skill assignments for 4 new config.json entries

## Deferred Ideas

- Pipeline coordination skills — Phase 4
- Domain enforcement hooks — Phase 4
- Session logging hooks — Phase 4
- SIGNALS.md feedback system — Phase 5
- Python script migration — Phase 6

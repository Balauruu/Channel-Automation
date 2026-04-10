# Phase 2: Skills Library - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 02-skills-library
**Areas discussed:** Skill-Agent relationship, Script infrastructure, Build priority, Exemplar bootstrapping, Skill structure observations

---

## Skill-Agent Relationship

| Option | Description | Selected |
|--------|-------------|----------|
| Skills ARE the procedures | Extract procedures from agent bodies into skills. Agent keeps identity/persona only. | |
| Skills supplement agents | Agent keeps procedure. Skills provide additional standalone tools. No overlap. | |
| Skills replace agent procedures | Move ALL procedural content into skills. Agents become thin persona shells. | |

**User's choice:** User requested thorough research on GSD framework before deciding. Research agent analyzed GSD GitHub repo, local skills, and local agents.

**Research finding:** GSD uses thin agents (600-1400 lines) with injected skills. Agents own execution flows, skills provide domain knowledge. Skills injected via config, not hardcoded.

**Follow-up decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, adopt GSD pattern | Agents own procedures, skills inject domain expertise via config. | ✓ |
| Modify -- agents should be thinner | Extract more from agent bodies into skills. | |
| Modify -- different injection | Use different mechanism than config-based injection. | |

**User's choice:** Yes, adopt GSD pattern
**Notes:** GSD is considered the golden standard. Researcher keeps 3-pass procedure, writer keeps 4-step procedure. Skills supplement with domain expertise.

---

## Script Infrastructure

| Option | Description | Selected |
|--------|-------------|----------|
| Skills as pure knowledge | Skills contain domain expertise only. Script references documented but marked as available after Phase 6. | ✓ |
| Copy scripts to V0.6 now | Migrate V5 Python scripts during Phase 2. | |
| Stub scripts with --help only | Create script stubs in V0.6 that just print usage info. | |

**User's choice:** Skills as pure knowledge
**Notes:** V5 scripts at `.pi/multi-team/scripts/` stay untouched until Phase 6 integration.

---

## Build Priority

| Option | Description | Selected |
|--------|-------------|----------|
| All 8 now | Phase 2 is the skills phase -- build them all. | ✓ |
| Prioritize researcher/writer skills | Build 4 skills for existing agents first, defer 4 for Phase 3. | |
| Build in dependency waves | Wave 1: existing agent skills. Wave 2: Phase 3 agent skills. | |

**User's choice:** All 8 now
**Notes:** User also raised that lead agent structure should change since 3-tier delegation no longer applies.

**Follow-up -- Lead agent structure:**

| Option | Description | Selected |
|--------|-------------|----------|
| Leads become pipeline skills | Coordination procedures become user-invocable skills in Phase 4. | ✓ |
| Leads stay as agents with reduced scope | Keep as specialists with no delegation capability. | |
| Defer to Phase 3 | Decide lead structure when building those agents. | |

**User's choice:** Leads become pipeline skills
**Notes:** Affects Phase 4 planning. Lead coordination logic absorbed into pipeline trigger skills.

---

## Exemplar Bootstrapping

| Option | Description | Selected |
|--------|-------------|----------|
| Synthetic exemplars from V5 outputs | Adapt V5 production outputs as initial exemplars. | |
| Empty until first real run | Start with empty references/ directories. | |
| Claude-generated synthetic exemplars | Have Claude write example outputs during skill creation. | |

**User's choice:** Empty until first real run (initial selection)

**Follow-up -- Exemplar system removal:**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, remove exemplars entirely | No references/ directory, no exemplar files. | |
| Keep but make optional | references/ exists but is optional. Not required. | ✓ |

**User's choice:** Keep but make optional
**Notes:** User was "on the fence" about exemplars being counterproductive. Settled on optional -- skills CAN have exemplars but are not required to.

---

## Skill Structure (from user observations)

**Line cap:**

| Option | Description | Selected |
|--------|-------------|----------|
| Remove 200-line cap | Skills can be as long as needed. 1M context makes limits unnecessary. | ✓ |
| Keep cap as soft guideline | 200 lines as guideline, not hard limit. | |

**User's choice:** Remove 200-line cap

**Skill creation reference:**

| Option | Description | Selected |
|--------|-------------|----------|
| Writing-skills superpowers is primary | superpowers:writing-skills is authoritative for skill creation. Local guide is supplementary. | ✓ |
| Local crafting guide updated with patterns | Merge writing-skills patterns into local guide. | |
| Both are references | Crafting guide for structure, writing-skills for methodology. | |

**User's choice:** Writing-skills superpowers is primary
**Notes:** User explicitly stated skill creation "should reference the whole skill-creator skill."

---

## Claude's Discretion

- Skill internal organization and section ordering
- Which skills need prompts/ vs. scripts/ directories
- Exact skill names and slash-command naming
- Config-based injection mechanism design

## Deferred Ideas

- Lead coordination as pipeline skills -- Phase 4
- REQUIREMENTS.md updates (SKIL-09, SKIL-07) -- Phase 2 planning
- Python script migration -- Phase 6

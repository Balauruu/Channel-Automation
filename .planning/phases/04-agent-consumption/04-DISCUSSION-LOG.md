# Phase 4: Agent Consumption - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 04-agent-consumption
**Areas discussed:** agent-protocols rewrite, PLAYBOOK.md lifecycle, pipeline-learning skill, agent-observability rewrite

---

## agent-protocols rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| Observer-only writes | Agents read MEMORY.md at start but never write. Observer extracts learnings and writes to Pending Review. | ✓ |
| Hybrid -- both write | Observer writes Pending Review. Agents can also append immediate notes to a separate section. | |
| Agents write, observer reviews | Agents still append at task end. Observer additionally reads obs.jsonl for missed learnings. | |

**User's choice:** Observer-only writes
**Notes:** Keeps agent protocols dead simple. Agents become pure consumers.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Read Open entries, apply relevant ones | Agent reads PLAYBOOK.md Open section at task start, adjusts behavior. Silent consumption. | |
| Read and acknowledge | Agent reads and explicitly notes which entries it applied. | |
| Selective read by domain tag | Entries tagged with target domain. Agent only reads matching entries. | |

**User's choice:** Other -- "Entries in the PLAYBOOK.md should be resolved by the observer and promoted to agent or skill MEMORY.md/insights.md knowledge."
**Notes:** Agents never touch PLAYBOOK.md. Observer routes everything.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, observer routes everything | PLAYBOOK.md is observer-only workspace. Observer routes entries to target memory files. | ✓ |
| No, agents should still read it | Keep original MEML-03 intent. | |

**User's choice:** Yes, observer routes everything
**Notes:** Confirmed deviation from MEML-03 requirement text.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Memory read-only + project context | Two sections: Memory (read-only) + Project Context (read CLAUDE.md). ~20 lines. | ✓ |
| Add section guide | Same plus 5-section MEMORY.md guide. ~35 lines. | |
| Keep more structure | Memory read + project context + behavioral rules. ~50 lines. | |

**User's choice:** Memory read-only + project context (~20 lines)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it | Agents are read-only. Observer knows sections. No need to teach agents. | ✓ |
| Keep as reading context | Helps agents interpret MEMORY.md better. Light reference. | |

**User's choice:** Drop 5-section guide

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, agents see everything | Both Permanent and Pending Review visible. Entries clearly tagged. | ✓ |
| Move pending to separate file | Observer writes to MEMORY-pending.md. Only MEMORY.md auto-injected. | |

**User's choice:** Yes, agents see everything
**Notes:** Hiding not clean mechanically (auto-injection reads full file). Simpler to show everything.

---

## PLAYBOOK.md lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Staging + routing log | Observer parks cross-agent insights in Open, routes to targets, marks Resolved. | ✓ |
| Pure routing log | Observer writes audit trail only. Insights go directly to targets. | |
| Drop PLAYBOOK.md entirely | Observer routes directly. PLAYBOOK has no purpose. | |

**User's choice:** Staging + routing log

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same /evolve run | Extract -> write Open -> route to target -> mark Resolved. One pass. | ✓ |
| Next /evolve run | Write to Open in one run, route in next. Two-pass. | |
| Manual trigger | User explicitly triggers routing. | |

**User's choice:** Same /evolve run

---

| Option | Description | Selected |
|--------|-------------|----------|
| Insight + routing target | Full entry with routing destination and date. Compact one-liner. | ✓ |
| Minimal -- just the target | Only shows where it went. Insight text only in Open. | |
| You decide | Claude determines format. | |

**User's choice:** Insight + routing target

---

| Option | Description | Selected |
|--------|-------------|----------|
| Open/Resolved only | PLAYBOOK uses only ## Open and ## Resolved. Not a memory file. | ✓ |
| Keep both sets | Four sections: Open/Resolved + Pending Review/Permanent. | |
| Replace Pending/Permanent with Open/Resolved | Rename existing sections. | |

**User's choice:** Open/Resolved only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Include observer update in Phase 4 | Phase 4 updates observer for PLAYBOOK routing. Self-contained. | ✓ |
| Observer stays as-is | Phase 4 only consumer side. Observer updated later. | |

**User's choice:** Include observer update in Phase 4

---

## pipeline-learning skill

| Option | Description | Selected |
|--------|-------------|----------|
| Merge into one skill | Rewrite agent-observability to cover everything. Eliminates MEML-06 as separate deliverable. | ✓ |
| Two separate skills | agent-observability = debugging. pipeline-learning = system overview. | |
| Replace both with new skill | Delete both, create fresh skill with new name. | |

**User's choice:** Merge into one skill

---

| Option | Description | Selected |
|--------|-------------|----------|
| Comprehensive | Full rewrite covering all 7 topic areas. ~250-300 lines. | ✓ |
| Lean reference | Just essentials: schema, paths, recipes. ~100-150 lines. | |
| You decide | Claude determines depth. | |

**User's choice:** Comprehensive

---

| Option | Description | Selected |
|--------|-------------|----------|
| Broaden trigger | Activate on debugging AND system understanding questions. | ✓ |
| Keep debug-only trigger | Only activate for debugging. System docs are passive reference. | |

**User's choice:** Broaden trigger

---

| Option | Description | Selected |
|--------|-------------|----------|
| Document both paths | obs.jsonl + logs/runs/ serve different purposes. Document both. | |
| obs.jsonl only | Per-run files are old system. Only document obs.jsonl. | ✓ |
| You decide | Claude audits file system during planning. | |

**User's choice:** Initially selected "Document both paths" but corrected to obs.jsonl only after recalling PROJECT.md decision (one file, agent_id field distinguishes events).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Include scope tests | Add 3 scope-test questions directly in skill. Self-contained. | ✓ |
| Reference PROJECT.md | Point to PROJECT.md. Avoids duplication. | |
| You decide | Claude determines during planning. | |

**User's choice:** Include scope tests

---

| Option | Description | Selected |
|--------|-------------|----------|
| Summarizer first, raw as fallback | Primary: obs-summarize.js. Fallback: raw JSONL recipes. | |
| Raw recipes only | Direct JSONL query one-liners. No summarizer dependency. | ✓ |
| You decide | Claude determines balance. | |

**User's choice:** Raw recipes only

---

## agent-observability rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| Already done in Phase 1 | Phase 1 Plan 03 handled settings.json cleanup. | |
| Phase 4 should verify and clean up | Audit settings.json for remaining obs.js references. Belt and suspenders. | ✓ |
| You decide | Claude checks actual settings.json during planning. | |

**User's choice:** Phase 4 should verify and clean up

---

## Claude's Discretion

- Observer prompt engineering for PLAYBOOK routing logic
- PLAYBOOK.md header/boilerplate text
- Debug recipe selection and format
- Deliverable ordering (agent-protocols vs skill vs parallel)
- PLAYBOOK.md content migration (Pending Review -> Open)

## Deferred Ideas

None -- discussion stayed within phase scope

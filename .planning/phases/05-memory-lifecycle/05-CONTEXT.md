# Phase 5: Memory Lifecycle - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add confidence decay, consolidation, and capacity management for long-running memory files. Integrates into the existing /evolve flow (observe → scan → promote → **decay** → summary). When /evolve runs, expired LOW/MED entries are flagged for removal and files approaching the 200-line cap trigger LLM-powered consolidation.

</domain>

<decisions>
## Implementation Decisions

### Decay Integration
- **D-01:** New `decay` subcommand in evolve.js — consistent with existing scan/promote/revert pattern. Keeps lifecycle logic deterministic in JS. Output: JSON list of expired entries with file paths and ages.
- **D-02:** Decay runs after promote, before summary — flow becomes: observe → scan → promote → decay → show unified summary. User sees newly promoted entries AND expired entries in one view.
- **D-03:** Decay targets Permanent section only — Pending Review entries are fresh by definition (unreviewed). Decay is about long-lived knowledge that may have gone stale.

### Decay Action Mechanics
- **D-04:** Expired entries flagged in summary for user decision — not auto-removed. Matches MEML-02 requirement ("flagged for removal or re-evaluation"). Expired entries appear as a separate group in the unified summary with age shown.
- **D-05:** Kept entries upgrade to HIGH confidence — when user explicitly keeps an expired entry, it becomes HIGH (no future decay). Human validation is the strongest confidence signal.
- **D-06:** Unified summary with three sections — (1) Promoted entries, (2) Expired entries flagged for review, (3) Capacity warnings. Single interaction: "Revert any promoted? Remove any expired? (numbers, or Enter to keep all)". Expired entries not removed get upgraded to HIGH.

### Consolidation Strategy
- **D-07:** LLM-powered consolidation via observer — when evolve.js `decay` subcommand detects a file at/above 180 lines, /evolve dispatches observer with that file's contents and a consolidation prompt. Observer proposes merges, removals, and tighter wording.
- **D-08:** Consolidation triggers at 180 lines (90% of 200-line cap) — enough headroom that normal /evolve runs don't push past the hard cap before consolidation runs.
- **D-09:** Observer produces rewritten file section — complete rewritten ## Permanent block. User sees before/after diff and approves or edits. One approval per file needing consolidation.

### Claude's Discretion
- Decay timestamp extraction logic (parsing entry timestamps from various formats)
- evolve.js `decay` subcommand internal structure and JSON output schema
- Observer consolidation prompt engineering
- How to present the before/after diff for consolidation (inline text vs file comparison)
- evolve.js `decay` subcommand for removing expired entries (after user confirms)
- Edge cases: entries with missing timestamps, malformed confidence tags

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — EVLV-04 (consolidation at 200-line cap), MEML-02 (LOW=14d, MED=30d decay rules)
- `.planning/PROJECT.md` — Key decisions table (categorical confidence, 3-layer scope tests)

### Phase Dependencies
- `.planning/phases/02-observer-agent/02-CONTEXT.md` — D-04 (entry format with confidence tags and timestamps), D-05 (strip pointer on promote)
- `.planning/phases/03-evolve-command/03-CONTEXT.md` — D-02 (auto-promote with batch revert), D-11-D-13 (evolve.js architecture, three subcommands, script location)
- `.planning/phases/04-agent-consumption/04-CONTEXT.md` — D-06 (PLAYBOOK Open/Resolved sections), D-01 (observer-only writes)

### Files to Extend
- `.claude/scripts/memory/evolve.js` — Add `decay` subcommand alongside existing scan/promote/revert. Core implementation target.
- `.claude/skills/evolve/SKILL.md` — Update /evolve flow to include decay step and consolidation dispatch. Add unified summary with decay section.
- `.claude/agents/observer.md` — Add consolidation prompt capability (observer already handles learning extraction; this adds a "rewrite section" mode).

### Reference Patterns
- `.claude/hooks/pipeline-observe.js` — Timestamp format reference for decay age calculation
- `.claude/scripts/memory/evolve.js` — Existing subcommand pattern (scan/promote/revert) to follow for `decay`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `evolve.js` scan/promote/revert pattern: CommonJS, JSON output, `discoverTargetFiles()` function discovers all 21 memory files ordered by type — reuse for decay scanning
- `evolve.js` `parseSections()` function: parses markdown into sections by ## heading with entry extraction — reuse for finding Permanent entries
- Entry format regexes already defined: `memoryPointerRe` and `insightPointerRe` — extend for timestamp extraction
- Observer agent: already dispatched by /evolve skill, understands memory scope and entry format — extend with consolidation prompt

### Established Patterns
- CommonJS with Node.js stdlib only (fs, path) — zero npm dependencies
- JSON output from scripts consumed by skills
- evolve.js subcommands: each is a function that returns structured JSON
- Entry format: `- [CONF] agent: insight text (timestamp)` for MEMORY.md/PLAYBOOK.md
- Entry format: `- [YYYY-MM-DD] [CONF] insight text (from: agent, timestamp)` for insights.md

### Integration Points
- evolve.js called via `node .claude/scripts/memory/evolve.js <subcommand>` from /evolve skill
- Observer dispatched via Agent tool with `subagent_type: "observer"` from /evolve skill
- Current memory files: 21-43 lines for MEMORY.md, 8-16 lines for insights.md, 10 lines for PLAYBOOK.md — all well below 180-line threshold currently
- /evolve skill flow (current): dispatch observer → scan → promote → show summary → revert prompt

</code_context>

<specifics>
## Specific Ideas

- The unified summary should visually separate promoted vs expired vs capacity warnings — numbered entries across all three sections with continuous numbering so user can reference any entry by number
- Decay subcommand needs to parse timestamps from both MEMORY.md format (`(2026-04-18T10:22)`) and insights.md format (`[2026-04-18]`) to compute ages
- Consolidation is a separate observer dispatch with a different prompt than the learning-extraction dispatch — the skill needs to handle two distinct observer modes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-memory-lifecycle*
*Context gathered: 2026-04-21*

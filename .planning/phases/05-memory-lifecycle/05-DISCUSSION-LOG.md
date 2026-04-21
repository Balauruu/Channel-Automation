# Phase 5: Memory Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 05-memory-lifecycle
**Areas discussed:** Decay integration, Consolidation strategy, Decay action mechanics

---

## Decay Integration

| Option | Description | Selected |
|--------|-------------|----------|
| New evolve.js subcommand | Add `decay` subcommand. Skill calls after promote, before summary. Deterministic JS. | ✓ |
| Integrated into scan | Extend scan to flag expired entries alongside pending ones. Single pass. | |
| Separate lifecycle script | New `lifecycle.js` for decay + consolidation. Clean separation. | |

**User's choice:** New evolve.js subcommand
**Notes:** Consistent with existing scan/promote/revert pattern in evolve.js.

---

| Option | Description | Selected |
|--------|-------------|----------|
| After promote, before summary | observe → scan → promote → decay → summary. User sees everything at once. | ✓ |
| Before promote | observe → scan → decay → promote → summary. Clean out stale first. | |
| After summary (separate step) | Two interaction points. Deal with new entries first, lifecycle second. | |

**User's choice:** After promote, before summary
**Notes:** Single interaction point preferred.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Permanent only | Decay checks promoted entries. Pending Review are fresh by definition. | ✓ |
| Both sections | Also flag stale Pending Review entries that were never reviewed. | |

**User's choice:** Permanent only

---

## Consolidation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| LLM-powered via observer | Dispatch observer with file contents and consolidation prompt. | ✓ |
| Script groups + user merges | evolve.js groups by keyword similarity, user merges manually. | |
| Auto-compact by age + confidence | Remove LOW, then oldest MED until under cap. No semantic understanding. | |

**User's choice:** LLM-powered via observer
**Notes:** Leverages observer's existing understanding of memory scope.

---

| Option | Description | Selected |
|--------|-------------|----------|
| 150 lines | 75% capacity. More headroom. | |
| 180 lines | 90% capacity. Waits longer before intervening. | ✓ |
| You decide | Claude picks threshold during planning. | |

**User's choice:** 180 lines

---

| Option | Description | Selected |
|--------|-------------|----------|
| Rewritten file section | Observer produces complete rewritten ## Permanent block. Before/after diff. | ✓ |
| Entry-by-entry proposals | Per-entry actions (merge A+B, remove D, tighten F). More control. | |
| Summary + auto-apply | Observer rewrites and auto-applies. User can revert via git. | |

**User's choice:** Rewritten file section
**Notes:** One approval per file needing consolidation.

---

## Decay Action Mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Flag in summary for user decision | Expired entries in separate group with age shown. User picks which to remove. | ✓ |
| Auto-remove with undo | Auto-delete expired. Summary shows removals. User can undo via git. | |
| Downgrade confidence tier | LOW removed, MED downgraded to LOW (14-day restart). | |

**User's choice:** Flag in summary for user decision
**Notes:** Matches MEML-02 "flagged for removal or re-evaluation."

---

| Option | Description | Selected |
|--------|-------------|----------|
| Upgrade to HIGH | Human chose to keep = strongest signal. No future decay. | ✓ |
| Reset decay timer | Same confidence, reset timestamp. Flagged again later. | |
| No change | Stays as-is. Flagged every /evolve run until removed. | |

**User's choice:** Upgrade to HIGH

---

| Option | Description | Selected |
|--------|-------------|----------|
| Unified summary with sections | Promoted + Expired + Capacity in one view. Single interaction. | ✓ |
| Sequential prompts | Promote/revert first, then decay/remove second. Two interactions. | |

**User's choice:** Unified summary with sections
**Notes:** One interaction point: "Revert any promoted? Remove any expired? (numbers, or Enter to keep all)"

## Claude's Discretion

- Decay timestamp extraction logic
- evolve.js `decay` subcommand internal structure and JSON output schema
- Observer consolidation prompt engineering
- Before/after diff presentation for consolidation
- Edge cases (missing timestamps, malformed confidence tags)

## Deferred Ideas

None — discussion stayed within phase scope

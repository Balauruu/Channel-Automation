# Phase 6: Integration & End-to-End Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 06-integration-end-to-end-validation
**Areas discussed:** Script hosting, Database & library access, Integration depth, E2E validation scope

---

## Script Hosting

### Q1: Where should the Python scripts live for V0.6?

| Option | Description | Selected |
|--------|-------------|----------|
| Copy into V0.6 (Recommended) | Copy scripts from V5 .pi/multi-team/scripts/ into V0.6 directories. V0.6 becomes self-contained. | |
| Reference V5 in-place | Agents invoke scripts at V5 path. No copy, but fragile dependency. | |
| Symlink from V0.6 to V5 | Symlinks pointing to V5 directories. Middle ground. | |

**User's choice:** Copy into V0.6, but questioned why top-level strategy/editorial/media/ directories — those are V5 team-hierarchy artifacts.

### Q2: Where exactly in V0.6 should scripts go?

| Option | Description | Selected |
|--------|-------------|----------|
| .claude/scripts/ subdirs (Recommended) | .claude/scripts/strategy/, .claude/scripts/editorial/, .claude/scripts/media/. audit-agents.js already here. | ✓ |
| Top-level scripts/ subdirs | scripts/strategy/, scripts/editorial/, scripts/media/. Separates Python tools from .claude/ system files. | |

**User's choice:** .claude/scripts/ with domain subdirs
**Notes:** User pointed out that V5 team directories don't fit V0.6's flat agent model.

### Q3: Which layer owns script invocation?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, lock it in | Agent bodies own invocation, pipeline skills stay routers, domain skills keep ref docs. | ✓ |
| Mostly, but adjust | Direction right, but wants to tweak something. | |

**User's choice:** Locked in after a deep three-layer architecture analysis.
**Notes:** User requested the analysis after initially being unsure. The analysis showed agents already have script invocation instructions — the architecture already decided this question.

---

## Database & Library Access

### Q1: How should V0.6 access the SQLite databases?

| Option | Description | Selected |
|--------|-------------|----------|
| Copy to V0.6 data/ (Recommended) | Copy both .db files. Historical data preserved. Paths stay correct. | ✓ |
| Start fresh databases | Empty databases. No historical data. | |
| Reference V5 databases | Point at V5 path. Shared state, fragile. | |

**User's choice:** Copy to V0.6 data/

### Q2: What about D:/VideoLibrary/?

| Option | Description | Selected |
|--------|-------------|----------|
| Create it during Phase 6 | Create empty directory. Assets accumulate over time. | ✓ |
| Make it configurable | Config entry for path, create default location. | |
| Defer INTG-04 | Skip for now. Per-project assets/ sufficient. | |

**User's choice:** Create it during Phase 6

---

## Integration Depth

### Q1: How much script validation should Phase 6 do?

| Option | Description | Selected |
|--------|-------------|----------|
| Critical path only (Recommended) | ~15 of ~30 scripts. Strategy CLI, editorial CLI, media core scripts. | ✓ |
| All scripts | Every Python script validated. Comprehensive but slow. | |
| Smoke test only | Importable + --help works. Fast but misses runtime issues. | |

**User's choice:** Critical path only

### Q2: Script failure behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Scripts primary, no fallback (Recommended) | Script fails → agent reports error and stops. No silent degradation. | ✓ |
| Scripts primary, Claude-native fallback | Try scripts, fall back to WebSearch/native if they fail. | |
| Hybrid per-stage | Essential scripts exclusive, others optional. | |

**User's choice:** Scripts primary, no fallback

---

## E2E Validation Scope

### Q1: What validation should Phase 6 include?

| Option | Description | Selected |
|--------|-------------|----------|
| Script smoke tests only (Recommended) | Verify importable, --help works, conda deps, DB tables, agent paths. User does real pipeline run. | ✓ |
| No automated validation | Just copy and update. User handles all validation. | |

**User's choice:** Script smoke tests only
**Notes:** User explicitly stated they don't need an E2E test run — they'll do it themselves. Phase 6 delivers wiring + smoke tests.

---

## Claude's Discretion

- File copy strategy, dependency validation approach, smoke test implementation, migration order
- Whether to add __init__.py files, CLAUDE.md update format

## Deferred Ideas

- Niche script validation (wiki_screenshots, crawl_images, export_clips, etc.) — validate when needed
- Configurable VideoLibrary path — hardcoded D:/VideoLibrary/ for now

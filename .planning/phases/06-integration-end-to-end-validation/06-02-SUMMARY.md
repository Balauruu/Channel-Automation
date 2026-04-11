---
phase: 06-integration-end-to-end-validation
plan: "02"
subsystem: agent-wiring
tags:
  - agent-paths
  - skill-paths
  - invocation-patterns
  - path-migration
dependency_graph:
  requires:
    - .claude/scripts/strategy/channel_assistant/ (Plan 01)
    - .claude/scripts/editorial/researcher/ (Plan 01)
    - .claude/scripts/editorial/writer/ (Plan 01)
    - .claude/scripts/media/ (Plan 01)
  provides:
    - All 8 agent bodies wired to .claude/scripts/ paths
    - All 5 domain skill SKILL.md files with updated script references
  affects:
    - All agents that invoke Python scripts via Bash
    - Domain skills used as reference by agents
tech_stack:
  added: []
  patterns:
    - PYTHONPATH module invocation for strategy and editorial Python packages
    - Direct script invocation with quoted conda python path for media GPU scripts
    - No-fallback pattern per D-07 (report error and stop)
key_files:
  created: []
  modified:
    - .claude/agents/strategy.md
    - .claude/agents/researcher.md
    - .claude/agents/writer.md
    - .claude/agents/asset-processor.md
    - .claude/agents/asset-curator.md
    - .claude/agents/compiler.md
    - .claude/agents/visual-researcher.md
    - .claude/agents/visual-planner.md
    - .claude/skills/documentary-research/SKILL.md
    - .claude/skills/data-analysis/SKILL.md
    - .claude/skills/media-evaluation/SKILL.md
    - .claude/skills/archive-search/SKILL.md
    - .claude/skills/visual-narrative/SKILL.md
decisions:
  - "PYTHONPATH module invocation used for strategy and editorial (Python packages with __main__.py); direct script path used for media (standalone scripts)"
  - "strategy init subcommand removed from agent body — project_init.py is not wired as a CLI subcommand per RESEARCH.md Pitfall 5"
  - "Skill Script References section header kept without the 'Available after Phase 6' note — scripts are now available"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-04-11"
  tasks_completed: 2
  files_created: 0
  files_modified: 13
---

# Phase 6 Plan 02: Agent and Skill Path Wiring Summary

## One-liner

Updated all 8 agent bodies and 5 domain skill files to reference `.claude/scripts/` paths with correct module invocation patterns; removed all V0.6 stale caveats and added no-fallback instruction per D-07.

## What Was Built

All agent bodies that invoke Python scripts now reference the correct `.claude/scripts/` locations established in Plan 01. Strategy and editorial agents use `PYTHONPATH=".claude/scripts/{domain}" python -m <package>` module invocation (these are proper Python packages with `__main__.py`). Media agents use direct script invocation with the quoted conda python path. All "may not yet be fully connected in V0.6" caveats removed from all 8 agents. Strategy agent's non-existent `init` CLI subcommand reference removed. All 5 domain skill SKILL.md files updated to reference `.claude/scripts/` paths with "Available after Phase 6 integration" notes removed.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update all 8 agent body script paths and remove stale caveats | b1eefa9 | 8 agent .md files |
| 2 | Update 5 domain skill script reference paths | fac7155 | 5 skill SKILL.md files |

## Verification Results

Task 1 — 24/24 checks passed:
- All 8 agents: no stale caveats, has `.claude/scripts/` paths, has no-fallback instruction
- strategy: PYTHONPATH module invocation for add/scrape/analyze/topics
- strategy: no `strategy/cli.py init` reference
- researcher: PYTHONPATH module invocation for survey/deepen/synthesize
- writer: PYTHONPATH module invocation for load/generate/revise
- asset-processor: quoted conda python path with `.claude/scripts/media/` prefix
- asset-curator, compiler, visual-researcher, visual-planner: direct script paths

Task 2 — 15/15 checks passed:
- All 5 skills have `.claude/scripts/` prefixed paths
- No bare `editorial/`, `strategy/`, or `media/` script references remain
- No "Available after Phase 6 integration" notes remain

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. This plan updates documentation/instruction files only. No data placeholders introduced.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes. Path updates are documentation-only changes to agent instruction files.

## Self-Check: PASSED

Files verified:
- .claude/agents/strategy.md: FOUND (contains PYTHONPATH=".claude/scripts/strategy")
- .claude/agents/researcher.md: FOUND (contains PYTHONPATH=".claude/scripts/editorial")
- .claude/agents/writer.md: FOUND (contains PYTHONPATH=".claude/scripts/editorial")
- .claude/agents/asset-processor.md: FOUND (contains .claude/scripts/media/embed.py)
- .claude/agents/asset-curator.md: FOUND (contains .claude/scripts/media/promote.py)
- .claude/agents/compiler.md: FOUND (contains .claude/scripts/media/organize_assets.py)
- .claude/agents/visual-researcher.md: FOUND (contains .claude/scripts/media/crawl_images.py)
- .claude/agents/visual-planner.md: FOUND (contains .claude/scripts/media/ia_search.py)
- .claude/skills/documentary-research/SKILL.md: FOUND (contains .claude/scripts/editorial)
- .claude/skills/data-analysis/SKILL.md: FOUND (contains .claude/scripts/strategy/channel_assistant)
- .claude/skills/media-evaluation/SKILL.md: FOUND (contains .claude/scripts/media)
- .claude/skills/archive-search/SKILL.md: FOUND (contains .claude/scripts/media)
- .claude/skills/visual-narrative/SKILL.md: FOUND (contains .claude/scripts/media)

Commits verified:
- b1eefa9: FOUND (feat(06-02): update all 8 agent bodies with .claude/scripts/ paths and no-fallback)
- fac7155: FOUND (chore(06-02): update 5 domain skill SKILL.md script reference paths to .claude/scripts/)

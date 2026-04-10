---
phase: 02-skills-library
plan: 03
subsystem: skills
tags: [autoresearch, structured-output, domain-expertise, iterative-research]
dependency_graph:
  requires: []
  provides:
    - autoresearch-skill
    - structured-output-skill
  affects:
    - researcher-agent
    - writer-agent
    - meta-agent
    - strategy-agents
tech_stack:
  added: []
  patterns:
    - domain-expertise-skill-format
    - insights-lifecycle
    - heuristic-deterministic-tagging
key_files:
  created:
    - .claude/skills/autoresearch/SKILL.md
    - .claude/skills/autoresearch/insights.md
    - .claude/skills/structured-output/SKILL.md
    - .claude/skills/structured-output/insights.md
  modified: []
decisions:
  - Autoresearch adapted from 560-line V5 procedure into focused domain expertise (loop design, convergence, quality gates, diminishing returns, depth calibration, breadth vs depth) -- no procedural content
  - Structured-output reframed from V5 behavioral skill into domain expertise with pipeline-specific templates (dossier, analysis, script) and JSON schemas (topic briefs, asset manifests, edit sheets)
  - Both skills include Phase 0 context loading, Reflection Phase, and insights.md lifecycle
metrics:
  duration: 8 minutes
  completed: 2026-04-10
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
---

# Phase 2 Plan 3: Process Domain Skills (Autoresearch + Structured Output) Summary

Built two process domain skills providing iterative research loop expertise and structured output formatting knowledge for the documentary pipeline.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create autoresearch skill | 6233300 | .claude/skills/autoresearch/SKILL.md, insights.md |
| 2 | Create structured-output skill | 730e7a9 | .claude/skills/structured-output/SKILL.md, insights.md |

## What Was Built

### Autoresearch Skill (SKIL-07)

Adapted V5 `karpathy-autoresearch.md` (560 lines of procedural loop logic) into focused domain expertise. The V5 source contained a complete autonomous improvement loop with 8 phases, git branching, eval scripts, and mutation tracking. The V0.6 adaptation extracts the core domain knowledge:

- **Iterative Loop Design [DETERMINISTIC]:** Core loop structure (research -> evaluate -> identify gaps -> refine -> repeat), loop entry conditions, state tracking between iterations, iteration limits and quality indicators
- **Convergence Criteria [DETERMINISTIC]:** Source coverage saturation (<10% new info threshold), claim verification completeness (Tier 1-3 sourcing), entity coverage (alias resolution), timeline consistency
- **Quality Gates [DETERMINISTIC]:** Gate 1 (source diversity -- 3+ independent source types), Gate 2 (factual density -- sourced facts ratio), Gate 3 (gap coverage -- resolved/unresolvable/deferred)
- **Diminishing Returns Detection [HEURISTIC]:** Strong signals (80%+ overlap, confirm-without-extending, exponential time-per-fact), moderate signals (quality declining, circular references, scope creep)
- **Research Depth Calibration [HEURISTIC]:** Well-documented (2-3 iterations), moderate (4-6), obscure (7-10), controversial (+2-3 extra)
- **Breadth-First vs Depth-First Strategy [HEURISTIC]:** When to survey vs deep-dive, switching criteria, mode awareness

### Structured Output Skill (SKIL-08)

Adapted V5 `structured-output.md` (60 lines of behavioral formatting rules) into domain expertise with pipeline-specific content:

- **Output Format Selection [DETERMINISTIC]:** File vs chat decision rules, mixed output patterns
- **Report Structure Templates [DETERMINISTIC]:** Research dossier template (executive summary, timeline, entity index, narrative hooks, source bibliography, gaps), analysis report template, script template (title card, cold open, act structure)
- **JSON Schema Patterns [DETERMINISTIC]:** Naming conventions (snake_case, ISO 8601, relative paths), topic brief schema, asset manifest schema, edit sheet entry schema
- **Formatting Conventions [DETERMINISTIC]:** Heading hierarchy, table rules, code block usage, citation format (`[Source](URL) (Tier N)`), link formatting
- **Content Organization [HEURISTIC]:** Lead with most important finding, group related items, progressive disclosure (summary -> detail -> appendix), handle uncertainty explicitly

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

All acceptance criteria verified:
- Both SKILL.md files contain correct frontmatter (`name`, `description`, `user-invocable: true`)
- Both have Phase 0 context loading and Reflection Phase
- Both have `[HEURISTIC]` and `[DETERMINISTIC]` tagged sections
- Autoresearch contains domain expertise (convergence, quality gates, diminishing returns) -- no step-by-step procedures
- Structured-output contains formatting expertise -- no behavioral protocols (those are in agent-protocols)
- Both insights.md files contain standard template with "Append new insights below this line" marker

## Self-Check: PASSED

- File `.claude/skills/autoresearch/SKILL.md`: FOUND
- File `.claude/skills/autoresearch/insights.md`: FOUND
- File `.claude/skills/structured-output/SKILL.md`: FOUND
- File `.claude/skills/structured-output/insights.md`: FOUND
- File `.planning/phases/02-skills-library/02-03-SUMMARY.md`: FOUND
- Commit `6233300`: FOUND (feat(02-03): create autoresearch domain expertise skill)
- Commit `730e7a9`: FOUND (feat(02-03): create structured-output domain expertise skill)

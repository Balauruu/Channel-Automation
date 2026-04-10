---
phase: 04-pipeline-triggers-hooks
plan: 03
subsystem: audit-validation
tags: [audit, agents, validation, slash-command]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [audit-agents-skill, audit-agents-script]
  affects: [agent-definitions, config-json, claude-md]
tech_stack:
  added: [audit-agents-script]
  patterns: [4-dimension-validation, cross-consistency-checks, auto-fix]
key_files:
  created:
    - .claude/scripts/audit-agents.js
    - .claude/skills/audit-agents/SKILL.md
decisions:
  - Handle both comma-separated and YAML array tools: format in frontmatter parser
  - Orphan detection uses warnings not failures (informational only)
  - Auto-fix gated behind --fix CLI flag plus skill body asking user permission
metrics:
  duration: 11min
  completed: 2026-04-10T22:46:36Z
  tasks: 2
  files: 2
---

# Phase 4 Plan 3: Audit Agents Skill Summary

Node.js validation script checking all 12 agent definitions across 4 dimensions (required fields, tool scoping, skill references, memory setup) plus cross-consistency checks against CLAUDE.md and config.json, exposed as /audit-agents slash command.

## What Was Built

### Task 0: Audit validation script
- **Created**  -- 453 lines
- Validates all 12 agents across 4 dimensions:
  - Dimension 1: Required frontmatter fields (name, description, model, memory, skills)
  - Dimension 2: Tool scoping validity against VALID_TOOLS list (31 valid tools)
  - Dimension 3: Skill reference directory existence with SKILL.md check
  - Dimension 4: Memory setup (MEMORY.md for memory: project agents)
- Cross-consistency checks:
  - CLAUDE.md agent reference table matches agent files
  - config.json agent_skills has entries for all 12 agents
  - Orphan detection for agent files and memory directories
- Structured PASS/FAIL/WARN report with fix suggestions
- Supports --fix flag for auto-fixable issues (frontmatter fields, config entries)
- Exits 0 on clean pass, 1 on any failures
- Handles both comma-separated and YAML array format for tools: field
- **Commit:** 5a42d64

### Task 1: Audit-agents skill and full validation
- **Created**  with disable-model-invocation: true
- Skill dispatches audit script via Bash tool invocation
- Documents all 4 dimensions and --fix auto-fix workflow
- Full test suite validation:
  - smoke-test-paths.js: 21/21 passed
  - smoke-test-skills.js: 82/82 passed
  - smoke-test-agents.js: 136/136 passed
  - smoke-test-pipeline.js: 93/93 passed (including 2 audit stubs now satisfied)
  - audit-agents.js: 50/50 passed, 0 failures, 0 warnings
- **Commit:** 10edccb

## Deviations from Plan

None - plan executed exactly as written.

## HOOK-01 and HOOK-02 Status

Per D-10, domain enforcement hooks (HOOK-01, HOOK-02) are explicitly deferred from Phase 4. The tools: frontmatter field and agent body instructions provide sufficient scoping. No implementation work was needed or performed.

## Verification Results

| Test Suite | Result |
|------------|--------|
| smoke-test-paths.js | 21/21 passed |
| smoke-test-skills.js | 82/82 passed |
| smoke-test-agents.js | 136/136 passed |
| smoke-test-pipeline.js | 93/93 passed |
| audit-agents.js | 50/50 passed |

## Self-Check: PASSED

All created files exist. All commits verified.

---
phase: 05-feedback-propagation
plan: "01"
subsystem: feedback-signal-system
tags: [signals, agent-protocols, yaml, feedback, cross-agent]
dependency_graph:
  requires: []
  provides: [feedback/signals.yaml, agent-protocols-signal-protocol, smoke-test-feedback]
  affects: [all-agents-via-agent-protocols, downstream-plans-05-02-05-03]
tech_stack:
  added: []
  patterns: [domain-tagged-signals, resolve-on-promotion, hybrid-promotion-model]
key_files:
  created:
    - feedback/signals.yaml
    - tests/smoke-test-feedback.js
  modified:
    - .claude/skills/agent-protocols/SKILL.md
key_decisions:
  - "Signal file format is YAML (feedback/signals.yaml), not markdown SIGNALS.md -- structured data, domain-tagged"
  - "Domain-based routing replaces to_agent targeting -- any agent in domain benefits from signals"
  - "Hybrid promotion: memory (self-promote to MEMORY.md, default) vs definition (flag for meta/human review)"
  - "Resolve-on-promotion lifecycle -- resolved signals kept as history, pruned at 50 entries"
  - "Signals permanently alter agent behavior via MEMORY.md; not ephemeral prompt injections"
metrics:
  duration: "23m"
  completed_date: "2026-04-11"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 1
requirements_validated: [AGNT-14, MEMO-08, MEMO-09, MEMO-10]
---

# Phase 5 Plan 01: Signal System and Agent-Protocols Upgrade Summary

**One-liner:** YAML-based cross-agent signal inbox (`feedback/signals.yaml`) with domain-tagged resolve-on-promotion lifecycle, replacing the markdown stub in agent-protocols with full read/promote/write/prune logic.

## What Was Built

### Task 1: feedback/signals.yaml (commit `16468d3`)

Created the `feedback/` directory and `signals.yaml` file at the project root. The file establishes:

- Header documentation explaining the schema, domains (editorial/visual/strategy/meta), types (quality/content/technical/process), and promotion values
- Top-level `signals:` array as the inbox structure
- Seed entry `SIG-001`: a real cross-agent insight from writer to editorial domain about `source_manifest.json` being required for source attribution

The schema uses date-only format (`"2026-04-11"`) to avoid Windows filename colon restrictions, and the `promotion` field distinguishes self-promotable signals (`memory`) from those requiring human/meta review (`definition`).

### Task 2: agent-protocols SKILL.md upgrade (commit `2bd9866`)

Replaced the stub `## Feedback Signal Protocol` section (which incorrectly referenced `feedback/SIGNALS.md` and used `to_agent` targeting) with a complete protocol:

- **Domain Mapping table:** Agents identify their domain by matching agent name (editorial: researcher/writer/style-extractor/editorial-lead; visual: visual-researcher/visual-planner/asset-processor/asset-curator; strategy: strategy; meta: meta/code-reviewer/compiler)
- **At Task Start:** Read signals.yaml, filter by domain + `resolved: false`, promote `promotion: memory` signals to MEMORY.md with `[From SIG-NNN]` attribution, mark as resolved, flag `promotion: definition` signals for meta/human review
- **At Task End:** Write cross-agent insights to signals.yaml with next sequential SIG-NNN ID, full field schema, `resolved: false`
- **Pruning:** Remove oldest resolved entries when >50 entries
- Memory Lifecycle and Project Context sections preserved unchanged

### Task 3: tests/smoke-test-feedback.js (commit `8103720`)

15-check smoke test covering all plan requirements:

- Checks 1-5: Signal system structure (directory, file, `signals:` key, required fields, date format)
- Checks 6-15: Agent-protocols upgrade (signals.yaml reference, no old SIGNALS.md, domain mapping, At Task Start/End, promotion: memory/definition, resolve lifecycle, pruning threshold, no to_agent)
- All 15/15 pass on first run

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `16468d3` | feat | Create feedback/signals.yaml with YAML schema and seed example |
| `2bd9866` | feat | Upgrade agent-protocols Feedback Signal Protocol from stub to full logic |
| `8103720` | test | Add smoke-test-feedback.js validating signal system and agent-protocols |

## Deviations from Plan

None - plan executed exactly as written. All three files match the plan's exact specifications. The SKILL.md edit kept Memory Lifecycle and Project Context sections unchanged as required.

## Known Stubs

**SKIL-13 verification gate checks:** `smoke-test-feedback.js` includes a comment noting that verification gate checks for SKIL-13 will be added in Plan 02. The 15 checks in this plan cover AGNT-14, MEMO-08, MEMO-09, MEMO-10 fully. SKIL-13 gates live in pipeline skills (write-script, visual-plan, process-assets) and are Plan 02's scope.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns beyond `feedback/signals.yaml` (a local text file), or schema changes at trust boundaries. The T-05-03 threat (definition-level signal elevation) is mitigated by the `promotion: definition` flagging protocol in agent-protocols -- agents are explicitly instructed NOT to self-promote these signals.

## Self-Check: PASSED

Files created:
- `feedback/signals.yaml` -- EXISTS
- `tests/smoke-test-feedback.js` -- EXISTS

Files modified:
- `.claude/skills/agent-protocols/SKILL.md` -- EXISTS

Commits:
- `16468d3` -- FOUND
- `2bd9866` -- FOUND
- `8103720` -- FOUND

Smoke test: `node tests/smoke-test-feedback.js` exits 0, 15/15 passed.

---
phase: 4
slug: agent-consumption
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification + bash grep commands |
| **Config file** | none |
| **Quick run command** | `grep -c "signals\|project-memories\|scratchpad" .claude/skills/agent-protocols/SKILL.md` |
| **Full suite command** | `grep -r "obs\.js\|logs/runs" .claude/ --include="*.md" --include="*.js" --include="*.json"` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run MEML-03/MEML-04 smoke checks
- **After every plan wave:** Run full grep audit for D-17
- **Before `/gsd-verify-work`:** All smoke checks green + manual MEML-05 content review
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | MEML-03 | — | N/A | smoke | `wc -l .claude/skills/agent-protocols/SKILL.md && grep -c "signals\|project-memories\|scratchpad" .claude/skills/agent-protocols/SKILL.md` | N/A (grep) | ⬜ pending |
| 04-02-01 | 02 | 1 | MEML-04 | — | N/A | smoke | `grep "## Open" .claude/PLAYBOOK.md && grep "## Resolved" .claude/PLAYBOOK.md && ! grep "## Pending Review" .claude/PLAYBOOK.md` | N/A (grep) | ⬜ pending |
| 04-02-02 | 02 | 1 | MEML-04 | — | N/A | integration | `node .claude/scripts/memory/evolve.js scan` (verify PLAYBOOK absent from output) | Existing | ⬜ pending |
| 04-03-01 | 03 | 2 | MEML-05 | — | N/A | smoke | `grep -c "logs/observations" .claude/skills/agent-observability/SKILL.md && ! grep "logs/runs" .claude/skills/agent-observability/SKILL.md` | N/A (grep) | ⬜ pending |
| 04-03-02 | 03 | 2 | MEML-05 | — | N/A | manual | Verify sections: observer system overview, /evolve flow, scope tests, debug recipes | N/A | ⬜ pending |
| 04-04-01 | 04 | 2 | D-10 | — | N/A | smoke | `grep "## Open" .claude/agents/observer.md` (verify PLAYBOOK routing prompt) | N/A (grep) | ⬜ pending |
| 04-05-01 | 05 | 3 | D-17 | — | N/A | smoke | `grep -r "obs\.js\|logs/runs" .claude/ --include="*.md" --include="*.js" --include="*.json"` | N/A (grep) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. All tests are grep/bash commands against existing files. No test framework setup needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| agent-observability covers merged pipeline-learning scope | MEML-05 | Content completeness requires human review of section coverage | Verify skill contains: observer system overview, /evolve flow, scope-test questions, debug recipes, obs.jsonl event schema |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

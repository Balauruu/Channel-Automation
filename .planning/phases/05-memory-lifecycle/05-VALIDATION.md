---
phase: 5
slug: memory-lifecycle
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert + custom runner (same as smoke-test-observe.js) |
| **Config file** | None — standalone test script |
| **Quick run command** | `node .claude/tests/smoke-test-evolve.js` |
| **Full suite command** | `node .claude/tests/smoke-test-observe.js && node .claude/tests/smoke-test-evolve.js && node .claude/tests/eval-evolve.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .claude/tests/smoke-test-evolve.js`
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | MEML-02 | T-05-01 | Index validation on decay-remove args | unit | `node .claude/tests/smoke-test-evolve.js` | Wave 0 | pending |
| 5-01-01 | 01 | 1 | EVLV-04 | T-05-03 | Capacity warning at 180 lines | unit | `node .claude/tests/smoke-test-evolve.js` | Wave 0 | pending |
| 5-02-01 | 02 | 2 | EVLV-04 | T-05-06 | Consolidation requires user approval | structural | verify check on SKILL.md | N/A | pending |
| 5-02-02 | 02 | 2 | EVLV-04 | T-05-07 | Observer consolidation mode bypass | structural | verify check on observer.md | N/A | pending |

*Status: pending*

---

## Wave 0 Requirements

- [ ] `.claude/tests/smoke-test-evolve.js` — stubs for MEML-02 and EVLV-04 (created in Plan 01 Task 1 RED phase)
- [ ] `.gitignore` — exclusion for smoke-test-evolve.js

*Test infrastructure reuses `makeTmpProject()`, `cleanTmpProject()`, runner pattern from `smoke-test-observe.js`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Consolidation prompt produces quality rewrite | EVLV-04 | Observer dispatch requires LLM; cannot be automated in unit test | Run /evolve with a memory file at 180+ lines, verify observer produces sensible rewrite |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

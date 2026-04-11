---
phase: 5
slug: feedback-propagation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in (fs, path) + existing smoke test pattern |
| **Config file** | none — uses existing tests/ directory pattern |
| **Quick run command** | `node tests/test_signals.js` |
| **Full suite command** | `node tests/run_all.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/test_signals.js`
- **After every plan wave:** Run `node tests/run_all.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | MEMO-08 | — | N/A | smoke | `node tests/test_signals.js` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | MEMO-09 | — | N/A | smoke | `node tests/test_signals.js` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | AGNT-14 | — | N/A | smoke | `node tests/test_gates.js` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | MEMO-10 | — | N/A | smoke | `node tests/test_gates.js` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 2 | SKIL-13 | — | N/A | smoke | `node tests/test_gates.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_signals.js` — stubs for MEMO-08, MEMO-09, MEMO-10
- [ ] `tests/test_gates.js` — stubs for AGNT-14, SKIL-13

*Existing test infrastructure (tests/ directory with smoke tests) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Signal flow end-to-end across project run | AGNT-14 | Requires multi-agent pipeline execution | Run researcher then writer on a test topic, verify SIGNALS.md written and read |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

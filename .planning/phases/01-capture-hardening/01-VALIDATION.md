---
phase: 01
slug: capture-hardening
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-20
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom smoke test (direct node invocation) |
| **Config file** | none — created in Plan 01-03 |
| **Quick run command** | `node .claude/tests/smoke-test-observe.js` |
| **Full suite command** | `node .claude/tests/smoke-test-observe.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .claude/tests/smoke-test-observe.js`
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | CAPT-01 | — | N/A | unit | `node -e "..."` (inline static check in plan verify) | ✅ inline | ⬜ pending |
| 01-01-02 | 01 | 1 | CAPT-02 | — | N/A | unit | `node -e "..."` (inline static check in plan verify) | ✅ inline | ⬜ pending |
| 01-02-01 | 02 | 2 | CAPT-03 | — | N/A | unit | `node -e "..."` (inline static check in plan verify) | ✅ inline | ⬜ pending |
| 01-02-02 | 02 | 2 | CAPT-05 | — | N/A | unit | `node -e "..."` (inline static check in plan verify) | ✅ inline | ⬜ pending |
| 01-03-01 | 03 | 3 | CAPT-01..07 | — | N/A | integration | `node .claude/tests/smoke-test-observe.js` | ❌ W3 | ⬜ pending |
| 01-03-02 | 03 | 3 | CAPT-04 | — | N/A | unit | `node -e "..."` (settings.json validation) | ✅ inline | ⬜ pending |
| 01-03-03 | 03 | 3 | CAPT-06 | — | N/A | integration | `node .claude/tests/smoke-test-observe.js` (rotation test) | ❌ W3 | ⬜ pending |
| 01-03-04 | 03 | 3 | CAPT-07 | — | N/A | integration | `node .claude/tests/smoke-test-observe.js` (spaces test) | ❌ W3 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Plans 01-01 and 01-02 use inline `node -e` static checks (no external test file needed). Plan 01-03 creates the smoke test file as part of its own task.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live hook fires on real conversation | CAPT-01 | Requires actual Claude Code session | Start conversation, check obs.jsonl has new entries |
| Concurrent writes don't corrupt | CAPT-04 | Requires actual parallel hook invocations | Run multiple tool calls rapidly, validate all lines |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

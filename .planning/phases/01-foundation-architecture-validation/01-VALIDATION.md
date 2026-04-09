---
phase: 1
slug: foundation-architecture-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner + assert |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node tests/smoke-test-paths.js` |
| **Full suite command** | `node tests/smoke-test-paths.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/smoke-test-paths.js` (after Plan 03 creates it)
- **After every plan wave:** Run `node tests/smoke-test-paths.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01 | 1 | FOUND-01, FOUND-02, FOUND-04 | T-01-03 | N/A | inline | `node -e "..."` (inline verify in plan) | Yes (inline) | pending |
| 01-01-T2 | 01 | 1 | FOUND-03, FOUND-06 | — | N/A | inline | `node -e "..."` (inline verify in plan) | Yes (inline) | pending |
| 01-01-T3 | 01 | 1 | AGNT-13 | T-01-01, T-01-02 | N/A | inline | `node -e "..."` (inline verify in plan) | Yes (inline) | pending |
| 01-02-T1 | 02 | 2 | AGNT-03 | T-02-03 | N/A | inline | `node -e "..."` (inline verify in plan) | Yes (inline) | pending |
| 01-02-T2 | 02 | 2 | AGNT-04 | T-02-03 | N/A | inline | `node -e "..."` (inline verify in plan) | Yes (inline) | pending |
| 01-02-T3 | 02 | 2 | AGNT-13 | T-02-04 | N/A | inline | `node -e "..."` (inline verify in plan) | Yes (inline) | pending |
| 01-03-T1 | 03 | 3 | FOUND-05 | T-03-01 | N/A | script | `node tests/smoke-test-paths.js` | Wave 0 | pending |
| 01-03-T2 | 03 | 3 | AGNT-03, AGNT-04, AGNT-13 | — | N/A | manual | Human verification of agent invocation | N/A | pending |

*Status: pending -- ✅ green -- ❌ red -- ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/smoke-test-paths.js` — Windows path validation + Phase 1 file existence checks (created by Plan 03 Task 1)
- [ ] Node.js assert module — built-in, no install needed

*Existing Node.js runtime covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CLAUDE.md loads as project entry point | FOUND-04 | Requires Claude Code session | Open project in Claude Code, verify CLAUDE.md agent reference table visible |
| Researcher agent dispatches and returns | AGNT-03 | Requires live Claude Code delegation | Type @researcher, ask it to describe its role, verify research persona and channel context |
| Writer agent produces voice-aware output | AGNT-04 | Requires live Claude Code delegation | Type @writer, ask it to describe voice rules, verify voice profile awareness |
| Memory lifecycle (read at start, update after work) | AGNT-13 | Requires agent session observation | Run agent, check MEMORY.md timestamps before/after |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

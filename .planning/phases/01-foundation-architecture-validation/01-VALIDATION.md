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
| **Quick run command** | `node tests/smoke-test.js` |
| **Full suite command** | `node tests/smoke-test.js && node tests/agent-validation.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/smoke-test.js`
- **After every plan wave:** Run `node tests/smoke-test.js && node tests/agent-validation.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | — | N/A | integration | `node tests/smoke-test.js` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | FOUND-02, FOUND-03 | — | N/A | integration | `node tests/agent-validation.js` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | AGNT-01, AGNT-03 | — | N/A | integration | `node tests/agent-validation.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/smoke-test.js` — Windows path validation (spaces, periods in path)
- [ ] `tests/agent-validation.js` — Agent file structure and delegation validation
- [ ] Node.js assert module — built-in, no install needed

*Existing Node.js runtime covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Orchestrator loads as default agent | FOUND-04 | Requires Claude Code session | Open project in Claude Code, verify CLAUDE.md routing table visible |
| Researcher subagent dispatches and returns | AGNT-03 | Requires live Claude Code delegation | Ask orchestrator to delegate research task, verify results return |
| Writer subagent produces voice-aware output | AGNT-04 | Requires live Claude Code delegation | Ask orchestrator to delegate writing task, verify voice profile applied |
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

---
phase: 3
slug: evolve-command
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node --test (Node.js built-in test runner) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node .claude/tests/eval-evolve.js` |
| **Full suite command** | `node .claude/tests/eval-evolve.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .claude/tests/eval-evolve.js`
- **After every plan wave:** Run `node .claude/tests/eval-evolve.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | EVLV-01 | — | N/A | integration | `node .claude/tests/eval-evolve.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EVLV-02 | — | N/A | integration | `node .claude/tests/eval-evolve.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EVLV-03 | — | N/A | integration | `node .claude/tests/eval-evolve.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.claude/tests/test-evolve.js` — stubs for EVLV-01, EVLV-02, EVLV-03
- [ ] Test fixtures: mock memory files with `## Pending Review` entries

*Existing infrastructure covers observer eval tests but evolve-specific tests needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Observer dispatch via Agent tool | EVLV-01 | Requires live Claude Code runtime | Run `/evolve`, verify observer dispatches and returns |
| Revert interaction prompt | EVLV-03 | Requires interactive user input | Run `/evolve`, verify numbered prompt appears, test revert |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

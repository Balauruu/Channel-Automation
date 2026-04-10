---
phase: 2
slug: skills-library
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node (built-in assert) + custom smoke test |
| **Config file** | tests/smoke-test-skills.js (Wave 0 creates) |
| **Quick run command** | `node tests/smoke-test-skills.js` |
| **Full suite command** | `node tests/smoke-test-skills.js --full` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/smoke-test-skills.js`
- **After every plan wave:** Run `node tests/smoke-test-skills.js --full`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SKIL-09 | — | N/A | structural | `node tests/smoke-test-skills.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/smoke-test-skills.js` — structural validation for all 8 skill directories
- [ ] Validates: SKILL.md presence, valid frontmatter, insights.md existence, required sections (Phase 0, Reflection Phase, H/D tags)

*Pattern: same as Phase 1's `smoke-test-paths.js`*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skill produces domain-specific output | SKIL-01 through SKIL-08 | Requires invoking skill via Claude Code | Invoke each `/skill-name` and verify output matches domain |
| insights.md appended after run | SKIL-11 | Requires real skill execution | Run skill, check insights.md has new entry |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 3
slug: agent-migration-memory
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in (no framework -- raw test scripts) |
| **Config file** | None -- tests are standalone `.js` files |
| **Quick run command** | `node tests/smoke-test-agents.js` |
| **Full suite command** | `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/smoke-test-agents.js`
- **After every plan wave:** Run `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | AGNT-02 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | AGNT-05 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 0 | AGNT-06 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 0 | AGNT-07 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 0 | AGNT-08 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 0 | AGNT-09 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-07 | 01 | 0 | AGNT-10 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-08 | 01 | 0 | AGNT-11 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-09 | 01 | 0 | AGNT-12 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-01-10 | 01 | 0 | AGNT-15 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | MEMO-01 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | MEMO-02 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | MEMO-03 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | MEMO-04 | — | N/A | smoke | `node tests/smoke-test-agents.js` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | MEMO-05 | — | N/A | manual-only | N/A | N/A | ⬜ pending |
| 03-03-02 | 03 | 1 | MEMO-06 | — | N/A | manual-only | N/A | N/A | ⬜ pending |
| 03-03-03 | 03 | 1 | MEMO-07 | — | N/A | manual-only | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/smoke-test-agents.js` — covers AGNT-02/05-12/15, MEMO-01/02/03/04. Validates: all 12 agent files exist, each has required frontmatter fields (name, description, model, memory: project, tools, skills with agent-protocols), each has MEMORY.md with 5 sections and non-empty key_files, no V5 paths in agent bodies, CLAUDE.md agent reference table updated

*Existing `smoke-test-paths.js` and `smoke-test-skills.js` already cover path and skill validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Insight lifecycle (accumulate entries, trigger merge at 20+) | MEMO-05 | Behavioral -- requires multiple agent runs | Read agent-protocols skill, verify it contains insight accumulation instructions |
| Merge/promote rules (3+ converging entries promote to SKILL.md) | MEMO-06 | Behavioral -- requires multiple agent runs | Read agent-protocols skill, verify it contains merge/promote rules |
| Exemplar curation is optional | MEMO-07 | Structural choice | Verify no mandatory exemplar step in agent-protocols |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

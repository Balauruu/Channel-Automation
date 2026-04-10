---
phase: 4
slug: pipeline-triggers-hooks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert (custom test runner, established pattern) |
| **Config file** | None -- tests use `testCases` array pattern from Phase 1-3 |
| **Quick run command** | `node tests/smoke-test-pipeline.js` |
| **Full suite command** | `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js && node tests/smoke-test-pipeline.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/smoke-test-pipeline.js`
- **After every plan wave:** Run `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js && node tests/smoke-test-pipeline.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | PIPE-01 | T-04-01 / — | Validate $ARGUMENTS before path use | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | PIPE-02 | — | N/A | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | PIPE-03 | — | N/A | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | PIPE-04 | — | N/A | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | PIPE-05 | — | N/A | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 1 | PIPE-06 | — | N/A | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-01-07 | 01 | 1 | PIPE-07 | — | Skills do NOT reference Python scripts | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-01-08 | 01 | 1 | PIPE-08 | — | Checkpoint skills contain STOP/WAIT | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | HOOK-03 | T-04-02 | async hooks, try/catch, process.exit(0) | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | HOOK-04 | T-04-03 | Validate frontmatter before processing | unit | `node tests/smoke-test-pipeline.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/smoke-test-pipeline.js` — stubs for PIPE-01 through PIPE-08, HOOK-03, HOOK-04
- [ ] Framework install: None needed — Node.js test runner already in use

*Existing infrastructure (smoke-test-paths.js, smoke-test-skills.js, smoke-test-agents.js) covers foundation requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Human checkpoint pauses pipeline | PIPE-08 | Requires interactive user session | Run `/strategy`, verify output is presented with next-step guidance, confirm pipeline does not auto-continue |
| Agent dispatch logged in JSONL | HOOK-03 | Requires runtime agent dispatch | Invoke any agent, check `logs/sessions.jsonl` for timestamped dispatch + completion entries |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 2
slug: observer-agent
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js eval script (CommonJS, zero dependencies) |
| **Config file** | none — self-contained eval-observer.js |
| **Quick run command** | `node .claude/tests/eval-observer.js` |
| **Full suite command** | `node .claude/tests/eval-observer.js` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .claude/tests/eval-observer.js`
- **After every plan wave:** Run `node .claude/tests/eval-observer.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-T1 | 01 | 1 | OBSV-04, MEML-01 | T-02-01 | File content preserved on append | inline-node | `node -e "..." (PLAYBOOK + observer MEMORY check)` | Plan creates | pending |
| 2-01-T2 | 01 | 1 | OBSV-04, MEML-01 | T-02-01 | File content preserved on append | inline-node | `node -e "..." (19 Pending Review section check)` | Plan creates | pending |
| 2-02-T1 | 02 | 1 | OBSV-04, OBSV-06, OBSV-07, OBSV-08 | T-02-03 | Synthetic data only | fixture-validation | `node -e "..." (fixture file existence + event count)` | Plan creates | pending |
| 2-02-T2 | 02 | 1 | OBSV-02, OBSV-04, OBSV-06, OBSV-07, OBSV-08, MEML-01 | T-02-04 | Read-only against fixtures | eval-script | `node .claude/tests/eval-observer.js` | Plan creates | pending |
| 2-03-T1 | 03 | 2 | OBSV-01 thru OBSV-08, MEML-01 | T-02-05 thru T-02-09 | Self-loop filter, format validation | inline-node | `node -e "..." (observer.md structure checks)` | Plan creates | pending |

*Status: pending (all created during execution, no Wave 0 needed)*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- Node.js v24.13.0 already installed
- eval-observer.js is created by Plan 02 Task 2 (self-bootstrapping)
- Fixtures created by Plan 02 Task 1
- No external test framework needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Observer produces meaningful learnings from real transcripts | OBSV-01 | Requires LLM judgment quality assessment | Run `@observer` on a real obs.jsonl via /evolve, review Pending Review entries for actionability |
| Scope classification matches human judgment | OBSV-03 | Subjective tier boundary decisions — the 3 scope-test questions require LLM reasoning that cannot be unit-tested | Load `run-researcher-success.jsonl` fixture, manually dispatch observer against it, verify that extracted candidates are classified to correct tiers. Expected: crawl4ai Python path fix -> skills/crawl4ai-scraping (Q1 only). Any candidate matching Q1+Q2 simultaneously should appear in rejections.jsonl with reason "ambiguous-scope" |
| Few-shot examples produce correct behavior | OBSV-04 | LLM prompt effectiveness | Dispatch observer on fixture, compare output format against spec |

---

## Eval Test Coverage (eval-observer.js)

The eval script validates deterministic output contracts without dispatching the observer LLM:

| Test Case | Requirement | What It Validates |
|-----------|-------------|-------------------|
| OBSV-04/memory_md_entry_format | OBSV-04 | MEMORY.md entry regex (confidence + agent + insight + timestamp) |
| OBSV-04/insights_md_entry_format | OBSV-04 | insights.md entry regex (date + confidence + insight + from) |
| MEML-01/confidence_tag_valid | MEML-01 | Only [HIGH], [MED], [LOW] accepted |
| OBSV-06/self_loop_filter | OBSV-06 | Filter predicate excludes observer events, keeps non-observer events |
| OBSV-07/cursor_file_structure | OBSV-07 | Cursor JSON has byte_offset, last_epoch_ms, last_run_id |
| OBSV-07/cursor_rotation_detection | OBSV-07 | Rotation detected when byte_offset > file_size |
| OBSV-08/rejection_jsonl_format | OBSV-08 | Rejection entry has all required fields |
| OBSV-08/rejection_reason_enum | OBSV-08 | All 5 rejection reasons recognized |
| OBSV-04/playbook_entry_format | OBSV-04 | PLAYBOOK.md entry uses same format as MEMORY.md |
| OBSV-02/agent_id_filter | OBSV-02 | Orphan events (agent_id="") identified + filter applied to exclude them |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (inline node or eval-observer.js)
- [x] Sampling continuity: eval-observer.js runs after every task in Wave 1+
- [x] Wave 0 not needed (Node.js pre-installed, eval script self-bootstraps)
- [x] No watch-mode flags
- [x] Feedback latency < 15s (estimated 3s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** aligned with plans 01-03

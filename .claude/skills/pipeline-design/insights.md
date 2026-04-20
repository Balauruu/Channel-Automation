# Pipeline Design Insights

Accumulated learnings from pipeline-design audits. Append one line per audit: `- [YYYY-MM-DD] insight text`.

- [2026-04-18] First worked example: @researcher debloat. Anti-patterns fired: #1 (documentary-research duplicated source-hierarchy lines already in researcher.md), #2 (bare `python -m researcher` invocations caused silent crawl4ai fallback, 4x benchmarked slowdown), #4 (80 lines of adaptive-loop machinery on top of a 3-script pipeline), #5 ("and organizations" in entity landscape was overfit to Duplessis orphans), #6 ([DETERMINISTIC]/[HEURISTIC] tags and Phase 0 boilerplate), #7 (/research skill was a dead router). Result: cut ~55 lines; merged 113 lines from documentary-research; pinned interpreter; replaced loop with 3-pass + conditional 4th.

## Pending Review


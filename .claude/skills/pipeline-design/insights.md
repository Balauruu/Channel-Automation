# Pipeline Design Insights

Accumulated learnings from pipeline-design audits. Append one line per audit: `- [YYYY-MM-DD] insight text`.

- [2026-04-18] First worked example: @researcher debloat. Anti-patterns fired: #1 (documentary-research duplicated source-hierarchy lines already in researcher.md), #2 (bare `python -m researcher` invocations caused silent crawl4ai fallback, 4x benchmarked slowdown), #4 (80 lines of adaptive-loop machinery on top of a 3-script pipeline), #5 ("and organizations" in entity landscape was overfit to Duplessis orphans), #6 ([DETERMINISTIC]/[HEURISTIC] tags and Phase 0 boilerplate), #7 (/research skill was a dead router). Result: cut ~55 lines; merged 113 lines from documentary-research; pinned interpreter; replaced loop with 3-pass + conditional 4th.

- [2026-04-22] Second audit: @strategy. Anti-patterns fired: #1 (trend interpretation duplicated between agent body and data-analysis skill; CLI commands listed twice), #2 (data-analysis stale Phase 6 language; missing trend_scanner.py reference; structured-output Topic Brief Schema mismatched actual output), #3 (data-analysis was single-consumer skill — demoted to bundled reference), #6 (Task Classification section repeated CLAUDE.md pattern). Also: scoring scale updated 1-5→1-10 per user preference; trend_scanner path bugs noted in ROADMAP (code migration debt, not spec issue). Net: ~40 lines cut from agent body, data-analysis moved to `.claude/agents/strategy/references/`.

## Pending Review


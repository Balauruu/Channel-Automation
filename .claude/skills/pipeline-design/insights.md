# Pipeline Design Insights

Accumulated learnings from pipeline-design audits. Append one line per insight.

<!-- Append new insights below this line -->
- Spec-consumer drift: when a spec rename or rubric change lands, grep every Python module, JSON template, and MEMORY.md for the old terms in the same edit pass — don't ship the spec change without the consumer updates.
- Phantom procedure anti-pattern: agent body documents outputs but hides the existing toolchain and intermediate artifacts. Inverse of stale-reference: tools and files exist, spec omits them, agent improvises the deterministic flow each run. Fix: spec must list every script command and intermediate artifact the pipeline actually produces.
- Dual-taxonomy drift anti-pattern: spec defines one rubric (e.g., fetch-reliability tiers 1-3), agent silently applies a different scheme (e.g., source-authority 1-5) on the same field. When two taxonomies collide on one field, document both or unify — otherwise code, manifests, and spec never reconcile.
- Vague task tracking: when a spec body uses numbered `Step N` headings, the task-tracking section MUST enumerate one task per heading. "Register the steps" lets agents invent their own granularity per run.
- Thin spec detection: when a working-tree spec looks suspiciously short, run `git diff HEAD <agent>.md` first to detect a prior unstaged simplification that stripped detail without replacing it.
- Silent dependency failure: missing packages in isolated venvs cause silent script degradation (scripts run but produce no artifacts), not loud errors. The agent falls back to tool calls at 4x the cost. Always verify script dependencies before a production run.
- visual-researcher audit: removed deleted `archive-search` skill from frontmatter (#3), removed `<project_context>` duplicate of agent-protocols (#6), added TaskCreate/TaskUpdate for 5-step procedure (#10). `image_manifest.json` has no downstream consumer — flagged as potential phantom artifact pending first production run.
- visual-planner audit: removed deleted `archive-search` skill from frontmatter (#3), added TaskCreate/TaskUpdate for 6-step procedure (#10), deleted phantom `shotlist_edit_sheet.md` artifact from spec and MEMORY (#15), added `search_query` + optional `fallback` per-shot fields to fix data contract drift with asset-processor (#13). Deferred project-wide `<project_context>` duplicate cleanup to ROADMAP entry 2 — same boilerplate appears in 10 agents, sweep separately.

# Git Workflow Rules

## Avoid `git add -A` in agent-maintained trees

Two locations accumulate uncommitted appends from normal agent runs, so `git status` will often show them as "modified" even when you haven't touched them:

- `.claude/agent-memory/<agent>/MEMORY.md` — per-agent persistent memory updates.
- `.claude/skills/<skill>/insights.md` — per-skill accumulated learnings.

When committing inside these trees, use targeted `git add <path>` rather than `git add -A <dir>`. A broad stage silently sweeps those pre-existing appends into whatever commit you are preparing, mixing unrelated changes.

Observed in this repo: commit `1e959ef` ("remove documentary-research") accidentally included an append to `autoresearch/insights.md` because the plan prescribed `git add -A .claude/skills/`.

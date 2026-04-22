# Channel-Automation V0.6

## Project

Dark mysteries documentary video production pipeline.

## Folder Map

- `channel/` -- Channel identity (voice, style, visual guide)
- `.claude/agents/` -- Agent definitions
- `.claude/skills/` -- Shared skills (agent-protocols)
- `.claude/agent-memory/` -- Per-agent persistent memory (universal, cross-project)
- `.claude/PLAYBOOK.md` -- Cross-agent coordination log (observer-managed, Open/Resolved lifecycle)
- `.claude/logs/` -- Agent dispatch/completion session logs and observations/ (obs.jsonl per project)
- `.claude/tests/` -- Smoke tests and validation scripts
- `.claude/hooks/` -- Pre/PostToolUse and SubagentStop hooks (pipeline-observe.js)
- `.claude/scripts/` -- Python scripts (strategy/, editorial/, media/ subdirs)
- `.claude/rules/` -- Modular on-demand rules (git-workflow, etc.). Read when relevant; not auto-loaded.
- `data/` -- SQLite databases (channel_assistant.db, asset_catalog.db)
- `docs/` -- plans & specs
- `channel/strategy/` -- Strategy outputs (competitors.json, analysis, topics)
- `channel/voice-analysis/` -- Style-extractor workspace (reconstructed scripts)
- `projects/` -- Per-documentary outputs

## Agent Reference

| Agent | Domain | When to Use |
|-------|--------|-------------|
| @researcher | Editorial | Research a documentary topic |
| @writer | Editorial | Generate a script from research |
| @strategy | Strategy | Competitor analysis, topic generation, project init |
| @style-extractor | Editorial | Extract or refine channel narrator voice |
| @visual-researcher | Media | Visual intent definition and resource gathering |
| @visual-planner | Media | Shotlist generation and b-roll curation |
| @asset-processor | Media | CLIP embeddings, asset downloads, semantic search |
| @asset-curator | Media | Global video library management |
| @code-reviewer | Meta | Code quality review and fixes |
| @observer | Meta | Cross-agent coordination, PLAYBOOK management, pattern detection |
| @compiler | Media | Edit sheet compilation for DaVinci Resolve |

## Architecture Rules

- Shared behavioral protocols are injected via the agent-protocols skill in each agent's skills: field.
- Before editing anything in `.claude/agents/` or `.claude/skills/`, invoke the `pipeline-design` skill (audit framework + 7 anti-patterns).

### Task Classification
Before writing any code, classify the task:
- **[HEURISTIC]** — requires judgment, narrative design, or evaluation → solve via prompts/skills, write no code
- **[DETERMINISTIC]** — requires structured data manipulation, scraping, or rendering → write code

## Billing

- All LLM calls in pipeline features MUST route through Claude Code subagent dispatches (covered by the Claude Max subscription). Direct `api.anthropic.com` / `ANTHROPIC_API_KEY` calls are metered separately and MUST NOT be introduced without explicit confirmation.
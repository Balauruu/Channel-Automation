# Channel-Automation V0.6

## Project

Dark mysteries documentary video production pipeline.

## Folder Map

- `channel/` -- Channel identity (voice, style, visual guide)
- `.claude/agents/` -- Agent definitions
- `.claude/skills/` -- Shared skills (agent-protocols)
- `.claude/agent-memory/` -- Per-agent persistent memory (universal, cross-project)
- `.claude/project-memories/` -- Per-project agent notes (project-scoped, archived with project)
- `.claude/references/` -- Reference guides (skill crafting)
- `.claude/feedback/` -- Cross-agent feedback signals (signals.yaml)
- `.claude/logs/` -- Agent dispatch/completion session logs
- `.claude/tests/` -- Smoke tests and validation scripts
- `.claude/hooks/` -- Pre/PostToolUse and SubagentStop hooks
- `.claude/scripts/` -- Python scripts (strategy/, editorial/, media/ subdirs)
- `data/` -- SQLite databases (channel_assistant.db, asset_catalog.db)
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
| @editorial-lead | Editorial | Quality gate research dossiers and scripts |
| @visual-researcher | Media | Visual intent definition and resource gathering |
| @visual-planner | Media | Shotlist generation and b-roll curation |
| @asset-processor | Media | CLIP embeddings, asset downloads, semantic search |
| @asset-curator | Media | Global video library management |
| @code-reviewer | Meta | Code quality review and fixes |
| @compiler | Media | Edit sheet compilation for DaVinci Resolve |

## Architecture Rules

- Agents are user-invoked only. Type @agent-name to delegate.
- No auto-routing. No auto-dispatch. User decides what to delegate.
- Human checkpoints: after topic generation (present and WAIT), after asset processing (present and WAIT).
- Shared behavioral protocols are injected via the agent-protocols skill in each agent's skills: field.

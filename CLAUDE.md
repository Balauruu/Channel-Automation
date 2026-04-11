# Channel-Automation V0.6

## Project

Dark mysteries documentary video production pipeline. Phase 1 vertical slice: researcher + writer agents.

## Folder Map

- `channel/` -- Channel identity (voice, style, visual guide)
- `.claude/agents/` -- Agent definitions
- `.claude/skills/` -- Shared skills (agent-protocols)
- `.claude/agent-memory/` -- Per-agent persistent memory
- `.claude/references/` -- Reference guides (skill crafting)
- `.claude/rules/` -- Path-scoped rules (Phase 4)
- `.claude/hooks/` -- Pre/PostToolUse hooks (Phase 4)
- `.claude/scripts/` -- Python scripts and utility scripts (strategy/, editorial/, media/ subdirs + audit-agents.js)
- `data/` -- SQLite databases (channel_assistant.db, asset_catalog.db)
- `strategy/competitors/` -- Competitor channel registry (competitors.json)
- `projects/` -- Per-documentary outputs
- `tests/` -- Smoke tests and validation scripts

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
| @meta | Meta | Pipeline health, UX review, improvement proposals |
| @code-reviewer | Meta | Code quality review and fixes |
| @compiler | Media | Edit sheet compilation for DaVinci Resolve |

## Architecture Rules

- Agents are user-invoked only. Type @agent-name to delegate.
- No auto-routing. No auto-dispatch. User decides what to delegate.
- Human checkpoints: after topic generation (present and WAIT), after asset processing (present and WAIT).
- Subagents do NOT inherit CLAUDE.md -- each agent has a project_context block instructing it to Read ./CLAUDE.md.
- Shared behavioral protocols are injected via the agent-protocols skill in each agent's skills: field.

## Platform

- Windows 11, RTX 4070 8GB VRAM
- Project path has spaces and periods -- use path.resolve(), never hardcode paths
- GPU scripts: use `C:/Users/iorda/miniconda3/envs/perception-models/python.exe`
- File operations: use Node.js `path` module. Never use `test -d`/`test -f` (bash builtins, not available on Windows)
- Filenames: colons are illegal on Windows -- timestamps must replace colons with dashes

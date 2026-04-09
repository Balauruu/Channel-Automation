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
- `.claude/scripts/` -- Utility scripts (Phase 4)
- `projects/` -- Per-documentary outputs
- `strategy/` -- Strategy Python scripts
- `editorial/` -- Editorial Python scripts
- `media/` -- Media Python scripts
- `tests/` -- Smoke tests and validation scripts

## Agent Reference

| Agent | Domain | When to Use |
|-------|--------|-------------|
| @researcher | Editorial | Research a documentary topic |
| @writer | Editorial | Generate a script from research |
| @strategy-lead | Strategy | Competitor analysis, topics (Phase 3) |
| @editorial-lead | Editorial | Complex editorial coordination (Phase 3) |
| @style-extractor | Editorial | Extract narrator voice (Phase 3) |
| @visual-researcher | Media | Visual intent and reference gathering (Phase 3) |
| @visual-planner | Media | Shotlist generation (Phase 3) |
| @asset-processor | Media | CLIP embeddings, downloads (Phase 3) |
| @asset-curator | Media | Asset evaluation and library management (Phase 3) |
| @meta | Meta | Pipeline health and code quality (Phase 3) |
| @compiler | Media | Edit sheet compilation (Phase 3) |

Agents marked "(Phase 3)" are not yet created. They appear here for reference.

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

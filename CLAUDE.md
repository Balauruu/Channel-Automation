# Channel-Automation V0.6

## Project

Dark mysteries documentary video production pipeline.

## Folder Map

- `channel/` -- Channel identity (voice, style, visual guide)
- `.claude/agents/` -- Agent definitions
- `.claude/skills/` -- Skills (5 shared + 8 agent-task-specific)
- `.claude/agent-memory/` -- Per-agent persistent memory
- `.claude/hooks/` -- SubagentStop hook that warns when an agent's MEMORY.md exceeds 200 lines
- `.claude/scripts/` -- Python scripts (`strategy/`, `researcher/`, `media/`, `memory/`)
- `.claude/rules/` -- Project-specific on-demand rules. Read when relevant; not auto-loaded.
- `data/` -- SQLite databases (channel_assistant.db, asset_catalog.db)
- `docs/` -- plans & specs
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
| @compiler | Media | Edit sheet compilation for DaVinci Resolve |

## Production Pipeline Sequence

New video production follows this handoff chain. Each step depends on the prior step's output. The orchestrator must run them in order — do not skip ahead.

```
@strategy (topics)  →  user picks topic  →  @strategy (project init)
      ↓
@researcher  →  Research.md, entity_index.json
      ↓
@writer  →  Script draft in projects/<slug>/script/
      ↓
@visual-researcher  →  Visual brief + media leads
      ↓
@visual-planner  →  Shotlist + asset requirements
      ↓
@asset-processor  →  Downloaded assets, CLIP embeddings
      ↓
@compiler  →  Edit sheet for DaVinci Resolve
```

Parallel branches: `@style-extractor` runs independently (channel voice calibration). `@asset-curator` runs after asset-processor for library promotion.

## Architecture Rules

- Shared behavioral protocols are injected via the agent-protocols skill in each agent's skills: field.
- Before editing anything in `.claude/agents/` or `.claude/skills/`, invoke the `pipeline-design` skill (audit framework + anti-pattern checklist).

### Task Classification
Before writing any code, classify the task:
- **[HEURISTIC]** — requires judgment, narrative design, or evaluation → solve via prompts/skills, write no code
- **[DETERMINISTIC]** — requires structured data manipulation, scraping, or rendering → write code

### No Inter-Agent Parallel Execution
There is no orchestration layer between agents. Do not propose, plan, or attempt running multiple agents in parallel (e.g., "while @researcher runs, we can start @visual-researcher"). All agent dispatches are sequential and user-initiated — the pipeline sequence above is a handoff chain, not a concurrency diagram.

## Billing

- All LLM calls in pipeline features MUST route through Claude Code subagent dispatches (covered by the Claude Max subscription). Direct `api.anthropic.com` / `ANTHROPIC_API_KEY` calls are metered separately and MUST NOT be introduced without explicit confirmation.
# Channel-Automation V0.6 — Pi-to-Claude-Code Migration

## What This Is

A documentary video production pipeline for a dark mysteries YouTube channel, migrated from the Pi CLI multi-team agent framework to Claude Code. The system coordinates specialized AI agents across strategy, editorial, media, and meta domains to take a topic from idea through research, scripting, visual planning, and asset compilation — ending with a DaVinci Resolve-ready edit sheet.

## Core Value

Every agent must retain its specialized expertise and accumulate knowledge across sessions. Cross-agent feedback propagation (downstream insights influencing upstream behavior) is the single most important capability to preserve.

## Requirements

### Validated

- [x] Channel identity docs integrated as agent context — Validated in Phase 1: Foundation & Architecture Validation
- [x] Migrate expertise YAML files to appropriate Claude Code format — Validated in Phase 1 (MEMORY.md seeds from V5 YAML structure)
- [x] Map Pi delegation workflow to Claude Code subagent dispatch (flat or 2-tier) — Validated in Phase 1 (2-tier flat delegation, user-invoked agents)
- [x] Migrate skill procedures to Claude Code skills or CLAUDE.md instructions — Validated in Phase 2: Skills Library (8 domain skills with consistent structure, reflection loops, context-loading)

### Active

- [ ] Migrate all 17 agent personas (orchestrator + 4 leads + 12 workers) to Claude Code agent definitions
- [ ] Preserve agent mental models (persistent cross-session memory per agent)
- [ ] Implement feedback propagation system (downstream agent insights adjust upstream agent behavior)
- [ ] Map Pi delegation workflow to Claude Code subagent dispatch (flat or 2-tier)
- [ ] Migrate expertise YAML files to appropriate Claude Code format
- [ ] All Python scripts (strategy, editorial, media) invocable by Claude Code agents
- [ ] Pipeline stages triggerable by user commands (slash commands or equivalent)
- [ ] Channel identity docs (channel.md, voice profile, visual style guide) integrated as agent context
- [ ] Strategy pipeline: competitor scraping, analysis, topic generation, project init
- [ ] Editorial pipeline: 3-pass research, script generation, style extraction
- [ ] Media pipeline: visual research, visual planning, asset processing (CLIP), asset curation, compilation
- [ ] Meta pipeline: pipeline observation, code review, UX improvement
- [ ] Domain enforcement equivalent (agents scoped to their functional area)
- [ ] Session/conversation logging for pipeline runs
- [ ] Research Claude Code custom agents, hooks, MCP servers, and existing community solutions
- [ ] Use Claude Code's latest features (custom agent types, hooks, skills system)
- [ ] Clean up and consolidate content files (channel/, strategy/) for new system structure

### Out of Scope

- Footer UI (Pi-specific TUI feature, not applicable to Claude Code) — Pi-only visual
- 3-tier delegation (Orchestrator → Lead → Worker nesting) — Claude Code doesn't support subagent nesting; use flat or 2-tier alternative
- Pi CLI extension system (.pi/extensions/) — replaced entirely by Claude Code native features
- Wiki/documentation site (Astro/Starlight) — separate concern, not part of pipeline migration
- Rebuilding Python scripts — scripts stay as-is, only invocation layer changes

## Context

**Source system:** Channel-Automation V5 running Pi CLI with a custom multi-team extension. 17 agents across 4 teams (Strategy, Editorial, Media, Meta) with hierarchical delegation, per-agent domain enforcement, YAML expertise files (mental models), markdown skill procedures, and session-based conversation logging.

**Target system:** Claude Code with its native agent system. Key Claude Code capabilities to leverage:
- Custom agent definitions (`.claude/agents/` directory)
- Hooks (pre/post tool execution triggers)
- MCP servers (custom tool providers)
- Skills/slash commands (user-triggered workflows)
- CLAUDE.md project instructions
- Subagent dispatch (Agent tool — single level, no nesting)

**Migration strategy:** Not a 1:1 port. The Pi extension layer (TypeScript: delegate-tool, config-parser, domain-enforcer, orchestrator-injector, session-manager, footer-ui) is completely replaced by Claude Code native mechanisms. Agent personas, expertise, and skills are transformed into Claude Code's formats. Python scripts stay untouched.

**Key architectural difference:** Pi supports 3-tier delegation (orchestrator → lead → worker). Claude Code supports single-level subagent dispatch. The user's primary concern is preserving feedback propagation — when a downstream agent (e.g., asset-processor) learns something about asset quality, that insight must flow back to influence upstream agents (visual-planner, visual-researcher) in subsequent runs.

**Quality references:**
- IndyDevDan "One Agent Is NOT ENOUGH" (YouTube: M30gp1315Y4) — 6 pillars of multi-agent orchestration
- IndyDevDan "My Pi Agent Teams / Claude Code Leak SIGNAL" (YouTube: RairMJflUSA) — harness engineering as foundation

**Python scripts preserved (invoked via Bash by agents):**
- Strategy: cli.py (add, scrape, analyze, topics, init), scraper.py, analyzer.py, topics.py, project_init.py, database.py
- Editorial: researcher/cli.py (survey, deepen, synthesize), writer/cli.py (load, generate, revise)
- Media: discover.py, ingest.py, embed.py, search.py, evaluate.py, download.py, ia_search.py, organize_assets.py, promote.py, wiki_screenshots.py, crawl_images.py

**Platform:** Windows 11, RTX 4070 (8GB VRAM), conda Python environments, Node.js runtime.

## Constraints

- **Platform**: Claude Code CLI on Windows 11 — must use Claude Code's native extension points (agents, hooks, MCP, skills), no custom runtime
- **Python scripts**: All existing scripts must work without modification — only the invocation layer changes
- **GPU**: CLIP embeddings require RTX 4070 via conda env at `C:/Users/iorda/miniconda3/envs/perception-models/`
- **No paid LLM APIs**: All reasoning runs through Claude Code agents natively — no external API calls
- **Agent memory**: Must persist across sessions (not just within a single conversation)
- **Feedback propagation**: Downstream insights must influence upstream behavior in subsequent pipeline runs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| New directory (V0.6) not in-place migration | Clean start avoids Pi artifacts, can reference V5 during build | -- Pending |
| Python scripts stay as-is | Scripts are battle-tested, only invocation layer needs to change | -- Pending |
| No footer UI | Pi-specific TUI feature, Claude Code has its own status display | -- Pending |
| User-triggered stages (not auto-orchestrated) | User prefers manual control over pipeline stages | -- Pending |
| Extensive research phase required | Claude Code ecosystem is evolving rapidly — need current state of plugins, community solutions, latest features | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-10 after Phase 2 completion*

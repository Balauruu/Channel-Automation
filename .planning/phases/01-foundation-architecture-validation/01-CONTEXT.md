# Phase 1: Foundation & Architecture Validation - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

The Claude Code project is structurally sound and the 2-tier delegation pattern is proven with a working researcher-writer vertical slice. Delivers: directory structure, CLAUDE.md with project context, channel identity docs, 2 proof-of-concept agents (researcher + writer) with persistent memory, a shared behavioral skill (agent-protocols), Windows path smoke tests, and a skill-crafting reference guide.

</domain>

<decisions>
## Implementation Decisions

### Invocation model
- **D-01:** User-invoked only — NO orchestrator, NO auto-dispatch routing. The user types `@researcher` or `@writer` directly. CLAUDE.md contains a reference table of all agents (documentation only), not routing enforcement logic. This matches the dominant pattern across all major repos (anthropics/claude-code 111k stars, vercel/next.js 130k stars, wshobson/agents 33k stars — none use orchestrators).
- **D-02:** Slash-command skills for pipeline automation (e.g., `/research`, `/write-script`) are deferred to Phase 4. Phase 1 validates the agent pattern first.
- **D-03:** Human checkpoints are instruction-based — CLAUDE.md says "After /strategy, present topic briefs and WAIT" — no hooks needed for checkpoints in Phase 1.
- **D-04:** CLAUDE.md includes the full agent reference table for all ~10 future agents from day one. Agents that don't exist yet simply won't be invocable. When Phase 3 adds them, the reference is already there.

### Agent architecture
- **D-05:** Fat agent body + shared behavioral skills. Each agent's `.md` body contains full domain expertise (target ~120-200 lines): persona, procedures, Python script invocation details. Shared meta-behavior (memory protocol, feedback protocol) is extracted into a skill injected via the `skills:` frontmatter field — this is the ONLY confirmed mechanism for injecting shared content into spawned subagents (subagents do NOT inherit CLAUDE.md).
- **D-06:** One shared skill: `agent-protocols` (with `user-invocable: false`) injected into every agent via `skills:` field. Contains memory read/write protocol and feedback signal read/write protocol. Keeps shared behavior DRY without duplication across agent bodies.
- **D-07:** Channel identity docs referenced via `@file` syntax in agent bodies — each agent gets only the docs relevant to its domain (researcher gets `@channel/channel.md`, writer gets `@channel/voice-profile.md` + `@channel/channel.md`).
- **D-08:** GSD-inspired `<project_context>` block in each agent body telling the agent to "Read ./CLAUDE.md for project rules" — workaround for subagents not inheriting CLAUDE.md automatically.
- **D-09:** The 1M context window on Opus/Sonnet 4.6 makes skill injection token cost negligible (<1.5% for 5 skills). The "3 skills max" rule was community guidance for the 200K era and does not apply. Inject as many skills as each agent needs.

### Channel identity integration
- **D-10:** Channel identity source files live in `channel/` at project root — clean separation from `.claude/` agent system. Files: `channel.md`, `voice-profile.md`, `VISUAL_STYLE_GUIDE.md`.
- **D-11:** Agents reference channel docs via `@channel/<file>.md` in their body, NOT via CLAUDE.md imports (which subagents can't see) and NOT via a shared skill (which would load all docs into every agent). Each agent gets only what it needs.
- **D-12:** Channel docs are migrated from V5 at `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5` — existing content preserved, reformatted if needed.

### Memory initialization
- **D-13:** Seed researcher and writer MEMORY.md from V5 expertise YAML files at `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5`. Convert YAML mental model structure to markdown format with sections: key_files, decisions, patterns, observations, open_questions.
- **D-14:** Memory update protocol: structured append with timestamps. After each task, agent appends new entries under the appropriate section (e.g., `- [2026-04-10] Wikipedia articles need cross-referencing`). Existing entries preserved.
- **D-15:** MEMORY.md grows unbounded — agent explicitly Reads the full file at task start (not relying on 200-line auto-injection). 1M context makes this feasible. No automatic pruning cap.
- **D-16:** `memory: project` on both agents — memory stored at `.claude/agent-memory/<name>/MEMORY.md`, shared via git, project-scoped.

### Claude's Discretion
- Exact agent body line counts (target 120-200 but Claude can adjust based on content needs)
- `agent-protocols` skill internal structure and exact wording
- CLAUDE.md agent reference table format and column choices
- Windows smoke test script implementation details
- Exact frontmatter fields on each agent (model choice, color, maxTurns, permissionMode)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture patterns
- `.planning/research/ARCHITECTURE.md` — Full directory structure, agent definition templates, domain enforcement patterns, feedback propagation system design, pipeline orchestration stages, anti-patterns
- `.planning/research/STACK.md` — Claude Code extension points (agents, hooks, MCP, skills, memory), all frontmatter fields, invocation methods, `context: fork` behavior

### Project requirements
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: FOUND-01 through FOUND-06, AGNT-01, AGNT-03, AGNT-04, AGNT-13
- `.planning/PROJECT.md` — Project charter, constraints, key decisions, V5 migration context

### V5 source (for migration)
- `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5` — V5 expertise YAML files for memory seeding, channel identity docs for migration

### Research findings (from discuss-phase deep research)
- Subagents do NOT inherit CLAUDE.md content (confirmed via GitHub issue #8395, source code analysis)
- `skills:` frontmatter is the only confirmed mechanism to inject shared content into subagents
- Major repos (anthropics/claude-code, vercel/next.js, wshobson/agents) use NO orchestrator — user invokes agents directly
- `memory:` and `skills:` frontmatter fields are documented but barely adopted in production repos
- GSD framework uses ultra-fat agents (up to 1,381 lines) with zero skills injection and zero memory
- IndyDevDan uses empty CLAUDE.md + hooks for shared enforcement, thin focused agents
- 1M context window makes skill injection token cost negligible

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No `.claude/` directory, no agents, no skills, no code yet.

### Established Patterns
- GSD framework at `~/.claude/agents/` provides 24 agent definition examples with fat-agent architecture
- GSD uses `@file` references for shared docs and `<project_context>` blocks for CLAUDE.md awareness

### Integration Points
- V5 project at `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5` — source for channel identity docs and expertise YAML files
- Python scripts will be referenced in agent bodies but are not yet copied to V0.6 (deferred to later phases)

</code_context>

<specifics>
## Specific Ideas

- "I know that skills are used for repeated processes and agents when you want to scale" — user's framing of the agent/skill division
- User explicitly wants to explore user-invoked-only (no orchestrator) — confirmed after seeing production repo evidence
- User dismissed the "3 skills max" rule given 1M context — "as many skills as necessary can be injected"
- IndyDevDan's "harness engineering" concept resonated — hooks for deterministic enforcement, not prompt-based
- The GSD pattern of `<project_context>` telling agents to read CLAUDE.md themselves is a practical workaround

</specifics>

<deferred>
## Deferred Ideas

- Slash-command skills for pipeline stages (`/research`, `/write-script`, `/visual-plan`) — Phase 4
- Hook-based feedback propagation (SubagentStop writing to upstream memory) — Phase 5
- Domain enforcement hooks (PreToolUse blocking unauthorized writes) — Phase 4
- Session logging hooks (PostToolUse capturing delegations) — Phase 4
- Agent consolidation decisions (17 → ~10 agents) — Phase 3, informed by Phase 1 learnings
- Observability dashboard (IndyDevDan pattern) — backlog

</deferred>

---

*Phase: 01-foundation-architecture-validation*
*Context gathered: 2026-04-09*

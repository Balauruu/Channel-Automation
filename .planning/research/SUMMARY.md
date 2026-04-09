# Project Research Summary

**Project:** Channel-Automation V0.6 (Pi-to-Claude-Code Migration)
**Domain:** Multi-agent documentary video production pipeline
**Researched:** 2026-04-09
**Confidence:** HIGH

## Executive Summary

Channel-Automation V0.6 is a migration of a 17-agent, 4-team documentary production pipeline from the custom Pi CLI framework to Claude Code native agent ecosystem. The research confirms that Claude Code provides direct or superior equivalents for nearly every Pi capability -- agent personas, skills, memory, delegation, and lifecycle hooks all have native counterparts. The critical architectural shift is that Claude Code subagents cannot spawn other subagents, forcing a collapse from Pi 3-tier hierarchy (orchestrator -> leads -> workers) to a flat 2-tier model (main session -> all agents). This is not a limitation to work around; it is a simplification to embrace.

The recommended approach is a lean 2-tier architecture where the main Claude Code session (guided by CLAUDE.md routing rules) dispatches 8-10 consolidated subagents directly -- not the original 17. Agent consolidation is essential because each subagent initializes its own context window (~33K tokens of overhead), and 17 agents would burn ~561K tokens on initialization alone before doing any work. Consolidation targets: merge each lead with its least-complex workers (Strategy Lead + Market Analyst, Media Lead + Compiler, Meta Lead + Pipeline Observer + Code Reviewer + UX Improver). The feedback propagation system -- identified as the single most important capability to preserve -- must be explicitly engineered using shared project-level feedback files plus per-agent persistent memory, since Claude Code has no built-in cross-agent memory sharing.

The three highest risks are: (1) attempting to replicate the 3-tier delegation model, which will fail silently at runtime; (2) context window bloat from injecting too many skills/expertise files into agent prompts, causing measurable quality degradation; and (3) losing the feedback propagation loop that makes the pipeline improve across runs. All three are preventable with upfront architectural decisions detailed in this summary. Windows path handling on this project (paths with spaces and periods) is a moderate risk requiring early smoke testing.
## Key Findings

### Recommended Stack

Claude Code v2.1.96 provides seven native extension points that collectively replace the entire Pi CLI multi-team layer. No custom runtime, subprocess spawner, config parser, template resolver, or delegation tool is needed. The mapping is direct enough that the migration is primarily a content migration (rewriting agent definitions and skills in Claude Code format) rather than a systems engineering project.

**Core technologies:**
- **Claude Code Subagents** (`.claude/agents/*.md`): Replace Pi agent personas with richer frontmatter (model, memory, tools, hooks, skills, color) and markdown body as system prompt
- **Claude Code Skills** (`.claude/skills/*/SKILL.md`): Replace Pi skill procedures with auto-invocable or user-triggered `/slash-commands`, supporting shell injection for dynamic context
- **Claude Code Memory** (`memory: project` field): Replace Pi YAML mental models with persistent per-agent MEMORY.md files, auto-loaded at startup (200 lines / 25KB cap)
- **Claude Code Hooks** (25 lifecycle events): Replace Pi domain enforcement, session logging, and orchestrator injection with PreToolUse/PostToolUse/SubagentStart/SubagentStop hooks
- **CLAUDE.md + .claude/rules/**: Replace Pi shared context and domain rules with path-scoped instruction files loaded automatically by directory context
- **MCP Servers** (`.mcp.json`): Available for external tool integration but NOT recommended for this project -- Python scripts are invocable directly via Bash tool

**Critical version requirements:** Claude Code v2.1.32+ for SubagentStart/SubagentStop hooks. Agent Teams (experimental) require v2.1.32+ and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` but are NOT recommended for the initial migration.

### Expected Features

**Must have (table stakes) -- Features that define the pipeline:**
- Agent personas with per-agent tool scoping, model selection, and system prompts (DIRECT mapping)
- Orchestrator routing that dispatches to specialized agents based on request type (BETTER -- description-based auto-routing replaces hard-coded routing tables)
- Cross-session persistent memory per agent (BETTER -- native `memory: project` replaces custom YAML loader)
- Skills/procedures for domain-specific workflows (BETTER -- Claude Code skills support shell injection, auto-invocation, and `/slash-commands`)
- Pipeline stage execution via Python script invocation (DIRECT -- Bash tool calls scripts directly)
- Human checkpoints at topic selection and asset review (DIRECT -- main session pauses and presents output)

**Should have (differentiators) -- Features that make the pipeline smart:**
- Feedback propagation (downstream insights influencing upstream behavior) -- PARTIAL, needs shared feedback file protocol
- Domain enforcement (per-agent file-access restrictions) -- PARTIAL, needs PreToolUse hook script
- Session logging (delegation chain tracking) -- PARTIAL, needs PostToolUse hook
- Agent audit validation (`/audit-agents`) -- PARTIAL, needs custom skill + script
- Per-agent cost tracking -- PARTIAL, needs SubagentStop hook

**Defer (v2+):**
- Agent Teams for parallel pipeline stages (experimental, Windows limitations, ~15x token cost)
- Split-pane tmux mode (not available on Windows Terminal)
- Custom MCP server for pipeline tools (unnecessary complexity)
- Active listener pattern (retired -- Claude Code subagents are isolated by design)
### Architecture Approach

The architecture is a user-driven, stage-based pipeline where the main Claude Code session acts as the orchestrator via CLAUDE.md routing rules, dispatching to flat subagents for each pipeline stage. Lead agents become advisory/planning consultants rather than dispatchers. The pipeline is sequential (research -> script -> visuals -> assets -> edit sheet) with two human checkpoints. Feedback propagation uses a dual-layer system: project-level `upstream-signals.json` files for per-project cross-agent signals, and per-agent `MEMORY.md` files for accumulated institutional knowledge across sessions.

**Major components:**
1. **CLAUDE.md Orchestration Layer** -- routing table, context handoff rules, human checkpoint enforcement, GPU script conventions
2. **8-10 Consolidated Subagents** -- self-contained `.claude/agents/*.md` files with frontmatter (tools, model, memory, hooks, skills) and system prompt body
3. **Skills Library** -- `.claude/skills/` for domain procedures (documentary-research, archive-search, visual-narrative, crawl4ai-scraping, feedback-propagation)
4. **Domain Enforcement Hooks** -- PreToolUse hook script validating agent write access against allowed directory map
5. **Feedback Propagation Protocol** -- shared `projects/N/feedback/upstream-signals.json` + per-agent memory + `feedback-propagation.md` skill
6. **Path-Scoped Rules** -- `.claude/rules/` files that auto-load when agents work in specific directories (strategy scripts, editorial scripts, media scripts, channel identity)

### Critical Pitfalls

1. **3-tier delegation will fail silently** -- Subagents cannot spawn subagents. Design flat 2-tier from day one. Leads become advisors, not dispatchers. Detection: if any subagent frontmatter references the Agent tool, it is wrong.

2. **Context window bloat from skill/expertise injection** -- V5 injects ~478 lines of prompt context per agent before conversation begins. Claude Code adds ~33K tokens of system overhead. More than 2-3 skills per agent causes measurable quality degradation. Prevention: classify skills into project-wide rules (fold into CLAUDE.md/rules), domain procedures (keep as skills), and retired (mental-model, active-listener replaced by native features).

3. **Feedback propagation requires explicit engineering** -- No built-in cross-agent memory. Must build shared feedback file protocol with structured signals. Without it, the pipeline regresses to a dumb pipeline where stages cannot learn from each other. This is the project stated core value.

4. **Agent sprawl degrades routing accuracy** -- 17 agent descriptions overwhelm Claude routing decisions. Consolidate to 8-10 agents with non-overlapping descriptions. Use `Agent(type1, type2)` in tools field to restrict spawnable agents.

5. **Windows paths with spaces and periods** -- Project path contains spaces and a period. Known Claude Code bugs with drive letter duplication, cygpath errors, and Git Bash path mangling. Smoke test path handling in Phase 1 before building agents.
## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Architecture Validation
**Rationale:** Everything depends on the delegation model, directory structure, and path handling being correct. A vertical slice (2-3 agents running a mini-pipeline) validates the pattern before committing to all agents.
**Delivers:** CLAUDE.md with routing rules, directory structure, channel identity imports, 2-3 proof-of-concept agent definitions (researcher + writer + one lead), basic memory setup, Windows path smoke test.
**Addresses:** Agent personas (Feature 1), orchestrator routing (Feature 7), shared context (Feature 13), config replacement (Feature 8).
**Avoids:** 3-tier delegation attempt (Pitfall 1), Agent Teams confusion (Pitfall 12), Windows path issues (Pitfall 8).

### Phase 2: Agent Migration and Skills
**Rationale:** Once the pattern is validated with 2-3 agents, remaining agents are mechanical migration. Skills must exist before agents reference them. Agent consolidation decisions (17 -> 8-10) must be finalized here.
**Delivers:** All consolidated agent definitions, migrated skill procedures, seeded agent MEMORY.md files (converted from YAML), retired skills identified and folded into rules.
**Addresses:** Agent personas (Feature 1), skills (Feature 5), mental models (Feature 4), template variable elimination (Feature 11), expertise loading replacement (Feature 12).
**Avoids:** Context bloat from skill injection (Pitfall 2), mental model format incompatibility (Pitfall 3), 1:1 skill conversion (Pitfall 10), session log reimplementation (Pitfall 6).

### Phase 3: Domain Enforcement and Hooks
**Rationale:** Domain enforcement is a safety layer -- get agents working first, then constrain them. Hooks depend on settings.json configuration and a working agent ecosystem to test against.
**Delivers:** PreToolUse domain enforcement hook script, PostToolUse session logging hook, SubagentStart/SubagentStop cost tracking hooks, path-specific rules in `.claude/rules/`, `/audit-agents` validation skill.
**Addresses:** Domain enforcement (Feature 3), session logging (Feature 6), cost tracking (Feature 9), agent audit (Feature 10).
**Avoids:** Domain enforcement gap (Pitfall 5), background agent runaway (Pitfall 15).

### Phase 4: Feedback Propagation
**Rationale:** This is the most architecturally novel feature and the project stated core value. It needs working agents with memory to test against. Cannot validate until agents produce real output across multiple pipeline runs.
**Delivers:** Feedback signal file format (`upstream-signals.json` schema), `feedback-propagation.md` skill injected into all agents, cross-agent memory reading instructions in agent prompts, validated feedback flow (asset-processor -> visual-planner, writer -> researcher).
**Addresses:** Feedback propagation system, cross-agent learning.
**Avoids:** Losing feedback propagation (Pitfall 4), AutoDream disrupting structured data (Pitfall 14).

### Phase 5: Pipeline Integration and End-to-End Testing
**Rationale:** Integration testing requires all components in place. Validates the complete pipeline: topic -> research -> script -> visuals -> assets -> edit sheet. Also validates GPU conda env for CLIP scripts.
**Delivers:** End-to-end pipeline run, Python script invocation validation, GPU conda env testing, cost analysis and agent consolidation adjustments, performance benchmarking.
**Addresses:** All features in integrated context.
**Avoids:** Python invocation pattern breakage (Pitfall 13), token cost explosion (Pitfall 7).
### Phase Ordering Rationale

- **Phase 1 before Phase 2:** The 2-tier delegation model and directory structure are load-bearing decisions. Getting them wrong means rewriting all agent definitions. A vertical slice (researcher + writer) proves the pattern cheaply.
- **Phase 2 before Phase 3:** Agents must exist before hooks can constrain them. Hook scripts reference agent names and allowed directories, which are defined in Phase 2.
- **Phase 3 before Phase 4:** Domain enforcement prevents agents from corrupting each other outputs during the feedback propagation testing in Phase 4.
- **Phase 4 before Phase 5:** Feedback propagation must be validated in isolation before running the full pipeline, or it is impossible to diagnose whether issues come from feedback bugs or pipeline integration bugs.
- **Agent consolidation in Phase 2, not Phase 1:** Phase 1 validates the PATTERN with 2-3 agents. Phase 2 makes the consolidation DECISIONS (17 -> 8-10) based on Phase 1 learnings about context overhead and routing accuracy.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Windows path handling edge cases -- needs smoke testing against actual project paths with spaces and periods. Research the `claude-windows-shell` community plugin.
- **Phase 3:** Hook script development -- the PreToolUse JSON stdin format and exit code semantics are documented but complex. The domain enforcement hook needs careful design for the agent-to-directory mapping.
- **Phase 4:** Feedback propagation protocol design -- no established community pattern exists. This is novel architecture. The `upstream-signals.json` schema and cross-agent memory reading protocol need iterative design.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Agent definition migration is well-documented. The `.claude/agents/*.md` format, `skills` frontmatter, and `memory: project` are all production-stable features with clear official docs.
- **Phase 5:** Python script invocation via Bash tool and end-to-end testing are straightforward integration work.
## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All 7 extension points verified against official Claude Code docs (code.claude.com). Version-pinned to v2.1.96 |
| Features | HIGH | 13 Pi features mapped with clear DIRECT/BETTER/PARTIAL/GAP classifications. Community tools surveyed for gaps |
| Architecture | HIGH | 2-tier flat subagent model is the documented best practice. Feedback propagation design is novel but built on verified primitives (hooks, memory, file I/O) |
| Pitfalls | HIGH | 15 pitfalls identified from official docs, GitHub issues, V5 codebase analysis, and community reports. Quantified risks where possible |

**Overall confidence:** HIGH

### Gaps to Address

- **Agent consolidation roster:** Research recommends 8-10 agents but does not finalize which agents to merge. This decision should be made in Phase 2 after Phase 1 validates context overhead. Candidates: Strategy Lead + Market Analyst, Media Lead + Compiler, Meta Lead + Pipeline Observer + Code Reviewer + UX Improver.
- **Feedback propagation schema:** The `upstream-signals.json` format is proposed but untested. It needs iterative refinement during Phase 4 based on what signals agents actually produce.
- **Windows path stability:** Claude Code Windows support is actively improving. Some documented bugs (drive letter duplication, cygpath) may be fixed by implementation time. Smoke test early.
- **Background agent behavior:** GitHub issue #41461 reports uncontrollable background agents. Mitigation is to avoid `background: true` entirely, but this may limit future parallel execution options.
- **Agent Teams maturity:** Experimental feature deferred to v2+. Re-evaluate when Claude Code stabilizes the feature and adds Windows Terminal support.
## Sources

### Primary (HIGH confidence)
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents) -- agent definitions, nesting limitations, memory, tool restrictions
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks) -- 25 lifecycle events, PreToolUse blocking, handler types
- [Claude Code Skills](https://code.claude.com/docs/en/skills) -- skill format, invocation controls, shell injection
- [Claude Code Memory](https://code.claude.com/docs/en/memory) -- CLAUDE.md, auto-memory, MEMORY.md, agent-scoped memory
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) -- experimental parallel coordination
- [Claude Code Settings](https://code.claude.com/docs/en/settings) -- configuration precedence, permissions
- [Claude Code Costs](https://code.claude.com/docs/en/costs) -- token management, per-model pricing

### Secondary (MEDIUM confidence)
- [MindStudio context rot analysis](https://www.mindstudio.ai/blog/context-rot-claude-code-skills-bloated-files) -- quality degradation measurements past 3 skills
- [ClaudeFast context buffer analysis](https://claudefa.st/blog/guide/mechanics/context-buffer-management) -- 33K-45K token overhead, progressive disclosure benefits
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code) -- community plugin and tool survey
- [CC Audit Log](https://github.com/yurukusa/cc-audit-log), [CCUsage](https://github.com/ryoppippi/ccusage), [Claude Memory Compiler](https://github.com/coleam00/claude-memory-compiler) -- community solutions for gaps
- GitHub Issues #8265, #6578, #15471, #20118, #33045, #41461, #32731 -- Windows paths, background agents, worktree isolation

### Tertiary (LOW confidence)
- [Nested-subagent plugin](https://github.com/gruckion/nested-subagent) -- community workaround for subagent nesting (not recommended)
- [Claude-windows-shell](https://github.com/nicoforclaude/claude-windows-shell) -- Windows path handling fixes (untested for this project)

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*

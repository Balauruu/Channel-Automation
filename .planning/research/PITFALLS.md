# Domain Pitfalls: Pi-to-Claude-Code Multi-Agent Migration

**Domain:** Multi-agent CLI pipeline migration (17 agents, 4 teams)
**Researched:** 2026-04-09
**Overall confidence:** HIGH (official docs verified, GitHub issues cross-referenced, V5 codebase analyzed)

---

## Critical Pitfalls

Mistakes that cause rewrites, abandoned approaches, or fundamental architecture failures.

---

### Pitfall 1: Attempting 3-Tier Delegation (Orchestrator -> Lead -> Worker)

**What goes wrong:** Pi V5 uses 3-tier delegation: orchestrator delegates to team leads, leads delegate to workers. Claude Code subagents cannot spawn other subagents — this is a hard architectural constraint. Attempting to replicate the 3-tier hierarchy will fail silently (the Agent tool is simply not available inside subagents).

**Why it happens:** The V5 `delegate-tool.ts` has explicit 3-tier routing — `isLeadSubprocess` branches that detect whether the current process is a lead or orchestrator, then route to workers or leads respectively. This branching logic has no Claude Code equivalent. Developers instinctively try to map the existing hierarchy 1:1.

**Consequences:** If you build 17 agent definitions expecting leads to dispatch workers, leads will be unable to call workers at all. The entire pipeline stalls at the lead level. You discover this only at runtime after building all agent definitions.

**Prevention:**
- Accept the flat/2-tier constraint from day one. The main session (or an agent launched with `claude --agent orchestrator`) CAN spawn subagents via the Agent tool. Those subagents CANNOT spawn further subagents.
- Restructure as hub-and-spoke: the orchestrator/main agent dispatches directly to ALL agents (leads and workers alike). Lead agents become "advisory" — their prompts inform the orchestrator's routing decisions, but they don't dispatch workers themselves.
- Alternatively, consolidate: merge lead + worker into fewer, more capable agents. A "Strategy Agent" replaces both Strategy Lead and Market Analyst. An "Editorial Research Agent" replaces both Editorial Lead and Researcher.
- The community `nested-subagent` plugin exists (spawns isolated `claude -p` processes) but adds complexity, cost, and fragility. Avoid it for production pipelines.

**Detection:** If you find yourself writing agent definitions that reference the Agent tool inside subagent frontmatter — stop. `Agent(agent_type)` in the `tools` field only works for agents running as the main thread via `claude --agent`.

**Phase mapping:** Must be resolved in Phase 1 (Architecture). Every subsequent phase depends on getting the delegation model right.

**Confidence:** HIGH — verified in official docs: "Subagents cannot spawn other subagents" (code.claude.com/docs/en/sub-agents). The Plan built-in agent explicitly exists because of this constraint.

---

### Pitfall 2: Context Window Bloat from Expertise/Skills Injection

**What goes wrong:** Pi V5 injects expertise YAML files AND skill markdown files directly into each agent's system prompt via template variables (`{{EXPERTISE_BLOCK}}`, `{{SKILLS_BLOCK}}`). The V5 codebase has 3,633 lines / 134KB across agent definitions, expertise files, and skills. Claude Code's subagent system prompt is the ONLY prompt the subagent sees (not the full Claude Code system prompt), but it still must fit within the context window alongside the working conversation. Bloated prompts degrade performance before hitting the hard limit.

**Why it happens:** Pi V5's `expertise-loader.ts` concatenates all expertise and skill files into the system prompt with a `max-lines: 10000` safety valve. When migrating, the instinct is to replicate this by stuffing everything into the subagent markdown body. Claude Code adds its own overhead: CLAUDE.md files, auto-memory MEMORY.md (first 200 lines), tool definitions, and MCP schemas consume 30,000-40,000 tokens before any agent prompt loads.

**Quantified risk for this project:**
- The `mental-model.md` skill (48 lines) is loaded by ALL 17 agents.
- The `active-listener.md` skill (44 lines) is loaded by ALL 17 agents.
- The `precise-worker.md` skill (43 lines) is loaded by 12 agents.
- The `karpathy-autoresearch.md` skill (560 lines) loads for the researcher agent alone.
- Read-only expertise files range from 28-264 lines each.
- An agent like `visual-planner` loads: its 101-line definition + mental-model (48) + active-listener (44) + precise-worker (43) + structured-output (60) + verification-first (49) + archive-search (44) + visual-planner-mm.yaml (19) + youtube-evaluation.md (70) = ~478 lines of prompt context before any conversation begins.

**Consequences:** Performance degradation starts around 147K-152K tokens, not the 200K limit. "Context rot" — the model's attention is distributed across all content simultaneously, and noisy background files reduce accuracy on the actual task. Past 3 injected skills, quality visibly degrades on complex tasks. At 8-10 skills, Claude starts second-guessing itself.

**Prevention:**
- Use Claude Code's `skills` frontmatter field to preload ONLY the 1-2 most critical skills per agent. Skills are injected at startup, not loaded lazily.
- Convert shared behavioral skills (`mental-model`, `active-listener`, `precise-worker`) into CLAUDE.md rules or `.claude/rules/` path-specific files instead of per-agent injection. These are project-wide conventions, not agent-specific expertise.
- Use Claude Code's `memory` frontmatter (scoped to `project` or `local`) for the mental model YAML files instead of injecting them as system prompt text. The MEMORY.md approach gives agents persistent memory with a 200-line/25KB cap that auto-curates.
- Move read-only expertise files into `.claude/rules/` with `paths` frontmatter so they only load when Claude reads files in relevant directories, not at every session start.
- Keep each subagent's markdown body under 150 lines. Use `@path` imports in CLAUDE.md for shared context rather than duplicating across agents.

**Detection:** Run `/context` in a session — it now shows context-heavy tools, memory bloat, and capacity warnings. If any agent's startup context exceeds 40% of the window, it's too large.

**Phase mapping:** Phase 1 (Architecture) for the structural decisions. Phase 2 (Implementation) for actually writing the lean agent definitions.

**Confidence:** HIGH — official docs state "200 lines per CLAUDE.md" target; context rot is well-documented in MindStudio analyses and ClaudeFast's measurements showing 82% improvement from progressive disclosure vs. upfront loading.

---

### Pitfall 3: Mental Model (YAML) Format Incompatibility with Agent Memory

**What goes wrong:** Pi V5 mental models are structured YAML files (`*-mm.yaml`) with typed sections: `system`, `key_files`, `decisions`, `patterns`, `observations`, `open_questions`. Claude Code's agent memory system is a flat markdown file (`MEMORY.md`) with no enforced schema. Simply copying YAML files into `.claude/agent-memory/` directories won't work — the memory system expects markdown and auto-injects the first 200 lines of `MEMORY.md`.

**Why it happens:** Pi V5's `mental-model.md` skill teaches agents a specific YAML format and update protocol. The `expertise-loader.ts` reads these files and injects them wholesale. Claude Code has its own memory paradigm: markdown-based, auto-curated by AutoDream (the between-session memory consolidation system), and fundamentally text-oriented rather than structured-data-oriented.

**Consequences:** If you copy YAML mental models directly, agents may: (a) fail to parse them effectively since Claude Code's memory injection expects prose-style markdown, (b) overwrite them with markdown-formatted updates that break YAML syntax, (c) ignore them entirely since they don't match the expected MEMORY.md entrypoint pattern.

**Prevention:**
- Convert mental model YAML to markdown format during migration. Transform `decisions: []` arrays into `## Decisions` sections with bullet points.
- Use Claude Code's native `memory: project` or `memory: local` in subagent frontmatter. This creates a `MEMORY.md` per agent at `.claude/agent-memory/<agent-name>/MEMORY.md`.
- For the initial migration, pre-populate each agent's `MEMORY.md` with converted content from the YAML files. Only agents with actual accumulated knowledge need conversion (most V5 mental models are empty seed files).
- Write agent instructions that teach the Claude Code memory update protocol (read MEMORY.md at start, update at end) — but this is already built into Claude Code's memory system when `memory:` is set.

**Detection:** If agents produce YAML in their MEMORY.md files, or if MEMORY.md files grow beyond 200 lines without topic-file splitting, the format migration was incomplete.

**Phase mapping:** Phase 2 (Agent Definition Migration). Convert formats before building agent definitions.

**Confidence:** HIGH — verified in official docs: "The first 200 lines or 25KB of MEMORY.md are loaded at session start" and "Claude reads and writes memory files during your session."

---

### Pitfall 4: Losing Feedback Propagation (The Core Value)

**What goes wrong:** The PROJECT.md explicitly states: "Cross-agent feedback propagation (downstream insights influencing upstream behavior) is the single most important capability to preserve." Pi V5 achieves this through updatable mental model YAML files — a downstream agent (e.g., asset-processor) writes observations to its expertise file, which a subsequent upstream agent (e.g., visual-planner) reads in its next invocation. In Claude Code, subagents run in isolated context windows. There is no automatic mechanism for Agent B's output to modify Agent A's behavior in a subsequent run.

**Why it happens:** Pi V5's feedback loop is implicit: expertise files are read from disk into system prompts on each invocation. If a worker updates its YAML, that update is visible to any agent that reads it next. Claude Code's subagent memory is scoped per-agent — `visual-planner`'s MEMORY.md is independent from `asset-processor`'s MEMORY.md. There is no shared memory bus.

**Consequences:** Without feedback propagation, the pipeline regresses to a "dumb pipeline" where each stage operates independently. The asset-processor learns that certain search queries produce low-quality results, but the visual-planner keeps generating those same queries. The writer discovers that certain narrative structures work poorly for the channel, but the researcher keeps building dossiers optimized for those structures.

**Prevention:**
- Design a shared feedback file (e.g., `pipeline-feedback.md` or `pipeline-feedback.json`) in the project directory that all agents can read and specific agents can write to.
- Use Claude Code hooks (`PostToolUse` on Write) to detect when agents write to the feedback file and propagate context.
- Alternatively, use a dedicated `feedback-store` directory where each agent writes observations to named files: `asset-processor-feedback.md`, `writer-feedback.md`, etc. Upstream agents include instructions to read relevant downstream feedback files at task start.
- The orchestrator/main agent can read feedback files and inject relevant insights into the prompt when dispatching subagents — this replicates the Pi V5 pattern where expertise blocks were injected at delegation time.
- Consider using `.claude/rules/` path-specific rules that trigger when agents work in `projects/` directories, loading accumulated pipeline insights automatically.

**Detection:** After 3+ pipeline runs, check whether upstream agents show evidence of incorporating downstream lessons. If visual-planner keeps generating the same search queries despite asset-processor flagging them as ineffective, feedback propagation is broken.

**Phase mapping:** Phase 1 (Architecture) for the mechanism design. Phase 3 (Integration) for validation that it actually works across pipeline runs.

**Confidence:** HIGH — this is the project's stated core value and the research confirms there is no built-in cross-agent memory sharing in Claude Code. Must be engineered explicitly.

---

### Pitfall 5: No Domain Enforcement Equivalent

**What goes wrong:** Pi V5's `domain-enforcer.ts` is a sophisticated file-access control system: each agent has explicit `domain` rules declaring which paths it can read, write (upsert), and delete. The domain enforcer intercepts `write` and `edit` tool calls and blocks operations outside the agent's allowed scope. Claude Code has no built-in per-agent file-access scoping — any subagent that has Write/Edit tools can write anywhere in the project.

**Why it happens:** Pi V5 domain rules are critical for the multi-team setup: the orchestrator can only write to `.pi/multi-team/`, workers can write to their session directory and `projects/`, but nobody can accidentally overwrite root config files. Without domain enforcement, a media agent could overwrite an editorial agent's script, or a meta agent could modify production Python scripts.

**Consequences:** Agent cross-contamination — agents modify files outside their functional area, causing subtle bugs. Race conditions when multiple agents operate on the same pipeline run. Loss of the safety guarantee that made it comfortable to run agents with write access.

**Prevention:**
- Use Claude Code's `PreToolUse` hooks to replicate domain enforcement. Create a hook script (`.claude/hooks/domain-enforcer.sh` or `.js`) that reads the agent's allowed paths from a config file and blocks Write/Edit operations outside those paths.
- The hook receives JSON on stdin including `tool_input.file_path` — you can resolve paths and check against allowed domains exactly like V5's `isBlockedByDomain()`.
- Use exit code 2 to block unauthorized writes (this is the official blocking mechanism).
- For read-only agents (orchestrator, pipeline-observer), use `tools: Read, Grep, Glob` in frontmatter and omit Write/Edit entirely.
- For scoped-write agents, use `PreToolUse` hooks defined in the agent's `hooks` frontmatter (hooks scoped to the subagent's lifetime only).
- Start with tool restriction (simpler) and add path-based enforcement (hooks) only where agents need Write access to some paths but not others.

**Detection:** If an agent writes to a path outside its functional area (e.g., media agent editing `channel/channel.md`), domain enforcement is missing.

**Phase mapping:** Phase 2 (Agent Definition Migration) for tool restrictions. Phase 3 (Integration) for the hook-based path enforcement.

**Confidence:** HIGH — Claude Code's hook system with PreToolUse and exit code 2 blocking is well-documented and explicitly designed for this use case.

---

## Moderate Pitfalls

Issues that cause significant rework or degraded experience but don't require full architecture changes.

---

### Pitfall 6: Session/Conversation Log Migration Gap

**What goes wrong:** Pi V5's `session-manager.ts` creates timestamped session directories with JSONL conversation logs. Every delegation is logged with `from`, `to`, `content`, and `timestamp`. The `active-listener.md` skill instructs all 17 agents to "Read the conversation log before every response." Claude Code has no equivalent of a cross-agent conversation log. Each subagent runs in its own isolated context and has no visibility into what other subagents said.

**Why it happens:** Claude Code subagents are designed as isolated units. The main conversation sees subagent results as tool responses, but subagents don't see each other's output. The V5 conversation log was a coordination mechanism masquerading as a logging feature.

**Prevention:**
- The orchestrator/main agent naturally sees all subagent responses in its context window. Use the orchestrator as the "conversation log" — it accumulates all delegation results.
- For cross-run persistence, have the orchestrator write a session summary to a markdown file in the project directory after each pipeline stage.
- Do NOT try to replicate the JSONL conversation log inside Claude Code. The per-subagent isolation is a feature, not a bug — it prevents context window bloat.
- The `active-listener` skill should be retired entirely. Its purpose was to maintain coherence across the shared conversation log, which doesn't exist in Claude Code's model.

**Detection:** If you find yourself building a JSONL-writing mechanism for subagents, you're reimplementing Pi's model inside Claude Code. Stop and rethink.

**Phase mapping:** Phase 2 (Agent Definition Migration). Retire `active-listener.md` and redesign the coordination pattern.

**Confidence:** HIGH — verified in Claude Code docs: subagents run in their own context window.

---

### Pitfall 7: Token Cost Explosion from Multi-Agent Architecture

**What goes wrong:** Multi-agent setups in Claude Code use 4-7x more tokens than single-agent sessions. Agent Teams (parallel agents) use approximately 15x standard usage. With 17 agents in the V5 system, naively replicating this in Claude Code means each pipeline run could cost 10-20x what a single-agent session costs. Each subagent starts with a fresh context window, meaning shared context (CLAUDE.md, project files, expertise) is re-read by every agent.

**Why it happens:** Pi V5's delegate-tool tracked per-agent token usage and cost. That cost was already significant. Claude Code adds overhead: each subagent loads its own CLAUDE.md, rules, auto-memory, and tool definitions. With 17 agents, that's 17 separate context window initializations per pipeline run.

**Quantified risk:** If the base system prompt + CLAUDE.md + memory consumes ~33K tokens per agent, 17 agents burn ~561K tokens just on initialization overhead — before any actual work.

**Prevention:**
- Consolidate agents aggressively. Not all 17 V5 agents need to be separate Claude Code subagents. Target 6-8 agents maximum.
- Candidates for consolidation:
  - Strategy Lead + Market Analyst -> `strategy` agent
  - Editorial Lead + Writer -> `editorial-writer` agent (researcher stays separate due to distinct tooling)
  - Media Lead + Compiler -> `media-coordinator` agent
  - Meta Lead + Pipeline Observer + Code Reviewer + UX Improver -> `meta` agent
- Use model routing: Haiku for read-only exploration agents, Sonnet for most workers, Opus only for the orchestrator. Claude Code supports per-agent `model` in frontmatter.
- Use `maxTurns` in agent frontmatter to limit runaway agents.
- Set `effort: low` or `effort: medium` for straightforward agents; reserve `effort: high` or `effort: max` for complex reasoning.

**Detection:** Monitor `/cost` after pipeline runs. If a single pipeline stage exceeds your budget expectations, identify which agents consumed the most and consolidate.

**Phase mapping:** Phase 1 (Architecture) for consolidation decisions. Revisit after Phase 3 (Integration) based on actual cost data.

**Confidence:** HIGH — token cost multipliers documented by ClaudeFast, MorphLLM, and Anthropic's own cost management docs.

---

### Pitfall 8: Windows Path Handling in Claude Code

**What goes wrong:** Claude Code on Windows has documented path handling bugs: drive letter duplication (Issue #8265), cygpath command not found in PowerShell (Issue #20118), MINGW/POSIX path format conflicts with Windows APIs, and variable expansion bugs where bash pre-processes PowerShell commands. This project runs on Windows 11 with paths containing spaces (`D:\Youtube\D. Mysteries Channel\...`) and uses conda environments at `C:/Users/iorda/miniconda3/envs/...`.

**Why it happens:** Claude Code was originally Unix-first. Windows support has improved but still has edge cases, especially with: paths containing spaces, drive letter casing, Git Bash vs PowerShell shell detection, and subagent working directory resolution.

**Specific risks for this project:**
- Project path `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V0.6` contains spaces and a period. Both are known to trigger path bugs.
- Python scripts invoked via Bash tool need conda env activation: `C:/Users/iorda/miniconda3/envs/perception-models/python.exe` — this absolute path with forward slashes may be mangled by shell translation layers.
- The VideoLibrary at `D:/VideoLibrary/` needs to be accessible to media agents.

**Prevention:**
- Set `CLAUDE_CODE_GIT_BASH_PATH` in settings if Claude Code can't find Git Bash.
- In agent instructions that invoke Python scripts, use the full absolute path to the conda Python executable rather than relying on `conda activate`.
- Quote all file paths in Bash commands. Include explicit instructions in CLAUDE.md: "Always quote paths with double quotes in Bash commands."
- Add a `.claude/rules/windows-paths.md` rule file with path handling conventions.
- Test path handling early in Phase 2 with a smoke test: have an agent read a file from the project directory, write to the projects/ subdirectory, and invoke a Python script — all in one delegation.
- Consider using the `claude-windows-shell` community plugin for additional path safety.

**Detection:** `ENOENT` errors, "file not found" when the file clearly exists, or doubled drive letters in error messages (`D:D:\...`).

**Phase mapping:** Phase 1 (Setup) — establish path conventions and test them before building agents. Must be validated early since it affects every subsequent phase.

**Confidence:** MEDIUM — bugs are documented in GitHub issues, but Claude Code's Windows support is actively improving. Some issues may be fixed by the time implementation begins.

---

### Pitfall 9: Agent Sprawl — Too Many Specialized Agents

**What goes wrong:** Porting all 17 Pi V5 agents as 17 Claude Code subagents creates agent sprawl: the orchestrator must choose among too many options, delegation overhead dominates actual work time, and Claude's routing decisions become unreliable with more than 5-7 agent descriptions to evaluate.

**Why it happens:** In Pi V5, agent specialization was cheap — each agent was a process spawned by `runSync()` with explicit routing tables. The delegate-tool had hard-coded routing (`routingTable`, `workerRoutingTable`), so routing was deterministic. In Claude Code, the orchestrator uses the Agent tool and must CHOOSE which subagent to delegate to based on descriptions. With 17 descriptions, the model's routing accuracy drops.

**Consequences:** The orchestrator delegates to the wrong agent, the wrong agent does suboptimal work, the orchestrator has to retry. Or the orchestrator tries to handle everything itself rather than dealing with 17 routing options.

**Prevention:**
- Target 6-8 custom subagents, not 17. Group by pipeline stage, not organizational role.
- Write extremely clear, non-overlapping `description` fields. "Helper agent" won't work — Claude needs unambiguous routing signals.
- Use `Agent(type1, type2, ...)` in the orchestrator's `tools` field to restrict which subagents it can spawn. This puts a hard allowlist on routing.
- If certain agents should only be invoked in sequence (e.g., visual-planner THEN asset-processor), encode that in the orchestrator's prompt rather than relying on Claude to figure out the ordering.

**Detection:** If the orchestrator delegates a research task to a media agent, or a visual task to the editorial agent, the descriptions are too ambiguous or there are too many options.

**Phase mapping:** Phase 1 (Architecture) — decide the final agent roster before building anything.

**Confidence:** HIGH — community consensus and Claude Code docs both recommend clear, non-overlapping descriptions. The "vague description" pitfall is explicitly documented.

---

### Pitfall 10: Skill Files Converted 1:1 Instead of Rearchitected

**What goes wrong:** V5 has 17 skill files, many shared across agents (mental-model: 17 agents, active-listener: 17 agents, precise-worker: 12 agents). Converting each skill file into a Claude Code skill and loading all of them per agent replicates the context bloat problem with a different file format.

**Why it happens:** The natural migration instinct is to create `.claude/skills/mental-model.md`, `.claude/skills/active-listener.md`, etc. and list them in each agent's `skills` frontmatter. This looks like a clean 1:1 mapping but ignores that Claude Code skills are injected in full — they're not lazy-loaded like on-demand documentation.

**Prevention:**
- Classify each V5 skill by its actual function:
  - **Project-wide conventions** (mental-model, active-listener, conversational-response, zero-micro-management, high-autonomy, precise-worker): Convert to CLAUDE.md rules or `.claude/rules/` files. These are behavioral patterns that should apply globally, not per-agent.
  - **Domain-specific procedures** (karpathy-autoresearch, crawl4ai-scraping, archive-search, media-evaluation, visual-narrative, data-analysis): Convert to Claude Code skills with clear invocation triggers. These load on-demand.
  - **Workflow procedures** (doc-sync-workflow, skill-observation): Evaluate whether Claude Code's native features (auto-memory, hooks) already cover these. Likely retire.
  - **Output formatting** (structured-output, verification-first): Embed directly in relevant agent definitions as concise instructions.
- The `active-listener` skill should be RETIRED entirely (see Pitfall 6).
- The `mental-model` skill should be RETIRED — replaced by Claude Code's native `memory: project` system.

**Detection:** If more than 2-3 skills are listed in any agent's `skills` frontmatter, you're overloading the agent's context.

**Phase mapping:** Phase 2 (Agent Definition Migration). Classify before converting.

**Confidence:** HIGH — MindStudio research shows quality degradation past 3 skills; ClaudeFast's progressive disclosure approach recovers 15K tokens per session.

---

## Minor Pitfalls

Issues that cause friction or suboptimal results but are easily corrected.

---

### Pitfall 11: CLAUDE.md Bloat from Imported Channel Context

**What goes wrong:** V5's `shared_context` loads `README.md`, `AGENTS.md`, and `channel/channel.md` for all agents. The instinct is to put `@channel/channel.md` and `@AGENTS.md` imports in the project's CLAUDE.md. If `channel.md` is large (voice profiles, visual style guides, content guidelines), this consumes tokens on every session start for every agent, even those that don't need channel context.

**Prevention:**
- Use `.claude/rules/` with path-specific loading: create `.claude/rules/channel-context.md` with `paths: ["projects/**/*"]` so channel context only loads when agents work in the projects directory.
- Keep the root CLAUDE.md under 200 lines — use it for build commands, path conventions, and agent routing only.
- Channel identity docs should be available but not pre-loaded into every agent's context.

**Phase mapping:** Phase 2 (Setup).

---

### Pitfall 12: Agent Teams vs. Subagents Confusion

**What goes wrong:** Claude Code has TWO multi-agent paradigms: **subagents** (run within a single session, dispatched via the Agent tool, isolated context windows) and **agent teams** (multiple separate Claude Code sessions coordinating via shared task lists and messaging). Choosing the wrong paradigm leads to fundamental architecture mismatches.

**Why it happens:** Agent teams are experimental, require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, use git worktrees for isolation, and all teammates run the same model (Opus). Subagents are stable, support per-agent model selection, and run within the main session.

**Prevention:**
- Use **subagents** for the pipeline orchestration pattern (orchestrator dispatches to specialists sequentially). This maps to V5's delegation model.
- Use **agent teams** only if you later want parallel execution of independent pipeline stages (e.g., editorial and media teams working simultaneously on different aspects of the same project).
- Do NOT start with agent teams. Start with subagents, validate the pipeline works, then optionally upgrade specific stages to parallel execution via agent teams.

**Phase mapping:** Phase 1 (Architecture) decision.

**Confidence:** HIGH — official docs clearly distinguish the two paradigms.

---

### Pitfall 13: Overwriting V5 Python Script Invocation Patterns

**What goes wrong:** V5 agents invoke Python scripts through specific CLI patterns (e.g., `python -m editorial.researcher.cli survey`, `python strategy/cli.py analyze`). When writing new agent definitions, there's a risk of changing these invocation patterns or assuming conda activation works differently in Claude Code's Bash tool.

**Prevention:**
- Document exact invocation commands in CLAUDE.md or agent-specific rules.
- Use absolute paths to conda Python executables in agent instructions: `C:/Users/iorda/miniconda3/envs/perception-models/python.exe` for GPU scripts.
- Test every Python script invocation through Claude Code's Bash tool early. Claude Code's Bash tool on Windows uses Git Bash by default, which may handle paths differently than PowerShell.
- The constraint is: "Python scripts stay as-is, only invocation layer changes." Enforce this by never editing files under `strategy/`, `editorial/`, `media/` directories.

**Phase mapping:** Phase 2 (early integration testing).

---

### Pitfall 14: AutoDream Memory Consolidation Disrupting Structured Data

**What goes wrong:** Claude Code's AutoDream system (between-session memory consolidation) runs automatically and reorganizes MEMORY.md files. If agents store structured data (JSON snippets, YAML, specific formats) in their memory, AutoDream may rewrite it into prose, losing the structure.

**Prevention:**
- For structured persistent data (e.g., a visual-planner's equilibrium rule adjustments, or an asset-curator's library index), use project files in dedicated directories rather than agent memory. Agent memory is for prose-style knowledge, not structured data.
- Reserve MEMORY.md for actual "soft knowledge": patterns observed, decisions made, gotchas learned.
- Store structured operational data in `projects/` or a dedicated `.pipeline/` directory that agents read via Read tool.

**Phase mapping:** Phase 3 (Integration testing).

---

### Pitfall 15: Background Agents Burning Tokens Uncontrollably

**What goes wrong:** Claude Code subagents support `background: true` in frontmatter, which runs them as background tasks. A reported critical issue (GitHub #41461) documents background agents that cannot be stopped, with Claude lying about stopping them, causing massive token waste (~1.4M tokens) with inconsistent behavior.

**Prevention:**
- Do NOT use `background: true` for pipeline agents. All pipeline stages should run in the foreground where the user can monitor and interrupt.
- Use `maxTurns` in every agent definition to cap execution length. Start conservative (10-15 turns) and increase based on observed needs.
- Use `effort: medium` as default; only use `effort: high` or `effort: max` for agents that demonstrably need deep reasoning.

**Phase mapping:** Phase 2 (Agent Definition Migration) — set `maxTurns` on all agents.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Architecture | Attempting 3-tier delegation (Pitfall 1) | Design flat/2-tier from day one; consolidate to 6-8 agents |
| Phase 1: Architecture | Agent Teams vs. Subagents confusion (Pitfall 12) | Start with subagents only |
| Phase 1: Architecture | Token cost explosion (Pitfall 7) | Plan agent consolidation; set model routing strategy |
| Phase 2: Agent Migration | Context bloat from skill injection (Pitfall 2) | Classify skills; use rules/ for conventions, skills for procedures |
| Phase 2: Agent Migration | Mental model format incompatibility (Pitfall 3) | Convert YAML to markdown MEMORY.md format |
| Phase 2: Agent Migration | 1:1 skill conversion (Pitfall 10) | Retire shared behavioral skills; use CLAUDE.md rules |
| Phase 2: Agent Migration | Session log reimplementation (Pitfall 6) | Retire active-listener; use orchestrator as context hub |
| Phase 2: Agent Migration | Windows path issues (Pitfall 8) | Smoke test paths early; set conventions in CLAUDE.md |
| Phase 3: Integration | Feedback propagation loss (Pitfall 4) | Implement shared feedback files; validate across 3+ runs |
| Phase 3: Integration | Domain enforcement gap (Pitfall 5) | Build PreToolUse hook scripts; test with cross-domain writes |
| Phase 3: Integration | AutoDream disrupting structured data (Pitfall 14) | Separate structured data from agent memory |
| Phase 3: Integration | Background agent runaway (Pitfall 15) | Always foreground; always set maxTurns |

---

## Sources

### Official Documentation (HIGH confidence)
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents) — Agent definition format, nesting limitations, memory, tool restrictions
- [Hooks reference](https://code.claude.com/docs/en/hooks) — PreToolUse blocking, exit code 2, handler types
- [How Claude remembers your project](https://code.claude.com/docs/en/memory) — CLAUDE.md, auto-memory, MEMORY.md constraints
- [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams) — Agent Teams paradigm
- [Manage costs effectively](https://code.claude.com/docs/en/costs) — Token cost management

### GitHub Issues (HIGH confidence)
- [Issue #8265: CLI Path Duplication on Windows](https://github.com/anthropics/claude-code/issues/8265)
- [Issue #6578: Windows path parsing error](https://github.com/anthropics/claude-code/issues/6578)
- [Issue #15471: Windows Shell Compatibility](https://github.com/anthropics/claude-code/issues/15471)
- [Issue #20118: cygpath command not found](https://github.com/anthropics/claude-code/issues/20118)
- [Issue #33045: Agent worktree isolation not working](https://github.com/anthropics/claude-code/issues/33045)
- [Issue #41461: Background agents uncontrollable token waste](https://github.com/anthropics/claude-code/issues/41461)
- [Issue #32731: Teammates have fewer tools than subagents](https://github.com/anthropics/claude-code/issues/32731)

### Community Analysis (MEDIUM confidence)
- [Context rot in Claude Code skills](https://www.mindstudio.ai/blog/context-rot-claude-code-skills-bloated-files) — Skill bloat degradation measurements
- [Claude Code context buffer analysis](https://claudefa.st/blog/guide/mechanics/context-buffer-management) — 33K-45K token overhead measurements
- [How Claude Code builds a system prompt](https://www.dbreunig.com/2026/04/04/how-claude-code-builds-a-system-prompt.html) — System prompt composition analysis
- [Shipyard multi-agent orchestration](https://shipyard.build/blog/claude-code-multi-agent/) — Multi-agent coordination pitfalls
- [Nested-subagent plugin](https://github.com/gruckion/nested-subagent) — Community workaround for nesting (not recommended)
- [Claude-windows-shell utilities](https://github.com/nicoforclaude/claude-windows-shell) — Windows path handling fixes

### V5 Codebase Analysis (HIGH confidence — direct inspection)
- 17 agent definitions: 1,506 lines total, 75-108 lines each
- 17 mental model YAML seeds: mostly empty (19 lines each)
- 17 skill files: 1,821 lines total, 36-560 lines each
- 11 read-only expertise files: 1,489 lines total, 28-264 lines each
- Shared skill frequency: mental-model (17/17), active-listener (17/17), precise-worker (12/17)
- Total injectable content: 3,633 lines / 134KB across all files

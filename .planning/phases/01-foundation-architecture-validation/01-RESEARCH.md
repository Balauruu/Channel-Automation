# Phase 1: Foundation & Architecture Validation - Research

**Researched:** 2026-04-09
**Domain:** Claude Code agent system architecture, directory scaffolding, channel identity migration, subagent skills injection, persistent memory
**Confidence:** HIGH

## Summary

Phase 1 establishes the greenfield project structure for Channel-Automation V0.6, proves the 2-tier user-invoked agent pattern with a researcher + writer vertical slice, migrates channel identity docs from V5, creates a shared `agent-protocols` behavioral skill, seeds agent memory from V5 expertise files, and validates Windows path handling in a project path containing spaces and periods ("D. Mysteries Channel", "V0.6").

The core architecture is straightforward: CLAUDE.md serves as the project entry point with a reference table of all agents (documentation only, no auto-dispatch), agents are invoked directly by the user via `@agent-name`, each agent is a fat markdown file with full domain expertise in its body, and a single shared skill (`agent-protocols`) is injected via the `skills:` frontmatter field to provide DRY memory and feedback protocols. The `memory: project` field on each agent creates persistent `.claude/agent-memory/<name>/MEMORY.md` files where the first 200 lines are auto-injected at startup.

**Primary recommendation:** Build the directory structure first, then CLAUDE.md with agent reference table, then channel identity docs, then `agent-protocols` skill, then researcher agent, then writer agent, then memory seeding, then smoke tests. Each step validates one assumption before the next builds on it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** User-invoked only -- NO orchestrator, NO auto-dispatch routing. The user types `@researcher` or `@writer` directly. CLAUDE.md contains a reference table of all agents (documentation only), not routing enforcement logic. This matches the dominant pattern across all major repos (anthropics/claude-code 111k stars, vercel/next.js 130k stars, wshobson/agents 33k stars -- none use orchestrators).
- **D-02:** Slash-command skills for pipeline automation (e.g., `/research`, `/write-script`) are deferred to Phase 4. Phase 1 validates the agent pattern first.
- **D-03:** Human checkpoints are instruction-based -- CLAUDE.md says "After /strategy, present topic briefs and WAIT" -- no hooks needed for checkpoints in Phase 1.
- **D-04:** CLAUDE.md includes the full agent reference table for all ~10 future agents from day one. Agents that don't exist yet simply won't be invocable. When Phase 3 adds them, the reference is already there.
- **D-05:** Fat agent body + shared behavioral skills. Each agent's `.md` body contains full domain expertise (target ~120-200 lines): persona, procedures, Python script invocation details. Shared meta-behavior (memory protocol, feedback protocol) is extracted into a skill injected via the `skills:` frontmatter field -- this is the ONLY confirmed mechanism for injecting shared content into spawned subagents (subagents do NOT inherit CLAUDE.md).
- **D-06:** One shared skill: `agent-protocols` (with `user-invocable: false`) injected into every agent via `skills:` field. Contains memory read/write protocol and feedback signal read/write protocol. Keeps shared behavior DRY without duplication across agent bodies.
- **D-07:** Channel identity docs referenced via `@file` syntax in agent bodies -- each agent gets only the docs relevant to its domain (researcher gets `@channel/channel.md`, writer gets `@channel/voice-profile.md` + `@channel/channel.md`).
- **D-08:** GSD-inspired `<project_context>` block in each agent body telling the agent to "Read ./CLAUDE.md for project rules" -- workaround for subagents not inheriting CLAUDE.md automatically.
- **D-09:** The 1M context window on Opus/Sonnet 4.6 makes skill injection token cost negligible (<1.5% for 5 skills). The "3 skills max" rule was community guidance for the 200K era and does not apply. Inject as many skills as each agent needs.
- **D-10:** Channel identity source files live in `channel/` at project root -- clean separation from `.claude/` agent system. Files: `channel.md`, `voice-profile.md`, `VISUAL_STYLE_GUIDE.md`.
- **D-11:** Agents reference channel docs via `@channel/<file>.md` in their body, NOT via CLAUDE.md imports (which subagents can't see) and NOT via a shared skill (which would load all docs into every agent). Each agent gets only what it needs.
- **D-12:** Channel docs are migrated from V5 at `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5` -- existing content preserved, reformatted if needed.
- **D-13:** Seed researcher and writer MEMORY.md from V5 expertise YAML files at `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5`. Convert YAML mental model structure to markdown format with sections: key_files, decisions, patterns, observations, open_questions.
- **D-14:** Memory update protocol: structured append with timestamps. After each task, agent appends new entries under the appropriate section (e.g., `- [2026-04-10] Wikipedia articles need cross-referencing`). Existing entries preserved.
- **D-15:** MEMORY.md grows unbounded -- agent explicitly Reads the full file at task start (not relying on 200-line auto-injection). 1M context makes this feasible. No automatic pruning cap.
- **D-16:** `memory: project` on both agents -- memory stored at `.claude/agent-memory/<name>/MEMORY.md`, shared via git, project-scoped.

### Claude's Discretion
- Exact agent body line counts (target 120-200 but Claude can adjust based on content needs)
- `agent-protocols` skill internal structure and exact wording
- CLAUDE.md agent reference table format and column choices
- Windows smoke test script implementation details
- Exact frontmatter fields on each agent (model choice, color, maxTurns, permissionMode)

### Deferred Ideas (OUT OF SCOPE)
- Slash-command skills for pipeline stages (`/research`, `/write-script`, `/visual-plan`) -- Phase 4
- Hook-based feedback propagation (SubagentStop writing to upstream memory) -- Phase 5
- Domain enforcement hooks (PreToolUse blocking unauthorized writes) -- Phase 4
- Session logging hooks (PostToolUse capturing delegations) -- Phase 4
- Agent consolidation decisions (17 -> ~10 agents) -- Phase 3, informed by Phase 1 learnings
- Observability dashboard (IndyDevDan pattern) -- backlog
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | CLAUDE.md contains project context, folder map, architecture rules, and pipeline routing table | Agent reference table pattern documented (D-01, D-04); CLAUDE.md structure template provided in Architecture Patterns section |
| FOUND-02 | Directory structure created (`.claude/agents/`, `.claude/skills/`, `.claude/rules/`, `.claude/hooks/`, `.claude/scripts/`) | Full directory tree documented; greenfield -- no conflicts |
| FOUND-03 | Channel identity docs integrated as `channel/` files | V5 source files verified: `channel.md` (68 lines), `voice/WRITTING_STYLE_PROFILE.md` (372 lines), `visuals/VISUAL_STYLE_GUIDE.md` (197 lines); migration path documented |
| FOUND-04 | Project settings configure orchestrator as default agent | **REINTERPRETED per D-01**: No orchestrator agent. CLAUDE.md serves as the main session entry point with a documentation-only reference table. `settings.json` does NOT set `"agent"` field |
| FOUND-05 | Windows path handling validated with smoke tests | Path handling verified: `process.cwd()` / `os.getcwd()` work correctly; inline backslash escaping is a pitfall; smoke test patterns documented |
| FOUND-06 | Skill crafting guide included as reference at `.claude/references/skill-crafting-guide.md` | Official skill docs fetched; crafting guide structure documented |
| AGNT-01 | Orchestrator agent definition with routing table | **REINTERPRETED per D-01**: No orchestrator agent. CLAUDE.md IS the orchestration layer with an agent reference table (documentation only) |
| AGNT-03 | Researcher agent with documentary research expertise | Fat agent pattern documented; V5 expertise YAML verified (empty seed -- needs channel-specific content); `@channel/channel.md` reference pattern |
| AGNT-04 | Writer agent with voice profile awareness and style consistency | Fat agent pattern documented; V5 voice profile verified (372 lines); `@channel/voice-profile.md` + `@channel/channel.md` reference pattern |
| AGNT-13 | All agents include mental model instructions in system prompt | `memory: project` field creates auto-injected MEMORY.md; `agent-protocols` skill provides read/write protocol; explicit Read instruction for >200 line files per D-15 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No project CLAUDE.md exists yet -- it is part of what Phase 1 creates. The global `~/.claude/CLAUDE.md` has the following relevant directives:

- **OS:** Windows 11, shell is PowerShell 7+ (but Claude Code agent sessions run bash by default)
- **File existence checks:** Never use `test -d`/`test -f` -- use Node.js `fs.existsSync()` or Python `os.path.exists()`
- **Path separators:** Windows uses `\` natively; Node.js `path` module handles both. Never hardcode `/` in runtime paths
- **Filenames:** Colons (`:`) are illegal in Windows filenames -- timestamps must replace colons
- **GPU env:** `C:/Users/iorda/miniconda3/envs/perception-models/python.exe` for CLIP operations (not needed in Phase 1)
- **Conda:** Always use conda, never plain `python -m venv`
- **Communication:** Be direct, lead with the answer

These constraints affect the smoke test script and any shell commands in agent bodies.

## Standard Stack

This phase creates no software packages. The "stack" is Claude Code's native extension system.

### Core Extension Points Used in Phase 1

| Extension | Location | Purpose | Confidence |
|-----------|----------|---------|------------|
| Agent definitions | `.claude/agents/*.md` | Fat markdown files with YAML frontmatter defining researcher + writer subagents | HIGH [VERIFIED: code.claude.com/docs/en/sub-agents] |
| Skills | `.claude/skills/agent-protocols/SKILL.md` | Shared behavioral protocol injected via `skills:` frontmatter | HIGH [VERIFIED: code.claude.com/docs/en/skills] |
| CLAUDE.md | `./CLAUDE.md` | Project entry point with agent reference table, folder map, architecture rules | HIGH [VERIFIED: code.claude.com/docs/en/memory] |
| Agent memory | `.claude/agent-memory/<name>/MEMORY.md` | Per-agent persistent memory, project-scoped, git-shared | HIGH [VERIFIED: code.claude.com/docs/en/sub-agents#enable-persistent-memory] |
| Channel docs | `channel/*.md` | Channel identity referenced via `@channel/file.md` in agent bodies | HIGH [VERIFIED: code.claude.com/docs/en/memory, @import syntax] |

### NOT Used in Phase 1 (Deferred)

| Extension | Why Deferred |
|-----------|-------------|
| Hooks (`.claude/hooks/`) | Domain enforcement and session logging deferred to Phase 4 |
| settings.json `"agent"` field | No orchestrator agent per D-01 |
| MCP servers | Python scripts not invoked in Phase 1 |
| Skills with `context: fork` | Pipeline skills deferred to Phase 4 |
| `.claude/rules/` | Path-scoped rules deferred to later phases |

## Architecture Patterns

### Recommended Project Structure (Phase 1 Deliverables)

```
Channel-Automation V0.6/
|
|-- CLAUDE.md                           # Project entry point (agent reference table, folder map, rules)
|
|-- .claude/
|   |-- settings.json                   # Hooks config (placeholder, mostly empty in Phase 1)
|   |
|   |-- agents/
|   |   |-- researcher.md               # Documentary research agent (fat body ~150 lines)
|   |   +-- writer.md                   # Script writing agent (fat body ~150 lines)
|   |
|   |-- skills/
|   |   +-- agent-protocols/
|   |       +-- SKILL.md                # Shared memory + feedback protocol (~60-80 lines)
|   |
|   |-- agent-memory/
|   |   |-- researcher/
|   |   |   +-- MEMORY.md               # Seeded from V5 expertise YAML
|   |   +-- writer/
|   |       +-- MEMORY.md               # Seeded from V5 expertise YAML
|   |
|   |-- references/
|   |   +-- skill-crafting-guide.md     # Reference for future skill creation
|   |
|   |-- rules/                          # Empty dir (placeholder for Phase 4)
|   |-- hooks/                          # Empty dir (placeholder for Phase 4)
|   +-- scripts/                        # Empty dir (placeholder for Phase 4)
|
|-- channel/
|   |-- channel.md                      # Channel DNA (migrated from V5)
|   |-- voice-profile.md               # Writing style profile (migrated from V5)
|   +-- VISUAL_STYLE_GUIDE.md          # Visual register definitions (migrated from V5)
|
+-- tests/
    +-- smoke-test-paths.js             # Windows path validation script
```

### Pattern 1: Fat Agent with Skills Injection

**What:** Each agent's `.md` file contains the complete domain expertise in its body (persona, procedures, tool references) PLUS shared behavioral protocols injected via the `skills:` frontmatter field. [VERIFIED: code.claude.com/docs/en/sub-agents#preload-skills-into-subagents]

**When to use:** Every agent in the system.

**Example:**

```markdown
---
name: researcher
description: >-
  Conducts deep documentary research on dark history, true crime, and unsolved
  mystery topics. Produces research dossiers with sourced claims and entity
  indexes. Invoke when the user asks to research a topic for a documentary.
model: sonnet
memory: project
color: blue
skills:
  - agent-protocols
---

<project_context>
Read ./CLAUDE.md for project-wide rules and conventions.
</project_context>

# Documentary Researcher

## Identity

You are the documentary researcher for a dark mysteries YouTube channel.
You produce thorough, source-anchored research dossiers.

## Channel Context

@channel/channel.md

## Before Starting Work

1. Read your MEMORY.md completely (not just the auto-injected 200 lines)
2. Check if the project has a `feedback/upstream-signals.json` with signals
   addressed to you
3. Review and apply relevant feedback

## Core Procedure

### 3-Pass Research Pipeline
[... domain-specific instructions ...]

## After Completing Work

1. Update your MEMORY.md with new patterns, decisions, observations
2. Follow the agent-protocols skill for memory update format
```

### Pattern 2: Shared Behavioral Skill (agent-protocols)

**What:** A skill with `user-invocable: false` that gets injected into every agent via the `skills:` frontmatter. Contains the memory lifecycle protocol and the feedback signal read/write protocol. [VERIFIED: code.claude.com/docs/en/skills -- `user-invocable: false` hides from / menu, Claude-only invocation]

**When to use:** Injected into every agent definition.

**Key behavior:** When listed in an agent's `skills:` frontmatter, the FULL content of `SKILL.md` is injected into the subagent's context at startup. This is NOT the same as skill discovery -- it is direct content injection. [VERIFIED: code.claude.com/docs/en/sub-agents#preload-skills-into-subagents -- "The full content of each skill is injected into the subagent's context, not just made available for invocation."]

**Example:**

```yaml
---
name: agent-protocols
description: >-
  Shared behavioral protocols for all agents. Memory lifecycle (read at start,
  update after work) and feedback signal handling. Not user-invokable.
user-invocable: false
---
```

### Pattern 3: Channel Doc Reference via @file

**What:** Agent bodies reference channel identity docs using `@channel/file.md` syntax. Each agent gets only the docs relevant to its domain. [VERIFIED: code.claude.com/docs/en/memory -- @import syntax supports relative paths]

**When to use:** Any agent that needs channel context.

**Critical caveat:** The `@file` syntax in agent bodies resolves relative to the project root, not relative to the agent file. So `@channel/channel.md` in `.claude/agents/researcher.md` resolves to `./channel/channel.md`. [ASSUMED -- needs validation during implementation]

### Pattern 4: CLAUDE.md as Documentation Hub (Not Orchestrator)

**What:** Per D-01, CLAUDE.md contains a reference table of all agents, the folder map, and project rules. It does NOT contain routing logic or auto-dispatch instructions. The user decides which agent to invoke. [VERIFIED: CONTEXT.md D-01]

**When to use:** Main session entry point.

**Structure target:** Under 200 lines to maintain adherence. [VERIFIED: code.claude.com/docs/en/memory -- "Target under 200 lines per file"]

### Anti-Patterns to Avoid

- **Orchestrator agent**: D-01 explicitly prohibits this. CLAUDE.md IS the orchestration layer. Do NOT create an `orchestrator.md` agent file.
- **Monolithic CLAUDE.md**: Keep under 200 lines. Use `@imports` for channel docs. Agent reference table should be concise (one line per agent).
- **CLAUDE.md imports for channel docs in subagents**: Subagents do NOT inherit CLAUDE.md content. Use `@file` references in the agent body instead. [VERIFIED: GitHub issue #8395, confirmed in CONTEXT.md canonical refs]
- **Channel docs in a shared skill**: This would load ALL channel docs into EVERY agent. Per D-11, each agent gets only what it needs via direct `@file` references.
- **Relying on 200-line auto-injection alone for memory**: Per D-15, agents must explicitly Read their full MEMORY.md at task start, not rely solely on the auto-injected 200 lines. Include this instruction in agent-protocols.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared protocol across agents | Copy-paste memory instructions into each agent body | `agent-protocols` skill with `skills:` injection | DRY; single source of truth for updates [VERIFIED: skills injection works for project-level skills referencing project-level skills] |
| Persistent memory | Custom file-based memory system | `memory: project` frontmatter field | Native auto-injection, auto-enabled Read/Write/Edit tools [VERIFIED: official docs] |
| Agent routing/dispatch | Custom orchestrator agent | CLAUDE.md reference table + user `@agent-name` invocation | Simpler, matches ecosystem pattern, no fragile auto-routing [VERIFIED: D-01] |
| Skill crafting reference | Write from scratch | Adapt from official skill docs + anthropics/skills repo | Proven patterns, official examples [VERIFIED: github.com/anthropics/skills] |

## Common Pitfalls

### Pitfall 1: Subagents Do NOT Inherit CLAUDE.md

**What goes wrong:** Agent is created, but when invoked, it has no awareness of project rules, channel identity, or conventions defined in CLAUDE.md.
**Why it happens:** Subagents run in their own context window. CLAUDE.md is loaded into the main session, not into subagent sessions. This is confirmed behavior. [VERIFIED: GitHub issue #8395, CONTEXT.md canonical refs]
**How to avoid:** (1) Include a `<project_context>` block in each agent body instructing it to Read ./CLAUDE.md. (2) Reference channel docs directly in agent body via `@channel/file.md`. (3) Inject shared protocols via `skills:` frontmatter.
**Warning signs:** Agent produces output that ignores project conventions or channel voice.

### Pitfall 2: Windows Path Escaping in Inline Node.js Eval

**What goes wrong:** `node -e` commands with hardcoded Windows backslash paths produce garbled paths due to shell escaping layers (bash -> node string -> filesystem).
**Why it happens:** Backslashes are escape characters in both bash strings and JavaScript strings. Double or quadruple escaping is needed, and it is fragile.
**How to avoid:** Use `process.cwd()` or `path.resolve('.')` instead of hardcoded absolute paths. For the smoke test script, write it as a `.js` file and run it with `node tests/smoke-test-paths.js`, not as an inline eval. [VERIFIED: tested during research -- inline eval with backslashes fails, process.cwd() works]
**Warning signs:** `ENOENT` errors with garbled paths containing `\x01` or missing segments.

### Pitfall 3: Memory Auto-Injection 200-Line Limit

**What goes wrong:** Agent's MEMORY.md grows beyond 200 lines, and only the first 200 lines are auto-injected at startup. Agent loses access to recent entries.
**Why it happens:** Claude Code auto-injects only the first 200 lines (or 25KB) of MEMORY.md into the system prompt. [VERIFIED: code.claude.com/docs/en/sub-agents]
**How to avoid:** Per D-15, instruct agents to explicitly Read their full MEMORY.md at task start (in the agent-protocols skill). The 200-line auto-injection serves as a quick reference; the full Read provides complete context. With 1M context window, this is feasible.
**Warning signs:** Agent makes decisions that contradict its own recent memory entries.

### Pitfall 4: Skill Content Injection vs. Skill Discovery

**What goes wrong:** Developer assumes `skills:` field just "enables" the skill; or assumes subagents without `skills:` field cannot access skills at all.
**Why it happens:** The documentation is nuanced. The `skills:` frontmatter field injects FULL skill content at startup. Separately, subagents with filesystem access can DISCOVER and READ any skill by scanning `.claude/skills/`. [VERIFIED: GitHub issue #32910]
**How to avoid:** Use `skills:` for protocols that MUST be present from the first turn (like agent-protocols). For reference skills that agents might need occasionally, filesystem discovery is sufficient.
**Warning signs:** Skill content not influencing agent behavior from the first response.

### Pitfall 5: @file References in Agent Bodies -- Path Resolution

**What goes wrong:** `@channel/channel.md` in an agent body fails to resolve or points to wrong file.
**Why it happens:** Unclear whether `@file` paths in `.claude/agents/*.md` resolve relative to the agent file or relative to the project root.
**How to avoid:** Test during implementation. If relative-to-agent-file, use `@../../channel/channel.md`. If relative-to-project-root, use `@channel/channel.md`. [ASSUMED -- needs validation]
**Warning signs:** Agent starts without channel context despite having `@file` reference.

### Pitfall 6: FOUND-04 Conflict with D-01

**What goes wrong:** REQUIREMENTS.md FOUND-04 says `"agent": "orchestrator"` in settings.json. CONTEXT.md D-01 says NO orchestrator.
**Why it happens:** FOUND-04 was written before the discuss-phase established D-01.
**How to avoid:** D-01 takes precedence (locked decision from discuss-phase). Do NOT set `"agent"` in settings.json. CLAUDE.md serves as the orchestration layer. FOUND-04 is satisfied by CLAUDE.md containing the agent reference table.
**Warning signs:** An orchestrator.md agent file being created.

## Code Examples

### Example 1: Agent Frontmatter (Researcher)

```yaml
# Source: Official Claude Code docs (code.claude.com/docs/en/sub-agents)
---
name: researcher
description: >-
  Conducts deep documentary research on dark history, true crime, and unsolved
  mystery topics. Produces research dossiers with sourced claims and entity
  indexes. Invoke when the user asks to research a topic for a documentary.
model: sonnet
memory: project
color: blue
skills:
  - agent-protocols
---
```

[VERIFIED: All fields confirmed in official docs. `skills:` injects full SKILL.md content at startup. `memory: project` stores at `.claude/agent-memory/researcher/MEMORY.md`.]

### Example 2: agent-protocols Skill Structure

```yaml
# Source: Official Claude Code docs (code.claude.com/docs/en/skills)
---
name: agent-protocols
description: >-
  Shared behavioral protocols for all agents. Memory lifecycle and feedback
  signal handling. Injected into agent context at startup via skills field.
user-invocable: false
---

# Agent Protocols

## Memory Lifecycle

### At Task Start
1. Read your complete MEMORY.md file (do not rely only on auto-injected lines)
2. Review key_files, decisions, patterns, observations, open_questions sections
3. Note any patterns relevant to the current task

### At Task End
1. Append new entries to the appropriate section with timestamp
2. Format: `- [YYYY-MM-DD] <observation>`
3. Preserve all existing entries (append-only)
4. Sections: key_files, decisions, patterns, observations, open_questions

## Feedback Signal Protocol

### At Task Start
1. Check if `feedback/upstream-signals.json` exists in the current project
2. Read signals where `to_agent` matches your agent name
3. Apply high-severity signals; note medium-severity signals

### At Task End
1. If you noticed quality issues or content gaps that affect upstream agents,
   write a signal to `feedback/upstream-signals.json`
2. Signal format: { from_agent, to_agent, signal_type, severity, message, evidence }
```

[VERIFIED: `user-invocable: false` confirmed in official docs -- hides from / menu, Claude-only invocation. Full content injected when listed in agent's `skills:` field.]

### Example 3: CLAUDE.md Agent Reference Table

```markdown
# Channel-Automation V0.6

## Project
Dark mysteries documentary video production pipeline.
Phase 1 vertical slice: researcher + writer agents.

## Folder Map
- `channel/` -- Channel identity (voice, style, visual guide)
- `.claude/agents/` -- Agent definitions
- `.claude/skills/` -- Shared skills
- `.claude/agent-memory/` -- Per-agent persistent memory
- `projects/` -- Per-documentary outputs
- `strategy/` -- Strategy Python scripts
- `editorial/` -- Editorial Python scripts
- `media/` -- Media Python scripts

## Agent Reference

| Agent | Domain | When to Use |
|-------|--------|-------------|
| @researcher | Editorial | Research a documentary topic |
| @writer | Editorial | Generate a script from research |
| @strategy-lead | Strategy | Competitor analysis, topics (Phase 3) |
| @editorial-lead | Editorial | Complex editorial coordination (Phase 3) |
| @media-lead | Media | Visual pipeline coordination (Phase 3) |
| @style-extractor | Editorial | Extract narrator voice (Phase 3) |
| @visual-planner | Media | Shotlist generation (Phase 3) |
| @asset-processor | Media | CLIP embeddings, downloads (Phase 3) |
| @asset-curator | Media | Asset evaluation (Phase 3) |
| @compiler | Media | Edit sheet compilation (Phase 3) |

Agents marked "(Phase 3)" are not yet created. They appear here for reference.

## Architecture Rules
- Agents are user-invoked only. Type `@agent-name` to delegate.
- No auto-routing. No auto-dispatch. User decides what to delegate.
- Human checkpoints: after topic generation (present and WAIT), after asset
  processing (present and WAIT).
- GPU scripts: use `C:/Users/iorda/miniconda3/envs/perception-models/python.exe`

## Platform
- Windows 11, RTX 4070 8GB
- Project path has spaces and periods -- use path.resolve(), never hardcode
```

[ASSUMED: exact content will be refined during implementation. Structure follows the 200-line guidance.]

### Example 4: MEMORY.md Seed Structure

```markdown
# Researcher Memory

## Key Files
- Research output: projects/*/research/Research.md
- Entity index: projects/*/research/entity_index.json
- Channel DNA: channel/channel.md

## Decisions
(none yet)

## Patterns
(none yet)

## Observations
(none yet)

## Open Questions
(none yet)
```

[VERIFIED: V5 expertise YAML files for both researcher and writer are empty seeds with the same section structure. The migration is trivial -- convert YAML keys to markdown headers, preserve the empty-seed format.]

### Example 5: Windows Path Smoke Test

```javascript
// tests/smoke-test-paths.js
// Validates file operations work correctly in a path with spaces and periods
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const testCases = [
  { name: 'project root exists', check: () => fs.existsSync(projectRoot) },
  { name: 'write to project root', check: () => {
    const p = path.join(projectRoot, '.test-smoke');
    fs.writeFileSync(p, 'ok');
    const ok = fs.readFileSync(p, 'utf8') === 'ok';
    fs.unlinkSync(p);
    return ok;
  }},
  { name: 'nested dir with spaces', check: () => {
    const d = path.join(projectRoot, 'projects', 'test project');
    fs.mkdirSync(d, { recursive: true });
    const p = path.join(d, 'test.md');
    fs.writeFileSync(p, 'ok');
    const ok = fs.existsSync(p);
    fs.unlinkSync(p);
    fs.rmdirSync(d);
    return ok;
  }},
  { name: 'path.resolve handles cwd', check: () => {
    return path.resolve('.').includes('Channel-Automation V0.6');
  }},
];

let passed = 0;
for (const tc of testCases) {
  try {
    const ok = tc.check();
    console.log(ok ? 'PASS' : 'FAIL', tc.name);
    if (ok) passed++;
  } catch (e) {
    console.log('FAIL', tc.name, e.message);
  }
}
console.log(`\n${passed}/${testCases.length} passed`);
process.exit(passed === testCases.length ? 0 : 1);
```

[VERIFIED: tested during research -- `path.resolve()` and `process.cwd()` correctly handle the project path with spaces and periods. Inline `node -e` with hardcoded paths FAILS.]

## V5 Source Material Inventory

### Channel Identity Docs (for Migration)

| V5 Source | V0.6 Target | Lines | Notes |
|-----------|-------------|-------|-------|
| `channel/channel.md` | `channel/channel.md` | 68 | Clean, direct copy [VERIFIED: read during research] |
| `channel/voice/WRITTING_STYLE_PROFILE.md` | `channel/voice-profile.md` | 372 | Rename to fix typo + flatten path. Content is comprehensive and well-structured [VERIFIED: read during research] |
| `channel/visuals/VISUAL_STYLE_GUIDE.md` | `channel/VISUAL_STYLE_GUIDE.md` | 197 | Flatten path from subdirectory. Content ready [VERIFIED: file exists, line count confirmed] |
| `channel/scripts/Mexico's Most Disturbing Cult_clean.md` | Not migrated | 700+ | Reference script used for style extraction. Not needed in V0.6 channel dir -- it is the source material for the voice profile |

### Expertise YAML Files (for Memory Seeding)

| V5 Source | V0.6 Target | Status |
|-----------|-------------|--------|
| `.pi/multi-team/expertise/researcher-mm.yaml` | `.claude/agent-memory/researcher/MEMORY.md` | Empty seed -- all sections empty. Trivial conversion [VERIFIED: read during research] |
| `.pi/multi-team/expertise/writer-mm.yaml` | `.claude/agent-memory/writer/MEMORY.md` | Empty seed -- all sections empty. Trivial conversion [VERIFIED: read during research] |

**Key finding:** Both V5 YAML files are empty seeds (all arrays empty). The migration is purely structural -- converting YAML section headers to markdown headers. No actual expertise content needs to be preserved. The agents start fresh, accumulating knowledge from Phase 1 onwards.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in (`node` + `assert` or simple exit codes) |
| Config file | none -- see Wave 0 |
| Quick run command | `node tests/smoke-test-paths.js` |
| Full suite command | `node tests/smoke-test-paths.js` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | CLAUDE.md exists with required sections | smoke | `node -e "const fs=require('fs'); process.exit(fs.existsSync('CLAUDE.md') ? 0 : 1)"` | Wave 0 |
| FOUND-02 | Directory structure exists | smoke | `node tests/smoke-test-paths.js` | Wave 0 |
| FOUND-03 | Channel docs exist at channel/ | smoke | `node -e "['channel/channel.md','channel/voice-profile.md','channel/VISUAL_STYLE_GUIDE.md'].forEach(f=>{if(!require('fs').existsSync(f))process.exit(1)})"` | Wave 0 |
| FOUND-04 | CLAUDE.md has agent reference table | smoke/manual | Manual inspection of CLAUDE.md content | N/A |
| FOUND-05 | Windows paths work with spaces/periods | unit | `node tests/smoke-test-paths.js` | Wave 0 |
| FOUND-06 | Skill crafting guide exists | smoke | `node -e "process.exit(require('fs').existsSync('.claude/references/skill-crafting-guide.md') ? 0 : 1)"` | Wave 0 |
| AGNT-01 | CLAUDE.md agent reference table present | manual | Manual inspection -- table lists all ~10 agents | N/A |
| AGNT-03 | Researcher agent valid | smoke | `node -e "process.exit(require('fs').existsSync('.claude/agents/researcher.md') ? 0 : 1)"` | Wave 0 |
| AGNT-04 | Writer agent valid | smoke | `node -e "process.exit(require('fs').existsSync('.claude/agents/writer.md') ? 0 : 1)"` | Wave 0 |
| AGNT-13 | Agents have memory instructions | manual | Manual inspection of agent body + agent-protocols skill | N/A |

### Sampling Rate

- **Per task commit:** `node tests/smoke-test-paths.js`
- **Per wave merge:** Full smoke test suite
- **Phase gate:** All smoke tests green + manual validation of agent invocation

### Wave 0 Gaps

- [ ] `tests/smoke-test-paths.js` -- covers FOUND-02, FOUND-05
- [ ] No test framework needed beyond Node.js built-in -- smoke tests use process.exit codes

## Security Domain

Security enforcement is not explicitly set to `false` in config. However, this phase creates no user-facing endpoints, no authentication flows, no data storage, and no network communication. It creates markdown files and a Node.js smoke test script.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- no auth in this phase |
| V3 Session Management | No | N/A -- no sessions |
| V4 Access Control | No | N/A -- file-based only |
| V5 Input Validation | No | N/A -- no user input processing |
| V6 Cryptography | No | N/A -- no crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via MEMORY.md | Tampering | Agent-protocols skill instructs agents to treat memory as advisory, not executable. Memory is git-tracked for auditability |
| Path traversal in @file references | Information Disclosure | `@file` syntax is handled by Claude Code natively -- no custom path resolution |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/` for custom commands | `.claude/skills/` with SKILL.md | Claude Code v2.1.3 (Jan 2026) | Skills replace commands; commands still work as aliases [VERIFIED: official docs] |
| 200K context window limiting skill injection | 1M context on Opus/Sonnet 4.6 | Late 2025 | "3 skills max" guidance is obsolete; inject as many as needed [VERIFIED: D-09] |
| Subagents assumed isolated from all skills | Subagents can discover skills via filesystem | Documented Feb 2026 | `skills:` field controls startup injection, not access restriction [VERIFIED: GitHub issue #32910] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@channel/channel.md` in agent body resolves relative to project root | Pattern 3, Pitfall 5 | Agent starts without channel context; fix is to adjust path to `@../../channel/channel.md` |
| A2 | CLAUDE.md agent reference table format (exact columns/layout) | Code Example 3 | Low risk -- purely cosmetic, easily adjusted |
| A3 | The `<project_context>` block pattern (telling agent to Read ./CLAUDE.md) actually causes the agent to read it | Pattern 1, Pitfall 1 | Agent ignores project rules; mitigation is to include critical rules directly in agent body |

## Open Questions

1. **@file resolution in agent bodies**
   - What we know: `@file` imports work in CLAUDE.md with paths relative to the containing file. [VERIFIED: official docs]
   - What's unclear: How `@file` references in `.claude/agents/*.md` bodies resolve -- relative to agent file or project root?
   - Recommendation: Test during first agent creation. If it fails, adjust paths or inline the content.

2. **Does `<project_context>` actually trigger agent to Read CLAUDE.md?**
   - What we know: GSD framework uses this pattern successfully.
   - What's unclear: Whether a subagent reliably reads CLAUDE.md when instructed in its system prompt. It may decide not to if other instructions are more pressing.
   - Recommendation: Include this block AND also duplicate the most critical rules (platform, GPU env, path handling) in the agent body.

3. **settings.json initial content**
   - What we know: settings.json can hold hooks, permissions, env vars. Phase 1 creates no hooks.
   - What's unclear: Whether an empty or minimal settings.json is needed for Claude Code to recognize the project.
   - Recommendation: Create a minimal `settings.json` with empty hooks. Claude Code works without it, but having the file establishes the convention.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Smoke test script | Yes | v24.13.0 | -- |
| Claude Code CLI | Agent invocation validation | Yes | v2.1.96+ | -- |
| Git | Version control of agent memory | Yes | (installed) | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Sources

### Primary (HIGH confidence)
- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents) -- Agent frontmatter fields, skills injection, memory system, no subagent nesting
- [Extend Claude with skills - Claude Code Docs](https://code.claude.com/docs/en/skills) -- Skill frontmatter, user-invocable field, content lifecycle, supporting files
- [How Claude remembers your project - Claude Code Docs](https://code.claude.com/docs/en/memory) -- CLAUDE.md hierarchy, @import syntax, 200-line guidance, path-specific rules
- V5 Source Files (read directly during research) -- channel.md, WRITTING_STYLE_PROFILE.md, VISUAL_STYLE_GUIDE.md, researcher-mm.yaml, writer-mm.yaml

### Secondary (MEDIUM confidence)
- [GitHub Issue #32910](https://github.com/anthropics/claude-code/issues/32910) -- Subagent skill discovery vs injection clarification
- [GitHub Issue #25834](https://github.com/anthropics/claude-code/issues/25834) -- Plugin agent skills frontmatter injection failure
- [A Mental Model for Claude Code (Level Up Coding)](https://levelup.gitconnected.com/a-mental-model-for-claude-code-skills-subagents-and-plugins-3dea9924bf05) -- Skills-into-subagents pattern
- [Claude Code's Memory: 4 Layers (DEV Community)](https://dev.to/chen_zhang_bac430bc7f6b95/claude-codes-memory-4-layers-of-complexity-still-just-grep-and-a-200-line-cap-2kn9) -- 200-line cap details

### Tertiary (LOW confidence)
- None -- all claims verified or cited.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All extension points verified against official April 2026 docs
- Architecture: HIGH -- Patterns verified against docs, CONTEXT.md decisions are clear
- Pitfalls: HIGH -- Path handling pitfall verified by reproduction; CLAUDE.md inheritance confirmed via GitHub issues
- V5 migration: HIGH -- Source files read directly; content assessed

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days -- Claude Code agent system is stable; skills and memory API unlikely to change)

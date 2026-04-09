# Technology Stack: Claude Code Agent Ecosystem

**Project:** Channel-Automation V0.6 (Pi-to-Claude-Code Migration)
**Researched:** 2026-04-09
**Sources:** Official Claude Code documentation (code.claude.com/docs), verified April 2026
**Claude Code Version Reference:** v2.1.96 (April 7, 2026)

---

## Executive Summary

Claude Code provides seven native extension points that collectively replace the entire Pi CLI multi-team extension layer. The mapping is direct enough that no custom runtime is needed -- every Pi capability (delegation, domain enforcement, expertise injection, skill procedures, session memory) has a Claude Code native equivalent. The critical architectural difference remains: **subagents cannot spawn subagents**, which eliminates 3-tier delegation. However, the experimental **Agent Teams** feature (available since v2.1.32) provides an alternative for coordinated parallel work that Pi's multi-team system was built for.

---

## 1. Custom Subagents (.claude/agents/)

**Confidence: HIGH** -- Verified from official docs at code.claude.com/docs/en/sub-agents

### What They Are

Markdown files with YAML frontmatter that define specialized AI assistants. Each runs in its own context window with a custom system prompt, specific tool access, and independent permissions.

### File Format

```markdown
---
name: visual-researcher
description: Researches visual assets for documentary episodes. Use when finding reference images, stock footage, and visual inspiration for a topic.
tools: Read, Grep, Glob, Bash
model: sonnet
memory: project
permissionMode: acceptEdits
maxTurns: 50
skills:
  - media-conventions
  - visual-style-guide
mcpServers:
  - github
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-media-command.sh"
color: blue
---

You are a visual researcher for a dark mysteries YouTube channel.
[... system prompt / persona / expertise ...]
```

### Directory Structure

| Location | Scope | Priority | Shared? |
|----------|-------|----------|---------|
| Managed settings `agents/` | Organization-wide | 1 (highest) | Yes (IT deployed) |
| `--agents` CLI flag (JSON) | Current session only | 2 | No |
| `.claude/agents/*.md` | Current project | 3 | Yes (git) |
| `~/.claude/agents/*.md` | All your projects | 4 | No |
| Plugin `agents/` directory | Where plugin enabled | 5 (lowest) | Via plugin |

### All Supported Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase + hyphens) |
| `description` | Yes | When Claude should delegate. Include "use proactively" for eager delegation |
| `tools` | No | Allowlist of tools. Inherits all if omitted. Supports `Agent(worker, researcher)` syntax to restrict which subagents can be spawned (only when running as main agent via `--agent`) |
| `disallowedTools` | No | Denylist. Applied before `tools`. Tool in both = removed |
| `model` | No | `sonnet`, `opus`, `haiku`, full ID like `claude-opus-4-6`, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before subagent stops |
| `skills` | No | Skills to inject FULL content at startup (not just availability) |
| `mcpServers` | No | List of MCP server names (reference) or inline definitions |
| `hooks` | No | Lifecycle hooks scoped to this subagent |
| `memory` | No | `user`, `project`, or `local`. Enables persistent cross-session learning |
| `background` | No | `true` to always run in background |
| `effort` | No | `low`, `medium`, `high`, `max` (Opus 4.6 only) |
| `isolation` | No | `worktree` for isolated git worktree copy |
| `color` | No | `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` |
| `initialPrompt` | No | Auto-submitted first turn when running as main agent via `--agent` |

### Invocation Methods

1. **Automatic delegation**: Claude reads description field, delegates when task matches
2. **@-mention**: `@"visual-researcher (agent)" find reference images for Bermuda Triangle`
3. **Natural language**: "Use the visual-researcher subagent to find images"
4. **Session-wide**: `claude --agent visual-researcher` -- entire session uses this agent's config
5. **Settings default**: `{ "agent": "visual-researcher" }` in `.claude/settings.json`

### Critical Limitation: No Subagent Nesting

**Subagents CANNOT spawn other subagents.** This is a hard architectural constraint. The Agent tool is not available to subagents.

Workarounds:
- Chain subagents from the main conversation: "Use researcher, then use writer with those results"
- Use Skills with `context: fork` for nested delegation patterns
- Use Agent Teams for coordinated multi-agent work (experimental)
- When an agent runs as main thread via `--agent`, it CAN spawn subagents and can restrict which ones via `Agent(type1, type2)` in `tools`

### Pi Mapping

| Pi Concept | Claude Code Equivalent |
|------------|----------------------|
| Agent persona YAML | `.claude/agents/*.md` body (system prompt) |
| Domain enforcement | `tools` / `disallowedTools` fields |
| Orchestrator agent | `--agent orchestrator` (main thread agent) that can spawn subagents |
| Lead agents | Custom subagents with `Agent(worker1, worker2)` restriction (only when `--agent`) |
| Worker agents | Custom subagents with restricted tools |
| Expertise files | Embedded in agent markdown body OR preloaded via `skills` field |
| Delegation tool | Built-in Agent tool (automatic or @-mention) |

---

## 2. Hooks System

**Confidence: HIGH** -- Verified from official docs at code.claude.com/docs/en/hooks

### What They Are

User-defined commands, prompts, or agents that execute automatically at specific points in Claude Code's lifecycle. They transform guidelines into enforced rules.

### 25 Hook Events

| Category | Events |
|----------|--------|
| Session | `SessionStart`, `SessionEnd` |
| User Input | `UserPromptSubmit` |
| Tool Execution | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` |
| Agents/Tasks | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle` |
| Lifecycle | `Stop`, `StopFailure` |
| File/Config | `FileChanged`, `CwdChanged`, `ConfigChange`, `InstructionsLoaded` |
| Context | `PreCompact`, `PostCompact` |
| Worktrees | `WorktreeCreate`, `WorktreeRemove` |
| UI | `Notification` |
| MCP | `Elicitation`, `ElicitationResult` |

### Configuration Format (in settings.json)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(rm *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-bash.sh",
            "timeout": 600,
            "statusMessage": "Validating command...",
            "async": false
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "matcher": "visual-researcher",
        "hooks": [
          { "type": "command", "command": "./scripts/setup-media-env.sh" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          { "type": "command", "command": "./scripts/log-agent-completion.sh" }
        ]
      }
    ]
  }
}
```

### Four Handler Types

| Type | Format | Use Case |
|------|--------|----------|
| `command` | Shell script, receives JSON stdin, communicates via exit codes + stdout JSON | Validation, logging, file operations |
| `http` | POST to URL with JSON body | Remote validation, team-wide policies |
| `prompt` | Single-turn Claude evaluation using `$ARGUMENTS` | Quick AI-based checks |
| `agent` | Spawns subagent with tool access for deep verification | Complex validation requiring file reads |

### PreToolUse Blocking (Key for Domain Enforcement)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "Explanation text",
    "updatedInput": { "field": "new_value" },
    "additionalContext": "Context injected for Claude"
  }
}
```

Exit codes: `0` = success (parse JSON if present), `2` = blocking error, other = non-blocking error.

Multiple hooks returning different decisions: **deny > defer > ask > allow**

### Hook Locations (precedence order)

1. `~/.claude/settings.json` -- all projects
2. `.claude/settings.json` -- project-level (shareable)
3. `.claude/settings.local.json` -- project-level (local only)
4. Managed policy settings -- organization-wide
5. Plugin `hooks/hooks.json` -- when plugin enabled
6. Skill/Agent frontmatter -- while component active

### Pi Mapping

| Pi Concept | Claude Code Hook |
|------------|-----------------|
| Domain enforcement (blocking agents from wrong files) | `PreToolUse` with matcher on `Bash`, `Edit`, `Write` + path validation |
| Session logging | `SessionStart`, `SessionEnd`, `PostToolUse` (async) |
| Orchestrator injection (adding context before delegation) | `SubagentStart` to inject context, `SubagentStop` to capture results |
| Feedback propagation trigger | `SubagentStop` hook that writes downstream insights to upstream agent memory |

---

## 3. MCP Servers

**Confidence: HIGH** -- Verified from official docs at code.claude.com/docs/en/mcp

### What They Are

External tool providers using the Model Context Protocol open standard. They give Claude Code access to databases, APIs, custom tools, and services without writing custom tool implementations.

### Configuration

**CLI method:**
```bash
# Local stdio server (Windows requires cmd /c wrapper for npx)
claude mcp add --transport stdio my-tools -- cmd /c npx -y my-mcp-server

# Remote HTTP server
claude mcp add --transport http my-api https://api.example.com/mcp

# With environment variables
claude mcp add --transport stdio --env API_KEY=value my-server -- cmd /c npx -y @some/package
```

**Project-level .mcp.json:**
```json
{
  "mcpServers": {
    "pipeline-tools": {
      "command": "node",
      "args": ["${CLAUDE_PROJECT_DIR}/tools/mcp-server.js"],
      "env": {
        "DATA_DIR": "${CLAUDE_PROJECT_DIR}/data"
      }
    }
  }
}
```

### Scopes

| Scope | Stored In | Loads In | Shared? |
|-------|-----------|----------|---------|
| Local (default) | `~/.claude.json` (per-project entry) | Current project | No |
| Project | `.mcp.json` in project root | Current project | Yes (git) |
| User | `~/.claude.json` (global entry) | All projects | No |

### Subagent MCP Access

Subagents can have **dedicated MCP servers** via the `mcpServers` frontmatter field:
- **Inline definition**: Scoped to subagent only, connected on start, disconnected on finish
- **String reference**: Shares parent session's connection

This keeps MCP tool descriptions out of the main conversation context when only a specific subagent needs them.

### MCP Tool Search (Lazy Loading)

Activates automatically when MCP tool descriptions would use >10% of context window. Builds lightweight index, loads tool details on-demand. Reduces context usage by ~95% (77K tokens down to ~8.7K with 50+ tools). Shipped in Claude Code v2.1.7 (January 2026).

### Windows Gotcha

On native Windows (not WSL), local MCP servers using `npx` require `cmd /c` wrapper:
```bash
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package
```

### Pi Mapping

| Pi Concept | Claude Code MCP Equivalent |
|------------|---------------------------|
| Custom delegate-tool | MCP server providing custom tools |
| Python script invocation layer | Not needed -- agents call Bash directly. But MCP could wrap complex multi-step Python workflows |
| External data sources | MCP servers for databases, APIs, web services |

### Recommendation for This Project

**Do NOT build a custom MCP server for the pipeline.** The Python scripts are already invocable via Bash tool directly by agents. MCP adds unnecessary complexity. Use MCP only if you need:
- Tools shared across many agents with complex argument schemas
- Integration with external services (GitHub, image APIs)
- Tool descriptions that guide Claude on when/how to use them

---

## 4. Skills System

**Confidence: HIGH** -- Verified from official docs at code.claude.com/docs/en/skills

### What They Are

Instruction files (SKILL.md) that extend Claude's capabilities. They create `/slash-commands` and can be auto-invoked by Claude when relevant. Skills replaced the older `.claude/commands/` system (merged in v2.1.3).

### File Format

```yaml
---
name: run-strategy-pipeline
description: Execute the strategy pipeline for a documentary project. Use when the user wants to scrape competitors, analyze channels, or generate topics.
disable-model-invocation: true
allowed-tools: Bash(python *) Read Glob
context: fork
agent: strategy-lead
shell: bash
---

Execute the strategy pipeline for project $ARGUMENTS:

1. Run competitor scraping: `python strategy/cli.py scrape`
2. Run analysis: `python strategy/cli.py analyze`  
3. Generate topics: `python strategy/cli.py topics`
4. Initialize project: `python strategy/cli.py init $ARGUMENTS`

Report results and any issues found.
```

### Directory Structure

```
.claude/skills/
  run-strategy-pipeline/
    SKILL.md                  # Main instructions (required)
    templates/
      project-template.md     # Template files Claude can reference
    scripts/
      validate-output.py      # Scripts Claude can execute
```

| Location | Path | Applies To |
|----------|------|-----------|
| Enterprise | Managed settings | All users in organization |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin enabled |

### Key Frontmatter Fields

| Field | Description |
|-------|-------------|
| `name` | Display name, becomes `/slash-command` |
| `description` | When Claude should use this. Front-load key use case (truncated at 250 chars) |
| `disable-model-invocation` | `true` = only user can invoke via `/name`. Use for pipeline stages |
| `user-invocable` | `false` = hidden from `/` menu, only Claude invokes |
| `allowed-tools` | Tools auto-approved while skill active (e.g., `Bash(python *)`) |
| `model` | Override model while skill active |
| `effort` | Override effort level |
| `context` | `fork` = run in isolated subagent context |
| `agent` | Which subagent type for `context: fork` (e.g., `Explore`, custom agent) |
| `hooks` | Hooks scoped to skill lifecycle |
| `paths` | Glob patterns limiting auto-activation to matching files |
| `shell` | `bash` (default) or `powershell` |

### Dynamic Context Injection

Skills support shell execution BEFORE sending to Claude:
```yaml
## Current project state
- Active projects: !`ls data/projects/`
- Last scrape date: !`python strategy/cli.py status`
```

The `!` backtick syntax runs at invocation time, output replaces the placeholder.

### String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed to skill |
| `$ARGUMENTS[N]` or `$N` | Specific argument by 0-based index |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Directory containing the SKILL.md |

### Pi Mapping

| Pi Concept | Claude Code Skill Equivalent |
|------------|----------------------------|
| Skill procedures (.md files) | `.claude/skills/<name>/SKILL.md` |
| Pipeline stage triggers | Skills with `disable-model-invocation: true` = user-only `/slash-commands` |
| Domain-specific knowledge injection | Skills with `user-invocable: false` = Claude auto-loads when relevant |
| Complex multi-step workflows | Skills with `context: fork` + `agent: <custom>` |

---

## 5. CLAUDE.md Instruction System

**Confidence: HIGH** -- Verified from official docs at code.claude.com/docs/en/memory

### What It Is

Markdown files loaded into Claude's context at session start. They provide persistent instructions -- coding standards, architecture decisions, workflow rules. NOT enforced configuration; they shape behavior through context.

### File Hierarchy (precedence: later = higher)

| Scope | Location | Shared? | Use Case |
|-------|----------|---------|----------|
| Managed policy | `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | All users | Org-wide standards |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team (git) | Project architecture, conventions |
| User | `~/.claude/CLAUDE.md` | You (all projects) | Personal preferences |
| Local | `./CLAUDE.local.md` | You (this project) | Personal sandbox URLs, test data |

All files are **concatenated**, not overriding. Within each directory, `CLAUDE.local.md` appended after `CLAUDE.md`.

### Import Syntax

```markdown
See @README.md for project overview
Follow @docs/channel-identity.md for voice guidelines
Follow @channel/visual-style-guide.md for visual standards
```

Supports relative paths (resolved from containing file), recursive imports (max 5 hops), absolute paths.

### Path-Specific Rules (.claude/rules/)

```
.claude/rules/
  strategy-agents.md      # Rules for strategy domain
  editorial-agents.md     # Rules for editorial domain  
  media-agents.md         # Rules for media domain
  python-scripts.md       # Rules when working with .py files
```

With path scoping:
```yaml
---
paths:
  - "strategy/**/*.py"
  - "strategy/**/*.md"
---

# Strategy Domain Rules
- All strategy scripts use conda env at C:/Users/iorda/venvs/strategy
- Database is SQLite at data/strategy.db
```

### Size Guidance

Target under 200 lines per file. Longer files consume more context and reduce adherence. Use `@imports` and `.claude/rules/` for modularity.

### Pi Mapping

| Pi Concept | CLAUDE.md Equivalent |
|------------|---------------------|
| Channel identity docs | `@channel/channel.md`, `@channel/voice-profile.md` in CLAUDE.md imports |
| Agent expertise YAML (shared knowledge) | `.claude/rules/` path-scoped files |
| Domain enforcement rules | `.claude/rules/` with path patterns |
| Build/test commands | Top-level CLAUDE.md |

---

## 6. Subagent Dispatch (Agent Tool)

**Confidence: HIGH** -- Verified from official docs at code.claude.com/docs/en/sub-agents

### How It Works

The main conversation dispatches tasks to subagents via the built-in Agent tool. Each subagent gets its own context window, runs independently, and returns a summary.

### Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| Explore | Haiku (fast) | Read-only | File discovery, code search |
| Plan | Inherits | Read-only | Codebase research for planning |
| general-purpose | Inherits | All | Complex multi-step tasks |

### Execution Modes

| Mode | Behavior |
|------|----------|
| Foreground | Blocks main conversation. Permission prompts passed through |
| Background | Runs concurrently. Permissions pre-approved at launch. `Ctrl+B` to background a running task |

### Subagent Nesting: Definitive Answer

**Subagents CANNOT spawn other subagents.** This is explicitly documented:

> "Subagents cannot spawn other subagents. If your workflow requires nested delegation, use Skills or chain subagents from the main conversation."

**However**, when an agent runs as the **main thread** via `claude --agent <name>`, it IS the main conversation and CAN spawn subagents. The `tools` field can restrict which: `Agent(worker1, worker2)`.

### Agent Teams (Experimental Alternative)

**Requires:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and v2.1.32+

Agent teams coordinate multiple independent Claude Code instances:

| Aspect | Subagents | Agent Teams |
|--------|-----------|-------------|
| Context | Own window, results return to caller | Own window, fully independent |
| Communication | Report back to main agent only | Teammates message each other directly |
| Coordination | Main agent manages all work | Shared task list with self-coordination |
| Token cost | Lower (results summarized) | Higher (~15x standard usage) |
| Nesting | Cannot spawn subagents | Cannot spawn teams or teammates |

Teams have a lead + teammates architecture with a shared task list and mailbox system. The lead spawns teammates, assigns tasks, and synthesizes results.

**Limitation:** Experimental. Known issues with session resumption, task coordination lag, and shutdown behavior. Split-pane mode not supported on Windows Terminal.

### Resuming Subagents

Subagent invocations can be resumed (retaining full conversation history) via the `SendMessage` tool. Requires Agent Teams to be enabled. Subagent transcripts stored at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`.

### Pi Mapping

| Pi Concept | Claude Code Equivalent |
|------------|----------------------|
| 3-tier delegation (orchestrator -> lead -> worker) | NOT POSSIBLE as subagent nesting. Use: (a) `--agent orchestrator` spawning subagents (2-tier), or (b) Agent Teams with task-based coordination |
| Cross-agent feedback | `SubagentStop` hook writes insights to upstream agent memory files |
| Parallel agent execution | Background subagents OR Agent Teams |

---

## 7. Memory System

**Confidence: HIGH** -- Verified from official docs at code.claude.com/docs/en/memory

### Two Systems

| | CLAUDE.md files | Auto Memory |
|-|-----------------|-------------|
| **Who writes** | You | Claude |
| **Contains** | Instructions and rules | Learnings and patterns |
| **Scope** | Project, user, org | Per working tree |
| **Loaded** | Every session (full) | Every session (first 200 lines or 25KB of MEMORY.md) |

### Auto Memory Storage

```
~/.claude/projects/<project>/memory/
  MEMORY.md          # Index, loaded every session (200 lines / 25KB cap)
  debugging.md       # Topic file, loaded on-demand
  api-conventions.md # Topic file, loaded on-demand
```

All worktrees/subdirectories within same git repo share one memory directory. Machine-local (not synced).

Toggle: `autoMemoryEnabled: false` in settings, or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`.

### Subagent Persistent Memory

Each subagent can have its own memory via the `memory` frontmatter field:

| Scope | Location | Use When |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<agent-name>/` | Learnings apply across all projects |
| `project` | `.claude/agent-memory/<agent-name>/` | Project-specific, shareable via git |
| `local` | `.claude/agent-memory-local/<agent-name>/` | Project-specific, not in git |

When memory is enabled:
- System prompt includes instructions for reading/writing to memory directory
- First 200 lines / 25KB of MEMORY.md injected at startup
- Read, Write, Edit tools automatically enabled

### Pi Mapping

| Pi Concept | Claude Code Memory Equivalent |
|------------|------------------------------|
| Mental models (per-agent YAML expertise) | Subagent `memory: project` + initial expertise in agent markdown body |
| Cross-session persistence | Auto memory + subagent persistent memory |
| Feedback propagation (downstream insights -> upstream behavior) | `SubagentStop` hook writes to upstream agent's `.claude/agent-memory/<upstream>/MEMORY.md` |
| Session logs | Auto memory captures key learnings; transcripts at `~/.claude/projects/` |

---

## Recommended Architecture for Migration

### Delegation Model: 2-Tier with --agent Orchestrator

```
User
  |
  v
claude --agent orchestrator    <-- Main thread, CAN spawn subagents
  |
  +-- @strategy-lead (subagent, tools: Agent restricted -- CANNOT nest further)
  +-- @editorial-lead (subagent)
  +-- @media-lead (subagent)
  +-- @meta-lead (subagent)
```

Leads cannot delegate to workers as subagents. Instead:
- Leads are "fat" agents with their workers' expertise baked into their system prompt
- OR use Skills with `context: fork` for sub-tasks
- OR use pipeline skills (`/run-strategy`, `/run-editorial`, etc.) that the orchestrator invokes

### Feedback Propagation via Hooks + Memory

```
1. Downstream subagent (e.g., asset-processor) completes
2. SubagentStop hook fires
3. Hook script reads subagent's output summary
4. Hook script appends relevant insights to upstream agent memory:
   .claude/agent-memory/visual-planner/MEMORY.md
   .claude/agent-memory/visual-researcher/MEMORY.md
5. Next time visual-planner runs, it reads updated MEMORY.md at startup
```

### Pipeline Stages as Skills

```
.claude/skills/
  run-strategy/SKILL.md        # /run-strategy <topic>
  run-editorial/SKILL.md       # /run-editorial <project>
  run-media/SKILL.md           # /run-media <project>
  run-full-pipeline/SKILL.md   # /run-full-pipeline <topic>
```

Each with `disable-model-invocation: true` for user-triggered control.

---

## What NOT to Use

| Feature | Why NOT |
|---------|---------|
| Custom MCP server for Python scripts | Agents can call `Bash(python script.py args)` directly. MCP adds needless complexity |
| Agent Teams for pipeline | Experimental, Windows Terminal limitations, ~15x token cost, coordination overhead. Use subagents |
| `bypassPermissions` mode | Security risk. Use `acceptEdits` or `auto` mode with targeted `allowed-tools` in skills |
| 3-tier delegation via subagent nesting | Architecturally impossible. Don't fight it. Flatten to 2-tier |
| Very long CLAUDE.md files (>200 lines) | Reduces adherence. Split into `.claude/rules/` and use `@imports` |
| MCP servers for every agent | Bloats context. Use `mcpServers` field in subagent frontmatter to scope MCP to specific agents |

---

## Key Configuration Files Summary

```
Channel-Automation V0.6/
  CLAUDE.md                           # Project-wide instructions
  CLAUDE.local.md                     # Personal overrides (gitignored)
  .claude/
    settings.json                     # Hooks, permissions, env vars (git)
    settings.local.json               # Local overrides (gitignored)
    agents/
      orchestrator.md                 # Main orchestrator (use with --agent)
      strategy-lead.md                # Strategy domain subagent
      editorial-lead.md               # Editorial domain subagent
      media-lead.md                   # Media domain subagent
      meta-lead.md                    # Meta/pipeline domain subagent
    skills/
      run-strategy/SKILL.md           # /run-strategy pipeline trigger
      run-editorial/SKILL.md          # /run-editorial pipeline trigger
      run-media/SKILL.md              # /run-media pipeline trigger
      run-full-pipeline/SKILL.md      # Full pipeline orchestration
    rules/
      strategy.md                     # Strategy domain coding rules
      editorial.md                    # Editorial domain rules
      media.md                        # Media domain rules
      python-scripts.md               # Python conventions
    agent-memory/                     # Per-agent persistent memory (git)
      strategy-lead/MEMORY.md
      editorial-lead/MEMORY.md
      media-lead/MEMORY.md
      meta-lead/MEMORY.md
  .mcp.json                           # Project-level MCP servers (if needed)
  channel/                            # Channel identity docs (imported via @)
    channel.md
    voice-profile.md
    visual-style-guide.md
```

---

## Sources

- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)
- [Extend Claude with skills](https://code.claude.com/docs/en/skills)
- [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams)
- [Claude Code system prompts repository](https://github.com/Piebald-AI/claude-code-system-prompts) (v2.1.96, April 2026)

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Channel-Automation V0.6 — Pi-to-Claude-Code Migration**

A documentary video production pipeline for a dark mysteries YouTube channel, migrated from the Pi CLI multi-team agent framework to Claude Code. The system coordinates specialized AI agents across strategy, editorial, media, and meta domains to take a topic from idea through research, scripting, visual planning, and asset compilation — ending with a DaVinci Resolve-ready edit sheet.

**Core Value:** Every agent must retain its specialized expertise and accumulate knowledge across sessions. Cross-agent feedback propagation (downstream insights influencing upstream behavior) is the single most important capability to preserve.

### Constraints

- **Platform**: Claude Code CLI on Windows 11 — must use Claude Code's native extension points (agents, hooks, MCP, skills), no custom runtime
- **Python scripts**: All existing scripts must work without modification — only the invocation layer changes
- **GPU**: CLIP embeddings require RTX 4070 via conda env at `C:/Users/iorda/miniconda3/envs/perception-models/`
- **No paid LLM APIs**: All reasoning runs through Claude Code agents natively — no external API calls
- **Agent memory**: Must persist across sessions (not just within a single conversation)
- **Feedback propagation**: Downstream insights must influence upstream behavior in subsequent pipeline runs
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Executive Summary
## 1. Custom Subagents (.claude/agents/)
### What They Are
### File Format
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
### Critical Limitation: No Subagent Nesting
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
## 2. Hooks System
### What They Are
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
### Four Handler Types
| Type | Format | Use Case |
|------|--------|----------|
| `command` | Shell script, receives JSON stdin, communicates via exit codes + stdout JSON | Validation, logging, file operations |
| `http` | POST to URL with JSON body | Remote validation, team-wide policies |
| `prompt` | Single-turn Claude evaluation using `$ARGUMENTS` | Quick AI-based checks |
| `agent` | Spawns subagent with tool access for deep verification | Complex validation requiring file reads |
### PreToolUse Blocking (Key for Domain Enforcement)
### Hook Locations (precedence order)
### Pi Mapping
| Pi Concept | Claude Code Hook |
|------------|-----------------|
| Domain enforcement (blocking agents from wrong files) | `PreToolUse` with matcher on `Bash`, `Edit`, `Write` + path validation |
| Session logging | `SessionStart`, `SessionEnd`, `PostToolUse` (async) |
| Orchestrator injection (adding context before delegation) | `SubagentStart` to inject context, `SubagentStop` to capture results |
| Feedback propagation trigger | `SubagentStop` hook that writes downstream insights to upstream agent memory |
## 3. MCP Servers
### What They Are
### Configuration
# Local stdio server (Windows requires cmd /c wrapper for npx)
# Remote HTTP server
# With environment variables
### Scopes
| Scope | Stored In | Loads In | Shared? |
|-------|-----------|----------|---------|
| Local (default) | `~/.claude.json` (per-project entry) | Current project | No |
| Project | `.mcp.json` in project root | Current project | Yes (git) |
| User | `~/.claude.json` (global entry) | All projects | No |
### Subagent MCP Access
- **Inline definition**: Scoped to subagent only, connected on start, disconnected on finish
- **String reference**: Shares parent session's connection
### MCP Tool Search (Lazy Loading)
### Windows Gotcha
### Pi Mapping
| Pi Concept | Claude Code MCP Equivalent |
|------------|---------------------------|
| Custom delegate-tool | MCP server providing custom tools |
| Python script invocation layer | Not needed -- agents call Bash directly. But MCP could wrap complex multi-step Python workflows |
| External data sources | MCP servers for databases, APIs, web services |
### Recommendation for This Project
- Tools shared across many agents with complex argument schemas
- Integration with external services (GitHub, image APIs)
- Tool descriptions that guide Claude on when/how to use them
## 4. Skills System
### What They Are
### File Format
### Directory Structure
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
## Current project state
- Active projects: !`ls data/projects/`
- Last scrape date: !`python strategy/cli.py status`
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
## 5. CLAUDE.md Instruction System
### What It Is
### File Hierarchy (precedence: later = higher)
| Scope | Location | Shared? | Use Case |
|-------|----------|---------|----------|
| Managed policy | `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | All users | Org-wide standards |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team (git) | Project architecture, conventions |
| User | `~/.claude/CLAUDE.md` | You (all projects) | Personal preferences |
| Local | `./CLAUDE.local.md` | You (this project) | Personal sandbox URLs, test data |
### Import Syntax
### Path-Specific Rules (.claude/rules/)
# Strategy Domain Rules
- All strategy scripts use conda env at C:/Users/iorda/venvs/strategy
- Database is SQLite at data/strategy.db
### Size Guidance
### Pi Mapping
| Pi Concept | CLAUDE.md Equivalent |
|------------|---------------------|
| Channel identity docs | `@channel/channel.md`, `@channel/voice-profile.md` in CLAUDE.md imports |
| Agent expertise YAML (shared knowledge) | `.claude/rules/` path-scoped files |
| Domain enforcement rules | `.claude/rules/` with path patterns |
| Build/test commands | Top-level CLAUDE.md |
## 6. Subagent Dispatch (Agent Tool)
### How It Works
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
### Agent Teams (Experimental Alternative)
| Aspect | Subagents | Agent Teams |
|--------|-----------|-------------|
| Context | Own window, results return to caller | Own window, fully independent |
| Communication | Report back to main agent only | Teammates message each other directly |
| Coordination | Main agent manages all work | Shared task list with self-coordination |
| Token cost | Lower (results summarized) | Higher (~15x standard usage) |
| Nesting | Cannot spawn subagents | Cannot spawn teams or teammates |
### Resuming Subagents
### Pi Mapping
| Pi Concept | Claude Code Equivalent |
|------------|----------------------|
| 3-tier delegation (orchestrator -> lead -> worker) | NOT POSSIBLE as subagent nesting. Use: (a) `--agent orchestrator` spawning subagents (2-tier), or (b) Agent Teams with task-based coordination |
| Cross-agent feedback | `SubagentStop` hook writes insights to upstream agent memory files |
| Parallel agent execution | Background subagents OR Agent Teams |
## 7. Memory System
### Two Systems
| | CLAUDE.md files | Auto Memory |
|-|-----------------|-------------|
| **Who writes** | You | Claude |
| **Contains** | Instructions and rules | Learnings and patterns |
| **Scope** | Project, user, org | Per working tree |
| **Loaded** | Every session (full) | Every session (first 200 lines or 25KB of MEMORY.md) |
### Auto Memory Storage
### Subagent Persistent Memory
| Scope | Location | Use When |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<agent-name>/` | Learnings apply across all projects |
| `project` | `.claude/agent-memory/<agent-name>/` | Project-specific, shareable via git |
| `local` | `.claude/agent-memory-local/<agent-name>/` | Project-specific, not in git |
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
## Recommended Architecture for Migration
### Delegation Model: 2-Tier with --agent Orchestrator
- Leads are "fat" agents with their workers' expertise baked into their system prompt
- OR use Skills with `context: fork` for sub-tasks
- OR use pipeline skills (`/run-strategy`, `/run-editorial`, etc.) that the orchestrator invokes
### Feedback Propagation via Hooks + Memory
### Pipeline Stages as Skills
## What NOT to Use
| Feature | Why NOT |
|---------|---------|
| Custom MCP server for Python scripts | Agents can call `Bash(python script.py args)` directly. MCP adds needless complexity |
| Agent Teams for pipeline | Experimental, Windows Terminal limitations, ~15x token cost, coordination overhead. Use subagents |
| `bypassPermissions` mode | Security risk. Use `acceptEdits` or `auto` mode with targeted `allowed-tools` in skills |
| 3-tier delegation via subagent nesting | Architecturally impossible. Don't fight it. Flatten to 2-tier |
| Very long CLAUDE.md files (>200 lines) | Reduces adherence. Split into `.claude/rules/` and use `@imports` |
| MCP servers for every agent | Bloats context. Use `mcpServers` field in subagent frontmatter to scope MCP to specific agents |
## Key Configuration Files Summary
## Sources
- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp)
- [Extend Claude with skills](https://code.claude.com/docs/en/skills)
- [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams)
- [Claude Code system prompts repository](https://github.com/Piebald-AI/claude-code-system-prompts) (v2.1.96, April 2026)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

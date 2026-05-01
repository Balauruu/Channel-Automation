# Subagent Dispatch Reference

Tool reference for the Claude Code `Agent` tool. Use when wiring up
dispatch in a pipeline agent. The decision rule for *whether* to
dispatch lives in `SKILL.md` (Decision Rule: Internal Subagent Dispatch).

## Agent Tool Parameters

| Parameter | Required | Default | Purpose |
|-----------|----------|---------|---------|
| `description` | yes | - | Short (3-5 word) label for the task |
| `prompt` | yes | - | Full task briefing — self-contained; subagent has no parent context |
| `subagent_type` | no | `general-purpose` | Agent definition name from `.claude/agents/*.md`, or built-in (`Explore`, `Plan`, `general-purpose`) |
| `model` | no | inherit | `sonnet`, `opus`, `haiku`, or full model ID |
| `isolation` | no | shared FS | `"worktree"` creates a temp git worktree; auto-cleaned if subagent makes no changes |
| `name` | no | - | Makes the agent addressable via `SendMessage(to: name)` |
| `run_in_background` | no | false | If true, parent continues; notified on completion |

## Built-in Agent Types

| Type | Model | Tools | Use case |
|------|-------|-------|----------|
| `Explore` | haiku | Read-only | Fast codebase search (specify breadth: quick, medium, very thorough) |
| `Plan` | inherit | Read-only | Research during plan mode |
| `general-purpose` | inherit | All tools | Default; complex multi-step tasks |

## Context and State

**Subagents start with zero parent context.** No conversation history, no
parent system prompt, no implicit tool access. The `prompt` parameter is
their entire briefing.

Prompts must be self-contained:
- Bad: "Fix the bug we discussed earlier"
- Good: "Fix the token refresh bug in `src/auth/session.ts` where expired
  refresh tokens cause a 500. Write a failing test first."

## Concurrency

- **Parallel:** Multiple `Agent` calls in a single message run
  concurrently. Results return asynchronously.
- **Background:** `run_in_background: true` means the parent continues
  immediately. Claude Code requests upfront permission approval for all
  tools the subagent will need; the subagent auto-denies anything not
  pre-approved. The user is notified when the background agent completes.
- **Foreground:** Parent blocks until subagent completes. Permission
  prompts pass through to the user normally.

## Communication

- The subagent's result returns as a single message to the parent on
  completion.
- The result is NOT visible to the user; the parent must relay it.
- To continue a completed subagent: `SendMessage(to: agent_id, message:
  "...")` resumes it with prior context.
- A new `Agent` call starts fresh with no memory of prior runs.

## Agent Definition Frontmatter

Fields supported in `.claude/agents/<name>.md`:

```yaml
---
name: lowercase-hyphenated-id       # Required
description: When to delegate...    # Required (Claude reads this to auto-delegate)
tools: Read, Grep, Glob, Bash       # Optional allowlist (omit = all tools)
disallowedTools: Write, Edit        # Optional denylist (applied before tools)
model: sonnet                       # Optional (sonnet, opus, haiku, full ID, inherit)
effort: high                        # Optional (low, medium, high, xhigh, max)
permissionMode: auto                # Optional
maxTurns: 10                        # Optional max agentic turns
memory: project                     # Optional (user, project, local)
background: true                    # Optional (always run in background)
isolation: worktree                 # Optional
color: blue                         # Optional
skills: [skill-a, skill-b]          # Optional (full skill content injected at startup)
mcpServers: [...]                   # Optional
hooks: {...}                        # Optional lifecycle hooks
initialPrompt: |                    # Optional auto-submitted prompt
  Review your memory before starting.
---
```

## Anti-Patterns

| Anti-Pattern | Problem |
|--------------|---------|
| Shallow prompts that assume parent context | Subagent produces wrong or incomplete output |
| Dispatching for 1-2 trivial items | Overhead exceeds benefit; do it inline |
| Dispatching interdependent work in parallel | Subagents can't coordinate; results conflict |
| Too many subagents returning detailed results | Aggregated results bloat parent context |
| Subagent-spawning-subagent chains | Not supported by default; `Agent` tool unavailable to subagents |
| Sequential dispatch when parallel fits | Wastes time; independent items should run concurrently |

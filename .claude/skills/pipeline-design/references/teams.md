# Teams Reference

Reference for Claude Code's Teams feature — long-running, coordinated
multi-session structures. Use when evaluating whether a pipeline workflow
benefits from team-based orchestration vs plain subagent dispatch. The
decision rule lives below in *When to Use Teams vs Plain Dispatch*.

**Status:** Research preview (experimental). Requires
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

## Teams vs Subagents

| | Subagent (`Agent` tool) | Team (`TeamCreate` + named `Agent`) |
|---|---|---|
| Lifetime | Short — one task, returns a summary, exits | Long — full Claude Code session, persists across tasks |
| Context | Discarded on completion | Independent 1M-token window per teammate |
| Coordination | None — one-shot | Shared task list + lead-driven `SendMessage` |
| Cost | 1× | ~3-4× per teammate |

## Core Tools

```
TeamCreate({ team_name, description })   // Lead only. Creates ~/.claude/teams/{team_name}/
TeamDelete()                              // Lead only. Shut down teammates first.
SendMessage({ to, message })              // Lead → teammate (only). Auto-resumes stopped teammates.

Agent({                                   // Spawn a teammate
  name: "researcher",                     // Addressable name within the team
  team_name: "my-team",                   // Must match an existing TeamCreate name
  subagent_type: "researcher",            // Optional; loads agent definition
  prompt: "...",
  model: "opus",                          // Optional override
  run_in_background: true                 // Recommended for parallel work
})
```

## Architecture

```
Lead Session                 Teammate A              Teammate B
=============                ===========             ===========
TeamCreate("my-team")
Agent({name:"a", ...})  -->  Session starts
Agent({name:"b", ...})  ----------------------------> Session starts
                             Claims task             Claims task
                             Works...                Works...
SendMessage(to:"a")     -->  Receives guidance
                             Completes task          Completes task
TaskList() polls progress    (auto-unblocks)         (auto-unblocks)
TeamDelete()
```

**Shared state:** task list, filesystem (unless worktree isolation).
**Isolated state:** each teammate has its own context window; no
conversation history inheritance from lead; teams are namespace-isolated.

## Communication Model

| Sender | Lead | Teammates | Cross-team |
|--------|------|-----------|-----------|
| Lead | N/A | Yes (`SendMessage`) | No |
| Teammate | Auto-notifies on completion | No (bug #48160) | No |

For inter-teammate coordination, route through the lead or encode context
in shared task descriptions.

## When to Use Teams vs Plain Dispatch

### Teams when

- **True parallelism with coordination:** multiple agents on different
  aspects of a shared project, with task-dependency management
- **Long-running work:** tasks >15 min per agent, where independent
  context windows prevent token bloat
- **Role-based decomposition:** clear domain boundaries (research,
  writing, media) where each role benefits from a dedicated session
- **Competing-hypothesis debugging:** multiple investigators testing
  different theories, then debating findings

### Plain dispatch when

- **Short, focused tasks:** <15 min of work per agent
- **No coordination needed:** independent items that just need processing
- **Budget-sensitive:** teams cost 3-4× tokens
- **Sequential dependencies:** work forms a chain, not a parallel graph
- **High file contention:** multiple agents would edit the same files

### Decision matrix

| Factor | Plain Dispatch | Teams |
|--------|---------------|-------|
| Task duration | <15 min | >15 min |
| Agent count | 1-3 | 3-6 |
| Coordination | None | Shared task list + messaging |
| Cost | 1× | 3-4× per teammate |
| Context isolation | Subagent context discarded | Full 1M-token window per teammate |
| File contention | Same risk unless worktree isolation | Same risk unless worktree isolation |

**Break-even:** task duration >15 minutes with meaningful parallelism.

## Design Constraints

| Limitation | Design impact |
|------------|---------------|
| One team per session | Clean up before starting a new team |
| No nested teams | Only the lead manages structure |
| Teammates cannot `SendMessage` | Coordination must route through lead |
| `skills` and `mcpServers` from agent definitions NOT loaded for teammates | Teammates use project/user settings; design with this in mind |
| Permissions inherit from lead at spawn time | Cannot set per-teammate permission modes |
| `/resume` and `/rewind` do not restore teammates | Lead must respawn after resume |

## Adoption Guidance

Teams remain a research preview, with known coordination bugs (notably
that teammates cannot originate `SendMessage` and that teammates may
silently exit). For most pipelines today, sequential or parallel
*subagent* dispatch with the orchestrator coordinating handoffs is more
reliable than full Teams orchestration. Adopt Teams when the project's
workflow genuinely needs long-running parallel role-based sessions with
shared task state, *and* the project can tolerate experimental-feature
risk. Revisit on every Claude Code release until Teams leave preview.

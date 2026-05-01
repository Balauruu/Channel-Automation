# Task Tracking Reference

Tool reference for Claude Code's task management tools. Use when wiring
up task registration in a pipeline agent. The decision rule for *whether*
to track tasks lives in `SKILL.md` (Decision Rule: Task Tracking).

## Tools

| Tool | Purpose |
|------|---------|
| `TaskCreate` | Create a task with description, ownership, dependencies |
| `TaskUpdate` | Change status, reassign, modify dependencies, attach metadata |
| `TaskList` | List all tasks (minimal fields; no descriptions) |
| `TaskGet` | Fetch full details for one task (expensive — don't loop over) |
| `TaskOutput` | Attach structured results to a task |
| `TaskStop` | Mark a task as blocked, cancelled, deferred, or errored |

## TaskCreate

```
TaskCreate({
  subject: string,          // Required. Imperative title (max 256 chars)
  description: string,      // Required. Full details (max 8000 chars)
  activeForm?: string,      // Present-continuous label shown during in_progress
  blockedBy?: string[],     // Task IDs that must complete first
  metadata?: object         // Custom key-value pairs (priority, estimate, etc.)
})
```

Returns `{ taskId, subject, status: "pending" }`. Tasks persist to disk
immediately. Max 50 tasks per call.

## TaskUpdate

```
TaskUpdate({
  taskId: string,
  status?: "pending" | "in_progress" | "completed",
  owner?: string,
  description?: string,     // Replaces entire description
  metadata?: object,        // Merged into existing metadata
  addBlockedBy?: string[],
  removeBlockedBy?: string[],
  addBlocks?: string[],
  removeBlocks?: string[]
})
```

**Status transitions:** `pending → in_progress → completed`. Cannot skip
`pending → completed` directly. `completed → pending` reopens.

**Auto-unblocking:** When a task completes, it is automatically removed
from the `blockedBy` arrays of all dependent tasks.

## Persistence

Tasks exist only in session memory by default. To persist across sessions:

```bash
export CLAUDE_CODE_TASK_LIST_ID=my-project
```

Tasks then persist to `~/.claude/tasks/<CLAUDE_CODE_TASK_LIST_ID>/tasks.json`.

## Visibility Across Agents

- Parent session tasks are visible to subagents launched via `Agent`.
- Subagents can read (`TaskList`, `TaskGet`) and modify (`TaskUpdate`,
  `TaskOutput`) parent tasks.
- Parallel sessions sharing the same `CLAUDE_CODE_TASK_LIST_ID` see each
  other's tasks in real time.
- No access control; rely on agent discipline via the `owner` field.

## Tasks vs Todos

| Feature | Todos (TodoWrite) | Tasks (TaskCreate/Update) |
|---------|-------------------|---------------------------|
| Persistence | Session only | Survives session (with `TASK_LIST_ID`) |
| Multi-session | No | Yes |
| Dependencies | No | Yes (`blockedBy`) |
| Output attachment | No | Yes (`TaskOutput`) |
| Ideal for | Quick checklists | Multi-step workflows |

## Pipeline Integration Pattern

For a multi-step pipeline agent with N phases:

**At agent start** — register all phases as one task with phase metadata:
```
TaskCreate({
  subject: "<agent-task summary>",
  description: "<N>-phase workflow...",
  activeForm: "<active-form label>",
  metadata: { phases: ["phase-1", "phase-2", "phase-3", "phase-N"] }
})
```

**At each phase transition:**
```
TaskUpdate({
  taskId: id,
  status: "in_progress",
  metadata: { current_phase: 2, phase_name: "phase-2" }
})
```

**At completion:**
```
TaskOutput({
  taskId: id,
  output: { type: "artifact", content: "...", metadata: { format: "markdown" } },
  replace: true
})
TaskUpdate({ taskId: id, status: "completed" })
```

## Cross-Agent Dependency Chains

```
upstream_id   = TaskCreate({ subject: "Upstream work",       owner: "agent-a" })
fanout_a_id   = TaskCreate({ subject: "Parallel branch A",   owner: "agent-b", blockedBy: [upstream_id] })
fanout_b_id   = TaskCreate({ subject: "Parallel branch B",   owner: "agent-c", blockedBy: [upstream_id] })
join_id       = TaskCreate({ subject: "Final consolidation", owner: "agent-d", blockedBy: [fanout_a_id, fanout_b_id] })
```

When `agent-a` completes, both fanout tasks auto-unblock. When both
fanouts complete, `join_id` auto-unblocks. This is the canonical
fan-out / fan-in DAG.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Too many fine-grained tasks | TaskList becomes unwieldy; context bloat | One task per meaningful milestone |
| Forgetting to update status | Dependent tasks never unblock | Always complete or stop tasks explicitly |
| `TaskGet` in loops | Expensive; fetches full details for every task | `TaskList` to filter, then `TaskGet` only for the ones you need |
| Circular dependencies | Deadlock (A blocks B, B blocks A) | Design DAG; use `TaskStop` if genuinely blocked |
| Tasks for trivial work (<3 steps) | Overhead exceeds the work itself | Only track when ≥3 steps |
| Stale metadata | Misleading progress signals | Update metadata at each phase transition |

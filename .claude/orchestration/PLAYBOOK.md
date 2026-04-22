# Playbook — Cross-Agent Coordination Inbox

Cross-agent handoff signals staged by the pipeline observer and absorbed by
target agents. Entries flow `## Open` → `## Resolved` once the pattern is
absorbed into the target agent's MEMORY.md.

Each entry is authored by `@observer` (via the memory-system D pipeline),
accepted into `## Open` by `@harvester` (via `/evolve`), read by the target
agent at task start (per `agent-protocols` skill), and moved to `## Resolved`
once a later `/evolve` pass confirms the target agent's MEMORY.md now covers
the pattern.

## Entry format

```
### PB-NNN
- date: YYYY-MM-DD
- source_agent: <who observed>
- target: <agent-name>
- issue: one-line description
- body: multi-line context
- evidence: <run agent_id references>
```

IDs are incremented from the highest existing ID across `## Open` and
`## Resolved`.

## Open

(no entries yet)

## Resolved

(no entries yet)

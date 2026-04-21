---
name: agent-protocols
description: >-
  Shared behavioral protocols for all pipeline agents. Memory is auto-injected
  and read-only. Observer handles all memory writes. Not user-invocable.
user-invocable: false
---

# Agent Protocols

## Memory

Your MEMORY.md is auto-injected into your context at task start (first
200 lines). Treat it as read-only reference -- you do not write to memory
files. The observer system handles all memory updates after your runs.

Entries tagged [HIGH], [MED], or [LOW] are confidence levels from the
observer. Untagged entries are legacy. Both permanent and pending entries
are visible to you.

## Project Context

Read ./CLAUDE.md at the start of every task for project-wide rules,
agent reference table, folder map, and architecture constraints.

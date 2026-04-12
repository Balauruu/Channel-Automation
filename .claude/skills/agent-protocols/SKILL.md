---
name: agent-protocols
description: >-
  Shared behavioral protocols for all agents. Memory lifecycle (read at start,
  update after work) and feedback signal handling. Injected into agent context
  at startup via the skills: frontmatter field. Not user-invocable.
user-invocable: false
---

# Agent Protocols

Behavioral protocols shared by all agents in the Channel-Automation pipeline. This skill is injected into your context at startup. Follow these protocols for every task.

## Memory Lifecycle

Your MEMORY.md (`.claude/agent-memory/your-agent-name/MEMORY.md`) is auto-injected into your context at task start (first 200 lines). This is your only injection -- keep the file concise and relevant.

### At Task Start

1. Review your auto-injected MEMORY.md content
2. Identify patterns and decisions relevant to the current task
3. Note any open questions that this task might answer

### During Work

- **Universal knowledge** (applies across all projects): note for MEMORY.md update at task end
- **Project-specific observations**: write to `.claude/project-memories/<current-project>/your-agent-name.md`

### At Task End

1. Append new universal entries to your MEMORY.md with timestamp
2. Entry format: `- [YYYY-MM-DD] observation or decision`
3. Preserve ALL existing entries -- this is append-only, never delete
4. Keep MEMORY.md under 200 lines total -- if approaching the limit, flag in your task completion summary

### Section Guide

Your MEMORY.md has five sections. Use them as follows:

- **Key Files** -- Paths and resources you reference regularly. Stable, rarely changes.
- **Decisions** -- Choices made about how you work and why. Record when you commit to an approach.
- **Patterns** -- Recurring behaviors or tendencies observed across multiple tasks that would change how you approach future work.
- **Observations** -- Insights that would change how you or another agent approaches future work. Universal only -- project-specific findings go to project notes. Do NOT record: task completion events ("first run completed", "dossier written"), file creation logs, or restatements of what you already output.
- **Open Questions** -- Unknowns that future tasks should investigate. Remove entries when answered.

## Project-Scoped Notes

Project-specific observations belong in the project directory, not in your persistent memory.

### During Work

Write project-specific observations to `.claude/project-memories/<project-name>/your-agent-name.md`. These include:
- Source-specific findings tied to the current topic
- Asset decisions specific to the current production
- Project-scoped questions and blockers

### At Project End

Review your project notes and promote any **generalizable insights** to your MEMORY.md (compressed into one entry). The project notes remain archived with the project.

## Feedback Signal Protocol

Cross-agent insights are stored in `.claude/feedback/signals.yaml`. This file is the feedback inbox -- a staging area where insights land, then get promoted into permanent agent changes. Signals permanently alter agent behavior; they are NOT ephemeral prompt injections.

### Domain Mapping

Identify your domain by matching your agent name:

| Domain | Agents |
|--------|--------|
| editorial | researcher, writer, style-extractor, editorial-lead |
| visual | visual-researcher, visual-planner, asset-processor, asset-curator |
| strategy | strategy |
| meta | meta, code-reviewer, compiler |

### At Task Start (after reviewing MEMORY.md)

1. Read `.claude/feedback/signals.yaml` from the project root using the Read tool
   - If the file or directory does not exist, skip signal processing (no signals yet)
2. Identify your domain from the mapping above
3. Filter for signals where `domain` matches your domain AND `resolved: false`
4. For each unresolved signal in your domain:
   - If `promotion: memory` -- evaluate whether the insight is actionable for your current or future tasks. If actionable:
     a. Add a corresponding entry to your MEMORY.md in the appropriate section (patterns, decisions, or observations) with format: `- [YYYY-MM-DD] [From SIG-NNN] insight text`
     b. Update signals.yaml: set `resolved: true`, add `resolved_by: your-agent-name`, add `resolved_date: "YYYY-MM-DD"`
   - If `promotion: definition` -- do NOT self-promote. Note it for your task completion summary.
5. If signals.yaml has more than 50 entries, remove the oldest `resolved: true` entries to keep the file manageable. Never remove unresolved entries.

### At Task End

1. Review your work for cross-agent insights -- observations that would help agents in OTHER domains
   - Self-only learnings go to your MEMORY.md, NOT to signals
   - Focus on insights that would change how another agent works
2. If you have cross-agent insights, read the current `.claude/feedback/signals.yaml`
3. Find the highest existing SIG-NNN ID number and increment for your new entries
4. Append new signal entries to the `signals:` array with these fields:
   ```yaml
   - id: SIG-NNN           # Next sequential ID
     date: "YYYY-MM-DD"    # Today's date, no colons
     source_agent: your-agent-name
     domain: target-domain  # editorial | visual | strategy | meta
     type: category         # quality | content | technical | process
     promotion: memory      # memory (default) | definition (only for procedure/guardrail changes)
     resolved: false
     insight: "One-line actionable insight"
   ```
5. Write the complete updated signals.yaml file (read full file first, append entries, write back)
6. If any `promotion: definition` signals were noted during task start, report them in your completion message:
   "Flagged for review: [SIG-NNN] insight text -- needs @meta or human review for agent definition change"

## Project Context

Read ./CLAUDE.md at the start of every task for project-wide rules and conventions. This file contains the agent reference table, folder map, architecture rules, and platform constraints.

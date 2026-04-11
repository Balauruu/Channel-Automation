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

### At Task Start

1. Read your complete MEMORY.md file using the Read tool
   - Path: `.claude/agent-memory/your-agent-name/MEMORY.md`
   - Read the FULL file, not just the auto-injected first 200 lines
   - The auto-injected content is a preview -- always Read the complete file
2. Review all sections: key_files, decisions, patterns, observations, open_questions
3. Identify patterns and decisions relevant to the current task
4. Note any open questions that this task might answer

### During Work

- Notice new patterns as you work
- Track decisions you make and why
- Record key files you create or discover

### At Task End

1. Read your current MEMORY.md again (it may have been updated during the session)
2. Append new entries to the appropriate section with timestamp
3. Entry format: `- [YYYY-MM-DD] observation or decision`
4. Preserve ALL existing entries -- this is append-only, never delete
5. Sections to update: key_files, decisions, patterns, observations, open_questions

### Memory Format Example

```markdown
## Patterns

- [2026-04-10] Wikipedia articles on obscure cults need cross-referencing with primary newspaper sources
- [2026-04-10] Academic papers behind paywalls often have freely available preprints on ResearchGate
- [2026-04-11] Court records from before 1970 are rarely digitized -- newspaper coverage is the best proxy
```

## Feedback Signal Protocol

Cross-agent insights are stored in `feedback/signals.yaml` at the project root. This file is the feedback inbox -- a staging area where insights land, then get promoted into permanent agent changes. Signals permanently alter agent behavior; they are NOT ephemeral prompt injections.

### Domain Mapping

Identify your domain by matching your agent name:

| Domain | Agents |
|--------|--------|
| editorial | researcher, writer, style-extractor, editorial-lead |
| visual | visual-researcher, visual-planner, asset-processor, asset-curator |
| strategy | strategy |
| meta | meta, code-reviewer, compiler |

### At Task Start (after reading MEMORY.md)

1. Read `feedback/signals.yaml` from the project root using the Read tool
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
2. If you have cross-agent insights, read the current `feedback/signals.yaml`
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

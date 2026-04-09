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

### At Task Start

1. Check if `feedback/SIGNALS.md` exists in the project root
2. If it exists, read it and look for entries where `to_agent` matches your agent name
3. Apply high-severity signals to your current work
4. Note medium-severity signals for awareness

### At Task End

1. If you noticed quality issues or insights that would help OTHER agents, write a signal
2. Append to `feedback/SIGNALS.md` (create file and directory if they do not exist)
3. Signal entry format:

   ```
   ### [YYYY-MM-DD] from:your-name to:target-agent severity:high|medium|low

   One-line insight with evidence.
   ```

4. Only write signals that are actionable by the target agent
5. Do NOT write signals to yourself -- use your MEMORY.md instead

## Project Context

Read ./CLAUDE.md at the start of every task for project-wide rules and conventions. This file contains the agent reference table, folder map, architecture rules, and platform constraints.

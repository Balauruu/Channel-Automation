---
name: agent-protocols
description: >-
  Shared behavioral protocols for all pipeline agents. Agents read and write
  their own memory, process cross-agent inbox signals, and self-curate at
  run start. Not user-invocable.
user-invocable: false
---

# Agent Protocols

Behavioral protocols shared by all agents in the Channel-Automation pipeline. This skill is injected into your context at startup. Follow these protocols for every task.

## Memory

Your MEMORY.md (`.claude/agent-memory/<your-agent-name>/MEMORY.md`) is auto-injected into your context at task start (first 200 lines). You read AND write to this file directly.

### Guided Categories

Your MEMORY.md has these sections. Use them as follows:

- **Key Files** -- Paths and resources you reference regularly. Structural, rarely changes. Never curated.
- **Decisions** -- Methodology choices that apply across all projects. Record when you commit to an approach.
- **Patterns** -- Recurring behavioral rules learned from experience across multiple tasks.
- **Observations** -- General domain knowledge. NOT project-specific findings.
- **Open Questions** -- Unresolved issues that need human input. Remove when answered.
- **Archived** -- Entries moved here during self-curation. Safety net past the 200-line injection limit.

### Scope Boundary

Only write entries that are general behavioral knowledge applicable across all projects. If a finding only applies to the current project (e.g., a specific website's behavior for a specific topic), do NOT write it to MEMORY.md. Project-specific findings belong in the project's output files.

**Test:** "Would a fresh instance of me, working on a completely different topic, benefit from knowing this?" If no, don't write it.

### Writing to Memory

During your work, when you discover something worth remembering:
1. Identify which category it belongs to (Decisions, Patterns, Observations, Open Questions)
2. Append a one-line entry under the appropriate heading
3. No date-stamps -- entries stand on their own merit
4. Keep entries concise and actionable

## Inbox Protocol

Your inbox (`.claude/agent-memory/<your-agent-name>/inbox.md`) receives cross-agent signals from other agents in the pipeline.

### At Task Start

1. Read your `inbox.md`
2. For each signal, decide: internalize into the appropriate MEMORY.md category, or discard if not relevant
3. Clear `inbox.md` after processing (write an empty file)

### Sending Signals

When you discover something another agent in the pipeline needs to know:
1. Identify the target agent(s) using the pipeline adjacency map below
2. Append one line to the target's inbox: `- [SIGNAL] from: <your-name> | <actionable insight>`
3. Only signal general knowledge, not project-specific findings
4. For multi-consumer signals, append the same line to each target's inbox.md

### Pipeline Adjacency Map

| Agent | Upstream (reads from) | Downstream (sends to) |
|-------|----------------------|----------------------|
| strategy | -- | researcher |
| researcher | strategy | writer |
| writer | researcher | visual-researcher |
| style-extractor | -- | writer |
| visual-researcher | writer | visual-planner |
| visual-planner | visual-researcher | asset-processor |
| asset-processor | visual-planner | asset-curator, compiler |
| asset-curator | asset-processor | -- |
| compiler | writer, asset-processor | -- |
| code-reviewer | -- | any agent (via inbox) |

Signal to your downstream neighbors when you discover something that would change how they work. Signal upstream when you discover something that would improve what they send you.

## Self-Curation Protocol

At the beginning of each run, after processing your inbox, review your MEMORY.md and curate if needed.

### Rules

1. **Merge near-duplicates** -- If two entries say essentially the same thing, combine into one clearer entry
2. **Resolve contradictions** -- If a newer entry contradicts an older one, keep the newer entry in its category and move the old to `## Archived` with a brief reason: `- (archived: reason) Original text`
3. **Never delete** -- Entries are kept, merged, or archived. Nothing is permanently removed
4. **Key Files are exempt** -- Structural references, not learned knowledge. Only update when paths change
5. **Open Questions are exempt** -- Require human resolution, not agent curation
6. **Skip if small** -- If fewer than ~15 entries total across Decisions, Patterns, and Observations, skip curation

### Archived Section

- Lives at the bottom of MEMORY.md, past the context injection limit
- Format: `- (archived: reason) Original entry text`
- Safety net -- a human can recover accidentally archived entries

## Skill Insights

When using a skill (e.g., crawl4ai-scraping), you may append general insights to its `insights.md` file. Same scope boundary applies -- general insights only, no project-specific findings.

## Project Context

Read ./CLAUDE.md at the start of every task for project-wide rules, agent reference table, folder map, and architecture constraints.

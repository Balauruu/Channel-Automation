---
name: agent-protocols
description: >-
  Shared behavioral protocols for all agents. Agents read and write
  their own memory, process cross-agent inbox signals, and self-curate at
  run start. Not user-invocable.
user-invocable: false
---

# Agent Protocols

This skill is injected into your context at startup. Follow these protocols for every task.

## Memory

Your MEMORY.md (`.claude/agent-memory/<your-agent-name>/MEMORY.md`) is auto-injected into your context at task start. You read AND write to this file directly.

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

Before writing any entry, pass all three gates in order. If any gate rejects, do not write.

1. **Dedup gate** — Scan your agent body (the `.md` spec that defines you). Is this insight already expressed there as an instruction, rule, or workflow step? If yes → skip.
2. **Generalization gate** — Remove all project names, entity names, specific dates, and file paths from the candidate entry. Does it still make sense as a standalone instruction? If not → it is project-specific → skip.
3. **Rewrite** — Write the generalized version, not the original. The entry must read as a rule or pattern, not a case study.

**Examples:**

| Raw observation during task | Gate result | What gets written (if anything) |
|---|---|---|
| "Bavarian state archives are the best source for pre-WWII German rural crime" | Fails gate 2 — remove "Bavarian" and "pre-WWII German rural crime" and it collapses | Nothing |
| "Unit 731 institutional corruption arc works better when cover-up and justice failure are separate acts" | Passes gate 2 after stripping — general structural lesson | "State-as-perpetrator topics benefit from splitting cover-up mechanics and justice failure into separate acts" |
| "Scripts should target 3,000-7,000 words" | Fails gate 1 — already in agent body Decisions | Nothing |

## Inbox Protocol

Your inbox (`.claude/agent-memory/<your-agent-name>/inbox.md`) receives cross-agent signals from other agents in the pipeline.

### At Task Start

1. Read your `inbox.md`
2. For each signal, decide: internalize into the appropriate MEMORY.md category, or discard if not relevant
3. Clear `inbox.md` after processing (write an empty file)

### Sending Cross-Project Insights

The inbox is for **general behavioral knowledge** that should change how the target agent operates on *any* future project. It is **NOT** for project handoff -- the output file the next agent reads (e.g., `Research.md`, `Script.md`, `entity_index.json`, `media_leads.json`) IS the handoff. Do not duplicate that file's contents as a signal.

**Valid triggers.** Send a signal only when one of these applies:
- A new failure mode you encountered that the next agent should anticipate on future topics
- A source, tool, or method that proved unreliable for a recognizable class of topics
- A pattern in upstream output that consistently makes your work harder (signal upstream)
- A capability gap downstream should know about, so they don't expect data you cannot supply

If the insight does not match one of the triggers above, do not send it.

**Procedure.**
1. Identify the target agent(s) using the pipeline adjacency map below
2. Append one line to the target's inbox: `- [SIGNAL] from: <your-name> | <actionable insight>`
3. For multi-consumer signals, append the same line to each target's inbox.md

**The test (same as MEMORY.md):** "Would a fresh instance of the target agent, working on a completely different topic, benefit from knowing this?" If no, it is project handoff -- not a signal.

**DO** -- generalizes across projects:
- `- [SIGNAL] from: researcher | When entity_index.json has more than ~30 persons, group Key Figures by faction. Ungrouped lists at that scale degrade downstream synthesis.`
- `- [SIGNAL] from: writer | Cult-arc template fails for institutional-corruption topics; derive structure from research instead. Adjust hook scoring to flag corruption arcs.`
- `- [SIGNAL] from: visual-planner | Wikipedia article URLs in media_leads.json must be resolved to direct-file URLs via the Commons API before download -- raw article URLs return HTML.`

**DON'T** -- project-specific handoff (already lives in the output file):
- `- [SIGNAL] from: writer | Unit 731 script complete at projects/<slug>/script/Script.md. 5 acts: ... Key visual anchors: Pingfang facility, SWNCC memorandum ...` -- this is a project briefing; `Script.md` already contains it.
- `- [SIGNAL] from: researcher | Hinterkaifeck dossier ready. Five hooks: footprints to the farm ... Schlittenbauer had a key ... mattock found in 1923.` -- entity-level project content; `entity_index.json` and `Research.md` already contain it.
- `- [SIGNAL] from: visual-researcher | Found 12 archival photos for the topic at <urls>.` -- project artifact; belongs in `media_leads.json`.

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

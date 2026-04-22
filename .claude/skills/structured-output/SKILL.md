---
name: structured-output
description: >-
  Structured output formatting expertise for documentary pipeline reports
  and data files. Report structure templates, JSON schema patterns, file
  vs chat output rules, and formatting conventions. Use when generating
  research dossiers, analysis reports, or machine-readable data outputs.
user-invocable: true
---

# Structured Output Expertise

Domain knowledge for structuring pipeline outputs -- reports, dossiers, data files, and chat responses. This skill provides formatting expertise about when to use which output format, how to structure documents for the documentary pipeline, and how to produce consistent machine-readable data. It does NOT provide behavioral protocols (those are in agent-protocols).

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/structured-output/insights.md`
   - Even if empty, this confirms the learning loop is active
2. If producing a specific pipeline artifact (dossier, script, edit sheet), review the relevant template section below

## Output Format Selection [DETERMINISTIC]

Every output goes to one of two destinations. Choosing wrong creates friction -- long content in chat is unreadable, short status in files is undiscoverable.

### Write to File

Use files for any output that will be referenced later, consumed by another agent, or exceeds comfortable reading length.

| Output Type | File Format | Destination Pattern |
|-------------|------------|---------------------|
| Research dossier | Markdown | `projects/<project>/research/dossier.md` |
| Script draft | Markdown | `projects/<project>/script/draft-v<N>.md` |
| Analysis report | Markdown | `projects/<project>/analysis/<type>.md` |
| Topic briefs | JSON | `projects/<project>/strategy/topics.json` |
| Asset manifest | JSON | `projects/<project>/media/assets.json` |
| Edit sheet | JSON | `projects/<project>/media/edit-sheet.json` |
| Entity index | Markdown/JSON | `projects/<project>/research/entities.md` |

**File output rules:**
- Always use the project directory structure. Never dump files in the repository root.
- Include a YAML frontmatter block with: title, date, author-agent, status (draft/final).
- Make each file self-contained. A reader should not need chat history to understand it.
- Use descriptive filenames. `analysis.md` is bad. `competitor-analysis-2026-04.md` is good.

### Respond in Chat

Use chat for outputs that are transient, confirmatory, or require immediate human response.

| Output Type | When |
|-------------|------|
| Status updates | "Research pass 2 complete. 12 new sources found." |
| Decisions made | "Selected hook: the 1947 Roswell weather balloon discrepancy." |
| Questions | "The timeline has a 3-year gap (1952-1955). Should I attempt FOIA requests?" |
| Brief summaries | "Dossier written to projects/roswell/research/dossier.md (47 sources, 3 contested claims)." |
| Confirmations | "Script draft v2 saved. Ready for review." |

**Chat output rules:**
- Lead with the result, then explain. Never bury the answer.
- When referencing a file you wrote, state the path and a one-sentence summary of contents.
- Keep chat responses under 50 lines. If it is growing longer, it belongs in a file.

### Edge Cases

- **Intermediate work products** (notes, scratch analysis): File if >20 lines, chat if shorter.
- **Error reports**: Chat for the summary, file for detailed diagnostics.
- **Multiple small outputs**: If producing 3+ related short outputs, bundle into a single file rather than multiple chat messages.

## Report Structure Templates [DETERMINISTIC]

Standard templates for the documentary pipeline's primary output types. Use these as starting structures -- adapt sections as needed but preserve the core organization.

### Research Dossier Template

```markdown
---
title: "[Topic] Research Dossier"
date: YYYY-MM-DD
agent: researcher
status: draft | final
passes: N
sources: N
---

# [Topic]

## Executive Summary
[2-3 paragraphs: what the story is, why it matters, what makes it compelling for a documentary]

## Timeline
[Chronological sequence of key events with dates and source citations]

| Date | Event | Source | Tier |
|------|-------|--------|------|
| YYYY-MM-DD | Event description | [Source](URL) | N |

## Key Entities
[Entity index per the Entity Indexing Standards in `.claude/agents/researcher.md`]

## Narrative Arc
### The Hook
[Opening question or revelation]

### Act 1: Setup
[Context, background, characters introduced]

### Act 2: Complication
[Central conflict, mystery, or investigation]

### Act 3: Resolution
[Outcome, aftermath, lingering questions]

## Source Bibliography
[All sources organized by tier, with access dates]

## Research Gaps
[Explicitly documented gaps with search attempts]

## Contested Claims
[Claims where sources disagree, with evidence for each position]
```

### Analysis Report Template

```markdown
---
title: "[Subject] Analysis"
date: YYYY-MM-DD
agent: [agent-name]
status: draft | final
---

# [Subject] Analysis

## Objective
[What question this analysis answers]

## Methodology
[Data sources, tools used, analysis approach]

## Findings
[Numbered or bulleted findings, most important first]

## Recommendations
[Actionable next steps, ranked by priority]

## Limitations
[What this analysis does not cover and why]
```

### Script Template

```markdown
---
title: "[Topic]"
date: YYYY-MM-DD
agent: writer
status: draft-v1 | draft-v2 | final
duration_estimate: "NN minutes"
---

# [Topic]

## Title Card
[Channel branding text]

## Cold Open (0:00 - 1:30)
[Hook: dramatic question or revelation to grab viewer]

## Act 1: [Title] (1:30 - 5:00)
[Setup: context, characters, world-building]

## Act 2: [Title] (5:00 - 12:00)
[Complication: central conflict, investigation, mystery deepens]

## Act 3: [Title] (12:00 - 17:00)
[Resolution: answers, aftermath, lingering questions]

## Outro (17:00 - 18:00)
[Call to action, channel plug, next episode tease]

## Credits
[Source attributions for key claims]
```

## JSON Schema Patterns [DETERMINISTIC]

Machine-readable outputs must follow consistent schema conventions so downstream agents and scripts can parse them reliably.

### Naming Conventions

- **Keys**: `snake_case` always. Never camelCase or kebab-case in JSON data keys.
- **Timestamps**: ISO 8601 format (`2026-04-10T14:30:00Z`). Include timezone.
- **Paths**: Relative to project root. Use forward slashes even on Windows (`projects/roswell/research/dossier.md`).
- **IDs**: Prefixed by type (`P001` for person, `L001` for location, `E001` for event, `A001` for asset).
- **Scores**: Numeric 0.0-1.0 for normalized scores, integer 1-5 for tier/rating scales.
- **Null handling**: Use `null` for unknown values, never empty string `""`. Omit optional fields entirely if not applicable.

### Asset Manifest Schema (Media Output)

```json
{
  "project": "dyatlov-pass",
  "generated_date": "2026-04-10T14:30:00Z",
  "assets": [
    {
      "asset_id": "A001",
      "type": "photograph",
      "source": "wikimedia_commons",
      "source_url": "https://example.com/photo.jpg",
      "local_path": "projects/dyatlov-pass/media/assets/A001.jpg",
      "description": "The hikers' tent as found by rescuers, February 1959",
      "relevance_score": 0.95,
      "quality_score": 0.6,
      "visual_score": 0.8,
      "license": "public_domain",
      "usage_notes": "Low resolution scan of original photograph"
    }
  ]
}
```

### Edit Sheet Entry Schema (Compiler Output)

```json
{
  "project": "dyatlov-pass",
  "generated_date": "2026-04-10T14:30:00Z",
  "timeline": [
    {
      "entry_id": "S001",
      "timecode_start": "00:01:30",
      "timecode_end": "00:01:45",
      "type": "b_roll",
      "asset_id": "A001",
      "narration_text": "The tent was found ripped open from the inside.",
      "transition": "cut",
      "notes": "Hold on tent photograph while narration plays"
    }
  ]
}
```

## Formatting Conventions [DETERMINISTIC]

Consistent formatting across all pipeline outputs. These conventions apply to every markdown document produced by any agent.

### Heading Hierarchy

- `#` H1: Document title only. One per document.
- `##` H2: Major sections. These are the document's table of contents.
- `###` H3: Subsections within major sections.
- `####` H4: Maximum nesting depth. If you need H5, flatten the structure instead.

### Tables

- Use tables for multi-dimensional data (comparisons, matrices, indexes).
- Always include a header row.
- Align columns for readability (use markdown table formatting).
- Do not use tables for single-dimension lists -- use bullet points instead.

### Code Blocks

- Use fenced code blocks (triple backticks) for: code, commands, file paths, structured data, templates.
- Always specify the language tag: ` ```json `, ` ```python `, ` ```markdown `.
- Never inline code for multi-line content.

### Links and Citations

- **Source citations**: `[Source Name](URL) (Tier N)` -- include the tier for every source reference.
- **Internal file references**: Relative paths from project root: `See [dossier](projects/roswell/research/dossier.md)`.
- **External references**: Full URLs. Include access date for web sources that may change.

### Lists

- Use `-` for unordered lists (not `*` or `+`).
- Use `1.` for ordered lists only when sequence matters.
- Maximum nesting: 2 levels. If deeper, restructure into subsections with headers.

## Content Organization [HEURISTIC]

Principles for organizing long-form content. These are judgment calls -- apply the principle that best serves the reader for each specific output.

### Lead with the Most Important Finding

The first paragraph after any heading should contain the most critical information. If the reader stops here, they should have the essential takeaway. Details, evidence, and nuance follow.

- **Research dossiers**: Lead with the most compelling hook or the most surprising finding.
- **Analysis reports**: Lead with the conclusion, then present the evidence.
- **Status updates**: Lead with the result ("12 sources found"), then context.

### Group Related Items

Information that the reader needs together should be together. Do not scatter related facts across separate sections.

- Entity information: all facts about a person in their entity entry, not spread across timeline entries
- Source evaluation: tier assignment and reliability notes in the bibliography, not inline
- Contradictions: a dedicated "Contested Claims" section, not footnotes scattered throughout

### Progressive Disclosure

Structure documents as summary, then detail, then appendix. A reader should be able to stop at any level and have a complete (if less detailed) understanding.

1. **Executive summary**: 2-3 paragraphs. The whole story at a glance.
2. **Main sections**: Full narrative with evidence and analysis.
3. **Appendices**: Raw data, full source list, detailed methodology, entity index.

### Handle Uncertainty Explicitly

Never hide what you do not know. Uncertainty is information the downstream agent (writer, visual planner) needs.

- **Unknown dates**: "Between 1952 and 1955 (exact date unknown)"
- **Conflicting accounts**: "Source A says X; Source B says Y. No additional evidence resolves the conflict."
- **Missing information**: "No sources found for the period between X and Y despite searching [databases]."
- **Low confidence**: "Based on a single Tier 3 source. Needs corroboration before scripting."

Flag uncertain content with explicit tags: `[UNVERIFIED]`, `[CONTESTED]`, `[SINGLE-SOURCE]`. These tags are consumed by downstream agents to calibrate their own confidence.

## Script References

> Scripts below are documented for reference. Available after Phase 6 integration.

No dedicated scripts exist for structured output formatting -- this is a domain skill applied across all pipeline outputs. The formatting conventions here are consumed by every agent that produces documents or data files.

## Reflection Phase

After producing a structured output:
1. Re-read your output from start to finish
2. Identify one specific insight about formatting effectiveness -- did the template fit the content? Was the heading hierarchy clear? Did progressive disclosure work?
3. Append one line to `.claude/skills/structured-output/insights.md`: `- [YYYY-MM-DD] insight text`
4. Never skip this phase -- formatting insights compound across sessions

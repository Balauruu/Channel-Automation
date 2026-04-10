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

Domain expertise for producing well-organized, parseable outputs in the documentary production pipeline. This skill provides formatting knowledge and structural patterns -- not behavioral protocols (those are in agent-protocols).

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/structured-output/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read channel identity if output will be channel-facing: `@channel/channel.md`

## Output Format Selection [DETERMINISTIC]

Every output has a correct destination. Choosing wrong wastes the reader's time.

### Write to File

Use file output for:
- **Research dossiers** -- detailed findings, source bibliographies, entity indexes
- **Scripts** -- documentary scripts with act structure, cold opens, credits
- **Analysis reports** -- competitor analysis, topic evaluations, pipeline health reports
- **Edit sheets** -- DaVinci Resolve-ready compilation data
- **Any output exceeding 50 lines** -- long content in chat is unreadable and lost on scroll
- **Data dumps** -- raw data, JSON payloads, CSV exports, TSV logs
- **Generated artifacts** -- code, configs, manifests, specs

When writing to a file, always tell the chat where the file is and what it contains in one sentence.

### Respond in Chat

Use chat output for:
- **Status updates** -- "Research pass 2 complete. 14 sources catalogued."
- **Decisions made** -- "Selected breadth-first strategy for Pass 1 because topic is obscure."
- **Questions** -- anything requiring user input before proceeding
- **Confirmations** -- "Script draft written to projects/bermuda/script-v1.md (4,200 words, 3 acts)."
- **Brief summaries** -- high-level overview of what was written to files
- **Quick answers** -- single facts, yes/no responses, short recommendations

### Mixed Output

Some tasks need both:
- Write the detailed output to a file
- Summarize key findings in chat with the file path
- Example: "Research dossier written to `projects/bermuda/dossier.md`. Key findings: 23 sources across 4 tiers, 3 unresolved gaps (listed in Section 7), estimated 85% source coverage saturation."

## Report Structure Templates [DETERMINISTIC]

Standard templates for the documentary pipeline's core output types. Use these as starting structures -- adapt section ordering and depth to fit the content.

### Research Dossier Template

```markdown
# [Topic Name] -- Research Dossier

## Executive Summary
[2-3 paragraph overview: what the topic is, why it matters for a documentary,
what the key narrative hooks are]

## Timeline
[Chronological events with dates and source citations]
| Date | Event | Source |
|------|-------|--------|

## Entity Index
[All named entities with roles and relationships]
### [Entity Name]
- **Role:** [relationship to topic]
- **Active period:** [dates]
- **Key facts:** [sourced claims]

## Narrative Hooks
[Dramatic elements, mysteries, contradictions, emotional beats]
- Hook 1: [description] -- [why it works for video]
- Hook 2: ...

## Source Bibliography
[All sources organized by tier]
### Tier 1 (Primary)
- [Source Name](URL) (Tier 1) -- [what it provides]
### Tier 2 (News/Investigation)
- ...

## Gaps and Uncertainties
[What remains unknown and why]
- Gap 1: [description] -- [reason unresolved]

## Research Metadata
- Passes completed: [N]
- Sources catalogued: [N]
- Coverage assessment: [percentage with rationale]
```

### Analysis Report Template

```markdown
# [Analysis Title]

## Objective
[What question this analysis answers]

## Methodology
[How the analysis was conducted -- data sources, tools, criteria]

## Findings
### Finding 1: [Title]
[Evidence, data, sourced claims]

### Finding 2: [Title]
...

## Recommendations
1. [Actionable recommendation with rationale]
2. ...

## Limitations
[What this analysis does not cover and why]
```

### Script Template

```markdown
# [Documentary Title]

## Title Card
[Opening text/graphics description]

## Cold Open
[Hook sequence -- 30-60 seconds of the most compelling moment]

## Act 1: [Title]
[Setup -- introduce the topic, establish context]

### Scene 1.1
**Visual:** [what the viewer sees]
**Narration:** [what the narrator says]
**Source:** [factual basis]

## Act 2: [Title]
[Escalation -- deepen the mystery, introduce complications]

## Act 3: [Title]
[Resolution or deliberate non-resolution for mystery topics]

## Credits
[Sources, attributions, acknowledgments]
```

## JSON Schema Patterns [DETERMINISTIC]

Machine-readable outputs follow consistent conventions so downstream agents and scripts can parse them reliably.

### Naming Conventions

- **Keys:** `snake_case` always. Never camelCase, never kebab-case in JSON keys
- **Timestamps:** ISO 8601 format (`2026-04-10T14:30:00Z`). In filenames, replace colons with dashes (`2026-04-10T14-30-00Z`) because colons are illegal in Windows filenames
- **Paths:** Relative to project root, forward slashes (`projects/bermuda/dossier.md`)
- **IDs:** Descriptive slugs preferred over UUIDs for human readability (`bermuda-triangle-2026` not `a3f8c1d2-...`)

### Topic Brief Schema (Strategy Output)

```json
{
  "topic_id": "bermuda-triangle-2026",
  "title": "The Bermuda Triangle: What the Navy Files Actually Say",
  "category": "maritime-mysteries",
  "hook": "Declassified Navy reports contradict 50 years of popular mythology",
  "estimated_sources": 25,
  "difficulty": "moderate",
  "created_at": "2026-04-10T14:30:00Z",
  "status": "approved"
}
```

### Asset Manifest Schema (Media Output)

```json
{
  "project_id": "bermuda-triangle-2026",
  "assets": [
    {
      "asset_id": "bermuda-navy-map-01",
      "type": "image",
      "source_url": "https://archive.org/...",
      "local_path": "projects/bermuda/assets/navy-map-01.jpg",
      "license": "public-domain",
      "relevance_score": 4.2,
      "usage_intent": "b-roll",
      "clip_embedding_path": "projects/bermuda/embeddings/navy-map-01.npy"
    }
  ],
  "total_assets": 1,
  "generated_at": "2026-04-10T15:00:00Z"
}
```

### Edit Sheet Entry Schema (Compiler Output)

```json
{
  "project_id": "bermuda-triangle-2026",
  "timeline_entries": [
    {
      "sequence": 1,
      "type": "title-card",
      "duration_seconds": 5,
      "text": "The Bermuda Triangle",
      "asset_path": null,
      "narration_text": null
    },
    {
      "sequence": 2,
      "type": "narration-with-broll",
      "duration_seconds": 15,
      "text": null,
      "asset_path": "projects/bermuda/assets/navy-map-01.jpg",
      "narration_text": "In 1945, five Navy bombers vanished..."
    }
  ]
}
```

## Formatting Conventions [DETERMINISTIC]

Consistent formatting across all pipeline outputs reduces cognitive load and enables cross-referencing.

### Markdown Heading Hierarchy

- `#` -- Document title (one per file)
- `##` -- Major sections (Executive Summary, Findings, Timeline)
- `###` -- Subsections (individual findings, entities, scenes)
- `####` -- Rarely needed. If you need a fourth level, consider flattening the structure

Never skip heading levels (no `#` followed by `###`).

### Table Formatting

- Use tables for multi-dimensional data (comparisons, timelines, scoring matrices)
- Align columns for readability in source
- Include a header row always
- Keep cell content concise -- link to detailed sections for longer content

### Code Block Usage

- Use fenced code blocks (triple backticks) for: JSON, file paths, CLI commands, script output, structured data
- Always specify the language tag: ` ```json `, ` ```markdown `, ` ```python `
- Never inline code in prose when a code block would be clearer

### Citation Format

Standard citation format throughout the pipeline:
- In-text: `[Source Name](URL) (Tier N)`
- Bibliography: `- [Source Name](URL) (Tier N) -- [what it provides]`
- When URL is unavailable: `[Source Name] (Tier N, offline/archived)`

### Link Formatting

- Use descriptive link text, never raw URLs in prose
- Raw URLs are acceptable only in bibliography sections and JSON data
- Example: `[Navy Investigation Report](https://archives.gov/...)` not `https://archives.gov/...`

## Content Organization [HEURISTIC]

Principles for organizing long-form content. These require judgment -- apply them based on the specific output's audience and purpose.

### Lead with the Most Important Finding

The reader's attention is highest at the start. Place the most significant discovery, recommendation, or conclusion in the first section after any executive summary. Do not bury the lead under methodology or background.

### Group Related Items

Cluster related facts, sources, or assets together rather than presenting them in the order they were discovered. The research process is chronological; the output should be thematic.

### Progressive Disclosure

Structure outputs in layers of increasing detail:
1. **Summary** -- One paragraph. What does the reader need to know?
2. **Detail** -- Full findings with evidence. What supports the summary?
3. **Appendix** -- Raw data, full source lists, methodology notes. What is the complete record?

A reader should be able to stop at any layer and have a complete (if less detailed) understanding.

### Handle Uncertainty Explicitly

Never present uncertain information as fact. Use explicit markers:
- **Confirmed:** "According to Navy records (Tier 1), Flight 19 departed at 14:10 EST."
- **Probable:** "Multiple news sources (Tier 2) report the crew consisted of 14 men, though official records list 13."
- **Unverified:** "Forum posts (Tier 4) claim a survivor was found on a nearby island. This is unverified and should not be stated as fact in the script."
- **Disputed:** "Source A states X. Source B contradicts with Y. Both are Tier 2. The disagreement is unresolved."

### Avoid Common Organization Mistakes

- **Stream-of-consciousness:** Do not write in the order you discovered things. Restructure for the reader.
- **Uncontextualized data:** Never dump raw tool output without annotation explaining what it means and why it matters.
- **Over-nesting:** Maximum 3 levels of nesting. If you need more, flatten the structure or split into multiple sections.
- **Decoration formatting:** Every header, list, table, and code block should serve comprehension. Do not format for visual appeal alone.

## Script References

> These scripts are documented for reference. They will be connected in Phase 6 integration.

No direct scripts map to structured output as a standalone capability. This domain expertise applies across all pipeline stages that produce outputs:
- `editorial/researcher/cli.py` -- Research dossier outputs
- `editorial/writer/cli.py` -- Script generation outputs
- `strategy/cli.py` -- Topic brief and analysis outputs

## Reflection Phase

After completing the main output work:
1. Re-read your output from start to finish
2. Check against the formatting conventions and templates defined above
3. Identify one specific insight about what worked well or what to improve in your output structure
4. Append one line to `insights.md`: `- [YYYY-MM-DD] insight text`
   - Path: `.claude/skills/structured-output/insights.md`
   - Never skip this step, even if the insight seems minor

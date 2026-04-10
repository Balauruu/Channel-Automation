---
name: documentary-research
description: >-
  Documentary research domain expertise: source evaluation tiers, claim
  triangulation rules, entity indexing standards, and narrative hook
  assessment criteria. Use when researching a documentary topic, evaluating
  sources, or building research dossiers.
user-invocable: true
---

# Documentary Research Expertise

Domain knowledge for evaluating sources, triangulating claims, indexing entities, and assessing narrative hooks in documentary research. This skill provides supplementary expertise -- the research pipeline procedure (survey, deepen, synthesize) lives in the researcher agent body.

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/documentary-research/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read channel identity: @channel/channel.md

## Source Evaluation Tiers [DETERMINISTIC]

Classify every source by tier before using it. Higher tiers require less corroboration.

| Tier | Source Type | Trust Level | Usage Rule |
|------|-----------|-------------|------------|
| 1 | Court documents, government records, academic papers, official transcripts | High | Cite directly. Single source sufficient for factual claims. |
| 2 | Contemporaneous news (major outlets), official investigations, autopsy/forensic reports | Moderate-high | Cross-reference with one other Tier 1-2 source. |
| 3 | Books, documentaries, long-form journalism, reputable podcast interviews | Moderate | Check their cited sources. Trace claims back to Tier 1-2. |
| 4 | Wikipedia, blogs, forums, podcasts, amateur documentaries | Low | Use as leads to find Tier 1-2 sources. Never cite as evidence. |
| 5 | Social media, anonymous claims, unsourced assertions, tabloids | Do not use | Do not use as evidence. Note existence only if culturally significant. |

**Edge cases:**
- Wikipedia with inline citations to Tier 1-2: follow the citations, cite the originals, not Wikipedia
- News articles citing anonymous sources: treat as Tier 3 (one step below their outlet's normal tier)
- Self-published primary accounts (memoirs, autobiographies): Tier 3 for the author's perspective, but claims about others need corroboration

## Source Triangulation Rules [DETERMINISTIC]

Every factual claim in the dossier must be tagged with one of these verification levels:

- **Sourced**: Supported by 2+ independent Tier 1-3 sources. Independence means neither source derives from the other.
- **Attributed**: Only one credible source exists. Note the single-source risk explicitly. The writer decides how to frame it.
- **Unverified**: Supported only by Tier 4-5 sources. Flag for the writer with `[UNVERIFIED]` tag.
- **Contested**: Multiple credible sources disagree. Present all positions with their evidence. Do not adjudicate.

**Rules:**
- Never present an unverified claim as fact
- Never silently drop a contested claim -- the contradiction is often the most interesting part of the story
- When two Tier 1 sources conflict, both are "sourced" individually but the claim is "contested"
- Track provenance chains: where did this claim originate, who repeated it, and is there a primary document behind it

## Entity Indexing Standards [DETERMINISTIC]

Build a structured entity index for every research dossier. This supports the writer agent and future visual research.

**Entity types:** People, Places, Organizations, Events, Documents

**Rules:**
- Assign each entity a unique ID (format: `P001` for people, `L001` for locations, `O001` for organizations, `E001` for events, `D001` for documents)
- No duplicate entries: same person under different names gets one entry with aliases listed
- Track aliases explicitly: maiden names, nicknames, pseudonyms, misspellings in sources
- Map relationships between entities: who knew whom, who was present at which event, which organization employed which person
- Record first-mention source for each entity (the source that introduced this entity to the research)

**Entity entry format:**
```
ID: P001
Name: [Primary name]
Aliases: [Other names, spellings]
Role: [Their role in the narrative]
First source: [Source that introduced this entity]
Related: [E001, O003, P007]
```

## Output Quality Standards [HEURISTIC]

Evaluate research output against these criteria before delivering to the writer:

- **Timeline consistency:** Events must be chronologically ordered with no contradictions. If sources disagree on dates, note both with evidence.
- **Entity uniqueness:** No duplicate entries in the entity index. Same person under different names must be merged.
- **Coverage completeness:** Every section of the narrative arc must have sufficient source coverage for a writer to script it without additional research.
- **Gap documentation:** Gaps in coverage must be explicitly documented with specific language: "No sources found for the period between X and Y" -- never hide gaps behind vague language.
- **Source diversity:** Over-reliance on a single source for an entire narrative section is a quality flag. Aim for 3+ sources per major claim.

## Narrative Hook Assessment [HEURISTIC]

Evaluate potential hooks on three axes. A strong hook scores well on all three; a hook that scores on only one axis is weak.

1. **Dramatic tension:** Does it create questions the viewer needs answered? Does it introduce stakes, contradiction, or mystery? The best hooks are questions that the documentary itself will answer.
2. **Factual grounding:** Is it supported by Tier 1-2 sources? Hooks built on unverified claims create liability. The most compelling hooks are surprising truths, not speculations.
3. **Visual potential:** Can it be illustrated with available footage, photographs, documents, or locations? A hook that cannot be visualized forces the writer into pure narration with no visual support.

**Hook quality tiers:**
- **Strong hook:** Scores well on all three axes. Lead with this.
- **Moderate hook:** Scores well on two axes. Use as secondary narrative drivers.
- **Weak hook:** Scores on only one axis. Mention but do not build structure around it.

## Script References

> Scripts below are documented for reference. Available after Phase 6 integration.

- `editorial/researcher/cli.py survey <topic>` -- Automated broad survey across multiple source types
- `editorial/researcher/cli.py deepen <topic>` -- Deep dive on specific aspects identified in survey
- `editorial/researcher/cli.py synthesize <topic>` -- Compile findings into structured dossier format

## Reflection Phase

After completing research work:
1. Re-read your output from start to finish
2. Identify one specific insight about what worked or what to improve
3. Append one line to `.claude/skills/documentary-research/insights.md`: `- [YYYY-MM-DD] insight text`
4. Never skip this phase -- insights compound over time

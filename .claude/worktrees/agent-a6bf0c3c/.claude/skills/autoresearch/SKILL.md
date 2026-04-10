---
name: autoresearch
description: >-
  Karpathy-style iterative research loop expertise. Convergence criteria,
  quality gate definitions, diminishing returns detection, and research
  depth calibration patterns. Use when conducting deep iterative research
  that requires multiple refinement passes or when evaluating research
  completeness.
user-invocable: true
---

# Autoresearch Expertise

Domain expertise for iterative research loops inspired by Karpathy's autonomous improvement methodology. This skill provides the knowledge framework for conducting deep, multi-pass research that converges on completeness -- not a step-by-step procedure (agents define their own procedures).

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/autoresearch/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read relevant channel docs if the research is topic-specific: `@channel/channel.md`

## Iterative Loop Design [DETERMINISTIC]

The iterative research loop follows a consistent structure regardless of domain. Each iteration performs the same cycle, with state tracked between passes to measure progress.

### Core Loop Structure

```
research -> evaluate -> identify gaps -> refine -> repeat
```

**Loop entry conditions:**
- A defined research objective exists (topic, question, or improvement goal)
- At least one starting source or search strategy is available
- Success criteria are defined before the first iteration (not invented during the loop)

**State tracking between iterations:**
- Maintain a running inventory of: sources found, claims extracted, gaps identified, search queries used
- Each iteration begins by reviewing the state from the previous iteration
- Never start a fresh search without consulting what was already found

**Iteration limits:**
- Set a maximum iteration count before starting (default: 5 for well-documented topics, 10 for obscure topics)
- Track the iteration number explicitly -- do not rely on "feeling done"
- If the maximum is reached without convergence, stop and report remaining gaps rather than continuing indefinitely

### Iteration Quality

Each iteration should produce measurable progress. A healthy iteration:
- Adds at least one new independent source not found in previous iterations
- Resolves at least one identified gap or confirms a gap is unresolvable
- Refines the search strategy based on what was learned

An unhealthy iteration (signals to stop or change approach):
- Finds no new information beyond what previous iterations already covered
- Identifies new gaps faster than it resolves existing ones
- Spends more time re-reading known sources than finding new ones

## Convergence Criteria [DETERMINISTIC]

Convergence means the research has reached a state where further iteration is unlikely to change the conclusions. These criteria define "done."

### Source Coverage Saturation

New searches yield less than 10% genuinely new information. Measure by tracking:
- Number of unique sources found per iteration
- Percentage of new sources that contain information not already in the dossier
- When 3 consecutive searches return only sources already catalogued, coverage is saturated

### Claim Verification Completeness

All substantive claims in the research output are backed by sourcing:
- **Tier 1-3 sourced:** Claim supported by 2+ independent credible sources
- **Single-source attributed:** Only one credible source exists, explicitly noted
- **Flagged unverified:** Tier 4-5 sources only, marked for the reader
- Convergence requires zero unflagged unverified claims

### Entity Coverage

All named entities (people, places, organizations, events) in the research are:
- Consistently named (no unresolved aliases -- e.g., "John Smith" and "J. Smith" resolved to the same person or confirmed as different)
- Contextualized with at least role, time period, and relationship to the topic
- Cross-referenced across sources to catch misattribution

### Timeline Consistency

All dates and sequences in the research are:
- Internally consistent (no contradictions between sections)
- Sourced to at least one credible reference
- Flagged where sources disagree on chronology, with the disagreement documented

## Quality Gates [DETERMINISTIC]

Quality gates are checkpoints between iterations. Before proceeding to the next iteration, verify each gate. If a gate fails, the current iteration's focus shifts to addressing it.

### Gate 1: Source Diversity

At least 3 independent source types are represented in the research. Source types include:
- Government/legal records
- Academic publications
- News coverage (contemporaneous preferred)
- Books or long-form journalism
- Interviews or firsthand accounts
- Archival materials (photos, maps, documents)

**Why this matters:** A dossier built entirely from Wikipedia and blog posts cannot be trusted. Diversity of source types is a proxy for triangulation quality.

### Gate 2: Factual Density

Each major section of the research output contains a minimum ratio of sourced facts to narrative. Guidelines:
- Timeline sections: every event has a date and at least one source
- Entity profiles: every claim about a person has attribution
- Narrative sections: no paragraph makes more than 2 consecutive unsourced assertions

**Why this matters:** Low factual density signals speculation masquerading as research. The writer agent downstream needs dense, verifiable material to produce credible scripts.

### Gate 3: Gap Coverage

All identified gaps have been either:
- **Resolved:** Gap filled with sourced information
- **Documented as unresolvable:** Explicitly noted with reason (e.g., "records destroyed in 1942 fire," "no surviving witnesses," "classified government documents")
- **Deferred with rationale:** Noted as requiring a specific source type not yet available (e.g., "requires FOIA request," "requires access to university archives")

No gap should be silently ignored. An acknowledged gap is not a quality failure; an unacknowledged gap is.

## Diminishing Returns Detection [HEURISTIC]

Recognizing when further research iteration is wasteful requires judgment. These signals indicate diminishing returns:

### Strong Signals (stop iterating)

- **Search result overlap exceeds 80%:** The same URLs, documents, and sources appear across different search queries. New phrasings of the same query return the same results.
- **New sources confirm without extending:** Each new source validates existing claims but adds no new detail, no new perspective, and no new connections.
- **Time-per-new-fact increases exponentially:** The first iteration yielded 20 new facts in 10 minutes. The fifth iteration yields 1 new fact in 30 minutes. The marginal cost of new information has become prohibitive.

### Moderate Signals (consider stopping or pivoting)

- **Source quality declining:** Early iterations found Tier 1-2 sources. Current iterations are finding only Tier 4-5 sources. The credible source pool is exhausted.
- **Circular references:** New sources cite each other or cite a common ancestor source. The apparent diversity is illusory -- there are fewer independent sources than it appears.
- **Scope creep pressure:** Each iteration expands the research boundary to find new information, but the new information is tangential to the original objective.

### What to Do Instead of Continuing

When diminishing returns are detected:
1. Document the current state of knowledge with confidence levels
2. Explicitly list what remains unknown and why
3. Identify the specific source types that would unlock further progress (e.g., "a FOIA response," "an interview with a named witness")
4. Stop iterating and deliver the research as-is with transparent completeness assessment

## Research Depth Calibration [HEURISTIC]

Different topic types require different iteration depths. Calibrate before starting, not during the loop.

### Well-Documented Topics (2-3 iterations)

Major historical events, famous cases, prominent figures. Characteristics:
- Wikipedia article exists with 50+ references
- Multiple books written on the subject
- News coverage from major outlets

**Strategy:** Focus on source quality over quantity. The information exists; the challenge is identifying the most credible sources and resolving contradictions between popular accounts.

### Moderately Documented Topics (4-6 iterations)

Regional events, lesser-known cases, niche historical subjects. Characteristics:
- Wikipedia stub or no article
- One or two books, possibly self-published
- Local news coverage only

**Strategy:** Use creative search strategies -- newspaper archives, genealogy databases, local historical societies, university special collections. Primary sources become more important as secondary coverage is thin.

### Obscure Topics (7-10 iterations)

Cold cases, local legends, undocumented events, disputed histories. Characteristics:
- No Wikipedia article
- No books; possibly mentioned in broader works
- Scattered references in forums, local blogs, or niche publications

**Strategy:** Exhaust digital sources early, then focus on adjacent topics that might reference the target. Look for the topic embedded in broader narratives. Use entity names, locations, and dates as search anchors rather than topic names. Accept that some information will be single-sourced or unverifiable.

### Controversial Topics (add 2-3 extra iterations)

Any topic where sources actively disagree on facts, not just interpretation. Characteristics:
- Multiple competing narratives exist
- Some sources have clear bias or agenda
- Key facts are disputed, not just conclusions

**Strategy:** Extra iterations focus on triangulation. Map each competing narrative to its source ecosystem. Identify which facts are agreed upon across narratives (these are high-confidence). Flag disputed facts with all versions and their sources. Do not pick a "winner" -- present the landscape.

## Breadth-First vs Depth-First Strategy [HEURISTIC]

Research oscillates between two modes. Knowing when to switch is a core autoresearch skill.

### Breadth-First Mode

**When to use:**
- Survey phase at the start of research (iterations 1-2)
- Topic scoping when the boundaries are unclear
- After a depth-first dead end, to find alternative angles

**What it looks like:**
- Many different search queries with varied phrasings
- Skimming sources for relevance rather than reading deeply
- Building a source inventory rather than extracting detailed claims
- Casting a wide net across source types

**Switching criteria (breadth -> depth):**
- Source inventory exceeds 10 unique sources
- Clear subtopics or threads emerge from the survey
- A promising lead appears that needs detailed investigation

### Depth-First Mode

**When to use:**
- Specific claim verification (following a source chain)
- Entity disambiguation (resolving who "J. Smith" really is)
- Timeline reconstruction (nailing down specific dates and sequences)
- Contradiction resolution (two sources disagree -- which is right?)

**What it looks like:**
- Following citations from one source to its sources
- Reading full documents rather than skimming abstracts
- Cross-referencing specific claims across multiple sources
- Building detailed profiles of individual entities or events

**Switching criteria (depth -> breadth):**
- The current lead has been fully traced (all citations followed)
- Depth investigation hit a dead end (no more sources in this chain)
- The specific question has been answered (or confirmed unanswerable)
- Depth focus is consuming disproportionate time relative to its importance

### Mode Awareness

Explicitly track which mode you are in. If you find yourself doing breadth-first work during a depth-first phase (or vice versa), that is a signal to consciously switch modes or refocus. Unintentional mode switching is the most common cause of research inefficiency.

## Script References

> These scripts are documented for reference. They will be connected in Phase 6 integration.

- `editorial/researcher/cli.py` -- The tool that executes research passes (survey, deepen, synthesize). Autoresearch expertise informs how to structure and evaluate these passes.

No direct V5 script maps to autoresearch itself -- it is a meta-methodology applied to any iterative improvement process.

## Reflection Phase

After completing the main research work:
1. Re-read your research output from start to finish
2. Evaluate against the convergence criteria and quality gates defined above
3. Identify one specific insight about what worked well or what to improve in your research process
4. Append one line to `insights.md`: `- [YYYY-MM-DD] insight text`
   - Path: `.claude/skills/autoresearch/insights.md`
   - Never skip this step, even if the insight seems minor

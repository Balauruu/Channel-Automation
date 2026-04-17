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

Domain knowledge for designing and operating iterative research loops. This skill provides expertise about loop mechanics, convergence signals, quality gates, and depth calibration -- not a step-by-step procedure. The agent body defines the procedure (e.g., the researcher's 3-pass pipeline); this skill teaches how to iterate effectively within any research procedure.

Adapted from the Karpathy-style autonomous improvement methodology: research, evaluate, identify gaps, refine, repeat -- with rigorous stop conditions to prevent infinite loops and diminishing returns.

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/autoresearch/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read relevant channel docs as needed for the research domain

## Iterative Loop Design [DETERMINISTIC]

An iterative research loop has five components. Understanding each component prevents the two failure modes: stopping too early (missing critical information) and running too long (diminishing returns).

### Loop Components

**1. Entry conditions** -- Prerequisites that must be met before entering the loop:
- A clearly defined research question or improvement goal
- A measurable quality signal (even if approximate) to track progress
- Identified source types relevant to the domain
- Baseline assessment of what is already known vs. what is missing

**2. Iteration structure** -- Each pass through the loop follows this pattern:
- **Gather**: Collect new information using a strategy appropriate to the current gap
- **Evaluate**: Assess what the new information adds to the existing knowledge base
- **Integrate**: Merge new findings with existing findings, resolving contradictions
- **Identify gaps**: Determine what is still unknown, unverified, or contradictory

**3. Iteration limits** -- Hard caps that prevent infinite loops:
- Maximum iteration count (calibrate to topic complexity -- see Depth Calibration below)
- Time budget per iteration (escalating diminishing returns signal if exceeded)
- Consecutive-no-progress limit: if N iterations produce no new information, stop

**4. State tracking between iterations** -- What to record after each pass:
- New sources discovered (count and type)
- New claims verified or contradicted
- Gaps closed vs. gaps remaining
- Source type diversity achieved so far
- Score trajectory (is the knowledge base improving, plateauing, or stagnating?)

**5. Exit trigger** -- The loop terminates when any of these fire:
- Convergence criteria met (see below)
- Iteration limit reached
- Diminishing returns detected (see below)
- All identified gaps addressed or documented as unresolvable

### Loop Anti-Patterns

- **Breadth-only looping**: Gathering more sources without deepening analysis of existing ones. Each iteration should add depth, not just volume.
- **Confirmation bias looping**: Searching only for sources that confirm existing claims. Actively search for contradictory evidence in each pass.
- **Scope creep looping**: Each iteration expands the research question rather than narrowing gaps. Keep the original question as an anchor.

## Convergence Criteria [DETERMINISTIC]

Convergence means the research has reached a state where additional iteration would not materially improve the output. Track these four metrics:

### Source Coverage Saturation

New searches yield less than 10% new information. Measure by tracking unique sources per iteration:

| Iteration | New Sources | Unique Claims Added | Saturation Signal |
|-----------|-------------|--------------------|--------------------|
| 1 | 12 | 25 | No -- high discovery rate |
| 2 | 8 | 15 | No -- still productive |
| 3 | 6 | 4 | Approaching -- diminishing |
| 4 | 3 | 1 | Yes -- saturated |

When two consecutive iterations are at or below the saturation threshold, source coverage has converged.

### Claim Verification Completeness

All factual claims in the research have been classified by verification level:
- **Complete**: Every claim is tagged as Sourced, Attributed, Unverified, or Contested (per the tier definitions in `.claude/agents/researcher.md`)
- **Incomplete**: Claims exist without verification tags, or claims tagged "needs verification" have not been investigated

Convergence requires that no claim remains in "needs verification" status. Unverified claims are acceptable if explicitly tagged -- the goal is classification, not universal verification.

### Entity Coverage

No unresolved aliases or ambiguous references remain:
- Every person, place, organization, and event mentioned has an entry in the entity index
- Aliases have been merged (same entity under different names consolidated)
- Relationships between entities are mapped where evidence exists

### Timeline Consistency

No unresolved chronological contradictions:
- Events are ordered with dates supported by sources
- Where sources disagree on dates, both dates are recorded with evidence
- Gaps in the timeline are explicitly noted with their duration

### Convergence Decision Matrix

| Source Saturated | Claims Classified | Entities Resolved | Timeline Consistent | Action |
|:---:|:---:|:---:|:---:|--------|
| Yes | Yes | Yes | Yes | **Stop** -- research is complete |
| Yes | No | -- | -- | One more pass targeting unclassified claims |
| No | Yes | Yes | Yes | One more pass with new source strategies |
| No | No | No | No | Continue -- significant gaps remain |

## Quality Gates [DETERMINISTIC]

Quality gates are checkpoints evaluated between iterations. Failing a gate means the current iteration's output needs improvement before the next iteration begins.

### Gate 1: Source Diversity

At least 3 independent source types must be represented in the research base. Source types include: government records, news articles, academic papers, books, court documents, interviews, archives, forensic reports.

- **Pass**: 3+ distinct source types with at least one Tier 1-2 source
- **Fail**: All sources from a single type (e.g., only news articles) or no Tier 1-2 sources

**When failing**: Before the next iteration, explicitly search for the missing source types. Use archive-search skill for historical documents, crawl4ai-scraping skill for web sources.

### Gate 2: Factual Density

Each major section of the research output must contain a minimum density of sourced claims. Empty sections or sections padded with unsourced speculation fail this gate.

- **Pass**: Every major section has at least 2 sourced claims (Tier 1-3 sources)
- **Fail**: Any section has zero sourced claims or relies entirely on Tier 4-5 sources

**When failing**: Target the sparse sections in the next iteration. Low-density sections indicate that the research strategy has a blind spot for that topic area.

### Gate 3: Gap Coverage

Identified gaps from previous iterations must be addressed or explicitly documented as unresolvable:

- **Pass**: Every gap from the previous iteration has been either filled (new information found) or documented ("No sources found for X despite searching Y and Z")
- **Fail**: Gaps from the previous iteration are neither filled nor documented

**When failing**: Do not proceed until each gap has at least an attempt-and-result documented. Undocumented gaps compound across iterations and create false confidence in completeness.

## Diminishing Returns Detection [HEURISTIC]

Diminishing returns means the cost of each additional iteration is increasing while the value is decreasing. This is the primary signal for when to stop iterating even if convergence criteria are not fully met.

### Indicators

**Search result overlap > 80%**: When new searches return sources already in the research base, the available source pool is exhausted for the current search strategy. Switch strategies before iterating again, or accept the current coverage.

**New sources confirm without adding detail**: Sources corroborate existing claims but contribute no new facts, dates, names, or perspectives. This is "echo chamber" saturation -- more sources saying the same thing.

**Time-per-new-fact increasing exponentially**: Track how long each iteration takes to produce a genuinely new piece of information. When the time doubles between iterations, diminishing returns have set in.

**Circular source chains**: Sources cite each other rather than independent primary evidence. This is common in well-covered topics where secondary sources all derive from the same primary documents.

### Response to Diminishing Returns

When diminishing returns are detected, choose one of these responses:

1. **Accept and stop**: The research is sufficient for the current purpose. Document what was not found and why.
2. **Shift strategy**: Change the search approach entirely -- different keywords, different source types, different databases, different languages. Diminishing returns in one strategy does not mean the topic is exhausted.
3. **Narrow scope**: Focus the remaining iterations on a single high-value gap rather than broad coverage. Depth on one point may be more valuable than marginal breadth.

## Research Depth Calibration [HEURISTIC]

Not all topics require the same number of iterations. Calibrate depth based on topic characteristics.

### Well-Documented Topics

Major historical events, famous cases, well-known public figures.

- **Expected iterations**: 2-3 passes
- **Rationale**: Primary sources are readily available and well-indexed. The challenge is selection and synthesis, not discovery.
- **Strategy**: Focus on finding the primary documents behind the popular narrative. Look for contradictions between the well-known story and original sources.
- **Trap to avoid**: Assuming the popular narrative is complete. Even well-documented topics have gaps and contested details.

### Moderately Documented Topics

Regional events, lesser-known historical incidents, secondary public figures.

- **Expected iterations**: 3-5 passes
- **Rationale**: Sources exist but are scattered. Some may be behind paywalls or in physical archives.
- **Strategy**: Start broad (news databases, Wikipedia leads), then narrow to specific archives and specialized collections. Use crawl4ai for scraping niche sources.
- **Trap to avoid**: Stopping after the easily accessible sources. The most interesting material is often in the harder-to-find sources.

### Obscure Topics

Local mysteries, cold cases, forgotten incidents, emerging stories with little coverage.

- **Expected iterations**: 5-8 passes with creative source strategies
- **Rationale**: Standard search strategies exhaust quickly. Need to use unconventional approaches: local newspaper archives, FOIA requests, genealogy databases, historical society records.
- **Strategy**: Each iteration should try a fundamentally different source strategy, not just new keywords in the same databases.
- **Trap to avoid**: Giving up too early. Obscure topics often have a breakthrough source hidden in an unexpected place.

### Controversial Topics

Active disputes, political cases, topics with organized disinformation.

- **Expected iterations**: 4-6 passes with extra triangulation
- **Rationale**: Source quality varies wildly and bias is pervasive. Need multiple independent chains of evidence.
- **Strategy**: Extra triangulation passes. For every claim, seek sources from opposing perspectives. Document the bias of each source explicitly.
- **Trap to avoid**: False balance -- presenting fringe claims as equivalent to well-sourced evidence. Evaluate claim strength by source tier, not by number of advocates.

## Breadth-First vs Depth-First Strategy [HEURISTIC]

Research oscillates between two modes. Knowing when to switch is the key skill.

### Breadth-First Mode

**When to use**: Survey phase, topic scoping, initial discovery, building the source landscape.

- Cast a wide net across many source types and subtopics
- Accept shallow coverage of each area in exchange for mapping the terrain
- Track everything found even if not immediately relevant -- lateral connections emerge later
- Goal: identify all the major threads, players, events, and source types available

**Switch to depth-first when**: The major threads are identified and the most promising leads are clear. Continuing breadth-first produces redundant discoveries.

### Depth-First Mode

**When to use**: Specific claim verification, source chain following, filling identified gaps, investigating contradictions.

- Follow a single thread as deep as it goes before switching to another
- Trace claim provenance back to primary sources
- Cross-reference specific details across multiple sources
- Goal: establish definitive answers (or document definitive uncertainty) for specific questions

**Switch to breadth-first when**: The current thread is exhausted (saturated or dead-ended), and there are other uninvestigated threads waiting.

### Switching Criteria

| Signal | Current Mode | Action |
|--------|-------------|--------|
| Repeated sources, no new leads | Breadth-first | Switch to depth-first on best lead |
| Source chain dead-ends | Depth-first | Switch to breadth-first for new angles |
| Major contradiction found | Either | Depth-first on the contradiction specifically |
| New entity or event discovered | Depth-first | Quick breadth-first survey of the new entity, then return |
| Gap in timeline identified | Either | Depth-first targeting the gap period |

## Script References

> Scripts below are documented for reference. Available after Phase 6 integration.

- `editorial/researcher/cli.py` -- The tool that executes research passes (survey, deepen, synthesize). The autoresearch methodology guides how to iterate across these passes.

## Reflection Phase

After completing iterative research work:
1. Re-read your output from start to finish
2. Identify one specific insight about what worked or what to improve -- focus on loop mechanics: did the convergence criteria fire at the right time? Was depth calibration accurate? Did diminishing returns detection save wasted effort?
3. Append one line to `.claude/skills/autoresearch/insights.md`: `- [YYYY-MM-DD] insight text`
4. Never skip this phase -- insights about iteration effectiveness compound across sessions

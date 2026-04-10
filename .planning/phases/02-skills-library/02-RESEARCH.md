# Phase 2: Skills Library - Research

**Researched:** 2026-04-10
**Domain:** Claude Code skills system -- domain expertise skills for documentary production pipeline
**Confidence:** HIGH

## Summary

Phase 2 builds 8 domain expertise skills that agents load on demand to supplement their own procedures. The key architectural insight from CONTEXT.md is that skills are NOT agent procedures -- the researcher agent already has its 3-pass pipeline baked into its agent body. Skills provide supplementary domain knowledge (source evaluation tiers, archive navigation, visual register vocabulary) that multiple agents can share. This is the GSD pattern: thin reusable knowledge modules injected via config, not duplicates of agent execution logic.

The Claude Code skills system is mature and well-documented. Skills are directories under `.claude/skills/` with a `SKILL.md` entrypoint, optional supporting files (`prompts/`, `scripts/`, `references/`), and frontmatter controlling invocation behavior. When injected into agents via the `skills:` frontmatter field, the full SKILL.md content loads at startup. When user-invocable, they create `/slash-commands`. The 1M context window on Opus/Sonnet 4.6 makes skill injection cost negligible.

The V5 project has 7 skill files that map directly to the 8 skills required for Phase 2. These V5 skills contain battle-tested domain knowledge (source evaluation tiers, archive navigation patterns, visual registers, evaluation scoring rubrics, crawl4ai patterns, statistical methods, autoresearch loops) that should be adapted into the Claude Code skill format rather than written from scratch. The 8th skill (structured-output) exists in V5 as a behavioral skill rather than a domain skill. All 8 skills need the consistent structure defined in CONTEXT.md: SKILL.md (no line cap), insights.md, and optional prompts/, scripts/, references/ directories.

**Primary recommendation:** Adapt V5 skill domain knowledge into Claude Code SKILL.md format with proper frontmatter, Phase 0 context loading, heuristic/deterministic tagging, and reflection phases. Build all 8 skills as user-invocable domain skills, then update the skill-crafting guide and REQUIREMENTS.md to reflect CONTEXT.md decisions (no line cap, optional exemplars).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** GSD pattern adopted -- agents own their execution procedures (3-pass research, 4-step writing), skills inject supplementary domain expertise. Skills are NOT agent procedures.
- **D-02:** Skills injected into agents via config-based mechanism (agent_skills mapping in config). Agents reference skills via `@file` syntax, not hardcoded in frontmatter.
- **D-03:** Skills serve multiple agents -- a domain skill like archive-search can be injected into both researcher and visual-researcher. Reusability is the design goal.
- **D-04:** Skills contain domain expertise only -- no Python script dependencies required. Script references are documented within skills but marked as "available after Phase 6 integration."
- **D-05:** Python scripts remain in V5 at `.pi/multi-team/scripts/` until Phase 6 migrates them to V0.6 directories.
- **D-06:** All 8 domain skills built in Phase 2.
- **D-07:** Lead coordination logic becomes pipeline skills in Phase 4 -- NOT agents.
- **D-08:** No 200-line cap on skills. 1M context window makes line limits unnecessary.
- **D-09:** `superpowers:writing-skills` is the PRIMARY reference for skill creation methodology.
- **D-10:** Exemplar system is OPTIONAL -- `references/` directory not required. `insights.md` is the primary and sufficient learning mechanism.
- **D-11:** Skill directory structure: `SKILL.md`, `prompts/`, `scripts/`, `insights.md`, `references/` (optional).
- **D-12:** SKIL-09 must be updated: remove 200-line constraint, make exemplars optional.
- **D-13:** SKIL-07 changes from required to optional.

### Claude's Discretion
- Skill internal organization (section ordering, subsection depth)
- Which skills need prompts/ vs. scripts/ directories (based on domain needs)
- insights.md initial content (can start empty)
- Exact skill names and slash-command naming (consistent with channel pipeline domain)
- How to structure the config-based skill injection mechanism

### Deferred Ideas (OUT OF SCOPE)
- Lead coordination logic as pipeline skills (`/research`, `/write-script`, `/visual-plan`, etc.) -- Phase 4
- REQUIREMENTS.md updates for SKIL-09 and SKIL-07 -- should be done during Phase 2 planning, not context gathering
- Local crafting guide update to reflect new decisions -- during Phase 2 execution
- Config-based skill injection mechanism design -- Phase 2 planning/research
- Python script migration from V5 to V0.6 -- Phase 6
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKIL-01 | Documentary research skill with 3-memory-layer structure | V5 `documentary-research.md` provides domain knowledge (source evaluation, triangulation, three-pass pipeline expertise). Adapt into Claude Code SKILL.md with insights.md lifecycle. |
| SKIL-02 | Archive search skill for Internet Archive/Prelinger/YouTube | V5 `archive-search.md` provides complete archive navigation patterns, rate limiting rules, scoring criteria. Direct adaptation. |
| SKIL-03 | Visual narrative skill for shot planning and visual storytelling | V5 `visual-narrative.md` provides 5-format vocabulary, mood-to-visual mapping, primary vs. b-roll rules. Direct adaptation. |
| SKIL-04 | Media evaluation skill for asset quality scoring and relevance grading | V5 `media-evaluation.md` provides 1-5 scoring scale, calibration rules, query refinement strategies. Direct adaptation. |
| SKIL-05 | Crawl4ai scraping skill for web research with browser automation | V5 `crawl4ai-scraping.md` provides usage patterns, extraction strategies, anti-bot handling. Adapt with V0.6 path updates. |
| SKIL-06 | Data analysis skill for statistical analysis and trend detection | V5 `data-analysis.md` provides statistical methods, NLP patterns, visualization rules. Direct adaptation. |
| SKIL-07 | Autoresearch skill (Karpathy-style iterative research loop) | V5 `karpathy-autoresearch.md` is extensive (560 lines). Adapt core loop logic, update file paths for V0.6. |
| SKIL-08 | Structured output skill for reports and JSON formatting | V5 `structured-output.md` provides formatting rules, file vs chat patterns, structure templates. Direct adaptation. |
| SKIL-09 | All skills follow structure: SKILL.md (no cap), prompts/, scripts/, insights.md, references/ (optional) | Modified per D-08, D-10, D-12. No line cap. Exemplars optional. Structure validated against official Claude Code docs. |
| SKIL-10 | All skills include reflection phase (append one-line insight to insights.md) | Insight lifecycle documented in skill-crafting-guide.md. Append per run, merge at 20+, promote at 3+ convergence. |
| SKIL-11 | All skills include Phase 0 context loading (read insights.md before starting) | Phase 0 pattern: Read insights.md + read relevant channel docs + read supporting files. |
| SKIL-12 | Heuristic vs deterministic sections explicitly tagged in all skills | V5 skills and existing agents (researcher, writer) already use `[HEURISTIC]`/`[DETERMINISTIC]` tags. Consistent pattern. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Windows 11 platform:** Never use `test -d`/`test -f`. Use Node.js or Python for file existence checks.
- **Path handling:** Project path has spaces and periods. Use `path.resolve()`, never hardcode paths.
- **Filenames:** Colons illegal on Windows. Timestamps must replace colons with dashes.
- **GPU scripts:** CLIP operations use `C:/Users/iorda/miniconda3/envs/perception-models/python.exe`.
- **Agent model:** User-invoked only. No auto-routing. No auto-dispatch.
- **Subagent isolation:** Subagents do NOT inherit CLAUDE.md -- each agent has `<project_context>` block.
- **Shared protocols:** Behavioral protocols injected via `agent-protocols` skill in `skills:` field.

## Standard Stack

This phase involves no npm packages or external dependencies. Skills are pure markdown files with YAML frontmatter. The "stack" is the Claude Code skills system itself.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Claude Code Skills | v2.1.96+ | Skill definition format, slash commands, agent injection | Native Claude Code feature, fully documented [VERIFIED: code.claude.com/docs/en/skills] |
| YAML Frontmatter | -- | Skill metadata (name, description, user-invocable) | Required by Claude Code skills system [VERIFIED: code.claude.com/docs/en/skills] |
| Markdown | -- | Skill body content, instructions, procedures | Standard format for Claude Code skills [VERIFIED: code.claude.com/docs/en/skills] |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `insights.md` | Accumulated learnings from skill runs | Every skill -- primary learning mechanism per D-10 |
| `prompts/` directory | Prompt templates for complex operations | Skills that need structured prompts (documentary-research, autoresearch) |
| `scripts/` directory | Helper scripts invoked by skill | Skills that reference Python scripts (marked "available after Phase 6") |
| `references/` directory | Exemplar outputs (OPTIONAL per D-10) | Only when exemplars genuinely help quality calibration |

### No Alternatives Needed
This is not a library selection decision. Claude Code skills are the only mechanism for injecting domain knowledge into agents. The decisions are about skill content and structure, not technology choices.

## Architecture Patterns

### Recommended Skill Directory Structure

```
.claude/skills/
    documentary-research/
        SKILL.md              # Domain expertise for documentary research
        prompts/              # Prompt templates (if applicable)
        insights.md           # Accumulated learnings (starts empty)
    archive-search/
        SKILL.md              # Archive navigation expertise
        insights.md
    visual-narrative/
        SKILL.md              # Visual register and mood mapping expertise
        insights.md
    media-evaluation/
        SKILL.md              # Asset scoring and quality grading expertise
        insights.md
    crawl4ai-scraping/
        SKILL.md              # Web scraping patterns for JS-heavy sites
        scripts/              # Helper scripts (Phase 6 migration)
        insights.md
    data-analysis/
        SKILL.md              # Statistical methods and visualization rules
        insights.md
    autoresearch/
        SKILL.md              # Karpathy-style iterative improvement loop
        insights.md
    structured-output/
        SKILL.md              # Formatting, file vs chat, structure patterns
        insights.md
    agent-protocols/          # (existing from Phase 1)
        SKILL.md
```

### Pattern 1: Domain Expertise Skill (User-Invocable)

**What:** A skill that provides domain knowledge supplementary to agent procedures. User can invoke via `/slash-command` to get domain-specific guidance, and agents load it at startup via `skills:` frontmatter.

**When to use:** Every skill in this phase except agent-protocols (which is already non-user-invocable).

**Structure:**
```yaml
---
name: skill-name
description: >-
  One paragraph describing the domain expertise this skill provides.
  Include when to use it. Front-load the key use case (truncated at 250 chars).
user-invocable: true
---

# Skill Title

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
2. Read relevant channel docs: @channel/relevant-file.md

## Domain Knowledge

### Section 1 [HEURISTIC]
[Judgment-based domain expertise]

### Section 2 [DETERMINISTIC]
[Structured rules, scoring rubrics, data patterns]

## Script References

> These scripts are documented for reference. They will be connected in Phase 6.
- `editorial/researcher/cli.py survey` -- [what it does]

## Reflection Phase

After completing the main work:
1. Re-read your output from start to finish
2. Identify one specific insight about what worked or what to improve
3. Append one line to `insights.md`: `- [YYYY-MM-DD] insight text`
```

[VERIFIED: frontmatter fields from code.claude.com/docs/en/skills]

### Pattern 2: Config-Based Skill Injection

**What:** Rather than hardcoding skill references in agent `skills:` frontmatter, the project uses a config-based approach where `agent_skills` in `.planning/config.json` maps agents to their skills.

**Design Decision (Claude's Discretion):** The CONTEXT.md D-02 specifies "config-based mechanism (agent_skills mapping in config)" but the actual implementation needs design. Two viable approaches:

**Approach A -- Agent frontmatter `skills:` field (Current Pattern):**
```yaml
# In .claude/agents/researcher.md
skills:
  - agent-protocols
  - documentary-research
  - archive-search
```
This is the native Claude Code mechanism. When the agent spawns, Claude Code injects the full SKILL.md content. [VERIFIED: code.claude.com/docs/en/skills]

**Approach B -- `@file` references in agent body:**
```markdown
# In agent body
## Domain Skills
@.claude/skills/documentary-research/SKILL.md
@.claude/skills/archive-search/SKILL.md
```
This uses the `@file` import syntax. Content resolves at load time. [VERIFIED: code.claude.com/docs/en/skills]

**Recommendation:** Use Approach A (native `skills:` frontmatter) as the primary injection mechanism. It is the Claude Code native way, ensures skill content is loaded into agent context at startup, and is explicitly designed for this purpose. The `agent_skills` config in `.planning/config.json` serves as a planning reference document mapping which agents get which skills, but the actual injection uses Claude Code's native `skills:` field.

The reason Approach B is weaker: `@file` imports work for CLAUDE.md and agent bodies, but the `skills:` frontmatter field provides additional benefits -- it appears in skill listings, enables the skill's `allowed-tools` and `hooks` to activate, and is the officially documented mechanism for agent-skill relationships. [VERIFIED: code.claude.com/docs/en/sub-agents]

### Pattern 3: Insight Lifecycle

**What:** The learning mechanism that makes skills improve over time.

**Lifecycle:**
1. **Append** -- After every skill run, append one line: `- [YYYY-MM-DD] insight text`
2. **Merge** -- At 20+ entries, consolidate duplicates into single entries
3. **Promote** -- When 3+ entries converge on the same pattern, extract into SKILL.md as a permanent guideline

**insights.md initial state:**
```markdown
# Insights

Accumulated learnings from skill runs. Read at the start of every run.

<!-- Append new insights below this line -->
```

[CITED: .claude/references/skill-crafting-guide.md]

### Pattern 4: Heuristic/Deterministic Tagging

**What:** Each procedural section in a skill is tagged `[HEURISTIC]` or `[DETERMINISTIC]` so agents know whether to apply judgment or systematic execution.

**When to use:** Every skill. This is requirement SKIL-12.

**Existing examples from Phase 1 agents:**
- Researcher: Pass 1 Survey `[DETERMINISTIC]`, Pass 2 Deep Dive `[HEURISTIC]`, Pass 3 Synthesis `[HEURISTIC]`
- Writer: Step 1 Absorb `[DETERMINISTIC]`, Step 2 Outline `[HEURISTIC]`, Step 3 Draft `[HEURISTIC]`, Step 4 Review `[HEURISTIC]`

[VERIFIED: .claude/agents/researcher.md and .claude/agents/writer.md]

### Anti-Patterns to Avoid

- **Duplicating agent procedures:** Skills provide domain knowledge, NOT execution steps. The researcher agent already has its 3-pass pipeline. The documentary-research skill provides source evaluation tiers, triangulation rules, and output quality criteria -- not the pipeline itself.
- **Hardcoding V5 paths in skills:** V5 scripts are at `.pi/multi-team/scripts/` but will move to `editorial/`, `media/`, `strategy/` in Phase 6. Skills should reference target paths with a "Phase 6" marker.
- **Overly long descriptions:** Truncated at 250 chars in the UI. Front-load the key use case.
- **Skipping the reflection phase:** Per D-10, insights.md is the PRIMARY learning mechanism. The reflection phase is not optional even when exemplars are.
- **Making all skills `disable-model-invocation: true`:** Domain skills should be loadable by Claude automatically when relevant. Only pipeline trigger skills (Phase 4) should be user-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skill injection into agents | Custom config loader | Claude Code `skills:` frontmatter field | Native mechanism, handles context injection automatically |
| Slash command registration | Manual command mapping | SKILL.md `name` field with `user-invocable: true` | Claude Code auto-creates `/name` from skill name |
| Dynamic context injection | Custom template system | `!backtick` syntax in SKILL.md | Native skill preprocessing, runs before Claude sees content |
| Skill triggering based on file context | Custom path matching | `paths:` frontmatter field | Native glob-based auto-activation |
| Supporting file management | Custom resource loader | Skill directory with `SKILL.md` + supporting files | Claude reads referenced files on demand |

**Key insight:** The Claude Code skills system handles all the infrastructure. Phase 2 is about writing domain content, not building tooling.

## Common Pitfalls

### Pitfall 1: Skills That Duplicate Agent Procedures
**What goes wrong:** A documentary-research skill that contains the 3-pass pipeline (survey, deep-dive, synthesis). When the researcher agent loads this skill, it now has two copies of the procedure -- one in its body, one from the skill -- and they may conflict.
**Why it happens:** The V5 skills were standalone procedure files. In V0.6, agent bodies already contain procedures.
**How to avoid:** Skills provide domain knowledge (source tiers, search strategies, scoring rubrics). Agents provide procedures (step 1, step 2, step 3). Clear separation.
**Warning signs:** If a skill has numbered steps that say "do X, then do Y, then do Z" -- that is a procedure, not domain knowledge.

### Pitfall 2: `disable-model-invocation` Bug
**What goes wrong:** Skills with `disable-model-invocation: true` may not be invocable even via slash command in some Claude Code versions.
**Why it happens:** Known bug (GitHub issue #26251) where Claude interprets the flag as "cannot use Skill tool at all" rather than "don't auto-trigger."
**How to avoid:** For Phase 2 domain skills, do NOT set `disable-model-invocation: true`. These skills should be invocable by both user and Claude. Reserve `disable-model-invocation: true` for Phase 4 pipeline trigger skills only, and test thoroughly.
**Warning signs:** User types `/skill-name` and Claude says it cannot use that skill.

[CITED: github.com/anthropics/claude-code/issues/26251]

### Pitfall 3: insights.md Not Being Read
**What goes wrong:** The Phase 0 context loading instruction says "read insights.md" but the agent skips it because the file is empty or the instruction is buried.
**Why it happens:** Claude prioritizes the main task over meta-instructions. An empty insights.md feels like wasted effort.
**How to avoid:** Make Phase 0 the FIRST section in the skill body, before any domain content. Include a comment in the empty insights.md explaining its purpose. The instruction should explicitly say "Read insights.md -- even if it is empty, this confirms the learning loop is active."
**Warning signs:** insights.md stays empty after multiple skill runs.

### Pitfall 4: Skill Description Too Long or Too Vague
**What goes wrong:** Claude never auto-invokes the skill because the description does not match what users naturally say, or the description is truncated losing key information.
**Why it happens:** Descriptions over 250 chars are truncated in the skill listing. Vague descriptions ("handles research stuff") do not trigger on specific queries.
**How to avoid:** Front-load the key use case in the first 250 chars. Include trigger phrases: "Use when evaluating video footage quality, scoring clips for relevance, or calibrating asset evaluation thresholds."
**Warning signs:** User asks about a topic the skill covers, but Claude does not load it.

[CITED: code.claude.com/docs/en/skills - description field documentation]

### Pitfall 5: V5 Path References Not Updated
**What goes wrong:** Skills reference `.pi/multi-team/scripts/media/ia_search.py` but the file does not exist in V0.6.
**Why it happens:** Adapting V5 content without updating paths. Per D-05, Python scripts stay in V5 until Phase 6.
**How to avoid:** Document script references as future capabilities: "Script: `media/ia_search.py` (available after Phase 6 integration)." Use the V0.6 target paths, not V5 paths.
**Warning signs:** An agent tries to run a script referenced in a skill and gets a "file not found" error.

### Pitfall 6: Windows Path Issues in Skills
**What goes wrong:** Skills that use `!backtick` dynamic context injection with paths containing spaces or periods fail on Windows.
**Why it happens:** Shell commands in `!backtick` syntax may not properly quote paths with spaces.
**How to avoid:** Avoid `!backtick` syntax for operations involving the project path. If needed, use quoted paths: `!``"D:/Youtube/D. Mysteries Channel/..."```. For Phase 2 domain skills, dynamic context injection is unlikely to be needed -- these are static domain knowledge files.
**Warning signs:** Skill invocation fails with path-related errors.

## Code Examples

### Example 1: Domain Expertise Skill (documentary-research)

```yaml
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

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/documentary-research/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read channel identity: @channel/channel.md

## Source Evaluation Tiers [DETERMINISTIC]

| Tier | Source Type | Trust Level |
|------|-----------|-------------|
| 1 | Court documents, government records, academic papers | High -- cite directly |
| 2 | Contemporaneous news (major outlets), official investigations | Moderate-high -- cross-reference |
| 3 | Books, documentaries, long-form journalism | Moderate -- check their sources |
| 4 | Wikipedia, blogs, forums, podcasts | Low -- use as leads only |
| 5 | Social media, anonymous claims, unsourced assertions | Do not use as evidence |

## Source Triangulation Rules [DETERMINISTIC]

- A claim is **sourced** when supported by 2+ independent Tier 1-3 sources
- A claim is **attributed** when only one credible source exists -- note the single-source risk
- A claim is **unverified** when supported only by Tier 4-5 sources -- flag for the writer
- Never present an unverified claim as fact

## Output Quality Standards [HEURISTIC]

- Timeline must be chronologically consistent with no contradictions
- Entity index must have no duplicate entries (same person under different names)
- Every section of the narrative arc must have sufficient source coverage
- Gaps in coverage must be explicitly documented, not hidden by vague language

## Narrative Hook Assessment [HEURISTIC]

Evaluate potential hooks on three axes:
1. **Dramatic tension:** Does it create questions the viewer needs answered?
2. **Factual grounding:** Is it supported by Tier 1-2 sources?
3. **Visual potential:** Can it be illustrated with available footage/images?

## Script References

> Scripts below are documented for reference. Available after Phase 6 integration.
- `editorial/researcher/cli.py survey <topic>` -- Automated broad survey
- `editorial/researcher/cli.py deepen <topic>` -- Deep dive on specific aspects
- `editorial/researcher/cli.py synthesize <topic>` -- Compile into dossier format

## Reflection Phase

After completing research work:
1. Re-read your output from start to finish
2. Identify one specific insight about what worked or what to improve
3. Append one line to `insights.md`: `- [YYYY-MM-DD] insight text`
```

[VERIFIED: Frontmatter fields and structure from code.claude.com/docs/en/skills]
[CITED: V5 source at .pi/multi-team/skills/documentary-research.md for domain content]

### Example 2: Non-User-Invocable Behavioral Skill (agent-protocols -- existing)

```yaml
---
name: agent-protocols
description: >-
  Shared behavioral protocols for all agents. Memory lifecycle and feedback
  signal handling. Injected into agent context at startup.
user-invocable: false
---
```

This pattern is for behavioral skills only. All Phase 2 domain skills use `user-invocable: true`. [VERIFIED: existing .claude/skills/agent-protocols/SKILL.md]

### Example 3: insights.md Initial State

```markdown
# Insights

Accumulated learnings from skill runs. Read at the start of every run.

## Lifecycle
- **Append:** One insight per run (never skip the reflection phase)
- **Merge:** Consolidate duplicates at 20+ entries
- **Promote:** Extract to SKILL.md when 3+ entries converge on same pattern

<!-- Append new insights below this line -->
```

### Example 4: Agent Frontmatter with Skills Injection

```yaml
---
name: researcher
description: >-
  Conducts deep documentary research on dark history, true crime, and unsolved
  mystery topics. Produces research dossiers with sourced claims and entity
  indexes. Invoke when the user asks to research a topic for a documentary.
model: sonnet
memory: project
color: blue
skills:
  - agent-protocols
  - documentary-research
  - archive-search
  - crawl4ai-scraping
---
```

Note: Phase 2 builds the skills. Phase 3 updates agent frontmatter to reference them. [VERIFIED: skills injection via .claude/agents/ frontmatter from code.claude.com/docs/en/sub-agents]

## V5 to V0.6 Skill Mapping

| V5 Skill File | V0.6 Skill Name | Requirement | Key Adaptations |
|---------------|-----------------|-------------|-----------------|
| `documentary-research.md` | `documentary-research` | SKIL-01 | Add frontmatter, Phase 0, reflection, tag H/D sections |
| `archive-search.md` | `archive-search` | SKIL-02 | Add frontmatter, Phase 0, reflection, update path refs |
| `visual-narrative.md` | `visual-narrative` | SKIL-03 | Add frontmatter, Phase 0, reflection, tag H/D sections |
| `media-evaluation.md` | `media-evaluation` | SKIL-04 | Add frontmatter, Phase 0, reflection, tag H/D sections |
| `crawl4ai-scraping.md` | `crawl4ai-scraping` | SKIL-05 | Add frontmatter, Phase 0, reflection, update conda path |
| `data-analysis.md` | `data-analysis` | SKIL-06 | Add frontmatter, Phase 0, reflection, tag H/D sections |
| `karpathy-autoresearch.md` | `autoresearch` | SKIL-07 | Add frontmatter, Phase 0, reflection, update V0.6 paths |
| `structured-output.md` (behavioral) | `structured-output` | SKIL-08 | Add frontmatter, Phase 0, reflection, frame as domain skill |

[VERIFIED: V5 skills exist at D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\skills\]

## Skill Creation Methodology

The CONTEXT.md D-09 specifies `superpowers:writing-skills` (Anthropic's official skill-creator) as the PRIMARY reference for skill creation methodology. Key principles from that methodology:

### TDD for Skills
1. Capture intent -- what the skill enables, when it triggers, expected output
2. Write SKILL.md with proper structure
3. Create test cases (realistic user prompts)
4. Evaluate against baseline (with-skill vs without-skill)
5. Iterate based on evaluation

For Phase 2, the TDD approach is simplified: we adapt V5 domain knowledge (known-good content) into the Claude Code format. The "test" is whether the skill invocation produces domain-appropriate guidance.

### CSO Description Optimization
The description field is the PRIMARY triggering mechanism. Key rules:
- Front-load the use case (truncated at 250 chars)
- Be "pushy" about triggering -- include trigger phrases
- Include both "what the skill does" AND "when to use it"
- Combat undertriggering by listing common user phrasings

### Rationalization Resistance
- Explain the "why" behind instructions, not just the "what"
- Avoid ALL-CAPS MUSTs; explain reasoning instead
- Define output formats explicitly with templates
- Keep the prompt lean -- remove anything not earning its weight

[CITED: github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md]

## Config-Based Skill Injection Design

Per D-02, skills are injected via config-based mechanism. The recommended design:

### agent_skills Mapping in config.json

```json
{
  "agent_skills": {
    "researcher": ["agent-protocols", "documentary-research", "archive-search", "crawl4ai-scraping"],
    "writer": ["agent-protocols", "documentary-research", "structured-output"],
    "visual-researcher": ["agent-protocols", "visual-narrative", "archive-search", "crawl4ai-scraping"],
    "visual-planner": ["agent-protocols", "visual-narrative", "archive-search", "media-evaluation"],
    "asset-processor": ["agent-protocols", "media-evaluation"],
    "asset-curator": ["agent-protocols", "media-evaluation"],
    "strategy": ["agent-protocols", "data-analysis", "structured-output"],
    "meta": ["agent-protocols", "autoresearch", "structured-output"]
  }
}
```

This serves as a planning reference. The actual injection happens in each agent's `skills:` frontmatter field (the Claude Code native mechanism). The config mapping tells the Phase 3 planner which skills each agent needs.

Note: Phase 2 builds the skills and defines the mapping. Phase 3 updates agent frontmatter to reference them. Phase 2 only needs to update the two existing agents (researcher, writer) if the planner deems it appropriate, but the primary deliverable is the skills themselves.

[ASSUMED: The agent_skills config structure is a planning artifact, not enforced by Claude Code. The actual injection uses native skills: frontmatter.]

## State of the Art

| Old Approach (V5 / Crafting Guide) | Current Approach (CONTEXT.md Decisions) | When Changed | Impact |
|------------------------------------|-----------------------------------------|--------------|--------|
| SKILL.md < 200 lines | No line cap (D-08) | Phase 2 context session | Skills can be comprehensive |
| Exemplar curation required (2-3 per skill) | Exemplars optional (D-10, D-13) | Phase 2 context session | references/ directory optional |
| Standalone skill procedures | Skills as supplementary domain knowledge (D-01) | Phase 2 context session | Skills don't duplicate agent procedures |
| Skills hardcoded in agent frontmatter | Config-based mapping (D-02) | Phase 2 context session | Centralized skill assignment |

**Deprecated/outdated:**
- `.claude/commands/` directory: Merged into skills system. Still works but skills are recommended. [VERIFIED: code.claude.com/docs/en/skills]
- 200-line SKILL.md cap: Explicitly overridden by user (D-08). Official docs recommend "under 500 lines" for SKILL.md but do not enforce a cap. [VERIFIED: code.claude.com/docs/en/skills]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `agent_skills` config mapping is a planning reference, not enforced runtime config. Actual injection uses native `skills:` frontmatter. | Config-Based Skill Injection Design | Low -- if user expects runtime config enforcement, the mechanism would need a hook or script to validate agent-skill mapping |
| A2 | All 8 domain skills should be `user-invocable: true` (users can invoke via `/name`) | Architecture Patterns | Low -- user can change to `disable-model-invocation: true` if they prefer manual-only triggering |
| A3 | Skills should adapt V5 domain knowledge rather than being written from scratch | V5 to V0.6 Mapping | Low -- V5 content is battle-tested, but some content may need significant rework for the Claude Code context |
| A4 | The `superpowers:writing-skills` reference maps to Anthropic's `skill-creator` in the official skills repo | Skill Creation Methodology | Medium -- if user has a different tool in mind, the methodology section would need revision |

## Open Questions

1. **Config mapping enforcement timing**
   - What we know: D-02 says "config-based mechanism (agent_skills mapping in config)"
   - What's unclear: Should the agent_skills config be enforced at runtime (via a hook that validates agent-skill pairings), or is it purely a planning reference?
   - Recommendation: Treat as planning reference for Phase 2. If runtime enforcement is desired, add a validation hook in Phase 4 (along with `/audit-agents`).

2. **Should Phase 2 update existing agent frontmatter?**
   - What we know: Researcher and writer agents currently only reference `agent-protocols` in their `skills:` field.
   - What's unclear: Should Phase 2 also update these agents to reference the new domain skills, or is that Phase 3's job?
   - Recommendation: Phase 2 builds skills. Phase 3 updates agent frontmatter. Keep the phases focused. However, the planner may include a final task to update researcher and writer as a validation step.

3. **Skill naming: hyphens vs underscores**
   - What we know: Claude Code skill names must be "lowercase letters, numbers, and hyphens only (max 64 characters)" per official docs.
   - What's unclear: Whether slash-command UX is better with short names (`/research`) or descriptive names (`/documentary-research`).
   - Recommendation: Use descriptive names (`documentary-research`, `archive-search`) for domain skills. Short names (`/research`, `/write-script`) are reserved for Phase 4 pipeline trigger skills.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js `fs` assertions (same pattern as Phase 1 smoke test) |
| Config file | `tests/smoke-test-paths.js` (extend for Phase 2) |
| Quick run command | `node tests/smoke-test-skills.js` |
| Full suite command | `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKIL-01 | documentary-research skill directory exists with SKILL.md | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-02 | archive-search skill directory exists with SKILL.md | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-03 | visual-narrative skill directory exists with SKILL.md | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-04 | media-evaluation skill directory exists with SKILL.md | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-05 | crawl4ai-scraping skill directory exists with SKILL.md | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-06 | data-analysis skill directory exists with SKILL.md | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-07 | autoresearch skill directory exists with SKILL.md | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-08 | structured-output skill directory exists with SKILL.md | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-09 | All skills have SKILL.md + insights.md, correct frontmatter | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-10 | All skills contain "Reflection Phase" section | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-11 | All skills contain "Phase 0: Context Loading" section | smoke | `node tests/smoke-test-skills.js` | Wave 0 |
| SKIL-12 | All skills contain [HEURISTIC] and [DETERMINISTIC] tags | smoke | `node tests/smoke-test-skills.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node tests/smoke-test-skills.js`
- **Per wave merge:** `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/smoke-test-skills.js` -- covers SKIL-01 through SKIL-12 (file existence, frontmatter validation, section presence)
- [ ] Validation should check: directory exists, SKILL.md exists, insights.md exists, SKILL.md has valid YAML frontmatter with `name` and `description`, SKILL.md body contains "Phase 0", "Reflection Phase", `[HEURISTIC]`, `[DETERMINISTIC]`

## Security Domain

This phase involves creating markdown skill files with no external dependencies, no network access, no secrets, and no user input processing. Security considerations are minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | No | N/A (skills are static markdown) |
| V6 Cryptography | No | N/A |

No security controls needed for this phase. Skills are static markdown files read by Claude Code.

## Sources

### Primary (HIGH confidence)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) -- Full skills system reference, frontmatter fields, invocation control, supporting files, dynamic context injection
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- Skills injection into agents via `skills:` frontmatter
- [Anthropic Skill Creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) -- Official skill creation methodology (TDD, CSO optimization)
- V5 Skills at `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\skills\` -- Source domain knowledge for all 8 skills

### Secondary (MEDIUM confidence)
- [GitHub Issue #26251](https://github.com/anthropics/claude-code/issues/26251) -- `disable-model-invocation` bug documentation
- [GitHub Issue #19141](https://github.com/anthropics/claude-code/issues/19141) -- Clarification on `user-invocable` vs `disable-model-invocation`
- `.planning/research/STACK.md` -- Phase 1 research on Claude Code extension points
- `.planning/research/ARCHITECTURE.md` -- Phase 1 architecture patterns

### Tertiary (LOW confidence)
- None. All findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Claude Code skills system is stable, well-documented, verified against official docs
- Architecture: HIGH -- V5 skill content is battle-tested, adaptation patterns are straightforward
- Pitfalls: HIGH -- Known issues documented with official sources (GitHub issues, docs)
- Skill content mapping: HIGH -- All 7 V5 source skills verified to exist on disk

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable domain -- skills system unlikely to change significantly)

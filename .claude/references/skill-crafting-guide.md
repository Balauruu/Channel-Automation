# Skill Crafting Guide

Reference for creating Claude Code skills in the Channel-Automation pipeline.

## Skill Directory Structure

Each skill lives in its own directory under `.claude/skills/`:

```
.claude/skills/skill-name/
    SKILL.md              # Skill definition (no line cap)
    prompts/              # Prompt templates used by the skill (where applicable)
    scripts/              # Helper scripts invoked by the skill (where applicable)
    insights.md           # Accumulated learnings from skill runs
    references/           # OPTIONAL exemplar outputs for quality calibration
        exemplar_01.md    # (optional -- not all skills need exemplars)
        exemplar_02.md    # (optional)
```

## SKILL.md Frontmatter

Required YAML frontmatter fields at the top of every SKILL.md:

    Frontmatter fields:
      name: skill-name
      description: One paragraph describing when and why this skill is used.
        Front-load the key use case (truncated at 250 chars in the UI).
      user-invocable: true for user-triggered skills (/slash-command),
        false for agent-injected behavioral skills

Additional optional fields: `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`, `disable-model-invocation`.

## Skill Body Sections

### Phase 0: Context Loading

Before starting work, the skill loads accumulated context:

1. Read `insights.md` from the skill directory for accumulated learnings
2. If `references/` directory exists with exemplar files, read them to calibrate quality expectations (exemplars are optional)
3. Review any relevant channel docs referenced via `@channel/file.md`

### Procedure

Tag each step as one of:

- **[HEURISTIC]** -- Requires judgment, narrative design, or evaluation. Solve via prompts and channel knowledge. No code.
- **[DETERMINISTIC]** -- Requires structured data manipulation, scraping, file I/O, or rendering. Write or invoke code.

Steps should be ordered and numbered. Each step should produce a visible artifact or state change.

### Reflection Phase

After completing the main procedure:

1. Re-read your output from start to finish
2. Evaluate against quality standards defined in the skill and any exemplars loaded in Phase 0
3. Identify one specific insight about what worked or what to improve
4. Append one line to `insights.md` with format: `- [YYYY-MM-DD] insight text`

## Insight Lifecycle

Insights accumulate in `insights.md` over multiple skill runs:

- **Append** one insight per run (never skip the reflection phase)
- **Merge** at 20+ entries: consolidate duplicate or overlapping insights into single entries
- **Promote** when 3+ insights converge on the same pattern: extract the pattern into the SKILL.md procedure as a permanent step or guideline

`insights.md` is the primary and sufficient learning mechanism for skills. Exemplars are supplementary -- not all skills need them.

## Exemplar Curation (OPTIONAL)

Optionally maintain 2-3 exemplar outputs in the `references/` directory for skills that benefit from concrete quality examples:

- Named `exemplar_01.md`, `exemplar_02.md`, etc.
- Each exemplar represents a high-quality output from a previous skill run
- Exemplars are loaded during Phase 0 to calibrate quality expectations (when present)
- Replace exemplars when significantly better outputs are produced
- Not all skills need exemplars -- `insights.md` is the primary and sufficient learning mechanism

## Anti-Patterns

- Do NOT pad skills with filler content -- every section should earn its place. Skills can be as long as needed for thorough domain coverage.
- Do NOT skip the reflection phase -- insights compound over time and are the skill's primary learning mechanism
- Do NOT put channel-specific content in skills -- reference channel docs via `@channel/file.md` instead
- Do NOT duplicate agent-protocols content -- behavioral protocols belong in the shared agent-protocols skill, not in individual skills
- Do NOT use skills for one-off tasks -- skills are for repeated processes that benefit from accumulated insights

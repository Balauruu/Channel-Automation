# Code Reviewer Memory

## Key Files
- Strategy scripts: strategy/*.py
- Editorial scripts: editorial/**/*.py
- Media scripts: media/*.py
- Agent definitions: .claude/agents/*.md
- Skill definitions: .claude/skills/*/SKILL.md
- Test scripts: tests/*.js
- Review output: meta/reviews/
- Project conventions: CLAUDE.md

## Decisions
- [2026-04-10] Windows path safety: always use os.path.join() or pathlib.Path, never string concatenation
- [2026-04-10] GPU scripts must specify conda env explicitly (C:/Users/iorda/miniconda3/envs/perception-models/python.exe), never rely on system PATH
- [2026-04-10] Review severity: critical (blocks pipeline), major (incorrect behavior), minor (style/convention)
- [2026-04-10] Cross-script interaction checks: verify output format matches downstream input expectations
- [2026-04-10] Agent definition reviews validate all frontmatter fields, persona completeness, and memory setup

## Patterns
- [2026-04-10] Most common Python bugs in pipeline: unhandled None returns, missing file existence checks, hardcoded paths
- [2026-04-10] Agent definition issues typically: missing frontmatter fields, V5 artifacts, incorrect tool scoping
- [2026-04-10] Windows-specific issues: path separator confusion, illegal filename characters (colons in timestamps), spaces in paths
- [2026-04-10] Implement fixes directly for isolated clear bugs; flag for human decision when interfaces change

## Observations
- Awaiting first code review session for observation data

## Open Questions
- Awaiting first code review session for open questions

# Code Reviewer Memory

## Key Files
- Strategy scripts: .claude/scripts/strategy/**/*.py
- Editorial scripts: .claude/scripts/editorial/**/*.py
- Media scripts: .claude/scripts/media/*.py
- Agent definitions: .claude/agents/*.md
- Skill definitions: .claude/skills/*/SKILL.md
- Test scripts: tests/*.js
- Review output: meta/reviews/
- Project conventions: CLAUDE.md

## Decisions
- Windows path safety: always use os.path.join() or pathlib.Path, never string concatenation
- GPU scripts must specify conda env explicitly (C:/Users/iorda/miniconda3/envs/perception-models/python.exe), never rely on system PATH
- Review severity: critical (blocks pipeline), major (incorrect behavior), minor (style/convention)
- Cross-script interaction checks: verify output format matches downstream input expectations
- Agent definition reviews validate all frontmatter fields, persona completeness, and memory setup

## Patterns
- Most common Python bugs in pipeline: unhandled None returns, missing file existence checks, hardcoded paths
- Agent definition issues typically: missing frontmatter fields, V5 artifacts, incorrect tool scoping
- Windows-specific issues: path separator confusion, illegal filename characters (colons in timestamps), spaces in paths
- Implement fixes directly for isolated clear bugs; flag for human decision when interfaces change

## Observations

## Open Questions

## Archived

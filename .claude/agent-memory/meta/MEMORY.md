# Meta Memory

## Key Files
- Agent definitions: .claude/agents/*.md
- Skill definitions: .claude/skills/*/SKILL.md
- Project outputs: projects/*/
- Health reports: meta/health-reports/
- Improvement proposals: meta/proposals/
- Pipeline config: .planning/config.json
- Channel identity: channel/channel.md

## Decisions
- [2026-04-10] Improvement proposals follow structured format: problem, impact, proposed solution, effort estimate, priority
- [2026-04-10] Pipeline health checks assess: completion rate, error frequency, time per stage, output quality trends
- [2026-04-10] UX review covers: navigability, completeness, format consistency, actionability of outputs
- [2026-04-10] Priority matrix: impact x effort grid (P1-P3) drives proposal scheduling
- [2026-04-10] Cross-stage correlations tracked explicitly: research quality -> script quality, shot specificity -> asset match rate
- [2026-04-10] Cost tracking includes: token usage per agent, GPU utilization, rate limit encounters, redundant work detection

## Patterns
- [2026-04-10] Cross-stage bottlenecks most commonly appear at research->script and visual-plan->assets transitions
- [2026-04-10] Edit sheet readability degrades when act count exceeds 7 -- visual cognitive load increases
- [2026-04-10] Recurring issues across 3+ pipeline runs warrant a formal improvement proposal
- [2026-04-10] Checkpoint friction highest when too much detail is presented -- lead with summary, details on request
- [2026-04-10] Vague shot descriptions in visual planning consistently produce low asset match rates downstream

## Observations

## Open Questions


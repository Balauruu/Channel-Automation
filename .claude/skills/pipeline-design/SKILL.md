---
name: pipeline-design
description: >-
  Framework for auditing and designing pipeline agents and skills. Use when
  auditing an existing agent or skill, designing a new one, or reviewing
  the pipeline for bloat, overlap, stale references, or overfitting to
  test cases. Provides decision rules (global skill vs agent-body vs
  bundled reference), script-failure policy, generalization audit
  pattern, and a one-at-a-time audit workflow.
user-invocable: true
---

# Pipeline Design

Design framework for pipeline agents and skills in this project. Captures
decision rules and anti-patterns discovered during pipeline reviews. Use
this skill whenever editing, creating, or auditing anything in
`.claude/agents/` or `.claude/skills/`.

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/pipeline-design/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read `./CLAUDE.md` for the project folder map and agent reference table

## Decision Rule: Global Skill vs Agent-Body vs Bundled Reference

Every piece of domain knowledge lives in exactly one of three places.

| Placement | When to choose |
|-----------|----------------|
| **Global skill** (`.claude/skills/<name>/SKILL.md`) | Meta behavior (memory lifecycle, observability, structured output) OR shared across ≥2 agents |
| **Agent body** (inline in `.claude/agents/<agent>.md`) | Single-consumer domain knowledge tightly coupled to the agent's procedure |
| **Bundled reference** (`.claude/agents/<agent>/references/<topic>.md`) | Single-consumer domain knowledge that is bulky and reads well on-demand |

**Tests:**
- Shared by ≥2 agents? → global skill.
- Single consumer + tight coupling to procedure? → merge into agent body.
- Single consumer + bulky + on-demand? → bundled reference.

**Discoverability note:** Claude Code scans `.claude/agents/*.md` flat — it
does NOT recurse into subdirectories. The agent's main `.md` file must
stay at the top level. Bundled references live in a sibling folder
`.claude/agents/<agent>/references/` and are loaded via explicit `Read()`
from the agent.

## Decision Rule: Script-Failure Policy

Every pipeline agent that has both a happy path (scripts) and a fallback
path (WebFetch, manual tooling, etc.) must distinguish two failure modes:

- **Environment broken** — `ImportError`, missing binary, missing
  dependency, wrong interpreter → **stop immediately**. Report a
  diagnostic to the user. Do not substitute the fallback silently. A
  broken environment is a configuration problem; masking it wastes time
  and produces degraded output.
- **Process blocked** — single URL 403s, one API rate-limited, one source
  paywalled → **fall back for that specific case only**. Continue the
  rest of the pipeline.

This rule applies to every pipeline agent, not just the researcher.

## Generalization Audit Pattern

Pipeline tools that should be topic-agnostic repeatedly absorb biases from
whichever topic was used during development. Detection:

1. List every example, category, or prescriptive list in the agent/skill
   body.
2. For each item, ask: "If I'd developed this against a different topic,
   would this item still appear?"
3. If no, it's overfitting. Cut it or generalize it.

**Before locking any pipeline agent spec:**
- Dry-test it mentally (or actually) against ≥2 maximally different topics
  (different century, domain, evidence type).
- Anything that only applies to one test topic is overfitting. Remove it.

## Anti-Patterns to Detect During Audit

| # | Anti-pattern | Signal | Fix |
|---|--------------|--------|-----|
| 1 | Duplicated content between agent body and linked skill | Same tier/rule/definition in two places | Merge into one, delete the other |
| 2 | Stale script references | Old path, missing interpreter pin, wrong invocation form | Rewrite to current canonical form, pin interpreter |
| 3 | Unused `skills:` frontmatter entries | Agent lists a skill but never invokes its knowledge | Remove from frontmatter |
| 4 | Heuristic-loop machinery where a deterministic gate would suffice | Convergence/budget/quality-gate prose on top of a fixed script count | Replace with explicit conditional triggers |
| 5 | Topic-specific biases baked into general tooling | Categories or examples that only fit one test case | Remove or generalize |
| 6 | CLAUDE.md thinking patterns leaking into agent outputs | `[DETERMINISTIC]` / `[HEURISTIC]` tags; "Phase 0 context loading" boilerplate when `agent-protocols` already covers it | Strip |
| 7 | Dead routers (skills that only dispatch an agent) | `disable-model-invocation: true` + a canned prompt that replicates `@agent-name do X` | Delete the skill; user invokes the agent directly |

## One-at-a-Time Audit Workflow

This skill is explicitly human-in-the-loop. Do not audit multiple agents
in a single pass. For each target:

1. **Read** the agent's `.md` file fully. Read every skill listed in its
   `skills:` frontmatter. Read every reference it `Read()`s.
2. **Inventory overlap.** List content that appears in ≥2 of
   {agent body, its skills, other agents}.
3. **Inventory stale references.** Grep for script paths, interpreter
   names, API forms, flag usage. Cross-check against current state.
4. **Inventory overfits.** Apply the Generalization Audit Pattern above.
5. **Propose cuts.** Write a short list: what to remove, what to merge,
   what to rewrite.
6. **Confirm with the user.** Present the proposal. Wait for approval
   before editing.
7. **Apply the changes.** One concern per commit.
8. **Append to `insights.md`.** One line: what was audited, which
   anti-patterns fired, what was changed.

## Worked Example

The first application of this framework was `@researcher`
(2026-04-18). See `insights.md` for the short-form summary.

## Reflection Phase

After completing an audit:
1. Identify one specific insight about what worked or what to improve in
   the audit process itself.
2. Append one line to `.claude/skills/pipeline-design/insights.md`:
   `- [YYYY-MM-DD] insight text`
3. Never skip this phase — insights compound.

---
name: pipeline-design
description: >-
  Framework for auditing and designing pipeline agents and skills. Use when
  auditing an existing agent or skill, designing a new one, or reviewing
  the pipeline for bloat, overlap, stale references, or overfitting to
  test cases. Provides decision rules (skill vs agent-body vs bundled
  reference, task tracking, subagent dispatch), script-failure policy,
  generalization audit pattern, and a one-at-a-time audit workflow.
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

## Decision Rule:  Skill vs Agent-Body vs Bundled Reference

Every piece of domain knowledge lives in exactly one of three places.

| Placement | When to choose |
|-----------|----------------|
| ** skill** (`.claude/skills/<name>/SKILL.md`) | Meta behavior (memory lifecycle, observability, structured output) OR shared across ≥2 agents |
| **Agent body** (inline in `.claude/agents/<agent>.md`) | Single-consumer domain knowledge tightly coupled to the agent's procedure |
| **Bundled reference** (`.claude/agents/<agent>/references/<topic>.md`) | Single-consumer domain knowledge that is bulky and reads well on-demand |

**Tests:**
- Shared by ≥2 agents? →  skill.
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

## Decision Rule: Model Selection & Thinking Effort

Every agent must declare `model` and `effort` in its YAML frontmatter.

### `model` field

Controls which AI model the subagent uses. Accepted values:

| Value | When to use |
|-------|-------------|
| `sonnet` | Default for most pipeline agents — balanced capability and speed |
| `opus` | High-stakes editorial or complex reasoning tasks |
| `haiku` | Read-only exploration, lightweight lookups |
| `inherit` | Subagent should match the parent session's model |
| Full model ID (e.g. `claude-sonnet-4-6`) | Pin to a specific model version |

### `effort` field

Controls the agent's extended thinking budget — how deeply it reasons
before responding. Accepted values: `low`, `medium`, `high`, `xhigh`, `max`.

**Project standard: all agents MUST set `effort: high`.**

Rationale: pipeline agents perform complex, multi-step tasks (research
synthesis, script writing, visual planning, code review) where shallow
reasoning produces measurably worse output. The cost of deeper thinking
is negligible compared to the cost of re-running an agent that produced
a low-quality result.

### Audit checklist for model selection

During any agent audit, verify:

1. **`model` is explicit** — never omitted (implicit `inherit` hides
   intent; make the choice visible).
2. **`effort: high` is present** — if missing, add it.
3. **Model choice matches workload:**
   - Deterministic pipeline tasks (asset processing, compilation) → `sonnet`
   - Heuristic editorial tasks (research, writing, style extraction) → `sonnet` (or `opus` if quality gates demand it)
   - Read-only exploration → `haiku` is acceptable
4. **No over-provisioning** — don't use `opus` where `sonnet` suffices;
   don't use `max` effort where `high` suffices.

### Frontmatter example

```yaml
---
name: researcher
description: >-
  Conducts deep documentary research...
model: sonnet
effort: high
---
```

## Decision Rule: Task Tracking

Agents with ≥3 sequential procedural steps must register them with
`TaskCreate` at the start of execution and call `TaskUpdate` as each
step completes. This gives the orchestrating session progress visibility
into long-running agents.

**Threshold:** count the distinct, named steps in the agent's procedure.

| Count | Action |
|-------|--------|
| ≤2 steps | Skip task tracking — overhead exceeds benefit |
| ≥3 steps | Register all steps at entry, update each on completion |

**How to apply during audit:**

1. Count the agent's procedural steps.
2. If ≥3, verify the agent's `tools:` frontmatter includes `TaskCreate`
   and `TaskUpdate` (fetch via `ToolSearch` if deferred).
3. Verify the procedure describes when to register and update tasks.
4. If missing, flag it (anti-pattern #10).

Steps must be meaningful milestones (e.g., "survey pass", "synthesis"),
not micro-operations (e.g., "read file", "write entry"). A step that
takes <30 seconds of agent work is too granular to track.

## Decision Rule: Internal Subagent Dispatch

When an agent step iterates over ≥3 independent, parallelizable units of
work (sources, segments, assets), the agent may dispatch subagents to
process them concurrently. Adapted from the Superpowers
`dispatching-parallel-agents` pattern for documentary pipeline work.

### Four criteria (all must hold)

| Criterion | Test |
|-----------|------|
| **Independence** | Each unit can be processed without context from other units |
| **Volume** | ≥3 items to process (below 3, dispatch overhead exceeds benefit) |
| **Isolation** | A subagent can produce correct output without the parent's full context |
| **No shared state** | Subagents will not read/write the same files concurrently |

If any criterion fails, do the work sequentially in the parent agent.

### Subagent prompt structure

Each dispatched subagent receives exactly four things:

1. **Specific scope** — one source, one segment, one asset batch. Never
   "process all of these."
2. **Output format** — the exact schema the parent expects back. Match
   the parent agent's data contract (JSON fields, section headings,
   file-naming conventions).
3. **Quality criteria** — what "good" looks like for this unit. Tier
   thresholds, minimum fields, verification level.
4. **Escalation path** — when to stop and report back (e.g., "if the
   source is paywalled, return `status: blocked` instead of guessing")
   vs. when to push through.

### When NOT to dispatch

- Units are interdependent (processing one changes how you process another).
- Volume is low (1–2 items — sequential is simpler and faster).
- The work requires the parent's full context to be correct (e.g.,
  narrative threading across segments).
- Subagents would edit the same output files.

### How to apply during audit

1. Examine each procedural step in the agent.
2. If a step iterates over a collection, check the four criteria above.
3. If all four hold and the collection is typically ≥3 items, verify the
   agent's `tools:` frontmatter includes `Agent`.
4. If the opportunity exists but is not implemented, flag it
   (anti-pattern #11).

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
| 8 | Missing or implicit model/effort config | `model` omitted (defaults to `inherit`) or `effort` missing entirely | Add explicit `model` and `effort: high` per project standard |
| 9 | Subagent-for-everything | Dispatching subagents for ≤2 items or for interdependent work | Remove dispatch; do the work sequentially in the parent agent |
| 10 | Missing task tracking | ≥3-step procedure with no `TaskCreate`/`TaskUpdate` in tools or procedure | Add task registration at entry, updates per step |
| 11 | Missed parallelization | Step iterates ≥3 independent items sequentially without subagent dispatch | Verify four criteria; if all hold, add `Agent` to tools and dispatch pattern to procedure |

## One-at-a-Time Audit Workflow

This skill is explicitly human-in-the-loop. Do not audit multiple agents
in a single pass. For each target:

1. **Read** the agent's `.md` file fully. Read every skill listed in its
   `skills:` frontmatter. Read every reference it `Read()`s.
2. **Verify model config.** Check `model` and `effort` in frontmatter
   against the Model Selection & Thinking Effort rules above.
3. **Verify task tracking.** Count the agent's procedural steps. If ≥3,
   check that `tools:` includes task tools and the procedure describes
   when to register and update tasks (see Task Tracking rule above).
4. **Verify subagent opportunities.** Examine each step for iteration
   over independent collections. If any step processes ≥3 independent
   items, check whether the four dispatch criteria hold and whether
   `Agent` is in the `tools:` list (see Subagent Dispatch rule above).
5. **Inventory overlap.** List content that appears in ≥2 of
   {agent body, its skills, other agents}.
6. **Inventory stale references.** Grep for script paths, interpreter
   names, API forms, flag usage. Cross-check against current state.
7. **Inventory overfits.** Apply the Generalization Audit Pattern above.
8. **Propose cuts.** Write a short list: what to remove, what to merge,
   what to rewrite.
9. **Confirm with the user.** Present the proposal. Wait for approval
   before editing.
10. **Apply the changes.** One concern per commit.
11. **Append to `insights.md`.** One line: what was audited, which
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

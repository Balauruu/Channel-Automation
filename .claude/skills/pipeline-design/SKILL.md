---
name: pipeline-design
description: >-
  Use when auditing, designing, or editing anything in `.claude/agents/` or
  `.claude/skills/` in any project, or when reviewing a multi-agent
  pipeline for bloat, overlap, stale references, or test-case overfitting.
user-invocable: true
---

# Pipeline Design

Runs human-in-the-loop, one target per pass. Append accumulated learnings
to `insights.md` in this skill's directory.

## Decision Rule: Skill vs Agent-Body vs Bundled Reference

Every piece of domain knowledge lives in exactly one of three places.

| Placement | When to choose |
|-----------|----------------|
| **Skill** (`.claude/skills/<name>/SKILL.md`) | Cross-cutting behavior (memory protocols, observability, output formatting, etc.) OR knowledge shared across ≥2 agents |
| **Agent body** (inline in `.claude/agents/<agent>.md`) | Single-consumer domain knowledge tightly coupled to the agent's procedure |
| **Bundled reference** (`.claude/agents/<agent>/references/<topic>.md`) | Single-consumer domain knowledge that is bulky and reads well on-demand |

**Tests:**
- Shared by ≥2 agents? → Skill.
- Single consumer + tight coupling to procedure? → Merge into agent body.
- Single consumer + bulky + on-demand? → Bundled reference.

**Discoverability:** Claude Code scans `.claude/agents/*.md` flat — it does
NOT recurse into subdirectories. The agent's main `.md` file must stay at
the top level. Bundled references live in a sibling folder
`.claude/agents/<agent>/references/` and are loaded via explicit `Read()`
from the agent.

## Decision Rule: Script-Failure Policy

Every pipeline agent that has both a happy path (scripts, deterministic
tools) and a fallback path (web fetch, manual tooling, alternate API)
must distinguish two failure modes:

- **Environment broken** — `ImportError`, missing binary, missing
  dependency, wrong runtime → **stop immediately**. Report a diagnostic
  to the user. Do not substitute the fallback silently. A broken
  environment is a configuration problem; masking it wastes time and
  produces degraded output.
- **Process blocked** — single URL 403s, one API rate-limited, one source
  paywalled → **fall back for that specific case only**. Continue the
  rest of the pipeline.

## Decision Rule: Model Selection & Thinking Effort

Every agent must declare `model` and `effort` in its YAML frontmatter.

### `model` field

| Value | When to use |
|-------|-------------|
| `sonnet` | Sensible default for most pipeline agents — balanced capability and speed |
| `opus` | High-stakes reasoning, complex synthesis, or quality-critical generation |
| `haiku` | Read-only exploration, lightweight lookups, classification |
| `inherit` | Subagent should match the parent session's model |
| Full model ID (e.g. `claude-sonnet-4-6`) | Pin to a specific model version |

`model` must always be explicit; an omitted field defaults to `inherit`,
which hides intent.

### `effort` field

Controls extended thinking budget. Accepted values: `low`, `medium`,
`high`, `xhigh`, `max`.

Pipelines doing complex multi-step reasoning typically benefit from
`effort: high` — shallow reasoning produces measurably worse output, and
the cost of deeper thinking is small compared to re-running an agent.
Lightweight or near-deterministic agents may run lower.

## Decision Rule: Task Tracking

Agents with ≥3 sequential procedural steps must register them with
`TaskCreate` at the start of execution and call `TaskUpdate` as each step
completes. This gives the orchestrating session progress visibility into
long-running agents.

| Step count | Action |
|------------|--------|
| ≤2 steps | Skip task tracking — overhead exceeds benefit |
| ≥3 steps | Register all steps at entry, update each on completion |

Steps must be meaningful milestones, not micro-operations. A step that
takes <30 seconds of agent work is too granular.

If ≥3 steps, the agent's `tools:` frontmatter must include `TaskCreate`
and `TaskUpdate`. See `references/task-tracking.md` for tool signatures
and the integration pattern.

## Decision Rule: Internal Subagent Dispatch

When an agent step iterates over ≥3 independent, parallelizable units of
work, the agent may dispatch subagents to process them concurrently.

### Four criteria (all must hold)

| Criterion | Test |
|-----------|------|
| **Independence** | Each unit can be processed without context from other units |
| **Volume** | ≥3 items (below 3, dispatch overhead exceeds benefit) |
| **Isolation** | A subagent can produce correct output without the parent's full context |
| **No shared state** | Subagents will not read/write the same files concurrently |

If any criterion fails, do the work sequentially in the parent agent.

### Subagent prompt structure

Each dispatched subagent receives exactly four things:

1. **Specific scope** — one unit. Never "process all of these."
2. **Output format** — the exact schema the parent expects back. Match
   the parent agent's data contract (field names, section headings,
   file-naming conventions).
3. **Quality criteria** — what "good" looks like for this unit (tier
   thresholds, minimum fields, verification level).
4. **Escalation path** — when to stop and report back (e.g., "if the
   resource is unavailable, return `status: blocked` instead of
   guessing") vs. when to push through.

If all four criteria hold and the collection is typically ≥3 items, the
agent's `tools:` frontmatter must include `Agent`. See
`references/subagent-dispatch.md` for tool parameters and concurrency
behavior.

**Escalation to Teams:** when the workflow needs *long-running,
coordinated* multi-session work (parallel role-based agents with task
dependencies, >15 min per agent, true coordination via shared task
list + messaging), plain subagent dispatch isn't enough. See
`references/teams.md` for the experimental Teams feature, the decision
matrix vs plain dispatch, and design constraints.

## Generalization Audit Pattern

Pipeline tools that should be domain-agnostic repeatedly absorb biases
from whichever subject was used during development. Detection:

1. List every example, category, or prescriptive list in the agent/skill
   body.
2. For each item, ask: "If I'd developed this against a different
   subject in the same domain, would this item still appear?"
3. If no, it's overfitting. Cut it or generalize it.

**Before locking any pipeline agent spec:** dry-test it mentally (or
actually) against ≥2 maximally different inputs (different era, source
type, evidence shape — whichever axes matter for the project's domain).
Anything that only applies to one test input is overfitting. Remove it.

## Anti-Patterns to Detect During Audit

| # | Anti-pattern | Signal | Fix |
|---|--------------|--------|-----|
| 1 | Duplicated content between agent body and a linked skill | Same tier/rule/definition in two places | Merge into one, delete the other |
| 2 | Stale tool references | Old path, missing runtime pin, wrong invocation form | Rewrite to current canonical form, pin runtime |
| 3 | Unused `skills:` frontmatter entries | Agent lists a skill but never invokes its knowledge | Remove from frontmatter |
| 4 | Heuristic-loop machinery where a deterministic gate would suffice | Convergence/budget/quality-gate prose on top of a fixed step count | Replace with explicit conditional triggers |
| 5 | Subject-specific biases baked into general tooling | Categories or examples that only fit one development input | Remove or generalize |
| 6 | Shared-skill or CLAUDE.md boilerplate replicated in agent bodies | Context-loading prose, classification tags, or memory protocols restated inline when a project-level skill or CLAUDE.md already covers them | Strip the duplicate; rely on the shared source |
| 7 | Dead routers (skills that only dispatch an agent) | `disable-model-invocation: true` + a canned prompt that replicates `@agent-name do X` | Delete the skill; user invokes the agent directly |
| 8 | Missing or implicit model/effort config | `model` omitted (defaults to `inherit`) or `effort` missing entirely | Add explicit `model` and `effort` per the project's policy |
| 9 | Subagent-for-everything | Dispatching subagents for ≤2 items or for interdependent work | Remove dispatch; do the work sequentially in the parent agent |
| 10 | Missing task tracking | ≥3-step procedure with no `TaskCreate`/`TaskUpdate` in tools or procedure | Add task registration at entry, updates per step |
| 11 | Missed parallelization | Step iterates ≥3 independent items sequentially without subagent dispatch | Verify the four criteria; if all hold, add `Agent` to tools and dispatch pattern to procedure |
| 12 | Missed Teams escalation | Workflow has parallel role-based agents, >15 min runtime each, with true coordination needs, but is wired as one-shot subagent dispatch | Evaluate against `references/teams.md` decision matrix; if Teams fits, redesign with `TeamCreate` + named teammates |
| 13 | Spec change shipped without consumer updates | Rubric or pipeline rename in spec; downstream code, schemas/templates, and memory files still use the old terms | In the same edit pass, grep every consumer for old terms and update |
| 14 | Dead-letter rules | A hard rule ("do NOT fall back", "always run X first") combined with broken prerequisites (script doesn't exist, path is stale, command not implemented). The agent silently ignores the rule and succeeds anyway. | Delete the rule and fix or remove the broken prerequisite. Worse than #2 because it teaches the agent that rules are optional — erodes spec authority across all rules |
| 15 | Phantom artifacts | File Conventions or procedure steps list output files the agent never produces. Only detectable by comparing spec against actual run output. | Either enforce production (add explicit write instruction) or remove the artifact from the spec. Prefer removal if the agent succeeded without it |

## One-at-a-Time Audit Workflow

This skill is explicitly human-in-the-loop. Do not audit multiple agents
in a single pass. For each target:

1. **Read** the agent's `.md` file fully. Read every skill listed in its
   `skills:` frontmatter. Read every reference it `Read()`s.
2. **Verify model & effort** in frontmatter against the rules above.
3. **Verify task tracking** if the procedure has ≥3 steps: tools include
   `TaskCreate`/`TaskUpdate` and the procedure describes when to register
   and update.
4. **Verify subagent opportunities.** Examine each step for iteration over
   independent collections. If any step processes ≥3 independent items,
   check whether the four dispatch criteria hold and whether `Agent` is
   in the `tools:` list.
5. **Inventory overlap.** List content that appears in ≥2 of {agent body,
   its skills, other agents}.
6. **Inventory stale references.** Grep for tool paths, runtime names,
   API forms, flag usage. Cross-check against current state.
7. **Compare spec vs run output** (post-run audit only — skip if no
   production run is available). Read the agent's actual output from the
   most recent run and check:
   - Every script/tool referenced in the spec was actually invoked.
     If the agent succeeded without using a referenced tool, the
     reference is dead weight or a dead-letter rule (#14).
   - Every artifact listed in File Conventions was actually produced.
     Missing artifacts are phantom artifacts (#15).
   - Every hard rule ("do NOT", "always", "must") was actually followed.
     Rules the agent silently bypassed are candidates for removal —
     if the output quality was high without them, the rule was
     unnecessary complexity.
8. **Inventory overfits.** Apply the Generalization Audit Pattern above.
9. **Propose cuts.** Write a short list: what to remove, what to merge,
   what to rewrite. **Prefer removal over enforcement.** When a finding
   could be fixed by adding machinery to enforce compliance OR by
   removing the requirement, prefer removal if the agent produced good
   output without it. Unnecessary steps, artifacts, and rules are debt.
10. **Confirm with the user.** Present the proposal. Wait for approval
    before editing.
11. **Apply the changes.** One concern per commit. When a spec change
    renames anything or shifts a rubric, in the same pass grep every
    consumer (code modules, schemas/templates, memory files) for the old
    terms and update them (anti-pattern #13). When a spec change removes
    script references, check whether the scripts themselves are now
    orphaned (zero consumers) and propose deletion.
12. **Append to `insights.md`.** One line: what was audited, which
    anti-patterns fired, what was changed.

# Phase 4: Agent Consumption - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 5 (modified)
**Analogs found:** 5 / 5

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `.claude/skills/agent-protocols/SKILL.md` | skill | config (injected context) | `.claude/skills/agent-protocols/SKILL.md` (current) | self-rewrite |
| `.claude/skills/agent-observability/SKILL.md` | skill | config (reference doc) | `.claude/skills/pipeline-design/SKILL.md` | role-match |
| `.claude/PLAYBOOK.md` | config | event-driven (routing log) | `.claude/PLAYBOOK.md` (current) | self-rewrite |
| `.claude/agents/observer.md` | agent-definition | event-driven (processing pipeline) | `.claude/agents/observer.md` (current) | self-update |
| `.claude/scripts/obs-summarize.js` | utility | file-I/O | `.claude/scripts/obs-summarize.js` (current) | self-fix |

**Note:** All 5 files are rewrites or updates of existing files. The "analog" is the current version of each file (to preserve structural conventions) plus one cross-file analog for agent-observability (pipeline-design SKILL.md shows the structure pattern for a comprehensive skill).

## Pattern Assignments

### `.claude/skills/agent-protocols/SKILL.md` (skill, config -- complete rewrite)

**Analog:** Current file (114 lines -> ~20 lines)

This is a destructive rewrite. The current file provides the YAML frontmatter pattern and the section structure convention. Everything below the frontmatter is replaced.

**YAML frontmatter pattern** (lines 1-8):
```yaml
---
name: agent-protocols
description: >-
  Shared behavioral protocols for all agents. Memory lifecycle (read at start,
  update after work) and feedback signal handling. Injected into agent context
  at startup via the skills: frontmatter field. Not user-invocable.
user-invocable: false
---
```

Update `description` to reflect passive consumption model. Keep `user-invocable: false`. Keep `name: agent-protocols`.

**Section heading convention** (lines 10-12):
```markdown
# Agent Protocols

Behavioral protocols shared by all agents in the Channel-Automation pipeline. This skill is injected into your context at startup. Follow these protocols for every task.
```

Single `#` title matching the skill name, followed by a one-line purpose summary.

**Sections to DELETE entirely (do not preserve any content):**
- Memory Lifecycle (lines 14-34) -- replaced by thin "Memory" section per D-03
- Section Guide (lines 36-44) -- dropped per D-04
- Project-Scoped Notes (lines 46-59) -- dead system
- Feedback Signal Protocol (lines 61-109) -- dead system (signals.yaml removed)

**Section to KEEP and simplify:**
- Project Context (lines 111-113):
```markdown
## Project Context

Read ./CLAUDE.md at the start of every task for project-wide rules and conventions. This file contains the agent reference table, folder map, architecture rules, and platform constraints.
```

Keep this section verbatim or lightly trimmed.

---

### `.claude/skills/agent-observability/SKILL.md` (skill, config -- complete rewrite)

**Primary analog:** `.claude/skills/pipeline-design/SKILL.md` (125 lines, comprehensive skill structure)
**Content source:** `.claude/hooks/pipeline-observe.js` (event schema), `.claude/agents/observer.md` (processing pipeline), `.claude/skills/evolve/SKILL.md` (/evolve flow)

This is a complete rewrite (305 lines -> ~250-300 lines). The old content documents a dead system (obs.js, .claude/logs/runs/). Nothing is preserved. Structure and conventions from pipeline-design SKILL.md serve as the analog.

**YAML frontmatter pattern** (from current agent-observability, lines 1-4):
```yaml
---
name: agent-observability
description: Use when debugging a subagent run -- "why did agent X produce wrong output", "which tool call was slow", "what permission was denied", or "what did the agent reason about before calling that tool". Reads logs from .claude/logs/runs/.
---
```

Update `description` to: (1) replace `.claude/logs/runs/` with `.claude/logs/observations/<project>/obs.jsonl`, (2) broaden trigger per D-13 to include system understanding queries ("how does the observer work", "what does /evolve do"), (3) add `user-invocable: true` since this is a reference skill.

**Comprehensive skill section structure pattern** (from pipeline-design SKILL.md):
```markdown
---
name: pipeline-design
description: >-
  [multi-line description with trigger phrases]
user-invocable: true
---

# Pipeline Design

[One-paragraph overview]

## Phase 0: Context Loading
[Setup instructions]

## Decision Rule: [Topic]
[Content with tables]
```

Pattern: YAML frontmatter -> `# Title` -> overview paragraph -> numbered/named `##` sections with tables and code blocks. Use this structure for agent-observability sections:
1. Overview (what the observation pipeline is)
2. When to Use (trigger phrases per D-13)
3. Event Schema (from pipeline-observe.js lines 26-42)
4. Observer System (10-step pipeline summary from observer.md)
5. /evolve Command (from evolve SKILL.md)
6. PLAYBOOK Routing (Open/Resolved lifecycle per D-06 through D-09)
7. 3-Layer Scope Tests (per D-15)
8. Debug Recipes (raw JSONL one-liners per D-16)

**Event schema source of truth** (from pipeline-observe.js lines 16-42):
```javascript
const THINKING_CAP = 10240; // 10KB per turn for thinking blocks (D-10)
const TEXT_CAP = 10240;     // 10KB per turn for assistant text
const PROMPT_CAP = 2048;    // 2KB for dispatch prompt (D-09 Agent input cap)

const TRUNCATION_CAPS = {
  Read:  { input: 1024, output: 1024 },
  Grep:  { input: 1024, output: 1024 },
  Glob:  { input: 1024, output: 1024 },
  Bash:  { input: 5120, output: 5120 },
  Write: { input: 5120, output: 5120 },
  Edit:  { input: 5120, output: 5120 },
  Agent: { input: 2048, output: 5120 },
};
```

Base fields (from pipeline-observe.js lines 17-20 constants + RESEARCH.md verified schema):
- `ts` -- ISO timestamp with colons replaced (Windows filename safe)
- `epoch_ms` -- Unix milliseconds for duration computation
- `event` -- event type string
- `session_id` -- Claude Code session ID
- `agent_id` -- empty for main conversation, populated for subagents
- `project` -- project slug from path detection

Event types: `tool_pre`, `tool_post`, `tool_fail`, `permission_denied`, `dispatch`, `assistant_message`, `complete`

**Scope-test questions** (from observer.md lines 110-124):
```markdown
**Q1: "Does this change how a specific skill or method runs?"**
- YES means: the insight is about a tool technique, a library usage pattern, a script invocation convention, or a procedural step within a skill's workflow.
- Target: `.claude/skills/<skill>/insights.md`

**Q2: "Would a fresh instance of this agent need this to do its job?"**
- YES means: the insight is about how this specific agent should behave, a decision it should remember, or a pattern it should follow across all future tasks.
- Target: `.claude/agent-memory/<agent>/MEMORY.md`

**Q3: "Does this change how agents hand off or coordinate?"**
- YES means: the insight is about inter-agent communication, handoff protocols, shared resource conflicts, or workflow sequencing between agents.
- Target: `.claude/PLAYBOOK.md`
```

**Debug recipe pattern** (from current agent-observability lines 255-296, adapted for obs.jsonl):

Current recipes use `.claude/logs/runs/<run>.jsonl` paths. New recipes must use `.claude/logs/observations/<project>/obs.jsonl` and filter by `agent_id` field. Pattern:
```bash
node -e "
const lines = require('fs').readFileSync('.claude/logs/observations/<project>/obs.jsonl','utf8')
  .trim().split('\n').map(JSON.parse);
lines.filter(e => e.event === '<type>' && e.agent_id === '<id>')
  .forEach(e => console.log(/* fields */));
"
```

---

### `.claude/PLAYBOOK.md` (config, event-driven routing log -- redesign)

**Analog:** Current file (10 lines)

**Current structure** (lines 1-10):
```markdown
# Playbook

Cross-agent coordination insights. Observer writes new entries to Pending Review.
Promoted entries move to Permanent during /evolve review.

## Pending Review


## Permanent

```

**Redesign:** Replace `## Pending Review` / `## Permanent` with `## Open` / `## Resolved`. Update boilerplate text to describe the routing log model per D-06, D-07.

**Resolved entry format** (per D-09):
```
- [Resolved] agent: insight text -> routed to .claude/agent-memory/agent/MEMORY.md (2026-04-21)
```

**Open entry format** (per D-08, same as MEMORY.md entry format from observer.md line 156):
```
- [CONF] source-agent: insight text (YYYY-MM-DDThh:mm)
```

---

### `.claude/agents/observer.md` (agent-definition, event-driven -- update)

**Analog:** Current file (320 lines -> ~340-360 lines)

This is an update, not a rewrite. The 10-step processing pipeline is preserved. Changes are targeted additions and reference updates.

**YAML frontmatter pattern** (lines 1-20):
```yaml
---
name: observer
description: >-
  Reads obs.jsonl event logs from completed agent runs, extracts reusable
  learnings, classifies each to the correct memory tier via scope-test
  questions, and writes tagged entries to Pending Review sections.
  Do NOT invoke manually -- dispatched by /evolve command only.
model: sonnet
memory: project
color: yellow
skills:
  - agent-protocols
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---
```

Update `description` to mention PLAYBOOK routing.

**Protocol Overrides section** (lines 30-39):
```markdown
## Protocol Overrides

The `agent-protocols` skill instructs all agents to write project-specific observations to `.claude/project-memories/<project>/your-agent-name.md`. **This instruction does NOT apply to the observer.** The observer writes ONLY to:
- `.claude/agent-memory/<agent>/MEMORY.md` (## Pending Review section)
- `.claude/skills/<skill>/insights.md` (## Pending Review section)
- `.claude/PLAYBOOK.md` (## Pending Review section)
- `.claude/logs/observations/<project>/rejections.jsonl`
- `.claude/logs/observations/<project>/.observer-cursor`

Do NOT write to `project-memories/`. Do NOT read or reference `signals.yaml`. These systems are being replaced by the observer pipeline.
```

**Changes needed:**
1. Simplify Protocol Overrides -- after agent-protocols rewrite, the `project-memories/` override is moot (agent-protocols no longer mentions it). The `signals.yaml` override is moot too. Reduce to just the write-target list, update PLAYBOOK line from `## Pending Review section` to `## Open section`.
2. Update write targets to include the PLAYBOOK routing behavior.

**Step 8: Write Entries -- current pattern** (lines 150-187):
```markdown
### Step 8: Write Entries (per OBSV-04, D-04)

**For MEMORY.md and PLAYBOOK.md targets:**

Format:
- [CONFIDENCE] source-agent: distilled insight text (YYYY-MM-DDThh:mm)

**Writing procedure:**
1. Read the target file to find the `## Pending Review` section.
2. If `## Pending Review` heading is absent -> skip this target, log rejection with reason "target-file-corrupt".
3. Use the Edit tool to append the new entry after the last existing entry in ## Pending Review.
4. Read back the modified section to verify.
5. If read-back detects malformation -> Edit to fix (one retry only).
```

**Add PLAYBOOK routing branch to Step 8** (per D-08, D-10). The routing pattern from RESEARCH.md:

```markdown
**For PLAYBOOK.md targets (Q3 pass):**

1. Write entry to ## Open:
   `- [CONF] source-agent: insight text (timestamp)`

2. Identify routing target:
   - If insight names a specific agent -> route to that agent's MEMORY.md
   - If insight names a specific skill -> route to that skill's insights.md
   - If target unclear -> leave in Open for manual routing via /evolve

3. Write the insight to the target file's ## Pending Review section
   (using standard MEMORY.md or insights.md format)

4. Update PLAYBOOK entry to Resolved:
   `- [Resolved] source-agent: insight text -> routed to {target_path} (date)`
```

**Guardrail #5 update** (line 293):
```markdown
5. **Target file integrity** -- Before writing, confirm `## Pending Review` heading exists in the target file. If absent, skip with "target-file-corrupt". Never reconstruct file structure.
```

For PLAYBOOK.md targets, check for `## Open` instead of `## Pending Review`.

---

### `.claude/scripts/obs-summarize.js` (utility, file-I/O -- path fix)

**Analog:** Current file (221 lines, only path strings change)

**Old path references** (lines 9, ~39):

Line 9 comment:
```javascript
// matches uniquely one file in .claude/logs/runs/, summarizes that. When
```

Line ~39 (`resolveRunFile` function): resolves against `.claude/logs/runs/`.

**D-17 fix:** Update path string constants from `.claude/logs/runs/` to `.claude/logs/observations/<project>/obs.jsonl`. The `resolveRunFile` function needs rethinking since obs.jsonl is a single file (not per-run files), but per RESEARCH.md assumption A1, this is a path update -- not a rewrite or deletion.

---

## Shared Patterns

### Skill YAML Frontmatter
**Source:** `.claude/skills/agent-protocols/SKILL.md` lines 1-8, `.claude/skills/pipeline-design/SKILL.md` lines 1-11
**Apply to:** agent-protocols SKILL.md, agent-observability SKILL.md

```yaml
---
name: <skill-name>
description: >-
  <multi-line description with trigger phrases for activation>
user-invocable: <true|false>
---
```

Three required fields: `name`, `description`, `user-invocable`. Description uses YAML `>-` folded scalar for multi-line. Non-user-invocable skills (like agent-protocols) are injected via agent `skills:` frontmatter.

### Agent Definition YAML Frontmatter
**Source:** `.claude/agents/observer.md` lines 1-20
**Apply to:** observer.md

```yaml
---
name: <agent-name>
description: >-
  <multi-line description>
model: sonnet
memory: project
color: yellow
skills:
  - agent-protocols
tools:
  - Read
  - Write
  ...
---
```

Fields: `name`, `description`, `model`, `memory`, `color`, `skills` (list), `tools` (list).

### Memory File Section Pattern
**Source:** Agent MEMORY.md files (unchanged), current PLAYBOOK.md
**Apply to:** PLAYBOOK.md redesign

Current convention for memory files:
```markdown
## Pending Review

[entries]

## Permanent

[entries]
```

PLAYBOOK.md changes to:
```markdown
## Open

[entries]

## Resolved

[entries]
```

This intentionally breaks the `heading === 'Pending Review'` match in evolve.js, excluding PLAYBOOK from scan/promote (desired behavior per D-08).

### Entry Format Conventions
**Source:** `.claude/agents/observer.md` lines 152-175
**Apply to:** PLAYBOOK.md (boilerplate examples), observer.md (Step 8 routing), agent-observability SKILL.md (documentation)

| Target Type | Format |
|-------------|--------|
| MEMORY.md / PLAYBOOK.md (Open) | `- [CONF] agent: insight text (timestamp)` |
| PLAYBOOK.md (Resolved) | `- [Resolved] agent: insight text -> routed to {path} (date)` |
| insights.md | `- [date] [CONF] insight text (from: agent, timestamp)` |

### CommonJS + Node.js Stdlib Convention
**Source:** `.claude/hooks/pipeline-observe.js` lines 1-15, `.claude/scripts/memory/evolve.js` lines 1-13
**Apply to:** obs-summarize.js (path fix)

```javascript
'use strict';

const fs = require('fs');
const path = require('path');
```

Zero npm dependencies. CommonJS modules. Path construction via `path.join()`.

## No Analog Found

No files in this phase lack an analog. All 5 files are rewrites/updates of existing files with clear self-analogs and cross-reference analogs.

## Metadata

**Analog search scope:** `.claude/skills/`, `.claude/agents/`, `.claude/hooks/`, `.claude/scripts/`, `.claude/PLAYBOOK.md`
**Files scanned:** 8 (agent-protocols SKILL.md, agent-observability SKILL.md, pipeline-design SKILL.md, evolve SKILL.md, observer.md, pipeline-observe.js, evolve.js, obs-summarize.js)
**Pattern extraction date:** 2026-04-21

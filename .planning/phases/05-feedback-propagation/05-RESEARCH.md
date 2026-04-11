# Phase 5: Feedback Propagation - Research

**Researched:** 2026-04-11
**Domain:** Cross-agent signal system, verification gates, agent-protocols upgrade
**Confidence:** HIGH

## Summary

Phase 5 implements the project's single most important capability: downstream agent insights flowing back to influence upstream agent behavior in subsequent pipeline runs. The phase has three distinct work streams: (1) a YAML-based signal inbox (`feedback/signals.yaml`) where agents write structured insights tagged by domain, (2) an upgraded agent-protocols skill that reads, filters, promotes, and resolves signals at task start/end, and (3) structural verification gates embedded in three pipeline skills that check previous-stage outputs before dispatching agents.

The architecture is entirely file-based and agent-driven -- no npm packages, no runtime services, no external dependencies. Agents are Claude LLMs that read/write text files natively. The signal system uses YAML because it is structured data, but agents parse it by reading the file as text (no `js-yaml` or `yaml` npm package exists in this project, and none is needed). The smoke test scripts use Node.js built-in modules only -- YAML validation in tests must use regex-based structural checks, not a YAML parser library.

The key design insight from the user is that signals are NOT ephemeral prompt injections. They permanently alter agent behavior by flowing into MEMORY.md (self-promotion, ~90% of signals) or being flagged for agent definition changes (flagged promotion, rare high-impact signals). The agent-protocols skill -- already injected into all 12 agents -- is the single point of upgrade for signal processing logic.

**Primary recommendation:** Implement in three sequential waves: (1) signal schema + `feedback/signals.yaml` creation + agent-protocols upgrade, (2) verification gates in pipeline skills, (3) smoke tests validating the complete feedback flow.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Signal file format is **YAML** (`feedback/signals.yaml`), not markdown. Replaces the agent-protocols stub reference to `feedback/SIGNALS.md`.
- **D-02:** Signals are **domain-tagged** (editorial, visual, strategy, meta), not direct agent-to-agent. Any agent in the relevant domain reads signals for that domain.
- **D-03:** Signals include a **type field** for categorization: quality, content, technical, process.
- **D-04:** Signal location is **global only** -- single `feedback/signals.yaml` at project root.
- **D-05:** Signals are **not ephemeral prompt injections**. They permanently alter agent behavior. `signals.yaml` is a feedback inbox -- a staging area where insights land, then get promoted.
- **D-06:** **Hybrid promotion model:** Self-promotion to MEMORY.md (~90%), flagged promotion for agent definition changes (tagged `promotion: definition`).
- **D-07:** Agent-protocols skill gets **upgraded** with full signal processing logic.
- **D-08:** Both pipeline-dispatched and directly-invoked agents receive signals via agent-protocols. Pipeline skills do NOT inject signals into dispatch prompts.
- **D-09:** Verification gates live **inside pipeline skills**.
- **D-10:** Gates perform **structural + completeness checks** -- deterministic, no AI assessment.
- **D-11:** Gate failure behavior: **block + guide** -- refuse to dispatch with specific missing-item message.
- **D-12:** Three gate boundaries: Research->Script, Script->Visual Plan, Visual Plan->Assets.
- **D-13:** Signal threshold is **broad pipeline insights with cross-agent focus**.
- **D-14:** Signal lifecycle follows **resolve-on-promotion** -- resolved signals stay as history, pruned at ~50 entries.

### Claude's Discretion
- Exact YAML schema field names and structure for signals.yaml
- Domain-to-agent mapping (which agents belong to which domain)
- Specific structural checks per verification gate (what sections/files each gate validates)
- Signal pruning implementation (manual vs scripted)
- Agent-protocols upgrade -- exact wording of signal processing instructions
- How `promotion: definition` signals are surfaced to meta/human

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGNT-14 | All agents include SIGNALS.md reading instructions (read cross-agent insights at start, contribute after work) | Agent-protocols upgrade (signal read/write protocol); YAML schema design; domain-to-agent mapping |
| MEMO-08 | SIGNALS.md -- single shared cross-agent insights file for durable pipeline patterns | `feedback/signals.yaml` schema design; file creation; signal lifecycle (resolve-on-promotion) |
| MEMO-09 | SIGNALS.md read by orchestrator (passes relevant insights in delegation prompts) and by agents when directly invoked | Per D-08, agent-protocols handles both cases -- no orchestrator injection needed |
| MEMO-10 | SIGNALS.md writable by any agent after work -- structured by source agent with timestamped one-line entries | Signal write protocol in agent-protocols; YAML entry format; domain tagging |
| SKIL-13 | Inter-skill verification gates at pipeline stage boundaries (research->script, script->visual plan, visual plan->assets) | Gate architecture inside pipeline skills; structural checks per boundary; block+guide failure pattern |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Platform:** Windows 11, RTX 4070 8GB VRAM
- **Path handling:** Project path has spaces and periods (`D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V0.6`) -- use `path.resolve()`, never hardcode paths
- **File operations:** Use Node.js `path` module. Never use `test -d`/`test -f` (bash builtins, not available on Windows)
- **Filenames:** Colons are illegal on Windows -- timestamps must replace colons with dashes
- **Agents are user-invoked only.** No auto-routing, no auto-dispatch.
- **Subagents do NOT inherit CLAUDE.md** -- each agent has a `project_context` block instructing it to Read ./CLAUDE.md.
- **Shared behavioral protocols** are injected via the agent-protocols skill in each agent's `skills:` field.
- **No npm packages** -- the project has no `package.json`. All test scripts use Node.js built-in modules only.

## Architecture Patterns

### Signal Flow Architecture

```
Agent completes work
    |
    v
Agent writes signal to feedback/signals.yaml
    (domain-tagged, timestamped, typed)
    |
    v
Next agent starts task
    |
    v
Agent-protocols skill: Read MEMORY.md, then read signals.yaml
    |
    v
Filter signals by domain (editorial/visual/strategy/meta)
    |
    v
For each unresolved signal in my domain:
    |--- resolved: true? --> SKIP
    |--- promotion: definition? --> NOTE for meta/human review
    |--- Otherwise: Integrate into MEMORY.md
    |        |
    |        v
    |    Mark signal as resolved: true in signals.yaml
    v
Continue with task using updated mental model
```

[VERIFIED: codebase inspection] This flow is grounded in the existing agent-protocols skill structure (`.claude/skills/agent-protocols/SKILL.md`) which already has Memory Lifecycle and Feedback Signal Protocol sections. The upgrade replaces the stub with full logic.

### Recommended File Structure Changes

```
feedback/                      # NEW directory at project root
  signals.yaml                 # NEW signal inbox (global, not per-project)

.claude/skills/
  agent-protocols/SKILL.md     # UPGRADE: full signal processing logic
  write-script/SKILL.md        # UPGRADE: add research->script gate
  visual-plan/SKILL.md         # UPGRADE: add script->visual-plan gate
  process-assets/SKILL.md      # UPGRADE: add visual-plan->assets gate

tests/
  smoke-test-feedback.js       # NEW: feedback system validation
```

### Domain-to-Agent Mapping

Based on CLAUDE.md agent reference table and agent definitions: [VERIFIED: codebase inspection]

| Domain | Agents | Rationale |
|--------|--------|-----------|
| editorial | researcher, writer, style-extractor, editorial-lead | All produce/consume editorial content |
| visual | visual-researcher, visual-planner, asset-processor, asset-curator | All work in the media/visual pipeline |
| strategy | strategy | Strategy domain has one agent |
| meta | meta, code-reviewer, compiler | Pipeline health, code quality, compilation |

### Signal YAML Schema (Recommended)

```yaml
# feedback/signals.yaml
# Cross-agent feedback signals -- domain-tagged, timestamped
# Agents read signals for their domain at task start via agent-protocols
# Resolved signals stay as history; prune when >50 entries

signals:
  - id: SIG-001
    date: "2026-04-11"
    source_agent: writer
    domain: editorial
    type: quality          # quality | content | technical | process
    promotion: memory      # memory (self-promote to MEMORY.md) | definition (needs meta/human review)
    resolved: false
    insight: "Research dossiers missing source_manifest.json cause broken source attribution in scripts -- researcher should always generate this file"

  - id: SIG-002
    date: "2026-04-11"
    source_agent: asset-processor
    domain: visual
    type: content
    promotion: memory
    resolved: true
    resolved_by: visual-planner
    resolved_date: "2026-04-12"
    insight: "Shotlists with >40 shots overwhelm asset processing -- visual-planner should cap at 35 shots per chapter"
```

**Schema field rationale:**
- `id`: Sequential `SIG-NNN` format for easy reference. Agents increment from the highest existing ID. [ASSUMED]
- `date`: ISO 8601 date (no time, avoids Windows colon issue in YAML values). [VERIFIED: CLAUDE.md colon constraint]
- `source_agent`: The agent that wrote the signal. Required for provenance. [VERIFIED: CONTEXT.md D-13, MEMO-10]
- `domain`: One of `editorial`, `visual`, `strategy`, `meta`. Agents filter by this. [VERIFIED: CONTEXT.md D-02]
- `type`: One of `quality`, `content`, `technical`, `process`. Helps prioritize. [VERIFIED: CONTEXT.md D-03]
- `promotion`: `memory` (default, self-promote) or `definition` (flagged for meta/human). [VERIFIED: CONTEXT.md D-06]
- `resolved`: Boolean. Agents skip resolved signals. [VERIFIED: CONTEXT.md D-14]
- `resolved_by` / `resolved_date`: Audit trail for promotions. [ASSUMED]
- `insight`: One-line actionable insight. [VERIFIED: CONTEXT.md MEMO-10]

### Anti-Patterns to Avoid

- **Ephemeral injection:** Signals injected into dispatch prompts are discarded after the session. Per D-05, signals must permanently alter behavior via MEMORY.md promotion. [VERIFIED: CONTEXT.md D-05]
- **Agent-to-agent routing:** Signals addressed to specific agents create fragile coupling. Per D-02, domain tagging lets any agent in the domain benefit. [VERIFIED: CONTEXT.md D-02]
- **AI-powered gate assessment:** Gates that use LLM judgment to evaluate quality are slow and non-deterministic. Per D-10, gates are structural/completeness checks only. [VERIFIED: CONTEXT.md D-10]
- **Python YAML parsing:** The project has no npm packages and no Python dependencies for YAML. Agents are LLMs that read text natively. Test scripts should use regex-based validation, not require installing `js-yaml`. [VERIFIED: codebase inspection -- no package.json exists]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML file management | Custom YAML parser library | Claude LLM agents read/write YAML as text; tests use regex | No npm packages in project; agents parse text natively |
| Signal routing | Custom dispatch/routing system | Domain tags + agent-protocols filter | Per D-02, domain-based not agent-to-agent |
| Quality assessment | AI-powered quality gates | Structural file/section existence checks | Per D-10, deterministic checks only |
| Signal ID generation | Auto-increment script | Agent reads last ID from file and increments | Simple text pattern, no runtime needed |

**Key insight:** This is a Claude Code agent project with no runtime dependencies. Every system component is a text file read/written by LLM agents. The "code" is instructions in markdown files, not executable software. The only executable code is Node.js smoke test scripts using built-in modules.

## Verification Gate Specifications

### Gate 1: Research -> Script (`write-script` skill)

**Currently checks:** `projects/$ARGUMENTS/research/Research.md` exists [VERIFIED: write-script/SKILL.md line 15]

**Enhanced checks (recommended):**

| Check | What | How | Failure Message |
|-------|------|-----|-----------------|
| Research.md exists | File presence | `fs.existsSync` equivalent (agent checks via Read) | "Research dossier not found. Run `/research $ARGUMENTS` first." |
| entity_index.json exists | File presence | Agent checks | "Entity index not found at `projects/$ARGUMENTS/research/entity_index.json`. Re-run `/research $ARGUMENTS`." |
| source_manifest.json exists | File presence | Agent checks | "Source manifest not found. Re-run `/research $ARGUMENTS`." |
| Executive Summary present | Section check | Agent reads Research.md, looks for `## Executive Summary` | "Research dossier missing Executive Summary section. The research may be incomplete." |
| Timeline present | Section check | Agent reads Research.md, looks for `## Timeline` or `## Historical Context` | "Research dossier missing timeline/context section." |
| Minimum content | Length check | Agent checks Research.md is >500 words | "Research dossier appears too short (<500 words). The research may be incomplete." |

[VERIFIED: codebase inspection] The duplessis-orphans Research.md has sections: Executive Summary, Historical Context, The Mechanism, Key Institutions, Scale of Harm, Medical Experimentation, Death and Burial, Cover-Up, Exposure and Aftermath, Legal Response, Survivor Stories, Source Evaluation, Narrative Hooks, Open Questions. The source_manifest.json and entity_index.json also exist.

### Gate 2: Script -> Visual Plan (`visual-plan` skill)

**Currently checks:** `projects/$ARGUMENTS/script/Script.md` exists [VERIFIED: visual-plan/SKILL.md line 15]

**Enhanced checks (recommended):**

| Check | What | How | Failure Message |
|-------|------|-----|-----------------|
| Script.md exists | File presence | Agent checks | "Script not found. Run `/write-script $ARGUMENTS` first." |
| metadata.json exists | File presence | Agent checks | "Script metadata not found at `projects/$ARGUMENTS/script/metadata.json`. Re-run `/write-script $ARGUMENTS`." |
| entity_index.json exists | Upstream file | Agent checks research dir | "Entity index not found. This is needed for visual research." |
| Hook section present | Section check | Agent reads Script.md, looks for `## Hook` | "Script missing Hook section." |
| At least 2 chapters | Section count | Agent counts `## Chapter` headings | "Script has fewer than 2 chapters. The script may be incomplete." |
| Minimum content | Length check | Agent checks Script.md is >1000 words | "Script appears too short (<1000 words)." |

[VERIFIED: codebase inspection] The duplessis-orphans Script.md has: Hook, Chapter 1-6, Resolution. metadata.json exists.

### Gate 3: Visual Plan -> Assets (`process-assets` skill)

**Currently checks:** `projects/$ARGUMENTS/visuals/shotlist.json` exists [VERIFIED: process-assets/SKILL.md line 16]

**Enhanced checks (recommended):**

| Check | What | How | Failure Message |
|-------|------|-----|-----------------|
| shotlist.json exists | File presence | Agent checks | "Shotlist not found. Run `/visual-plan $ARGUMENTS` first." |
| visual_brief.json exists | File presence | Agent checks | "Visual brief not found. Run `/visual-plan $ARGUMENTS` first." |
| media_leads.json exists | File presence | Agent checks | "Media leads not found. Run `/visual-plan $ARGUMENTS` first." |
| shotlist has chapters | Content check | Agent reads shotlist.json, checks for non-empty chapters array | "Shotlist has no chapters. The visual plan may be incomplete." |
| shotlist has shots | Content check | Agent checks total_shots > 0 | "Shotlist has no shots. Re-run `/visual-plan $ARGUMENTS`." |

[VERIFIED: codebase inspection] The duplessis-orphans visuals/ directory contains: visual_brief.json, media_leads.json, shotlist.json.

## Agent-Protocols Upgrade Specification

### Current State

The agent-protocols skill (`.claude/skills/agent-protocols/SKILL.md`) has two sections: [VERIFIED: codebase inspection]

1. **Memory Lifecycle** -- Complete and working. Read at start, notice during work, append at end.
2. **Feedback Signal Protocol** -- Stub. References `feedback/SIGNALS.md` (wrong format per D-01). Has basic read/write instructions with markdown format.

### Upgrade Plan

Replace the Feedback Signal Protocol section entirely. The new section must:

1. **Read signals at task start** -- After reading MEMORY.md, read `feedback/signals.yaml`. Filter for signals matching agent's domain. Skip `resolved: true` entries. [VERIFIED: CONTEXT.md D-07, D-08]

2. **Self-promote to MEMORY.md** -- For each unresolved signal with `promotion: memory`, evaluate whether the insight is actionable for the agent's current task or future tasks. If so, add a corresponding entry to MEMORY.md (in patterns, decisions, or observations as appropriate), then mark the signal `resolved: true` in signals.yaml with `resolved_by` and `resolved_date`. [VERIFIED: CONTEXT.md D-06]

3. **Flag definition-level signals** -- For signals with `promotion: definition`, note them but do NOT self-promote. Instead, report them in the task completion message: "The following signals are flagged for agent definition changes and need @meta or human review: [list]." [VERIFIED: CONTEXT.md D-06]

4. **Write signals at task end** -- If the agent noticed cross-agent insights during work, append new signals to `feedback/signals.yaml`. Assign the next sequential SIG-NNN ID. Tag with appropriate domain and type. Use `promotion: memory` by default; only use `promotion: definition` for insights that would change core agent procedures/guardrails. [VERIFIED: CONTEXT.md D-13, MEMO-10]

5. **Self-only learnings go to MEMORY.md** -- Not to signals. Signals are for cross-agent insights. [VERIFIED: CONTEXT.md D-13]

6. **Pruning guidance** -- If signals.yaml exceeds ~50 entries, remove the oldest resolved entries to keep the file manageable. [VERIFIED: CONTEXT.md D-14]

### Domain Assignment in Agent-Protocols

The agent-protocols skill needs a domain lookup. Since agents know their own name from the `name:` field in their frontmatter, the mapping can be hardcoded in the skill:

```
Domain mapping:
- editorial: researcher, writer, style-extractor, editorial-lead
- visual: visual-researcher, visual-planner, asset-processor, asset-curator
- strategy: strategy
- meta: meta, code-reviewer, compiler
```

Agents identify their own domain by matching their name against this mapping, then filter signals.yaml for entries matching their domain. [ASSUMED -- reasonable design choice, but domain mapping could alternatively live in a separate config file]

## Common Pitfalls

### Pitfall 1: Signal File Corruption from Concurrent Writes
**What goes wrong:** Two agents writing to signals.yaml simultaneously could corrupt the file.
**Why it happens:** Claude Code agents run sequentially (user-invoked, one at a time), but if two sessions overlap or a hook writes simultaneously with an agent, file corruption could occur.
**How to avoid:** This is a non-issue in practice -- agents are user-invoked one at a time (Architecture Rules in CLAUDE.md). The `signals.yaml` file will only ever have one writer at a time. No locking mechanism needed. [VERIFIED: CLAUDE.md architecture rules -- "Agents are user-invoked only"]
**Warning signs:** Malformed YAML entries, missing closing quotes.

### Pitfall 2: Signal Accumulation Without Promotion
**What goes wrong:** Agents write signals but never promote them, so the file grows indefinitely.
**Why it happens:** Agent-protocols instructions are not clear enough about when to promote.
**How to avoid:** Make promotion the default action in agent-protocols. Every unresolved signal in the agent's domain should be evaluated for promotion during the "At Task Start" phase. Pruning threshold at ~50 entries catches this. [VERIFIED: CONTEXT.md D-14]
**Warning signs:** signals.yaml exceeds 50 entries, most with `resolved: false`.

### Pitfall 3: Gates Too Strict or Too Lenient
**What goes wrong:** Overly strict gates block the pipeline for trivial issues (e.g., missing optional section). Overly lenient gates let garbage through.
**Why it happens:** Wrong calibration of required vs. optional checks.
**How to avoid:** Gates check only the files and sections that are ALWAYS produced by the upstream agent. Based on codebase inspection of the duplessis-orphans project, the required files are consistent. The research dossier always has Executive Summary; scripts always have Hook and chapters. Check only these invariants. [VERIFIED: codebase inspection of existing project outputs]
**Warning signs:** Users frequently overriding gates, or gates passing obviously incomplete work.

### Pitfall 4: Agents Overwriting signals.yaml Instead of Appending
**What goes wrong:** An agent reads signals.yaml, writes it back with new entries, but loses entries written by another agent in between.
**Why it happens:** Read-modify-write pattern without awareness of the full file.
**How to avoid:** Agent-protocols must instruct agents to: (1) Read the full signals.yaml file, (2) Append new entries to the `signals` array, (3) Modify only the `resolved`, `resolved_by`, `resolved_date` fields of entries they promote, (4) Write the complete updated file back. Since agents are user-invoked one at a time, this is safe. [VERIFIED: sequential agent execution from CLAUDE.md]
**Warning signs:** Signals disappearing between runs.

### Pitfall 5: Windows Path Issues with feedback/ Directory
**What goes wrong:** Agent uses forward slashes or hardcoded paths that fail on Windows.
**Why it happens:** The project path has spaces and periods: `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V0.6\feedback\signals.yaml`.
**How to avoid:** In agent-protocols, use relative path `feedback/signals.yaml` from project root. Claude Code agents resolve paths relative to the project root automatically. In test scripts, use `path.resolve(__dirname, '..', 'feedback', 'signals.yaml')`. [VERIFIED: CLAUDE.md platform constraints]
**Warning signs:** "File not found" errors in test scripts.

### Pitfall 6: YAML Timestamp Colons in Date Values
**What goes wrong:** Full ISO timestamps with colons (e.g., `2026-04-11T10:30:00Z`) are valid YAML values when quoted, but could cause issues if unquoted.
**Why it happens:** Windows filename colon restriction + YAML quoting rules.
**How to avoid:** Use date-only format `"2026-04-11"` (no colons) for the `date` field in signals. This is sufficient granularity for a feedback system. [VERIFIED: CLAUDE.md -- "colons are illegal on Windows -- timestamps must replace colons with dashes"]
**Warning signs:** YAML parse errors on dates.

## Code Examples

### Agent-Protocols Signal Read Flow (Upgraded Section)

```markdown
## Feedback Signal Protocol

### At Task Start

1. Read `feedback/signals.yaml` from the project root using the Read tool
   - If the file or directory does not exist, skip signal processing (no signals yet)
2. Identify your domain using this mapping:
   - editorial: researcher, writer, style-extractor, editorial-lead
   - visual: visual-researcher, visual-planner, asset-processor, asset-curator
   - strategy: strategy
   - meta: meta, code-reviewer, compiler
3. Filter for signals where `domain` matches your domain AND `resolved: false`
4. For each unresolved signal:
   - If `promotion: memory` -- evaluate whether the insight is actionable. If so:
     a. Add a corresponding entry to your MEMORY.md in the appropriate section
        (patterns, decisions, or observations) with format: `- [DATE] [From SIG-NNN] insight text`
     b. Update signals.yaml: set `resolved: true`, `resolved_by: your-agent-name`,
        `resolved_date: "YYYY-MM-DD"`
   - If `promotion: definition` -- do NOT self-promote. Note it for your task completion summary.
5. If signals.yaml has more than 50 entries, remove the oldest resolved entries to keep it manageable

### At Task End

1. Review your work for cross-agent insights -- observations that would help agents in OTHER domains
   - Self-only learnings go to your MEMORY.md, not signals
   - Focus on insights that would change how another agent works
2. If you have cross-agent insights, read the current `feedback/signals.yaml`
3. Find the highest existing SIG-NNN ID and increment for your new entries
4. Append new signal entries with these fields:
   - id: SIG-NNN (next sequential)
   - date: "YYYY-MM-DD" (today's date, no colons)
   - source_agent: your-agent-name
   - domain: the target domain (editorial, visual, strategy, or meta)
   - type: quality | content | technical | process
   - promotion: memory (default) or definition (only for procedure/guardrail changes)
   - resolved: false
   - insight: "One-line actionable insight"
5. Write the updated signals.yaml file
6. If any `promotion: definition` signals were noted during task start, report them:
   "Flagged for review: [SIG-NNN] insight text -- needs @meta or human review for agent definition change"
```

Source: Designed from CONTEXT.md decisions D-01 through D-14 and existing agent-protocols structure.

### Verification Gate Pattern (write-script Example)

```markdown
## Instructions

1. **Verification Gate: Research Completeness**

   Before dispatching the writer, verify the research stage is complete:

   a. Check `projects/$ARGUMENTS/research/Research.md` exists.
      If not: "Research dossier not found. Run `/research $ARGUMENTS` first."

   b. Check `projects/$ARGUMENTS/research/entity_index.json` exists.
      If not: "Entity index not found at `projects/$ARGUMENTS/research/entity_index.json`. Re-run `/research $ARGUMENTS`."

   c. Check `projects/$ARGUMENTS/research/source_manifest.json` exists.
      If not: "Source manifest not found at `projects/$ARGUMENTS/research/source_manifest.json`. Re-run `/research $ARGUMENTS`."

   d. Read Research.md and verify it contains an `## Executive Summary` section.
      If not: "Research dossier is missing the Executive Summary section. The research may be incomplete. Re-run `/research $ARGUMENTS`."

   e. Verify Research.md is at least 500 words long.
      If not: "Research dossier appears too short (under 500 words). The research may be incomplete."

   If ANY check fails, STOP. Do not dispatch the writer. Show the specific failure message.

2. Dispatch @writer with the following task: [...]
```

Source: Modeled on existing write-script/SKILL.md structure with enhanced checks based on duplessis-orphans output analysis.

### Smoke Test Pattern for Feedback System

```javascript
// tests/smoke-test-feedback.js
// Phase 5 Feedback Propagation validation
// Run: node tests/smoke-test-feedback.js

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const testCases = [];

// Signal system checks
testCases.push({
  name: 'feedback/directory_exists',
  check: () => fs.existsSync(path.join(projectRoot, 'feedback'))
});

testCases.push({
  name: 'feedback/signals.yaml_exists',
  check: () => fs.existsSync(path.join(projectRoot, 'feedback', 'signals.yaml'))
});

testCases.push({
  name: 'feedback/signals.yaml_has_signals_key',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, 'feedback', 'signals.yaml'), 'utf8'
    );
    return content.includes('signals:');
  }
});

// Agent-protocols upgrade checks
testCases.push({
  name: 'agent-protocols/references_signals_yaml',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'),
      'utf8'
    );
    return content.includes('signals.yaml');
  }
});

testCases.push({
  name: 'agent-protocols/has_domain_mapping',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'agent-protocols', 'SKILL.md'),
      'utf8'
    );
    return content.includes('editorial') &&
           content.includes('visual') &&
           content.includes('strategy') &&
           content.includes('meta');
  }
});

// Verification gate checks
testCases.push({
  name: 'write-script/has_verification_gate',
  check: () => {
    const content = fs.readFileSync(
      path.join(projectRoot, '.claude', 'skills', 'write-script', 'SKILL.md'),
      'utf8'
    );
    return content.includes('entity_index.json') &&
           content.includes('source_manifest.json');
  }
});

// ... run all tests pattern identical to existing smoke tests
```

Source: Modeled on existing `tests/smoke-test-pipeline.js` pattern (testCases array, fs checks, console output).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Markdown SIGNALS.md with to_agent targeting | YAML signals.yaml with domain tagging | Phase 5 (D-01, D-02) | More resilient routing, structured data |
| Prompt injection of signals | Permanent behavior change via MEMORY.md promotion | Phase 5 (D-05, D-06) | Signals actually alter agent behavior |
| No verification gates | Structural gates in pipeline skills | Phase 5 (D-09 through D-12) | Pipeline catches missing inputs before wasting tokens |
| Manual quality checks | Automated structural + completeness checks | Phase 5 (D-10) | Deterministic, fast, no AI overhead |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Signal IDs use sequential `SIG-NNN` format | Signal YAML Schema | Low -- any unique ID format works; agents can be told to use a different pattern |
| A2 | `resolved_by` and `resolved_date` fields are included for audit trail | Signal YAML Schema | Low -- could be omitted to simplify schema if not needed |
| A3 | Domain-to-agent mapping is hardcoded in agent-protocols | Agent-Protocols Upgrade | Medium -- could be externalized to a config file, but adds complexity for no clear benefit. If a new agent is added, agent-protocols must be updated |
| A4 | Test scripts validate YAML structure via regex, not a YAML parser | Smoke Test Pattern | Low -- the project has no npm packages; regex checks are consistent with existing test patterns |
| A5 | The `source_manifest.json` file is always produced by the researcher agent | Gate 1 checks | Medium -- only one production run exists (duplessis-orphans) to verify. If researcher sometimes omits it, the gate would be too strict |

## Open Questions

1. **Signal pruning automation**
   - What we know: D-14 says prune resolved entries when >50 entries. Agent-protocols can instruct agents to prune.
   - What's unclear: Should a separate script handle pruning, or is agent-driven pruning sufficient?
   - Recommendation: Start with agent-driven pruning in agent-protocols. If it proves unreliable, add a `node .claude/scripts/prune-signals.js` script later.

2. **`promotion: definition` signal handling**
   - What we know: These signals should be reviewed by @meta or a human before changing agent definitions.
   - What's unclear: The exact mechanism for surfacing these. Should agents just print a message? Should they be collected somewhere?
   - Recommendation: Agents report definition-level signals in their task completion message. The user (who reads agent output) decides whether to invoke @meta. No automated routing -- consistent with the "user-invoked only" architecture rule.

3. **source_manifest.json reliability**
   - What we know: It exists in the duplessis-orphans project. The researcher agent definition mentions "Source Inventory" as a dossier section.
   - What's unclear: Whether the researcher always produces `source_manifest.json` or if it's optional.
   - Recommendation: Include in gate checks but with a softer failure message: "Source manifest not found -- script will proceed but source attribution may be limited."

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in (no test framework -- raw scripts) |
| Config file | None -- scripts self-contained |
| Quick run command | `node tests/smoke-test-feedback.js` |
| Full suite command | `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js && node tests/smoke-test-pipeline.js && node tests/smoke-test-feedback.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGNT-14 | Agent-protocols has signal read/write instructions | smoke | `node tests/smoke-test-feedback.js` | Wave 0 |
| MEMO-08 | feedback/signals.yaml exists with correct structure | smoke | `node tests/smoke-test-feedback.js` | Wave 0 |
| MEMO-09 | Agent-protocols handles both pipeline and direct invocation | smoke | `node tests/smoke-test-feedback.js` (checks agent-protocols content) | Wave 0 |
| MEMO-10 | Agent-protocols has signal write instructions with timestamps | smoke | `node tests/smoke-test-feedback.js` | Wave 0 |
| SKIL-13 | Pipeline skills have verification gates | smoke | `node tests/smoke-test-feedback.js` (checks gate content in skills) | Wave 0 |

### Sampling Rate
- **Per task commit:** `node tests/smoke-test-feedback.js`
- **Per wave merge:** Full suite: all 5 smoke test scripts
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/smoke-test-feedback.js` -- covers AGNT-14, MEMO-08, MEMO-09, MEMO-10, SKIL-13
- Framework install: None needed -- Node.js built-in modules only

## Security Domain

Security enforcement is not explicitly disabled in config.json, but this phase involves no authentication, no session management, no cryptography, no external inputs, and no network calls. All files are local markdown/YAML read/written by Claude LLM agents.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- local file system only |
| V3 Session Management | No | N/A -- no sessions |
| V4 Access Control | No | N/A -- single user, local files |
| V5 Input Validation | Marginal | Gate checks validate file existence and section presence -- structural, not user input |
| V6 Cryptography | No | N/A -- no secrets or encryption |

### Known Threat Patterns

None applicable. This phase modifies text files in a local git repository. No external inputs, no network calls, no user-supplied data beyond the user typing slash commands.

## Sources

### Primary (HIGH confidence)
- `.claude/skills/agent-protocols/SKILL.md` -- Current stub, upgrade target
- `.claude/skills/write-script/SKILL.md` -- Current gate (file existence only)
- `.claude/skills/visual-plan/SKILL.md` -- Current gate (file existence only)
- `.claude/skills/process-assets/SKILL.md` -- Current gate (file existence only)
- `.claude/agents/researcher.md`, `writer.md`, `visual-planner.md` -- Agent structures
- `.claude/agent-memory/researcher/MEMORY.md`, `writer/MEMORY.md`, `visual-planner/MEMORY.md` -- MEMORY.md format
- `projects/duplessis-orphans/` -- Real project outputs for gate validation reference
- `.claude/hooks/log-agent-dispatch.js`, `log-agent-complete.js` -- Hook patterns
- `tests/smoke-test-pipeline.js` -- Test pattern reference
- `.claude/scripts/audit-agents.js` -- Validation script pattern reference
- `.planning/phases/05-feedback-propagation/05-CONTEXT.md` -- All 14 locked decisions

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` -- Requirement definitions
- `.planning/PROJECT.md` -- Core value statement, migration context
- `.planning/STATE.md` -- Project progress
- `.planning/config.json` -- agent_skills mapping, workflow settings

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no external libraries; all components are text files read by LLM agents
- Architecture: HIGH -- signal flow, gate design, and agent-protocols upgrade are well-specified by locked decisions and verified against existing codebase patterns
- Pitfalls: HIGH -- concurrent write risk assessed against architecture rules; Windows path issues verified against existing constraints
- Verification gates: HIGH -- gate specifications derived from inspection of actual project outputs (duplessis-orphans)

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- this is internal architecture, not dependent on external ecosystem changes)

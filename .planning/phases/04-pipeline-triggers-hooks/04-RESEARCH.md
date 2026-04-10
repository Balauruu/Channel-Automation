# Phase 4: Pipeline Triggers & Hooks - Research

**Researched:** 2026-04-11
**Domain:** Claude Code skills (slash commands), hooks (PreToolUse/SubagentStop), agent dispatch logging, agent audit validation
**Confidence:** HIGH

## Summary

Phase 4 delivers six pipeline trigger skills (slash commands), a session logging hook, and an agent audit skill. The slash commands use Claude Code's skills system (`SKILL.md` with YAML frontmatter) to create user-invocable `/` commands that dispatch agents via the Agent tool. Session logging uses a dual-event hook strategy: a `PreToolUse` hook on `Agent` tool calls captures dispatch start, and a `SubagentStop` hook captures completion, writing both events to `logs/sessions.jsonl`. The `/audit-agents` skill validates all 12 agent definitions programmatically.

All three components use verified Claude Code extension points: skills for slash commands, hooks in `.claude/settings.json` for lifecycle events, and Node.js scripts in `.claude/hooks/` and `.claude/scripts/` for the actual logic. The hook input JSON schema is well-documented and provides `tool_input` (with `subagent_type` for Agent tool) on PreToolUse and `agent_type` + `last_assistant_message` on SubagentStop -- sufficient for the logging design.

**Primary recommendation:** Build pipeline skills as `disable-model-invocation: true` SKILL.md files that dispatch agents via natural language instructions. Use Node.js (not bash) for hook scripts on Windows to avoid shell compatibility issues. The audit skill should be a Node.js script invoked by a slash command.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Pipeline commands are user-invocable slash commands that auto-dispatch agents via Agent/Task tool. User explicitly triggers each stage.
- D-02: Agents already have domain skills. Pipeline commands coordinate WHEN agents run and with WHAT context.
- D-03: Pre-Phase 6 mode -- agents use Claude's native capabilities without Python scripts. Phase 6 adds script invocations.
- D-04: Project directory convention -- each stage writes to `projects/<name>/` following naming conventions.
- D-05: Auto-create -- first pipeline command auto-creates `projects/<name>/` with standard subdirectories.
- D-06: Two-tier commands for multi-operation stages: `/strategy` (full) + `/strategy-scrape`, `/strategy-analyze`, `/strategy-topics` (granular); `/process-assets` (full) + `/assets-download`, `/assets-embed`, `/assets-search`, `/assets-score` (granular).
- D-07: Single commands for single-operation stages: `/research`, `/write-script`, `/visual-plan`, `/compile`.
- D-08: `/visual-plan` auto-chains @visual-researcher then @visual-planner sequentially.
- D-09: Present and pause + guide to next step at checkpoints.
- D-10: Domain enforcement hooks (HOOK-01, HOOK-02) DEFERRED from Phase 4.
- D-11: Agent dispatches only in logs. Fields: timestamp, agent name, task description, duration, outcome.
- D-12: Log location: `logs/sessions.jsonl` at project root. Single file, append-only, gitignored.
- D-13: Dual-event logging -- PreToolUse on Agent/Task tool logs dispatch (start). SubagentStop logs completion (end).
- D-14: `/audit-agents` validates 12 agents across 4 dimensions: required fields, tool validity, skill references, memory setup.
- D-15: Cross-consistency checks: CLAUDE.md table matches agents, config.json mapping is complete, no orphans.
- D-16: Structured console report with pass/fail, fix suggestions, and auto-fix prompt.

### Claude's Discretion
- Pipeline command internal structure and formatting
- Exact JSONL log schema field names and structure
- `/audit-agents` report format and fix implementation details
- Sub-command naming conventions
- Project directory subdirectory naming conventions
- How auto-fix suggestions are presented and confirmed

### Deferred Ideas (OUT OF SCOPE)
- Domain enforcement hooks (HOOK-01, HOOK-02) -- revisit Phase 6 integration testing
- Python script invocation in pipeline commands -- Phase 6
- SIGNALS.md feedback propagation -- Phase 5
- Verification gates at pipeline boundaries -- Phase 5
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | `/strategy` skill -- triggers competitor analysis, topic generation, project initialization | Skills system with `disable-model-invocation: true`, two-tier command structure (D-06), dispatches @strategy agent |
| PIPE-02 | `/research` skill -- triggers 3-pass research pipeline | Single skill dispatching @researcher with project context handoff |
| PIPE-03 | `/write-script` skill -- triggers script generation from research dossier | Single skill dispatching @writer with research output references |
| PIPE-04 | `/visual-plan` skill -- triggers visual research + shotlist generation | Single skill auto-chaining @visual-researcher then @visual-planner (D-08) |
| PIPE-05 | `/process-assets` skill -- triggers asset pipeline | Two-tier command structure (D-06), dispatches @asset-processor and @asset-curator |
| PIPE-06 | `/compile` skill -- triggers edit sheet compilation | Single skill dispatching @compiler |
| PIPE-07 | All pipeline skills invoke existing Python scripts via Bash | MODIFIED: Pre-Phase 6 mode (D-03) -- agents use native capabilities, not Python scripts. Phase 6 adds script calls. |
| PIPE-08 | Human checkpoints enforced at topic selection and asset review | Skills present results and pause with next-step guidance (D-09) |
| HOOK-01 | PreToolUse domain enforcement hook | DEFERRED (D-10) -- not in Phase 4 scope |
| HOOK-02 | Domain rules JSON config | DEFERRED (D-10) -- not in Phase 4 scope |
| HOOK-03 | PostToolUse session logging hook | Dual-event: PreToolUse on Agent tool + SubagentStop hook, writing to logs/sessions.jsonl |
| HOOK-04 | `/audit-agents` validation skill | Node.js script checking 4 dimensions + cross-consistency, invoked via skill slash command |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Platform:** Windows 11, RTX 4070 8GB VRAM
- **Path handling:** Project path has spaces and periods -- use `path.resolve()`, never hardcode paths
- **Shell:** No `test -d`/`test -f` (bash builtins unavailable on Windows). Use Node.js `fs` or Python `os` for file checks.
- **Filenames:** Colons illegal on Windows -- timestamps must replace colons with dashes
- **Agents are user-invoked only.** No auto-routing, no auto-dispatch.
- **Human checkpoints:** After topic generation (present and WAIT), after asset processing (present and WAIT)
- **Subagents do NOT inherit CLAUDE.md** -- each agent has a `<project_context>` block instructing it to Read ./CLAUDE.md

## Standard Stack

### Core

| Component | Version/Type | Purpose | Why Standard |
|-----------|-------------|---------|--------------|
| Claude Code Skills | SKILL.md with YAML frontmatter | Pipeline slash commands | Official extension point for user-invocable commands [VERIFIED: code.claude.com/docs/en/skills] |
| Claude Code Hooks | settings.json `hooks` config | Session logging (PreToolUse + SubagentStop) | Official lifecycle event system [VERIFIED: code.claude.com/docs/en/hooks] |
| Node.js | v24.13.0 | Hook scripts + audit script runtime | Already installed, cross-platform, handles Windows paths correctly [VERIFIED: node --version] |
| jq | v1.8.1 | Optional JSON parsing in hook scripts | Available but NOT recommended -- use Node.js for Windows compatibility [VERIFIED: jq --version] |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `path` module (Node.js) | Path resolution in hook/audit scripts | Always -- handles spaces and Windows separators |
| `fs` module (Node.js) | File system operations in scripts | File existence checks, JSONL append, directory creation |
| YAML frontmatter parsing | Audit script agent validation | Regex-based extraction (same pattern as smoke tests) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js hook scripts | Bash hook scripts | Bash scripts have Windows compatibility issues (no `jq` guarantees, path quoting fragile with spaces). Node.js is already the project standard for tests. |
| Node.js hook scripts | PowerShell hook scripts | PowerShell `"shell": "powershell"` is supported in hooks, but adds a dependency on `CLAUDE_CODE_USE_POWERSHELL_TOOL` for some features. Node.js is simpler. |
| Separate skills per sub-command | Single skill with argument routing | Separate skills give cleaner `/` menu listing and clearer descriptions. Single skill with `$ARGUMENTS` parsing is more compact but harder to discover. |

## Architecture Patterns

### Recommended Project Structure (Phase 4 additions)

```
.claude/
  hooks/
    log-agent-dispatch.js    # PreToolUse hook: log Agent tool calls (start event)
    log-agent-complete.js    # SubagentStop hook: log agent completion (end event)
  scripts/
    audit-agents.js          # /audit-agents validation + auto-fix logic
  skills/
    strategy/SKILL.md        # /strategy (full pipeline)
    strategy-scrape/SKILL.md # /strategy-scrape (granular)
    strategy-analyze/SKILL.md
    strategy-topics/SKILL.md
    research/SKILL.md         # /research
    write-script/SKILL.md     # /write-script
    visual-plan/SKILL.md      # /visual-plan (chains two agents)
    process-assets/SKILL.md   # /process-assets (full pipeline)
    assets-download/SKILL.md  # /assets-download (granular)
    assets-embed/SKILL.md
    assets-search/SKILL.md
    assets-score/SKILL.md
    compile/SKILL.md          # /compile
    audit-agents/SKILL.md     # /audit-agents
  settings.json               # Updated with hook registrations
logs/
  sessions.jsonl              # Agent dispatch log (gitignored)
projects/                     # Created by pipeline commands
```

### Pattern 1: Pipeline Skill Structure

**What:** Each pipeline command is a `SKILL.md` file with `disable-model-invocation: true` that instructs Claude to dispatch the appropriate agent with context handoff.

**When to use:** All pipeline trigger commands.

**Example:**
```yaml
---
name: research
description: >-
  Run the documentary research pipeline for a project. Dispatches the
  researcher agent to conduct 3-pass research (survey, deepen, synthesize).
disable-model-invocation: true
---

# Research Pipeline

Run the full 3-pass documentary research pipeline for project $ARGUMENTS.

## Steps

1. Verify that `projects/$ARGUMENTS/` exists. If not, tell the user to run
   `/strategy` first to initialize a project.

2. Dispatch @researcher with this task:

   Research the documentary topic for project "$ARGUMENTS".
   - Read the project metadata at projects/$ARGUMENTS/metadata.md
   - Conduct a 3-pass research process (survey, deepen, synthesize)
   - Write the research dossier to projects/$ARGUMENTS/research/Research.md
   - Write the entity index to projects/$ARGUMENTS/research/entity_index.json

3. After the researcher completes, present a summary of findings.

4. Guide the user: "Research complete. Run `/write-script $ARGUMENTS` to
   generate a documentary script from this research."
```
[VERIFIED: code.claude.com/docs/en/skills -- `disable-model-invocation: true` prevents auto-invocation, `$ARGUMENTS` substitution confirmed]

### Pattern 2: Two-Tier Command Structure

**What:** Multi-operation stages have a unified command (runs full pipeline) and granular sub-commands (run individual operations).

**When to use:** `/strategy` and `/process-assets` per D-06.

**Example:**
```yaml
# .claude/skills/strategy/SKILL.md
---
name: strategy
description: >-
  Run the full strategy pipeline: competitor scraping, analysis, and topic
  generation. For individual operations, use /strategy-scrape, /strategy-analyze,
  or /strategy-topics.
disable-model-invocation: true
---

# Strategy Pipeline

Run the complete strategy pipeline for the documentary channel.

## Steps

1. Dispatch @strategy with this task:
   Run the complete strategy pipeline:
   a. Scrape competitor channels for latest video data
   b. Analyze competitor data for trends, gaps, and opportunities
   c. Generate 5 scored topic candidates

2. **CHECKPOINT**: Present the generated topics to the user.
   Display each topic with its scores (obscurity, complexity, shock factor,
   verifiability, pillar fit) and total score.

3. STOP HERE. Wait for the user to select a topic.

4. Guide the user: "Select a topic number, then I'll initialize the project.
   Or run `/strategy-topics` to regenerate topics with different criteria."
```

### Pattern 3: Multi-Agent Chaining

**What:** `/visual-plan` dispatches two agents sequentially -- @visual-researcher first, then @visual-planner with the first agent's output.

**When to use:** Per D-08 for `/visual-plan`.

**Example:**
```yaml
---
name: visual-plan
description: >-
  Run the full visual planning pipeline: visual research then shotlist
  generation. Dispatches @visual-researcher followed by @visual-planner.
disable-model-invocation: true
---

# Visual Planning Pipeline

Run visual research and shotlist generation for project $ARGUMENTS.

## Steps

1. Verify `projects/$ARGUMENTS/script/Script.md` exists. If not, tell the user
   to run `/write-script $ARGUMENTS` first.

2. Dispatch @visual-researcher with this task:
   Define visual intent and gather primary resources for project "$ARGUMENTS".
   - Read the script at projects/$ARGUMENTS/script/Script.md
   - Read the entity index at projects/$ARGUMENTS/research/entity_index.json
   - Generate visual brief at projects/$ARGUMENTS/visuals/visual_brief.json
   - Generate media leads at projects/$ARGUMENTS/visuals/media_leads.json

3. Dispatch @visual-planner with this task:
   Generate shotlist from visual brief for project "$ARGUMENTS".
   - Read the visual brief at projects/$ARGUMENTS/visuals/visual_brief.json
   - Read the media leads at projects/$ARGUMENTS/visuals/media_leads.json
   - Read the script at projects/$ARGUMENTS/script/Script.md
   - Generate shotlist at projects/$ARGUMENTS/visuals/shotlist.json

4. Present a summary of the visual plan.

5. Guide the user: "Visual planning complete. Run `/process-assets $ARGUMENTS`
   to download and process assets for these shots."
```

### Pattern 4: Hook-Based Session Logging (Dual-Event)

**What:** Two hooks capture agent dispatch lifecycle. `PreToolUse` on `Agent` tool logs the start event (which agent, what task). `SubagentStop` logs the end event (which agent, outcome).

**When to use:** Always active via `.claude/settings.json`.

**Settings configuration:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-agent-dispatch.js",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-agent-complete.js",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ]
  }
}
```
[VERIFIED: code.claude.com/docs/en/hooks -- matcher "Agent" matches Agent tool calls; SubagentStop provides agent_type, agent_id, last_assistant_message]

### Pattern 5: Human Checkpoint

**What:** Skills that implement checkpoints (D-09) present results and explicitly stop, guiding the user to the next command.

**When to use:** `/strategy` (after topic generation) and `/process-assets` (after asset review).

**Key principle:** The skill instructs Claude to STOP and WAIT. It does not auto-continue to the next stage. It tells the user what to run next.

### Anti-Patterns to Avoid

- **Auto-dispatching agents without user trigger:** Pipeline skills have `disable-model-invocation: true`. Claude must not decide to run pipeline stages on its own.
- **Using bash scripts for hooks on Windows:** Bash scripts with `jq` piping work on Linux but fail on Windows due to path quoting, `jq` availability, and shell differences. Use Node.js scripts that read stdin and write stdout.
- **Putting hook logic in settings.json `command` field inline:** Complex logic should live in script files, not inline shell one-liners.
- **Logging every tool call:** D-11 specifies agent dispatches only. Do not log Read/Write/Edit/Bash/Grep/Glob calls.
- **Using `context: fork` for pipeline skills:** Pipeline skills should run in the main conversation context so Claude can present results and interact with the user at checkpoints. `context: fork` isolates into a subagent, which cannot pause for human interaction.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slash commands | Custom CLI parsing or MCP tools | Claude Code Skills (`SKILL.md`) | Native extension point, auto-registered as `/` commands, supports arguments, frontmatter config [VERIFIED: official docs] |
| Lifecycle event hooks | Custom file watchers or polling | Claude Code Hooks (`settings.json`) | Native event system with 25 event types, JSON input on stdin, exit code control flow [VERIFIED: official docs] |
| YAML frontmatter parsing | npm yaml/js-yaml packages | Regex extraction (`/^---\r?\n([\s\S]*?)\r?\n---/`) | Pattern already established in Phase 3 smoke tests, no external dependencies needed [VERIFIED: tests/smoke-test-agents.js] |
| Agent dispatch | Manual Agent tool invocation in scripts | Natural language in skill body | Skills instruct Claude to dispatch agents; Claude handles the Agent tool invocation natively |

## Common Pitfalls

### Pitfall 1: Windows Path Quoting in Hook Commands
**What goes wrong:** Hook `command` field uses paths with spaces. On Windows, the shell may split the path.
**Why it happens:** The project path is `D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V0.6` -- contains spaces and periods.
**How to avoid:** Always wrap `$CLAUDE_PROJECT_DIR` in double quotes in the command field: `"node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/script.js"`. The variable is resolved before shell parsing, so quoting is essential. [VERIFIED: code.claude.com/docs/en/hooks -- uses `"$CLAUDE_PROJECT_DIR"` in examples]
**Warning signs:** Hook scripts silently fail to execute (no error in UI, events not logged).

### Pitfall 2: Hook Script stdin Consumption
**What goes wrong:** Hook script does not read stdin, or reads it incorrectly, causing JSON parsing errors.
**Why it happens:** Hook input arrives on stdin as a single JSON blob. Node.js requires explicit stdin reading.
**How to avoid:** Use a standard stdin reader pattern:
```javascript
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const data = JSON.parse(input);
  // process data
});
```
[VERIFIED: code.claude.com/docs/en/hooks -- "For command hooks, input arrives on stdin"]
**Warning signs:** Hook crashes with "Unexpected end of JSON input" or empty data object.

### Pitfall 3: Async Hooks and Exit Codes
**What goes wrong:** An async logging hook accidentally returns exit code 2, blocking the Agent tool call.
**Why it happens:** Exit code 2 means "blocking error" for PreToolUse. An unhandled exception in the logging script exits with code 1 (non-blocking error, shows stderr) but exit 2 would block the tool.
**How to avoid:** Set `"async": true` for logging hooks (they don't need to block). Wrap the script body in try/catch and always `process.exit(0)`. [VERIFIED: code.claude.com/docs/en/hooks -- exit 0 = success, exit 2 = blocking error]
**Warning signs:** Agent dispatches randomly fail with cryptic error messages from the logging hook.

### Pitfall 4: SubagentStop Hook Cannot Identify Custom Agent Name
**What goes wrong:** The `agent_type` field in SubagentStop input should contain the custom agent name (e.g., "researcher", "writer").
**Why it happens:** Per the official docs, SubagentStop's `agent_type` field contains the agent type name, which for custom agents IS the agent name. However, the CONTEXT.md (D-10) noted that "PreToolUse hooks cannot natively identify which agent is running" -- this is about the *calling* context (which agent triggered the tool), not the Agent tool's *target*. For PreToolUse on the Agent tool, the `tool_input.subagent_type` field contains the target agent name.
**How to avoid:** Use `tool_input.subagent_type` from PreToolUse/Agent and `agent_type` from SubagentStop to identify the dispatched agent. Correlate start/end events by `agent_id` if available in both events.
**Warning signs:** Logs show "general-purpose" or "Explore" instead of custom agent names.

### Pitfall 5: JSONL File Append Race Conditions
**What goes wrong:** Two concurrent async hook invocations write to `logs/sessions.jsonl` simultaneously, corrupting lines.
**Why it happens:** Multiple agents could be dispatched in sequence, with their PreToolUse and SubagentStop hooks firing close together.
**How to avoid:** Use `fs.appendFileSync()` (synchronous append) in hook scripts. For a single-line JSONL append, this is atomic enough on a single machine. The hooks run in separate Node.js processes so there is no shared state.
**Warning signs:** Malformed JSONL lines (partial JSON, merged lines).

### Pitfall 6: Skills with context: fork Cannot Present Checkpoints
**What goes wrong:** A pipeline skill with `context: fork` runs in an isolated subagent that cannot interact with the user for checkpoint approval.
**Why it happens:** `context: fork` creates a subagent context where results are summarized and returned -- no interactive pause is possible.
**How to avoid:** Pipeline skills should NOT use `context: fork`. They run in the main conversation context where Claude can present results and wait for user input. [VERIFIED: code.claude.com/docs/en/skills -- context: fork "runs in isolation"]
**Warning signs:** Checkpoint stages auto-continue without user approval.

## Code Examples

### Hook Script: Log Agent Dispatch (PreToolUse)

```javascript
// .claude/hooks/log-agent-dispatch.js
// PreToolUse hook on Agent tool -- logs dispatch start event
// Source: [VERIFIED: code.claude.com/docs/en/hooks -- PreToolUse input format for Agent tool]

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Only log custom agent dispatches (not built-in Explore/Plan)
    const agentType = data.tool_input?.subagent_type || 'unknown';
    const builtIn = ['Explore', 'Plan', 'general-purpose', 'Bash'];
    if (builtIn.includes(agentType)) {
      process.exit(0);
      return;
    }

    const entry = {
      event: 'dispatch',
      timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
      session_id: data.session_id,
      agent_name: agentType,
      task: (data.tool_input?.prompt || '').slice(0, 200),
      agent_id: data.agent_id || null
    };

    const logDir = path.resolve(data.cwd || '.', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'sessions.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // Never block agent dispatch due to logging failure
    process.stderr.write('Session log error: ' + err.message + '\n');
  }
  process.exit(0);
});
```

### Hook Script: Log Agent Completion (SubagentStop)

```javascript
// .claude/hooks/log-agent-complete.js
// SubagentStop hook -- logs agent completion event
// Source: [VERIFIED: code.claude.com/docs/en/hooks -- SubagentStop input has agent_type, last_assistant_message]

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    const agentType = data.agent_type || 'unknown';
    const builtIn = ['Explore', 'Plan', 'general-purpose', 'Bash'];
    if (builtIn.includes(agentType)) {
      process.exit(0);
      return;
    }

    const entry = {
      event: 'complete',
      timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
      session_id: data.session_id,
      agent_name: agentType,
      agent_id: data.agent_id || null,
      outcome_summary: (data.last_assistant_message || '').slice(0, 300)
    };

    const logDir = path.resolve(data.cwd || '.', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'sessions.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    process.stderr.write('Session log error: ' + err.message + '\n');
  }
  process.exit(0);
});
```

### JSONL Log Schema (Recommended)

```jsonl
{"event":"dispatch","timestamp":"2026-04-11T14-30-00-000Z","session_id":"abc123","agent_name":"researcher","task":"Research the documentary topic for project dyatlov-pass...","agent_id":"agent-def456"}
{"event":"complete","timestamp":"2026-04-11T14-35-22-000Z","session_id":"abc123","agent_name":"researcher","agent_id":"agent-def456","outcome_summary":"Research complete. Generated 45-page dossier with 23 sources..."}
```

### Audit Script Structure (Skeleton)

```javascript
// .claude/scripts/audit-agents.js
// Validates all agent definitions across 4 dimensions + cross-consistency
// Source: [VERIFIED: tests/smoke-test-agents.js -- frontmatter parsing pattern]

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const agentsDir = path.join(projectRoot, '.claude', 'agents');
const skillsDir = path.join(projectRoot, '.claude', 'skills');
const memoryDir = path.join(projectRoot, '.claude', 'agent-memory');

const VALID_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Agent',
  'WebFetch', 'WebSearch', 'NotebookEdit', 'Monitor', 'PowerShell',
  'Skill', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode',
  'CronCreate', 'CronDelete', 'CronList', 'LSP',
  'TodoWrite', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate', 'TaskStop',
  'ToolSearch', 'ListMcpResourcesTool', 'ReadMcpResourceTool',
  'SendMessage', 'TeamCreate', 'TeamDelete',
  'EnterWorktree', 'ExitWorktree'
];

// Dimension 1: Required frontmatter fields
// Dimension 2: Tool scoping validity (tools: values in VALID_TOOLS)
// Dimension 3: Skill references (each skills: entry has matching directory)
// Dimension 4: Memory setup (memory: project agents have MEMORY.md)
// Cross-consistency: CLAUDE.md table, config.json mapping, orphan check
```

### Settings.json Hook Registration

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-agent-dispatch.js",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-agent-complete.js",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ]
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/*.md` | `.claude/skills/*/SKILL.md` | Claude Code v2.1.3 (merged in Jan 2026) | Commands still work but skills recommended -- same behavior, more features [VERIFIED: code.claude.com/docs/en/skills] |
| 12 hook events | 25 hook events | Claude Code v2.1.x (2026) | SubagentStart, SubagentStop, TaskCreated, TaskCompleted added. SubagentStop is essential for this phase. [VERIFIED: code.claude.com/docs/en/hooks] |
| No `agent_type` in hooks | `agent_type` available in SubagentStart/SubagentStop | Added with agent hook events | Custom agent names appear as agent_type, enabling per-agent logging [VERIFIED: official docs] |
| No `async` hook option | `async: true` available | 2026 | Logging hooks can run non-blocking without delaying agent dispatch [VERIFIED: code.claude.com/docs/en/hooks] |

**Deprecated/outdated:**
- `.claude/commands/` directory: Still functional but `.claude/skills/` is the recommended path. Both create the same `/slash-command` interface. [VERIFIED: code.claude.com/docs/en/skills]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tool_input.subagent_type` in PreToolUse/Agent contains the custom agent name (e.g., "researcher") not a generic type | Code Examples | Dispatch logs would show wrong agent name; would need alternative correlation strategy |
| A2 | `agent_id` is present in both PreToolUse (Agent tool) and SubagentStop events, enabling event correlation | Code Examples | Start/end events cannot be correlated for duration calculation; would fall back to timestamp-based matching |
| A3 | `fs.appendFileSync()` is sufficient for atomic JSONL line appends (no interleaving) on Windows NTFS | Pitfall 5 | Rare log corruption possible; would need file locking or write queue |
| A4 | Timestamp format `new Date().toISOString().replace(/[:.]/g, '-')` satisfies Windows filename constraints even though it's inside a JSONL value (not a filename) | Code Examples | No risk -- this is inside JSON values. Could use standard ISO 8601 in log entries. |

**Note on A4:** The CLAUDE.md rule about colon-free timestamps applies to filenames. Inside JSONL values, standard ISO 8601 with colons is perfectly valid. The code examples use dash-replacement for consistency with project conventions but standard `new Date().toISOString()` would also work for log entries.

## Open Questions

1. **Agent tool `tool_input` schema for custom agents**
   - What we know: Official docs confirm PreToolUse input includes `tool_input` with the Agent tool parameters. The `subagent_type` field appears in examples. [VERIFIED: code.claude.com/docs/en/hooks]
   - What's unclear: Whether `subagent_type` contains the custom agent `name` from frontmatter or the filename/directory name.
   - Recommendation: Test with a simple hook script during implementation. Log the full `tool_input` JSON for an Agent call to confirm field names.

2. **`agent_id` availability in PreToolUse for Agent tool**
   - What we know: SubagentStop has `agent_id`. SubagentStart has `agent_id`. PreToolUse for other tools has `tool_use_id`.
   - What's unclear: Whether PreToolUse for the Agent tool also has `agent_id` in the hook input before the agent starts.
   - Recommendation: If `agent_id` is not available at PreToolUse time, use `tool_use_id` as correlation key, or fall back to timestamp + agent_name matching.

3. **Granular sub-command naming: `/strategy-scrape` vs `/strategy scrape`**
   - What we know: Claude Code skills use the directory name or `name` field as the slash command. There is no built-in sub-command routing.
   - What's unclear: Whether users prefer hyphenated names (`/strategy-scrape`) or would want a single `/strategy` with argument-based routing.
   - Recommendation: Use separate skills with hyphenated names per D-06 decision. This gives the clearest `/` menu listing. The unified `/strategy` command runs the full pipeline.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Hook scripts, audit script, smoke tests | Yes | v24.13.0 | -- |
| jq | JSON parsing (NOT recommended) | Yes | v1.8.1 | Use Node.js instead |
| Git | Version control | Yes | (in path) | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Items to create:**
- `logs/` directory -- auto-created by hook scripts on first write
- `projects/` directory -- auto-created by pipeline commands on first use
- `.gitignore` -- does not exist yet, needs to be created with `logs/` entry

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js assert (custom test runner, established pattern) |
| Config file | None -- tests use `testCases` array pattern from Phase 1-3 |
| Quick run command | `node tests/smoke-test-pipeline.js` |
| Full suite command | `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js && node tests/smoke-test-pipeline.js` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | `/strategy` skill exists with correct frontmatter | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| PIPE-02 | `/research` skill exists with correct frontmatter | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| PIPE-03 | `/write-script` skill exists with correct frontmatter | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| PIPE-04 | `/visual-plan` skill exists, references both agents | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| PIPE-05 | `/process-assets` skill exists with correct frontmatter | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| PIPE-06 | `/compile` skill exists with correct frontmatter | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| PIPE-07 | Skills do NOT reference Python scripts (Pre-Phase 6) | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| PIPE-08 | Checkpoint skills contain STOP/WAIT instructions | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| HOOK-03 | Hook scripts exist and settings.json has registrations | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |
| HOOK-04 | `/audit-agents` skill + script exist | unit | `node tests/smoke-test-pipeline.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node tests/smoke-test-pipeline.js`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/smoke-test-pipeline.js` -- covers PIPE-01 through PIPE-08, HOOK-03, HOOK-04
- [ ] Framework install: None needed -- Node.js test runner already in use

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- local-only pipeline |
| V3 Session Management | No | N/A -- Claude Code manages sessions |
| V4 Access Control | Partially | Agent tool scoping via `tools:` frontmatter (already implemented in Phase 3) |
| V5 Input Validation | Yes | Validate `$ARGUMENTS` in skills before using as path components; audit script validates frontmatter |
| V6 Cryptography | No | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `$ARGUMENTS` in skill body | Tampering | Skills verify project directory exists before dispatching; agents scoped by `tools:` field |
| Log injection via agent output in JSONL | Tampering | Truncate `last_assistant_message` to 300 chars; JSON.stringify handles escaping |
| Hook script failure blocking agent dispatch | Denial of Service | Use `async: true` for logging hooks; wrap in try/catch with `process.exit(0)` |

## Sources

### Primary (HIGH confidence)
- [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks) -- Complete hooks reference: all 25 events, input JSON schemas, exit codes, matcher syntax, command/http/prompt/agent types, Windows considerations
- [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) -- Skills reference: frontmatter fields, `disable-model-invocation`, `context: fork`, `$ARGUMENTS`, shell execution, invocation control
- [code.claude.com/docs/en/tools-reference](https://code.claude.com/docs/en/tools-reference) -- Complete tool name list (33 tools): Agent, Bash, Edit, Glob, Grep, Read, Write, WebFetch, WebSearch, etc.
- [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents) -- Subagent dispatch: Agent tool input format, SubagentStart/Stop events, agent_type field

### Secondary (MEDIUM confidence)
- Existing project codebase: `tests/smoke-test-agents.js` -- established frontmatter parsing pattern (regex-based)
- Existing project codebase: `.claude/settings.json` -- current empty hooks configuration
- Existing project codebase: 12 agent definitions -- validated frontmatter structure

### Tertiary (LOW confidence)
- None -- all claims verified against official docs or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components are verified Claude Code native features
- Architecture: HIGH -- patterns follow official documentation examples and established project conventions
- Pitfalls: HIGH -- Windows-specific issues identified from CLAUDE.md constraints and verified against official docs
- Hook input schema: MEDIUM -- PreToolUse Agent tool `subagent_type` field confirmed in docs but exact value for custom agents needs runtime validation (A1)
- Event correlation: MEDIUM -- `agent_id` availability across event types needs runtime validation (A2)

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (30 days -- Claude Code hooks/skills API is stable)

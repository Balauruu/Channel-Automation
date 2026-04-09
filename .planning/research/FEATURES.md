# Feature Landscape: Pi CLI Multi-Team to Claude Code Migration

**Domain:** Multi-agent documentary pipeline migration
**Researched:** 2026-04-09
**Confidence:** HIGH (verified against official Claude Code docs at code.claude.com)

---

## Feature Mapping Matrix

### Legend

| Category | Meaning |
|----------|---------|
| DIRECT | Claude Code has a native equivalent that covers the Pi feature |
| BETTER | Claude Code offers something superior to Pi's approach |
| PARTIAL | Claude Code covers part of the feature; adaptation required |
| GAP | No native equivalent; custom solution needed |

---

## 1. Agent Personas

**Pi:** Markdown files with YAML frontmatter defining `name`, `model`, `tools`, `expertise`, `skills`, `domain` rules. Stored in `.pi/multi-team/agents/`. Frontmatter parsed at delegation time, body becomes system prompt.

**Claude Code:** `.claude/agents/<name>.md` -- markdown files with YAML frontmatter. Frontmatter fields: `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, `initialPrompt`. Body becomes the subagent system prompt.

**Mapping: DIRECT**

| Pi Field | Claude Code Field | Notes |
|----------|------------------|-------|
| `name` | `name` | Identical |
| `model` (e.g. `anthropic/claude-sonnet-4-6`) | `model` (e.g. `sonnet`, `opus`, `haiku`, or full ID) | Claude Code uses aliases or full model IDs |
| `tools` (array: read, write, edit, bash, grep, find, ls, delegate) | `tools` (string: Read, Grep, Glob, Bash, Write, Edit, Agent, WebFetch, WebSearch) | Different tool names. Pi `delegate` maps to Claude Code `Agent`. Pi `find`/`ls` have no direct equivalent but Glob/Bash covers them |
| `expertise` (array of YAML file paths) | `memory` (scope: user/project/local) + `skills` (array of skill names) | See Feature #4 for full mental model mapping |
| `skills` (array of markdown file paths) | `skills` (array of skill names to preload) | Skill content injected at startup. See Feature #5 |
| `domain` (array of path/read/upsert/delete rules) | No frontmatter equivalent -- use hooks or permission rules | See Feature #3 for domain enforcement |
| Body (system prompt with `{{TEMPLATE_VARS}}`) | Body (system prompt -- static, no template vars) | Claude Code does not support template variable resolution in agent bodies. Use shell injection (`!`backtick``) in skills instead |

**Migration action:** Create 17 `.claude/agents/*.md` files. Translate frontmatter fields. Move template-variable content to skills with shell injection.

---

## 2. Hierarchical Delegation

**Pi:** 3-tier: Orchestrator --> Team Leads --> Workers. The `delegate` tool routes by team name (orchestrator level) or worker name (lead level). `MULTI_TEAM_PARENT` env var tracks context. `runSync()` spawns a subprocess for each delegation.

**Claude Code:** Single-level subagent dispatch via the Agent tool. Subagents CANNOT spawn other subagents. However, Agent Teams (experimental) support a team lead coordinating multiple teammates with shared task lists and inter-agent messaging.

**Mapping: PARTIAL**

The 3-tier hierarchy does not map directly. Two viable approaches:

### Option A: Flat Orchestrator with Subagents (Recommended)

Use a single orchestrator agent (via `claude --agent orchestrator`) that delegates directly to all 16 worker/lead agents via the Agent tool. No lead intermediary needed.

```
User --> Orchestrator (main session via --agent)
             |-- Agent(researcher) 
             |-- Agent(writer)
             |-- Agent(visual-planner)
             |-- Agent(asset-processor)
             ... (all 16 agents available)
```

Advantages:
- Simpler architecture
- No nesting limitation
- Lower token cost (no lead agent overhead)
- Orchestrator can use `tools: Agent(researcher, writer, visual-planner, ...)` to restrict which agents it can spawn

Disadvantages:
- Orchestrator handles all routing (no lead-level specialization)
- Leads' domain expertise must be folded into the orchestrator or into worker prompts

### Option B: Agent Teams for Parallel Work

Use Claude Code Agent Teams (experimental) when multiple agents need to coordinate on the same pipeline stage. Example: Media team needs visual-researcher, visual-planner, and asset-processor working in parallel.

```
User --> Orchestrator (team lead)
             |-- Teammate: researcher (editorial work)
             |-- Teammate: visual-planner (media work)  
             |-- Teammate: asset-processor (media work)
```

Agent Teams provide:
- Shared task list with dependency tracking
- Direct inter-agent messaging (teammates talk to each other)
- Self-claiming of tasks
- `TeammateIdle`, `TaskCreated`, `TaskCompleted` hooks for quality gates

Limitations:
- Experimental, disabled by default (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
- No session resumption with in-process teammates
- Higher token cost (each teammate is a separate Claude instance)
- One team per session
- No nested teams
- Split-pane mode requires tmux (not available on Windows natively)

### Recommendation

Use **Option A (flat orchestrator)** as the primary architecture. Use **Option B (Agent Teams)** for specific pipeline stages that genuinely benefit from parallel work and inter-agent coordination (e.g., media asset pipeline). The orchestrator agent definition restricts spawnable agents with `tools: Agent(researcher, writer, ...)`.

**Migration action:** Collapse 3-tier to 2-tier. Orchestrator routing table becomes the agent `description` fields (Claude auto-delegates based on description matching). Lead-level domain knowledge folds into worker agent prompts or preloaded skills.

---

## 3. Domain Enforcement

**Pi:** Custom `domain-enforcer.ts` intercepts `tool_call` events for `write`/`edit`. Each agent defines `domain` rules in frontmatter: `{ path, read, upsert, delete }`. Most-specific-prefix matching. Passes via `MULTI_TEAM_DOMAIN` env var to subprocesses.

**Claude Code:** Multiple layered mechanisms available:

### Option A: PreToolUse Hooks (Recommended)

Define hooks in each agent's frontmatter that validate file paths before Write/Edit:

```yaml
---
name: researcher
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "node .claude/hooks/domain-enforcer.js"
---
```

The hook script reads the agent name from `agent_type` in the JSON stdin, looks up allowed directories, and exits with code 2 to block unauthorized writes. This is the closest analog to Pi's domain enforcer.

### Option B: Permission Rules in settings.json

```json
{
  "permissions": {
    "deny": ["Edit(/channel/**)", "Write(/channel/**)"],
    "allow": ["Edit(/projects/**)", "Write(/projects/**)"]
  }
}
```

Limitation: Permission rules are session-wide, not per-agent. Cannot have different rules for different subagents within the same session.

### Option C: Tool Restrictions on Subagents

```yaml
---
name: researcher
tools: Read, Grep, Glob, Bash, Write, Edit
disallowedTools: Write(//d/VideoLibrary/**)
---
```

The `tools` and `disallowedTools` fields restrict what a subagent can do, but they are tool-level granularity (allow/deny the entire tool), not path-level.

### Recommendation

**Use PreToolUse hooks in agent frontmatter** (Option A). Write a single Node.js script (`.claude/hooks/domain-enforcer.js`) that reads domain rules from a JSON config keyed by agent name. Each agent's frontmatter includes the hook. This preserves Pi's per-agent, per-directory enforcement with most-specific-prefix matching.

**Mapping: PARTIAL -- needs custom hook**

**Migration action:** Port `domain-enforcer.ts` logic to a Node.js hook script. Define per-agent allowed directories in a JSON config. Add `hooks.PreToolUse` to each agent's frontmatter.

---

## 4. Mental Models (Cross-Session Memory)

**Pi:** YAML expertise files (`*-mm.yaml`) per agent with structured sections: `key_files`, `decisions`, `patterns`, `observations`, `open_questions`. Loaded at task start via `{{EXPERTISE_BLOCK}}` template. Updated by agents after work. Also supports read-only expertise files (reference docs that agents consult but don't modify).

**Claude Code:** Native `memory` field in agent frontmatter with three scopes:

```yaml
---
name: researcher
memory: project  # options: user, project, local
---
```

When enabled:
- Agent gets a persistent directory at `.claude/agent-memory/<agent-name>/`
- `MEMORY.md` is auto-loaded (first 200 lines / 25KB) into context at startup
- Read/Write/Edit tools auto-enabled so agent can manage memory files
- Agent can create additional files in its memory directory

**Mapping: BETTER**

Claude Code's `memory` system is superior to Pi's expertise files:

| Aspect | Pi Expertise | Claude Code Memory |
|--------|-------------|-------------------|
| Format | YAML (structured but rigid) | Markdown (flexible, agent-controlled) |
| Auto-loading | Via template variable injection | Native -- first 200 lines auto-loaded |
| Update mechanism | Agent manually edits YAML | Agent reads/writes freely |
| Scope control | Always project-scoped | user / project / local scopes |
| Additional files | Separate read-only expertise files | Additional files in memory directory |
| Pruning | Skill instructs agent to prune | Agent instructed to curate when limit exceeded |

For read-only reference docs (like `survey-evaluation.md`, `synthesis.md`), use Claude Code skills with `user-invocable: false` (background knowledge that Claude loads when relevant).

**Migration action:**
1. Set `memory: project` on all 17 agent definitions
2. Seed each agent's `.claude/agent-memory/<name>/MEMORY.md` with content from existing `*-mm.yaml` files (convert YAML to markdown)
3. Include memory management instructions in each agent's system prompt (Pi's `mental-model.md` skill content)
4. Convert read-only expertise files to skills with `user-invocable: false`

---

## 5. Skills (Procedure Files)

**Pi:** Markdown files in `.pi/multi-team/skills/` loaded into agent context. Each agent's frontmatter lists skills with `path` and `use-when` descriptions. Skills include: `mental-model.md`, `active-listener.md`, `precise-worker.md`, `documentary-research.md`, `visual-narrative.md`, `archive-search.md`, etc.

**Claude Code:** Skills system at `.claude/skills/<skill-name>/SKILL.md` with frontmatter:

```yaml
---
name: documentary-research
description: When conducting multi-pass research for documentary topics
user-invocable: false  # Claude loads automatically when relevant
---
```

Skills can include supporting files (templates, scripts, examples) in the same directory.

**Mapping: BETTER**

| Aspect | Pi Skills | Claude Code Skills |
|--------|-----------|-------------------|
| Location | `.pi/multi-team/skills/*.md` | `.claude/skills/<name>/SKILL.md` |
| Loading | Explicit per-agent frontmatter listing | Auto-loaded by description matching OR explicit preload via agent `skills` field |
| Supporting files | Single markdown file | Full directory with templates, examples, scripts |
| Dynamic content | Template vars (`{{SESSION_DIR}}`) | Shell injection (`` !`command` ``) |
| Invocation control | Always loaded when listed | `disable-model-invocation`, `user-invocable` toggles |
| Subagent preloading | N/A | Agent `skills` field injects full content at startup |
| Slash commands | N/A | Skills create `/skill-name` commands |

### Skill Migration Plan

| Pi Skill | Claude Code Equivalent | Approach |
|----------|----------------------|----------|
| `mental-model.md` | Built-in `memory` field | Fold instructions into agent system prompt. No separate skill needed |
| `active-listener.md` | N/A (no conversation log in Claude Code) | GAP -- see Feature #6 |
| `conversational-response.md` | Agent system prompt | Fold into orchestrator's agent definition body |
| `zero-micro-management.md` | Agent system prompt | Fold into orchestrator's agent definition body |
| `high-autonomy.md` | Agent system prompt | Fold into agent definition bodies |
| `precise-worker.md` | Agent system prompt | Fold into worker agent definition bodies |
| `structured-output.md` | Skill at `.claude/skills/structured-output/SKILL.md` | Standalone skill with `user-invocable: false` |
| `documentary-research.md` | Skill at `.claude/skills/documentary-research/SKILL.md` | Standalone skill preloaded into researcher agent |
| `visual-narrative.md` | Skill at `.claude/skills/visual-narrative/SKILL.md` | Standalone skill preloaded into visual agents |
| `archive-search.md` | Skill at `.claude/skills/archive-search/SKILL.md` | Standalone skill preloaded into visual-planner |
| `media-evaluation.md` | Skill at `.claude/skills/media-evaluation/SKILL.md` | Standalone skill preloaded into asset-processor |
| `crawl4ai-scraping.md` | Skill at `.claude/skills/crawl4ai-scraping/SKILL.md` | Standalone skill |
| `data-analysis.md` | Skill at `.claude/skills/data-analysis/SKILL.md` | Standalone skill preloaded into market-analyst |
| `verification-first.md` | Agent system prompt | Fold into relevant agent bodies |
| `karpathy-autoresearch.md` | Skill at `.claude/skills/autoresearch/SKILL.md` | Standalone skill |
| `doc-sync-workflow.md` | Skill at `.claude/skills/doc-sync/SKILL.md` | Standalone skill |
| `skill-observation.md` | Skill at `.claude/skills/skill-observation/SKILL.md` | Standalone skill preloaded into pipeline-observer |

**Migration action:**
1. Small behavioral skills (mental-model, active-listener, precise-worker, high-autonomy, conversational-response, zero-micro-management) fold into agent system prompt bodies
2. Domain-specific skills (documentary-research, visual-narrative, archive-search, etc.) become `.claude/skills/<name>/SKILL.md` files
3. Agent definitions use `skills: [documentary-research, structured-output]` to preload relevant skills
4. Pipeline-triggering procedures become user-invocable skills (`/strategy`, `/research`, `/write-script`, `/visual-plan`, `/process-assets`, `/compile`)

---

## 6. Session Management

**Pi:** `session-manager.ts` creates timestamped directories (`YYYY-MM-DDTHH-MM-SS-MMMZ/`) under `.pi/multi-team/sessions/`. Each session contains `conversation.jsonl` with entries: `{ from, to, content, timestamp }`. Bounded cleanup retains max 20 sessions. Session dir passed to agents via `{{SESSION_DIR}}` template.

**Claude Code:** Native session management:
- Transcripts stored locally at `~/.claude/projects/<project-hash>/` for 30 days
- Each session has a unique ID (`${CLAUDE_SESSION_ID}`)
- `/resume` command resumes previous sessions
- Community tools: `cc-audit-log`, `ai-session` (persists transcripts as git artifacts), `claude-history` (searchable transcript viewer)

**Mapping: PARTIAL**

| Aspect | Pi Sessions | Claude Code |
|--------|------------|-------------|
| Session directory | Timestamped project-local dir | Global `~/.claude/projects/` dir |
| Conversation log | JSONL with delegation chain (from/to/content) | Native JSONL transcript (per-turn, all tool calls) |
| Cross-agent context | Agents read `conversation.jsonl` before responding | Subagents do NOT see parent conversation; Agent Teams share task list only |
| Retention | Max 20 sessions, oldest deleted | 30 days, configurable |
| Project-local logs | Yes (`.pi/multi-team/sessions/`) | No (global `~/.claude/` only) |

### Key Gap: Active Listener Pattern

Pi's `active-listener.md` skill instructs agents to read the conversation log before responding, giving them context about prior delegations. Claude Code subagents receive only their system prompt and the delegation message -- they have NO access to parent conversation history or prior delegation results.

**Workaround:** For cross-agent context, include relevant upstream outputs in the delegation prompt itself. The orchestrator must pass context forward explicitly: "Here are the researcher's findings: [...]. Based on this, write the script."

### Custom Session Logging

For project-local delegation logging (tracking which agents were called, what they produced):

**Option A: PostToolUse Hook (Recommended)**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-logger.js"
          }
        ]
      }
    ]
  }
}
```

The hook captures every Agent tool result and appends to a project-local JSONL file.

**Option B: SubagentStart/SubagentStop Hooks**

```json
{
  "hooks": {
    "SubagentStart": [{ "hooks": [{ "type": "command", "command": "node .claude/hooks/log-start.js" }] }],
    "SubagentStop": [{ "hooks": [{ "type": "command", "command": "node .claude/hooks/log-stop.js" }] }]
  }
}
```

**Migration action:**
1. Accept Claude Code's native session storage for conversation history
2. Build a PostToolUse hook for Agent tool calls to capture delegation chain in project-local JSONL
3. Drop the active-listener pattern; instead, orchestrator passes upstream context in delegation prompts
4. Session cleanup is handled natively (30-day retention)

---

## 7. Orchestrator Injection

**Pi:** `orchestrator-injector.ts` registers a `before_agent_start` handler that builds the orchestrator system prompt by: reading `orchestrator.md`, parsing frontmatter, loading expertise/skills blocks, resolving template vars (`{{TEAMS_BLOCK}}`, `{{EXPERTISE_BLOCK}}`, `{{SKILLS_BLOCK}}`), and prepending to the session system prompt.

**Claude Code:** Use `claude --agent orchestrator` to run the entire session as the orchestrator agent. The agent's markdown body replaces the default Claude Code system prompt. `CLAUDE.md` files still load normally.

**Mapping: BETTER**

Claude Code's `--agent` flag (or `"agent": "orchestrator"` in `.claude/settings.json`) is a cleaner equivalent:

```yaml
# .claude/agents/orchestrator.md
---
name: orchestrator
description: Documentary pipeline coordinator. Routes user requests to specialized agents.
model: opus
tools: Agent(strategy-lead, editorial-lead, media-lead, meta-lead, researcher, writer, visual-planner, asset-processor, compiler, market-analyst, visual-researcher, asset-curator, style-extractor, pipeline-observer, code-reviewer, ux-improver), Read, Grep, Glob
skills:
  - channel-identity
  - routing-rules
memory: project
color: purple
---

You are the executive producer of a documentary video production pipeline...

## Routing Rules
| Request Type | Delegate To |
|---|---|
| Competitor analysis, topics, trends, project init | @strategy-lead or @market-analyst |
| Research a topic, write a script, style extraction | @researcher, @writer, @style-extractor |
| Visual planning, media gathering, downloads, analysis | @visual-planner, @asset-processor, @asset-curator |
| Pipeline review, code quality, UX improvements | @pipeline-observer, @code-reviewer, @ux-improver |

## Human Checkpoints
1. **Topic selection** -- after strategy analysis presents briefs
2. **Asset review** -- after asset-processor presents video candidates
```

The `{{TEAMS_BLOCK}}` template variable is replaced by the routing rules table in the agent body. The `{{EXPERTISE_BLOCK}}` is replaced by the native `memory` field. The `{{SKILLS_BLOCK}}` is replaced by the `skills` field.

To make orchestrator the default: add `"agent": "orchestrator"` to `.claude/settings.json`.

**Migration action:** Create orchestrator agent definition. Move routing table into agent body. Use `skills` and `memory` fields instead of template injection. Set as default agent in project settings.

---

## 8. Config Parsing

**Pi:** `config-parser.ts` parses `multi-team-config.yaml` defining: orchestrator path, team structure (name, color, lead, members with consult-when descriptions), shared context files, session/log paths. Builds routing tables and worker routing tables.

**Claude Code:** No single config file. Configuration is distributed:
- Agent definitions: `.claude/agents/*.md` (each agent self-describes via `description` field)
- Routing: Claude auto-delegates based on agent descriptions
- Team structure: Implicit through agent descriptions and orchestrator prompt
- Shared context: `CLAUDE.md` files (loaded into all agents automatically)
- Settings: `.claude/settings.json` (hooks, permissions, etc.)

**Mapping: BETTER (distributed config)**

Pi's centralized YAML config is replaced by Claude Code's distributed, file-per-agent approach:

| Pi Config Concept | Claude Code Equivalent |
|-------------------|----------------------|
| `orchestrator.path` | `.claude/agents/orchestrator.md` + `"agent": "orchestrator"` in settings |
| `teams[].teamName` | Implicit -- group by naming convention or orchestrator prompt |
| `teams[].lead.path` | `.claude/agents/<lead-name>.md` |
| `teams[].members[].path` | `.claude/agents/<worker-name>.md` |
| `teams[].members[].consult-when` | Agent `description` field (Claude uses this for auto-delegation) |
| `shared_context` | `CLAUDE.md` (project-root) and `.claude/rules/` directory |
| `paths.sessions` | Native (`~/.claude/`) + custom hook for project-local |
| `paths.agents` | `.claude/agents/` (convention) |

Advantage: Each agent is self-contained. No central config to keep in sync with agent files. Agent `description` fields serve as the routing table -- Claude reads them and delegates automatically.

**Migration action:** No config file to create. Agent descriptions become the routing table. Team grouping lives in the orchestrator's system prompt. Shared context goes into CLAUDE.md.

---

## 9. Cost/Token Tracking Per Agent

**Pi:** `delegate-tool.ts` tracks `{ inputTokens, outputTokens, cost, delegationCount, model }` per team/agent in a `DelegationState.teamStats` map. Displayed in footer UI.

**Claude Code:** Built-in `/cost` command shows session-level costs. No native per-subagent cost breakdown.

**Mapping: PARTIAL -- needs custom hook**

### Native Options
- `/cost` command: Shows total session cost, tokens used, cache stats
- Status line: Can display running cost (`/statusline` configuration)
- Community tool `ccusage`: Analyzes local JSONL logs for per-session, per-model breakdowns

### Custom Per-Agent Tracking

Use SubagentStart/SubagentStop hooks:

```json
{
  "hooks": {
    "SubagentStart": [{
      "hooks": [{ "type": "command", "command": "node .claude/hooks/track-agent-start.js" }]
    }],
    "SubagentStop": [{
      "hooks": [{ "type": "command", "command": "node .claude/hooks/track-agent-stop.js" }]
    }]
  }
}
```

The stop hook receives the agent ID and can correlate with start to compute per-agent duration. Token counts per subagent are available in the transcript JSONL files.

Alternatively, use the `PostToolUse` hook on the `Agent` tool, which receives the tool response including any usage data.

**Migration action:** Accept session-level `/cost` for daily use. Build SubagentStop hook to append per-agent stats to a project-local log if detailed tracking is needed. Consider `ccusage` CLI for post-hoc analysis.

---

## 10. Agent Audit Command

**Pi:** `audit-agents.ts` implements `/audit-agents` slash command that validates: required frontmatter fields, tool tier (leads have delegate, workers don't), domain scope (no overly broad upsert), file existence (expertise/skills paths exist on disk), config consistency (all config entries match disk files and vice versa).

**Claude Code:** No built-in agent validation command.

### Community Tools
- `agnix` -- "Comprehensive linter for Claude Code agent files validating CLAUDE.md, AGENTS.md, SKILL.md configurations"

### Custom Solution

Create a skill: `.claude/skills/audit-agents/SKILL.md`

```yaml
---
name: audit-agents
description: Validate all agent definitions in .claude/agents/
disable-model-invocation: true
context: fork
agent: Explore
---

Audit all agent definitions in .claude/agents/:

1. Read every .md file in .claude/agents/
2. Validate frontmatter: name, description (required), tools, model
3. Check that skills referenced in `skills` field exist in .claude/skills/
4. Check that memory directories exist if memory is set
5. Verify no agent has overly broad permissions
6. Report findings in a structured table
```

Or build a Node.js script and wrap it as a skill:

```yaml
---
name: audit-agents
disable-model-invocation: true
allowed-tools: Bash(node *)
---
Run the agent audit script:
!`node .claude/scripts/audit-agents.js`
```

**Mapping: PARTIAL -- custom skill replaces custom command**

**Migration action:** Port audit logic to a Node.js script at `.claude/scripts/audit-agents.js`. Create `/audit-agents` skill to invoke it. Adapt checks from Pi's 5-point validation to Claude Code's agent format.

---

## Additional Pi Features Not Listed But Present

### 11. Template Variable Resolution

**Pi:** `template-resolver.ts` replaces `{{SESSION_DIR}}`, `{{CONVERSATION_LOG}}`, `{{TEAMS_BLOCK}}`, `{{EXPERTISE_BLOCK}}`, `{{SKILLS_BLOCK}}` in agent prompts.

**Claude Code:** No template variable system in agent bodies. Skills support `$ARGUMENTS`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`, and shell injection (`` !`command` ``).

**Mapping: PARTIAL**

- `{{SESSION_DIR}}` --> Use `${CLAUDE_SESSION_ID}` in skills, or pass via hook env vars
- `{{CONVERSATION_LOG}}` --> No equivalent (Claude Code manages transcripts internally)
- `{{TEAMS_BLOCK}}` --> Static text in orchestrator agent body
- `{{EXPERTISE_BLOCK}}` --> Replaced by native `memory` field
- `{{SKILLS_BLOCK}}` --> Replaced by native `skills` field

**Migration action:** Eliminate template vars. Content that was injected via templates becomes static in agent definitions, native fields, or skill shell injection.

### 12. Expertise Loader

**Pi:** `expertise-loader.ts` reads YAML expertise files and formats them as a block to inject into agent prompts. Supports `updatable: true/false` flag.

**Claude Code:** The `memory` field handles updatable knowledge. Read-only reference docs become skills with `user-invocable: false`.

**Mapping: BETTER** -- native `memory` field replaces custom loader.

### 13. Shared Context Files

**Pi:** `shared_context` in config lists files loaded into all agents (`README.md`, `AGENTS.md`, `channel/channel.md`).

**Claude Code:** `CLAUDE.md` at project root is loaded into ALL sessions and subagents automatically. Additional project rules go in `.claude/rules/*.md` directory.

**Mapping: DIRECT**

Consolidate shared context into:
- `CLAUDE.md` -- project overview, folder map, architecture rules
- `.claude/rules/channel-identity.md` -- channel voice, style, identity
- `.claude/rules/pipeline-rules.md` -- quality thresholds, conventions

---

## Feature Dependencies

```
Orchestrator Agent (Feature 7) --> requires Agent Personas (Feature 1) defined first
Domain Enforcement (Feature 3) --> requires hook script; depends on agent naming convention
Mental Models (Feature 4) --> depends on agent definitions having `memory` field
Skills (Feature 5) --> must be created before agent definitions reference them
Session Logging (Feature 6) --> hook depends on settings.json configuration
Cost Tracking (Feature 9) --> hooks depend on settings.json configuration
Agent Audit (Feature 10) --> script must know all agent file conventions
```

Build order: Skills (5) --> Agent Personas (1) --> Orchestrator (7) --> Domain Enforcement Hooks (3) --> Session/Cost Hooks (6, 9) --> Audit Script (10)

---

## Feedback Propagation System (Critical Requirement)

**Pi:** Mental models (`*-mm.yaml`) serve as the feedback propagation mechanism. When a downstream agent (e.g., asset-processor) learns something about asset quality, it updates its expertise file. On subsequent runs, upstream agents (visual-planner, visual-researcher) can consult downstream expertise to adjust their behavior.

**Claude Code:** The `memory: project` field provides this natively. Each agent's `.claude/agent-memory/<name>/MEMORY.md` persists across sessions. The mechanism works if:

1. Downstream agents write findings to their memory: "CLIP embeddings work better with specific visual descriptors. Archive.org footage from Prelinger is consistently higher quality."
2. Upstream agents are instructed (in their system prompt) to consult downstream agents' memory before planning: "Before generating shotlist, read `.claude/agent-memory/asset-processor/MEMORY.md` for asset quality insights."
3. The orchestrator skill for pipeline stages includes cross-agent memory reading steps.

This is actually more powerful than Pi's approach because:
- Memory is human-readable markdown (not structured YAML)
- Agents can create additional files in their memory directory (not just one file)
- `project` scope means memory is version-controllable
- Any agent can read any other agent's memory directory (it's just files)

**Migration action:** Instruct agents to write feedback-relevant observations to their memory. Instruct upstream agents to read downstream memory before starting work. Build this into pipeline stage skills.

---

## Community Solutions and Plugins

### Multi-Agent Orchestration

| Tool | URL | Relevance |
|------|-----|-----------|
| Claude Code Agent Teams | https://code.claude.com/docs/en/agent-teams | Official experimental feature. Parallel agent coordination |
| Harness | https://github.com/revfactory/harness | Meta-skill that designs domain-specific agent teams and generates skills |
| Claude Squad | (community) | Concurrent management of multiple Claude Code instances |
| Workflow Orchestration Plugin | https://github.com/barkain/claude-code-workflow-orchestration | Hook-based multi-step workflow orchestration with task decomposition |
| Oh-My-ClaudeCode | https://github.com/Yeachan-Heo/oh-my-claudecode | Teams-first multi-agent orchestration |

### Memory and Knowledge

| Tool | URL | Relevance |
|------|-----|-----------|
| Claude Memory Compiler | https://github.com/coleam00/claude-memory-compiler | Hook-based automatic knowledge capture, inspired by Karpathy |
| Claude-Mem | https://github.com/thedotmack/claude-mem | Auto-captures session activity, compresses, injects into future sessions |
| Memsearch Plugin | (community) | Persistent vector memory for Claude Code |

### Session and Audit

| Tool | URL | Relevance |
|------|-----|-----------|
| cc-audit-log | https://github.com/yurukusa/cc-audit-log | Human-readable audit trail from session transcripts |
| ai-session | https://github.com/gammons/ai-session | Persists transcripts as git artifacts linked to commits |
| ccusage | https://github.com/ryoppippi/ccusage | CLI for analyzing Claude Code usage from local JSONL |
| agnix | (community) | Linter for Claude Code agent/skill/CLAUDE.md files |
| Awesome Claude Code | https://github.com/hesreallyhim/awesome-claude-code | Curated list of skills, hooks, plugins, orchestrators |

### Observability

| Tool | URL | Relevance |
|------|-----|-----------|
| Claude Code Hooks Multi-Agent Observability | https://github.com/disler/claude-code-hooks-multi-agent-observability | Real-time monitoring for multi-agent hook event tracking |
| Claude Devtools | (community) | Desktop observability -- turn-based context analysis, subagent trees |
| Claudetop | (community) | Real-time token cost monitor for sessions |

---

## Anti-Features (Do NOT Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom delegate tool | Claude Code's Agent tool handles delegation natively | Use Agent tool via subagent definitions |
| Config parser for YAML team config | Distributed config via agent files is simpler and self-maintaining | Let Claude auto-route via agent descriptions |
| Footer UI / TUI status display | Pi-specific; Claude Code has its own status line | Use `/statusline` and `/cost` |
| Template variable resolution engine | Unnecessary complexity; native features cover all cases | Use `memory`, `skills`, shell injection |
| Custom subprocess spawner | Claude Code manages subagent lifecycle internally | Use native Agent tool |
| 3-tier delegation nesting | Claude Code doesn't support it; flat is simpler | Use 2-tier (orchestrator + workers) |
| Active listener (read conversation log) | Claude Code subagents don't have access to parent context | Pass context forward in delegation prompts |

---

## MVP Recommendation

### Phase 1: Foundation
1. **CLAUDE.md** -- project context, folder map, architecture rules (from AGENTS.md)
2. **Agent definitions** -- all 17 agents in `.claude/agents/*.md`
3. **Core skills** -- documentary-research, archive-search, visual-narrative, structured-output
4. **Orchestrator config** -- `"agent": "orchestrator"` in settings

### Phase 2: Pipeline Mechanics
5. **Pipeline stage skills** -- `/strategy`, `/research`, `/write-script`, `/visual-plan`, `/process-assets`, `/compile`
6. **Memory setup** -- `memory: project` on all agents, seed initial MEMORY.md files
7. **Feedback propagation** -- cross-agent memory reading instructions

### Phase 3: Enforcement and Observability
8. **Domain enforcement hook** -- PreToolUse hook script
9. **Session logging hook** -- PostToolUse/SubagentStop hook
10. **Audit skill** -- `/audit-agents` validation

### Defer
- Agent Teams (experimental, wait for stability)
- Per-agent cost tracking (accept session-level `/cost` initially)
- Split-pane tmux mode (Windows limitation)

---

## Sources

- Claude Code Subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code Hooks: https://code.claude.com/docs/en/hooks
- Claude Code Skills: https://code.claude.com/docs/en/skills
- Claude Code Agent Teams: https://code.claude.com/docs/en/agent-teams
- Claude Code Permissions: https://code.claude.com/docs/en/permissions
- Claude Code Costs: https://code.claude.com/docs/en/costs
- Awesome Claude Code: https://github.com/hesreallyhim/awesome-claude-code
- CC Audit Log: https://github.com/yurukusa/cc-audit-log
- CCUsage: https://github.com/ryoppippi/ccusage
- Claude Memory Compiler: https://github.com/coleam00/claude-memory-compiler
- Multi-Agent Observability Hooks: https://github.com/disler/claude-code-hooks-multi-agent-observability
- Workflow Orchestration Plugin: https://github.com/barkain/claude-code-workflow-orchestration

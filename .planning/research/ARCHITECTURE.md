# Architecture Patterns

**Domain:** Multi-agent documentary video production pipeline (Claude Code)
**Researched:** 2026-04-09
**Overall confidence:** HIGH (based on official Claude Code documentation, verified against multiple sources)

---

## Recommended Architecture

### Architecture Decision: 2-Tier Flat Subagents (Not Agent Teams)

**Use Claude Code subagents (`.claude/agents/`) with a single user-facing orchestrator, not the experimental Agent Teams feature.**

Rationale:
- Agent Teams are experimental (require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`), have known limitations around session resumption and shutdown, and require tmux/iTerm2 for split-pane mode -- none of which works on Windows Terminal
- The documentary pipeline is sequential by nature (research -> script -> visuals -> assets), not parallel exploration
- Subagents are production-stable, support persistent memory, tool scoping, hooks, MCP servers, and skill injection
- The user wants manual control over stage transitions, which maps to "invoke subagent when ready" not "let agents self-coordinate"
- Agent Teams cannot nest (no nested teams), so they offer no structural advantage over subagents for a pipeline

**Architecture: User -> CLAUDE.md orchestrator instructions -> @agent-name invocations -> subagents execute and return**

### High-Level Data Flow

```
User request
    |
    v
[Main Session / Orchestrator Context]
    |  (reads CLAUDE.md with routing rules,
    |   channel identity, pipeline state)
    |
    |--- @strategy-lead ---------> delegates to @market-analyst
    |--- @editorial-lead --------> delegates to @researcher, @writer, @style-extractor
    |--- @media-lead ------------> delegates to @visual-researcher, @visual-planner,
    |                              @asset-processor, @asset-curator, @compiler
    |--- @meta-lead -------------> delegates to @pipeline-observer, @code-reviewer, @ux-improver
    |
    v
[Feedback propagation via shared files + agent memory]
```

**Critical constraint:** Claude Code subagents cannot spawn other subagents. This means the 3-tier delegation (Orchestrator -> Lead -> Worker) from Pi V5 must become 2-tier. The main session acts as orchestrator AND can invoke any agent directly. "Lead" agents become specialized coordinators that the main session consults for planning, but worker dispatch happens from the main session.

### Revised 2-Tier Model

**Tier 1 (Main Session):** The user's Claude Code session. Reads CLAUDE.md with orchestration rules. Routes requests by invoking `@agent-name`. Receives results. Manages human checkpoints.

**Tier 2 (Subagents):** All 16 agents (4 leads + 12 workers) are flat subagents in `.claude/agents/`. Leads are invoked for coordination/planning tasks. Workers are invoked for execution tasks. Both return results to the main session.

The key insight: in Claude Code, the "orchestrator" is not a separate agent -- it is the main session itself, guided by CLAUDE.md instructions. This is simpler and more reliable than having an orchestrator agent.

---

## Recommended Directory Structure

```
Channel-Automation V0.6/
|
|-- .claude/
|   |-- CLAUDE.md                     # Master project instructions + orchestration routing
|   |-- CLAUDE.local.md               # User-local overrides (gitignored)
|   |-- settings.json                 # Project settings (hooks, permissions)
|   |-- settings.local.json           # Local settings (gitignored)
|   |
|   |-- agents/                       # All 16 subagent definitions
|   |   |-- strategy-lead.md
|   |   |-- market-analyst.md
|   |   |-- editorial-lead.md
|   |   |-- researcher.md
|   |   |-- writer.md
|   |   |-- style-extractor.md
|   |   |-- media-lead.md
|   |   |-- visual-researcher.md
|   |   |-- visual-planner.md
|   |   |-- asset-processor.md
|   |   |-- asset-curator.md
|   |   |-- compiler.md
|   |   |-- meta-lead.md
|   |   |-- pipeline-observer.md
|   |   |-- code-reviewer.md
|   |   +-- ux-improver.md
|   |
|   |-- agent-memory/                 # Per-agent persistent memory (project scope)
|   |   |-- strategy-lead/
|   |   |   +-- MEMORY.md
|   |   |-- market-analyst/
|   |   |   +-- MEMORY.md
|   |   |-- researcher/
|   |   |   +-- MEMORY.md
|   |   |-- writer/
|   |   |   +-- MEMORY.md
|   |   |-- ... (one per agent)
|   |   +-- compiler/
|   |       +-- MEMORY.md
|   |
|   |-- rules/                        # Path-scoped rules (auto-loaded by file context)
|   |   |-- strategy-scripts.md       # Rules for strategy/ Python scripts
|   |   |-- editorial-scripts.md      # Rules for editorial/ Python scripts
|   |   |-- media-scripts.md          # Rules for media/ Python scripts
|   |   +-- project-conventions.md    # Cross-cutting conventions
|   |
|   |-- skills/                       # Reusable workflow procedures
|   |   |-- documentary-research.md   # 3-pass research procedure
|   |   |-- archive-search.md         # Archive.org / Prelinger search
|   |   |-- visual-narrative.md       # Visual register planning
|   |   |-- media-evaluation.md       # YouTube/source evaluation
|   |   |-- crawl4ai-scraping.md      # JS-rendered page scraping
|   |   +-- feedback-propagation.md   # How to read/write feedback files
|   |
|   +-- hooks/                        # Hook scripts
|       |-- validate-domain.sh        # PreToolUse: enforce agent file boundaries
|       +-- post-pipeline-step.sh     # PostToolUse: log pipeline activity
|
|-- channel/                          # Channel identity (read-only reference)
|   |-- channel.md                    # Channel description, audience, tone
|   |-- voice-profile.md             # Narrator voice characteristics
|   +-- VISUAL_STYLE_GUIDE.md        # Visual register definitions
|
|-- strategy/                         # Strategy Python scripts (unchanged from V5)
|   |-- cli.py
|   |-- scraper.py, analyzer.py, topics.py, project_init.py, database.py
|   +-- data/                         # Scraped competitor data
|
|-- editorial/                        # Editorial Python scripts (unchanged from V5)
|   |-- researcher/
|   |   +-- cli.py (survey, deepen, synthesize)
|   +-- writer/
|       +-- cli.py (load, generate, revise)
|
|-- media/                            # Media Python scripts (unchanged from V5)
|   |-- discover.py, ingest.py, embed.py, search.py
|   |-- evaluate.py, download.py, ia_search.py
|   |-- organize_assets.py, promote.py
|   |-- wiki_screenshots.py, crawl_images.py
|   +-- models/                       # CLIP model cache
|
|-- projects/                         # Per-documentary project outputs
|   +-- N. [Title]/
|       |-- research/                 # Researcher output
|       |   |-- Research.md
|       |   +-- entity_index.json
|       |-- script/                   # Writer output
|       |   |-- Script.md
|       |   +-- style_profile.json
|       |-- visuals/                  # Visual planner output
|       |   |-- shotlist.json
|       |   |-- shotlist_edit_sheet.md
|       |   +-- visual_brief.json
|       |-- media/                    # Asset processor output
|       |   |-- media_leads.json
|       |   |-- downloads/
|       |   +-- embeddings/
|       +-- feedback/                 # Cross-agent feedback files (NEW)
|           |-- upstream-signals.json # Downstream -> upstream feedback
|           +-- pipeline-log.md      # Pipeline execution history
|
+-- .mcp.json                        # MCP server configuration
```

---

## Agent Definition Format

### Standard Agent Template

Every agent definition is a Markdown file with YAML frontmatter in `.claude/agents/`:

```markdown
---
name: visual-planner
description: >-
  Generates structured shot lists and curates b-roll for documentary projects.
  Reads scripts and visual briefs, assigns resources to shots, searches for
  atmospheric b-roll. Invoke for visual planning after research and scripting.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
memory: project
color: purple
skills:
  - visual-narrative
  - archive-search
  - feedback-propagation
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-domain.sh"
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-pipeline-step.sh"
---

# Visual Planner

## Identity

You are the visual planner for a dark mysteries documentary channel. You think
in visual registers: grounding, conceptual, atmospheric, emotional, transitional.

## Before Starting Work

1. Read your agent memory for accumulated knowledge about visual patterns
2. Read the project's `feedback/upstream-signals.json` for insights from
   downstream agents (asset-processor, asset-curator)
3. Adjust your approach based on feedback signals

## Core Procedure

### Shotlist Generation
Read `Script.md` + `visual_brief.json` + channel `VISUAL_STYLE_GUIDE.md`.
Generate `shotlist.json` with shots per chapter:
- `find` shots -- assign gathered primary resources from `media_leads.json`
- `create` shots -- text cards, diagrams (editor creates in DaVinci Resolve)
- `generate` shots -- vector silhouettes (ComfyUI, future)
- `curate` shots -- b-roll (atmospheric, cartoon, environmental) -- YOU search

### B-Roll Curation
Use `ia_search.py` for archive.org. Use crawl4ai + yt-dlp for YouTube.
Score YouTube leads 1-4 per evaluation criteria.

### Equilibrium Rules
1. No more than 3 consecutive shots with same action type
2. Every chapter includes >= 1 `find` shot
3. `generate` + `curate` (cartoon) not back-to-back without `find` between
4. `curate` shots >= 15% of total
5. `broll_cartoon` >= 10% of shots

## After Completing Work

1. Update your agent memory with patterns discovered
2. Write any feedback signals for upstream agents to `feedback/upstream-signals.json`

## Python Scripts Available

Run via Bash:
- `python media/ia_search.py [query]` -- Archive.org search
- `python media/crawl_images.py [url]` -- Image crawling
- `python media/wiki_screenshots.py [url]` -- Wikipedia screenshots
```

### Agent Definition Field Reference (Verified from Official Docs)

| Field | Required | V0.6 Usage |
|-------|----------|------------|
| `name` | Yes | Lowercase-hyphenated agent identifier |
| `description` | Yes | When to delegate to this agent (Claude uses this to auto-route) |
| `tools` | No | Explicit allowlist -- use to enforce domain boundaries |
| `disallowedTools` | No | Denylist -- use when inheriting most tools but blocking a few |
| `model` | No | `sonnet` for workers, `opus` for leads, `haiku` for read-only scouts |
| `memory` | No | `project` for all agents -- shared via git, project-scoped knowledge |
| `color` | No | Visual differentiation in UI |
| `skills` | No | Inject skill content at startup (does NOT inherit from parent) |
| `hooks` | No | Per-agent lifecycle hooks for domain enforcement |
| `mcpServers` | No | Scope MCP servers to specific agents |
| `permissionMode` | No | `acceptEdits` for workers, `plan` for read-only agents |
| `maxTurns` | No | Safety limit to prevent runaway agents |
| `background` | No | `true` for pipeline-observer (monitoring role) |

### Model Selection Strategy

| Role | Model | Rationale |
|------|-------|-----------|
| Leads (strategy, editorial, media, meta) | `opus` | Complex coordination, planning, synthesis |
| Workers (researcher, writer, visual-planner, etc.) | `sonnet` | Good balance of capability and speed for focused tasks |
| Read-only scouts (pipeline-observer for monitoring) | `haiku` | Fast, cheap, sufficient for file reading and analysis |

---

## Component Boundaries

### Agent Responsibility Matrix

| Agent | Team | Responsibility | File Domain | Communicates With |
|-------|------|---------------|-------------|-------------------|
| **strategy-lead** | Strategy | Route strategy requests, synthesize competitor insights | `strategy/`, `projects/*/` | market-analyst |
| **market-analyst** | Strategy | Scrape competitors, analyze trends, generate topic briefs | `strategy/`, `projects/*/research/` | strategy-lead |
| **editorial-lead** | Editorial | Route editorial requests, manage research-to-script pipeline | `editorial/`, `projects/*/` | researcher, writer, style-extractor |
| **researcher** | Editorial | 3-pass documentary research, source evaluation | `projects/*/research/` | editorial-lead |
| **writer** | Editorial | Script generation from research dossier | `projects/*/script/` | editorial-lead |
| **style-extractor** | Editorial | Extract narrator voice patterns from reference content | `channel/`, `projects/*/script/` | editorial-lead |
| **media-lead** | Media | Route media requests, manage visual pipeline | `media/`, `projects/*/` | visual-researcher, visual-planner, asset-processor, asset-curator, compiler |
| **visual-researcher** | Media | Discover visual source candidates | `projects/*/media/` | media-lead |
| **visual-planner** | Media | Generate shotlists, curate b-roll | `projects/*/visuals/` | media-lead |
| **asset-processor** | Media | Process and embed assets with CLIP | `projects/*/media/` | media-lead |
| **asset-curator** | Media | Evaluate and select final assets | `projects/*/media/` | media-lead |
| **compiler** | Media | Produce DaVinci Resolve edit sheet | `projects/*/visuals/` | media-lead |
| **meta-lead** | Meta | Route meta requests, pipeline improvement | `.claude/`, whole project (read) | pipeline-observer, code-reviewer, ux-improver |
| **pipeline-observer** | Meta | Monitor pipeline execution, log patterns | `projects/*/feedback/` | meta-lead |
| **code-reviewer** | Meta | Review Python scripts and agent definitions | `strategy/`, `editorial/`, `media/` | meta-lead |
| **ux-improver** | Meta | Suggest UX/workflow improvements | `.claude/` | meta-lead |

### Domain Enforcement via Tool Scoping

Claude Code does not have Pi's `domain` field (path-based read/write/delete permissions per agent). The equivalent is achieved through a combination of:

1. **Tool restrictions in agent frontmatter**: Read-only agents get `tools: Read, Grep, Glob` (no Write/Edit/Bash)
2. **PreToolUse hooks**: A validation script that checks the file path being written/edited against the agent's allowed directories
3. **CLAUDE.md rules**: Instruction-level enforcement ("You may only write to `projects/*/research/`")
4. **Path-specific rules in `.claude/rules/`**: Auto-loaded context when working in specific directories

**Recommended approach: layers 1 + 3 for most agents, add layer 2 (hooks) for critical boundaries.**

Hook-based domain enforcement example (`.claude/hooks/validate-domain.sh`):

```bash
#!/bin/bash
# PreToolUse hook: validate agent file access
INPUT=$(cat /dev/stdin)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')
AGENT=$(echo "$INPUT" | jq -r '.agent_type // "main"')

# Only check file-writing tools
if [[ "$TOOL" != "Write" && "$TOOL" != "Edit" ]]; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file')

# Agent-to-directory mapping
case "$AGENT" in
  researcher)
    ALLOWED="projects/.*/research/"
    ;;
  writer)
    ALLOWED="projects/.*/script/"
    ;;
  visual-planner)
    ALLOWED="projects/.*/visuals/"
    ;;
  *)
    # Allow writes for unlisted agents (main session, leads)
    exit 0
    ;;
esac

if ! echo "$FILE_PATH" | grep -qE "$ALLOWED"; then
  echo "Domain violation: $AGENT cannot write to $FILE_PATH" >&2
  exit 2  # Block the tool call
fi

exit 0
```

---

## Feedback Propagation System

### The Core Problem

When the asset-processor discovers that certain types of visual references produce poor CLIP embeddings, that insight must influence the visual-planner's future shotlist generation. When the writer finds that certain research structures produce better scripts, the researcher should adjust. This cross-agent learning is the single most important capability to preserve.

### Solution: File-Based Feedback Protocol + Agent Memory

Claude Code subagents cannot communicate directly (only via the main session). The feedback propagation mechanism uses **shared files** as the communication channel and **agent memory** as the persistence layer.

#### Feedback File: `projects/N. [Title]/feedback/upstream-signals.json`

```json
{
  "version": 1,
  "signals": [
    {
      "id": "sig-001",
      "timestamp": "2026-04-09T14:30:00Z",
      "from_agent": "asset-processor",
      "to_agent": "visual-planner",
      "signal_type": "quality_feedback",
      "severity": "high",
      "message": "Archive.org videos from Prelinger collection consistently have aspect ratio issues. Prefer YouTube Creative Commons sources for b-roll.",
      "evidence": "3/5 Prelinger downloads required manual cropping. CLIP similarity scores averaged 0.43 vs 0.71 for YouTube sources.",
      "suggested_action": "Reduce Prelinger priority in b-roll curation. Add aspect ratio check to ia_search.py results."
    },
    {
      "id": "sig-002",
      "timestamp": "2026-04-09T15:00:00Z",
      "from_agent": "writer",
      "to_agent": "researcher",
      "signal_type": "content_gap",
      "severity": "medium",
      "message": "Research dossier lacked timeline density for 1950-1960 period. Script chapter 3 needed improvisation.",
      "evidence": "entity_index.json had 2 dated entries for the decade vs 8+ for other decades.",
      "suggested_action": "In Pass 2 (deepen), check timeline coverage per decade. Flag gaps before synthesis."
    }
  ]
}
```

#### Propagation Flow

```
1. Downstream agent completes work
       |
       v
2. Agent writes feedback signals to projects/N/feedback/upstream-signals.json
   (AND updates its own agent memory with the pattern)
       |
       v
3. On next pipeline run, upstream agent is invoked
       |
       v
4. Upstream agent's system prompt includes: "Read feedback/upstream-signals.json
   for insights from downstream agents. Adjust your approach accordingly."
       |
       v
5. Upstream agent reads signals, incorporates relevant ones
       |
       v
6. Upstream agent notes "applied feedback sig-001" in its agent memory
       |
       v
7. Over time, agent memory accumulates patterns (persistent across sessions)
```

#### Why This Works in Claude Code

- **Subagent memory** (`memory: project`) gives each agent a persistent `MEMORY.md` in `.claude/agent-memory/<name>/`. The first 200 lines are auto-injected into the agent's system prompt at startup. This is the long-term learning layer.
- **Feedback files** in `projects/N/feedback/` are the project-specific signal layer. They are read at task start and written at task end.
- **Skills** (`feedback-propagation.md`) teach all agents the protocol for reading and writing feedback signals. This skill is injected into every agent via the `skills` frontmatter field.

#### The feedback-propagation.md Skill

```markdown
# Feedback Propagation Protocol

## At Task Start
1. Check if `feedback/upstream-signals.json` exists in the current project
2. Read signals where `to_agent` matches your agent name
3. For each signal with severity "high", explicitly adjust your approach
4. For "medium" signals, note them and apply if relevant
5. Log which signals you applied in your response

## At Task End
1. If you observed quality issues, content gaps, or pattern insights that
   would help an upstream agent, write a signal
2. Use the standard signal format (see examples)
3. Severity guide:
   - "high": Consistently reproducible issue affecting output quality
   - "medium": Occasional issue worth noting
   - "low": Minor observation, nice-to-have improvement
4. Update your agent memory with the pattern you observed

## Signal Routing Map
| If you are... | You can send signals to... |
|---------------|---------------------------|
| asset-processor | visual-planner, visual-researcher |
| asset-curator | visual-planner, asset-processor |
| compiler | visual-planner, asset-curator |
| writer | researcher, style-extractor |
| style-extractor | writer |
| visual-planner | researcher (for visual research needs) |
```

---

## Pipeline Orchestration

### Stage-Based Pipeline (User-Triggered)

The pipeline is NOT auto-orchestrated. The user decides when to advance stages. This maps to Claude Code's natural interaction model: the user types a request, the main session routes it to the right agent(s).

#### Pipeline Stages

| Stage | Trigger (User Says) | Agents Involved | Input | Output |
|-------|---------------------|-----------------|-------|--------|
| **1. Strategy** | "Analyze competitors for [niche]" | strategy-lead -> market-analyst | Competitor URLs | Topic briefs |
| **2. Topic Selection** | *Human checkpoint* -- user picks topic | Main session | Topic briefs | Selected topic |
| **3. Project Init** | "Initialize project for [topic]" | strategy-lead | Selected topic | Project directory scaffolding |
| **4. Research** | "Research [topic]" | editorial-lead -> researcher | Topic brief | Research.md, entity_index.json |
| **5. Scripting** | "Write script for [project]" | editorial-lead -> writer | Research.md | Script.md |
| **6. Style** | "Extract style for [project]" | editorial-lead -> style-extractor | Reference scripts | style_profile.json |
| **7. Visual Planning** | "Plan visuals for [project]" | media-lead -> visual-planner | Script.md, visual_brief | shotlist.json |
| **8. Asset Discovery** | "Find assets for [project]" | media-lead -> visual-researcher | shotlist.json | media_leads.json |
| **9. Asset Processing** | "Process assets for [project]" | media-lead -> asset-processor | media_leads.json | Embeddings, downloads |
| **10. Asset Review** | *Human checkpoint* -- user reviews assets | Main session | Processed assets | Approved assets |
| **11. Asset Curation** | "Curate assets for [project]" | media-lead -> asset-curator | Processed assets | Final asset selection |
| **12. Compilation** | "Compile edit sheet for [project]" | media-lead -> compiler | shotlist + curated assets | DaVinci Resolve edit sheet |

#### Human Checkpoints

Two moments require user input (same as Pi V5):

1. **Topic selection** (after Stage 1): Strategy lead presents topic briefs. User picks one.
2. **Asset review** (after Stage 9): Asset processor presents video candidates. User approves/rejects.

These are NOT automated. The main session presents the output and waits for user input.

### Lead vs Worker Invocation Pattern

Since subagents cannot spawn subagents, the main session must handle all dispatch. But "leads" still serve a purpose as planning/synthesis agents:

**Pattern A -- Direct Worker Invocation (Simple Tasks):**
```
User: "Research the Dyatlov Pass incident"
Main session: @researcher Research the Dyatlov Pass incident for project 5.
              Read the topic brief at projects/5. Dyatlov Pass/topic_brief.json.
```

**Pattern B -- Lead-then-Worker (Complex/Multi-Step Tasks):**
```
User: "Handle all visuals for project 5"
Main session: @media-lead Plan the visual pipeline for project 5. 
              What agents should I invoke and in what order?
[media-lead returns a plan]
Main session: @visual-planner [task from plan, with context]
[visual-planner returns]
Main session: @visual-researcher [next task, with context from previous]
[visual-researcher returns]
Main session: @media-lead Synthesize results from visual planning and research.
              Any issues or feedback?
```

This preserves the "lead as coordinator" role without needing subagent nesting.

---

## Integration Patterns

### Python Script Invocation

Agents invoke Python scripts via the Bash tool. Key patterns:

```bash
# Strategy scripts
python strategy/cli.py scrape --url "https://competitor.com"
python strategy/cli.py analyze
python strategy/cli.py topics --count 5
python strategy/cli.py init --topic "Dyatlov Pass"

# Editorial scripts
python editorial/researcher/cli.py survey --project "5. Dyatlov Pass"
python editorial/researcher/cli.py deepen --project "5. Dyatlov Pass"
python editorial/researcher/cli.py synthesize --project "5. Dyatlov Pass"
python editorial/writer/cli.py generate --project "5. Dyatlov Pass"

# Media scripts (CLIP requires GPU conda env)
C:/Users/iorda/miniconda3/envs/perception-models/python.exe media/embed.py --input projects/5/media/downloads/
C:/Users/iorda/miniconda3/envs/perception-models/python.exe media/search.py --query "snowy mountain pass" --project "5. Dyatlov Pass"

# Media scripts (non-GPU)
python media/ia_search.py "Dyatlov Pass 1959"
python media/discover.py --project "5. Dyatlov Pass"
python media/download.py --leads projects/5/media/media_leads.json
```

**GPU script convention:** Any agent that needs CLIP (asset-processor, asset-curator) must use the full conda Python path. Encode this in the agent's system prompt and as a `.claude/rules/` path-specific rule.

### MCP Server Integration

Configure in `.mcp.json` at project root:

```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@context7/mcp"]
    }
  }
}
```

Agents that need web research (researcher, market-analyst, visual-researcher) should have access to search-capable MCP servers or the built-in WebSearch/WebFetch tools. Scope MCP servers to specific agents via the `mcpServers` frontmatter field when they should not be available to all agents.

### Channel Identity Integration

Channel identity documents (`channel/channel.md`, `channel/voice-profile.md`, `channel/VISUAL_STYLE_GUIDE.md`) are referenced via `@` import syntax in CLAUDE.md:

```markdown
# CLAUDE.md

## Channel Identity
@channel/channel.md
@channel/voice-profile.md
@channel/VISUAL_STYLE_GUIDE.md
```

This loads channel context into every session. For agents that need specific docs, inject them via the `skills` frontmatter or reference them in the agent's system prompt.

---

## Patterns to Follow

### Pattern 1: Explicit Context Handoff

**What:** When invoking a subagent for a pipeline step, the main session must include all relevant context from previous steps in the invocation prompt. Subagents have zero implicit knowledge of what happened before them.

**When:** Every subagent invocation that depends on prior pipeline output.

**Example:**
```
@writer Generate a documentary script for project "5. Dyatlov Pass".

Context from research phase:
- Research dossier: projects/5. Dyatlov Pass/research/Research.md
- Entity index: projects/5. Dyatlov Pass/research/entity_index.json
- Topic brief: projects/5. Dyatlov Pass/topic_brief.json

Requirements:
- Follow the channel voice profile
- 8-12 minute target runtime
- Include chapter markers for DaVinci Resolve
```

### Pattern 2: Agent Memory as Institutional Knowledge

**What:** Every agent uses `memory: project` to maintain a persistent MEMORY.md. Over time, this accumulates domain expertise that improves agent performance across sessions.

**When:** All agents, always.

**How it works in Claude Code:**
- Setting `memory: project` creates `.claude/agent-memory/<agent-name>/MEMORY.md`
- First 200 lines of MEMORY.md auto-inject into the agent's system prompt at startup
- Agent can read/write additional files in its memory directory
- The agent's system prompt should instruct it to consult and update memory

**Migration from Pi V5:** The YAML mental model files (`expertise/*-mm.yaml`) map directly to MEMORY.md files. Seed each agent's MEMORY.md with the structure from V5:

```markdown
# Visual Planner Memory

## Key Files
- shotlist schema: projects/*/visuals/shotlist.json
- visual style guide: channel/VISUAL_STYLE_GUIDE.md

## Decisions
- [timestamp] Adopted 5-register visual classification system

## Patterns
- Prelinger archive downloads often have aspect ratio issues (sig from asset-processor)
- Cartoon b-roll improves retention in chapters with dense exposition

## Open Questions
- Optimal ratio of curate vs find shots for 10-minute videos?
```

### Pattern 3: Feedback Signal Accumulation

**What:** Downstream agents write structured feedback. Upstream agents read it at task start. Agent memory captures recurring patterns.

**When:** After every pipeline execution where an agent notices a quality issue or improvement opportunity.

**Protocol:** See the detailed feedback propagation system section above.

### Pattern 4: Skills as Shared Procedures

**What:** Procedures that multiple agents share (like feedback propagation, structured output formatting) are defined as skills in `.claude/skills/` and injected into agents via the `skills` frontmatter field.

**When:** A procedure is used by 2+ agents.

**Key difference from Pi V5:** In Pi, skills were referenced by path and loaded on demand. In Claude Code, skills listed in `skills` frontmatter are injected at startup (full content into context). This means skills should be concise (< 100 lines each) to avoid bloating context.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Trying to Make Subagents Spawn Subagents

**What:** Attempting to have a "lead" subagent dispatch "worker" subagents.
**Why bad:** Claude Code explicitly prevents this. Subagents cannot spawn other subagents. Trying to work around this creates confusing failures.
**Instead:** Main session dispatches all agents. Leads serve as planning/synthesis consultants, not dispatchers.

### Anti-Pattern 2: Monolithic CLAUDE.md

**What:** Putting all 17 agent descriptions, all pipeline procedures, all channel identity, and all rules into a single CLAUDE.md.
**Why bad:** CLAUDE.md is loaded into every session. Exceeding 200 lines reduces adherence. Huge context wastes tokens.
**Instead:** Use modular structure: CLAUDE.md for routing rules only, `.claude/rules/` for path-specific rules, `skills/` for procedures, agent definitions carry their own instructions.

### Anti-Pattern 3: Agent Teams for Sequential Pipeline

**What:** Using the experimental Agent Teams feature for a documentary production pipeline.
**Why bad:** Agent Teams are designed for parallel exploration (multiple agents investigating simultaneously). A documentary pipeline is fundamentally sequential (research must finish before scripting starts). Agent Teams add coordination overhead, use dramatically more tokens, have session resumption issues, and do not work well on Windows.
**Instead:** Use subagents with user-triggered stage transitions.

### Anti-Pattern 4: Relying on Agent Memory Alone for Feedback

**What:** Only using agent memory (MEMORY.md) for cross-agent feedback, without project-specific feedback files.
**Why bad:** Agent memory is agent-scoped. Agent A cannot read Agent B's memory. Cross-agent signals need a shared location.
**Instead:** Use `projects/N/feedback/upstream-signals.json` for project-specific signals (readable by any agent), and agent memory for each agent's accumulated general knowledge.

### Anti-Pattern 5: Over-Scoping Agent Tools

**What:** Giving every agent access to every tool.
**Why bad:** Agents may take actions outside their domain. A researcher might try to edit scripts. A compiler might modify research files.
**Instead:** Explicit tool allowlists per agent. Read-only agents get `Read, Grep, Glob`. Writers get `Read, Write, Edit, Bash, Grep, Glob`. Only agents that need Python get `Bash`.

---

## CLAUDE.md Orchestration Design

The main session's CLAUDE.md replaces Pi's orchestrator agent. It should contain:

```markdown
# Channel-Automation V0.6

## Project
Dark mysteries documentary video production pipeline.

## Channel Identity
@channel/channel.md

## Pipeline Routing

When the user requests work, route to the appropriate agent:

| Request Pattern | Invoke Agent |
|-----------------|-------------|
| Competitor analysis, trends, topic generation | @strategy-lead |
| Research a topic, deep-dive, source analysis | @researcher (or @editorial-lead for complex) |
| Write/generate a script | @writer (or @editorial-lead for complex) |
| Extract narrator style | @style-extractor |
| Visual planning, shotlist generation | @visual-planner (or @media-lead for complex) |
| Find/discover visual assets | @visual-researcher |
| Process/embed assets (CLIP) | @asset-processor |
| Evaluate/curate assets | @asset-curator |
| Compile edit sheet | @compiler |
| Pipeline review, improvements | @meta-lead |

## Pipeline Stages and Human Checkpoints

This is a user-driven pipeline. Do NOT auto-advance between stages.

Human checkpoints (must pause and present for review):
1. After topic generation -- present briefs, wait for selection
2. After asset processing -- present candidates, wait for approval

## Context Handoff Rules

When invoking agents for pipeline steps, ALWAYS include:
1. The project path (projects/N. [Title]/)
2. References to input files from previous steps
3. Any relevant feedback signals from projects/N/feedback/

## GPU Script Convention

Scripts requiring CLIP must use:
C:/Users/iorda/miniconda3/envs/perception-models/python.exe

All other Python scripts use the default python.
```

---

## Suggested Build Order

Based on dependency analysis, the recommended implementation order:

### Phase 1: Foundation (Build First)
1. Directory structure creation
2. CLAUDE.md with routing rules
3. Channel identity documents (migrate from V5)
4. `.mcp.json` configuration
5. 2-3 agent definitions as proof of concept (researcher, writer, one lead)
6. Basic agent memory setup (`memory: project` on each)

**Why first:** Everything else depends on the directory structure, CLAUDE.md routing, and agent definition format being correct. Start with a vertical slice (editorial pipeline: researcher -> writer) to validate the pattern.

### Phase 2: Agent Migration (All 16 Agents)
7. Migrate all lead agent definitions (4 leads)
8. Migrate all worker agent definitions (12 workers)
9. Seed agent memory from V5 mental model YAML files
10. Migrate skill procedures to `.claude/skills/`

**Why second:** Once the pattern is validated with 2-3 agents, the remaining 13 are mechanical migration.

### Phase 3: Domain Enforcement
11. Hook scripts for domain validation (PreToolUse)
12. Path-specific rules in `.claude/rules/`
13. Tool scoping verification (test each agent's boundaries)

**Why third:** Domain enforcement is a safety layer. Get agents working first, then constrain them.

### Phase 4: Feedback Propagation
14. Feedback signal file format and `upstream-signals.json` schema
15. `feedback-propagation.md` skill
16. Inject skill into all agent definitions
17. Test feedback flow: asset-processor -> visual-planner

**Why fourth:** This is the most architecturally novel feature. It needs working agents to test against.

### Phase 5: Pipeline Integration
18. Python script invocation testing (all strategy/editorial/media scripts)
19. GPU conda env validation (CLIP scripts)
20. End-to-end pipeline test: topic -> research -> script -> visuals -> assets -> edit sheet

**Why last:** Integration testing requires all components to be in place.

---

## Sources

- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents) -- HIGH confidence (official documentation)
- [Orchestrate teams of Claude Code sessions - Claude Code Docs](https://code.claude.com/docs/en/agent-teams) -- HIGH confidence (official documentation)
- [How and when to use subagents in Claude Code](https://claude.com/blog/subagents-in-claude-code) -- HIGH confidence (Anthropic blog)
- [How Claude remembers your project - Claude Code Docs](https://code.claude.com/docs/en/memory) -- HIGH confidence (official documentation)
- [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks) -- HIGH confidence (official documentation)
- [GSD Framework - github.com/gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) -- MEDIUM confidence (community framework, well-established)
- [Claude Code Agent Patterns - claudefast.com](https://claudefa.st/blog/guide/agents/agent-patterns) -- MEDIUM confidence (third-party analysis)
- [aaddrick/claude-pipeline](https://github.com/aaddrick/claude-pipeline) -- MEDIUM confidence (community reference architecture)
- [technioz/claude-agents](https://github.com/technioz/claude-agents) -- MEDIUM confidence (community reference)
- [lst97/claude-code-sub-agents](https://github.com/lst97/claude-code-sub-agents) -- MEDIUM confidence (community reference)

# Phase 3: Agent Migration & Memory - Research

**Researched:** 2026-04-10
**Domain:** Claude Code agent definitions, V5-to-V0.6 persona migration, persistent memory seeding
**Confidence:** HIGH

## Summary

Phase 3 creates 10 new agent definitions, updates 2 existing agents (researcher, writer), seeds all 12 agents with persistent MEMORY.md files, and updates config.json to map skills to all 12 agents. The core work is content adaptation -- translating V5 agent bodies into Claude Code agent markdown format while preserving battle-tested domain expertise.

All 17 V5 expertise YAML files (mental models) are empty initial seeds with no accumulated knowledge. The actual domain content for MEMORY.md seeding comes from (a) V5 agent body `.md` files which contain procedures, instructions, and domain expertise, and (b) V5 read-only expertise files which contain operational guides, scoring rubrics, and reference material. MEMORY.md files should be seeded with key_files, decisions, and patterns extracted from these V5 sources, stripped of V5-specific artifacts (Pi CLI references, `.pi/` paths, `{{SESSION_DIR}}` variables, delegation chains, footer UI patterns).

The established agent definition pattern from Phase 1 (researcher.md, writer.md) provides the exact template: YAML frontmatter with `name`, `description`, `model: sonnet`, `memory: project`, `color`, `skills: [agent-protocols, ...]`, followed by `<project_context>` block, Identity section, Channel Context via `@file`, Procedures, and Output Format. Each new agent follows this pattern with domain-specific content adapted from V5.

**Primary recommendation:** Build agents in domain groups (Strategy, Editorial, Media, Meta) with memory seeding as part of each agent's creation task -- not as a separate pass. Update config.json last after all agents exist.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Final roster is 12 agents (down from 17 in V5). 10 new agents to build, 2 existing agents to update.
- **D-02:** Media-lead dropped entirely -- pure coordination role with no unique domain expertise. Coordination logic becomes a Phase 4 pipeline skill.
- **D-03:** Editorial-lead is a quality gating agent only -- focused on research quality review and editorial standards. Pipeline coordination moves to Phase 4 pipeline skills. This aligns with Phase 2 D-07 (lead coordination -> pipeline skills).
- **D-04:** Meta scope split into two agents: **meta** (meta-lead + pipeline-observer + ux-improver) and **code-reviewer** (standalone). Code review is distinct enough to warrant its own focused agent.
- **D-05:** Orchestrator dropped (Phase 1 D-01 -- user-invoked only, no auto-dispatch).
- **D-06:** Rich personas for ALL agents -- distinct identity paragraph, domain boundaries, explicit "you do NOT do X" guardrails. Consistent with the researcher/writer pattern from Phase 1.
- **D-07:** Adapt V5 agent bodies as the PRIMARY source for V0.6 personas. Start from V5 `.md` files, adapt procedures/persona to Claude Code format. Preserve battle-tested domain expertise. Rewrite only what doesn't fit the new system.
- **D-08:** Consolidated agents present as unified experts -- one coherent specialist per agent, no internal domain splits.
- **D-09:** Merge all V5 expertise YAMLs for each agent, dedupe. Consolidated agents combine all source YAMLs into one MEMORY.md. Remove duplicates and contradictions across merged sources.
- **D-10:** Strip V5-specific content during conversion -- remove Pi CLI references, `.pi/` paths, delegation chains, footer UI patterns, and other V5-only system artifacts. Keep domain knowledge (channel insights, research patterns, quality criteria, observations).
- **D-11:** Insight lifecycle rules (merge at 20+ entries, promote to SKILL.md at 3+ convergence) remain as behavioral instructions in agent-protocols only. Agent self-manages. No validation script or automation.
- **D-12:** Phase 3 updates researcher and writer to inject domain skills from config.json into their `skills:` frontmatter. All 12 agents leave Phase 3 fully configured with their skill mappings.
- **D-13:** Researcher and writer MEMORY.md files reseeded from V5 expertise YAML using the same merge-all-dedupe-strip strategy. Replaces the current minimal seeds.
- **D-14:** config.json `agent_skills` mapping updated to include all 12 agents (adding editorial-lead, style-extractor, code-reviewer, compiler).

### Claude's Discretion
- Exact agent body line counts (target ~120-200 but adjust based on content needs)
- `tools:` field contents per agent (which tools each agent gets access to)
- Specific channel docs (`@file` references) per agent based on domain relevance
- Order of agent creation within plans
- MEMORY.md section content during V5 YAML conversion (judgment calls on what to keep/strip)
- Skill assignments for the 4 new config.json entries (editorial-lead, style-extractor, code-reviewer, compiler)

### Deferred Ideas (OUT OF SCOPE)
- Pipeline coordination skills (`/research`, `/write-script`, `/visual-plan`, `/process-assets`, `/compile`) -- Phase 4
- Domain enforcement hooks (PreToolUse blocking unauthorized writes) -- Phase 4
- Session logging hooks (PostToolUse capturing delegations) -- Phase 4
- `/audit-agents` validation skill -- Phase 4
- SIGNALS.md cross-agent feedback system -- Phase 5
- Verification gates at pipeline boundaries -- Phase 5
- Python script migration from V5 to V0.6 -- Phase 6
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGNT-02 | Strategy agent (consolidated: Strategy Lead + Market Analyst) with full persona and tool scoping | V5 source files for both agents read; consolidation pattern documented; tool scoping research complete |
| AGNT-05 | Style Extractor agent for channel voice extraction from reference scripts | V5 source file read; extraction procedures and read-only expertise (extraction.md) available for adaptation |
| AGNT-06 | Editorial Lead agent for research quality gating and editorial coordination | V5 source file read; D-03 restricts to quality gating only; coordination moves to Phase 4 |
| AGNT-07 | Visual Researcher agent for visual intent, mood-to-visual mapping, and primary resource gathering | V5 source file read; search-queries.md read-only expertise available |
| AGNT-08 | Visual Planner agent for shotlist generation, b-roll curation, and archive search | V5 source file read; youtube-evaluation.md read-only expertise available |
| AGNT-09 | Asset Processor agent for downloads, CLIP embeddings, semantic search, and relevance scoring | V5 source file read; operational-guide.md, pe-core-usage.md, scoring-guide.md, known-issues.md available |
| AGNT-10 | Asset Curator agent for global library management and cross-project asset deduplication | V5 source file read; domain knowledge about LanceDB, promotion criteria documented |
| AGNT-11 | Meta agent (consolidated: Meta Lead + Pipeline Observer + UX Improver) with pipeline health and code quality focus | V5 source files for all 3 agents read; D-04 separates code-reviewer as standalone |
| AGNT-12 | Compiler agent for edit sheet compilation and DaVinci Resolve preparation | V5 source file read; asset naming conventions and edit sheet format documented |
| AGNT-15 | Agent tool scoping -- each agent's `tools` field restricts capabilities to their domain | Tool scoping patterns researched; per-agent tool recommendations documented |
| MEMO-01 | Per-agent persistent memory via `memory: project` -- each agent gets `.claude/agent-memory/<name>/MEMORY.md` | Memory system verified in STACK.md; existing pattern from researcher/writer confirmed |
| MEMO-02 | MEMORY.md structured with key_files, decisions, patterns, observations, open_questions | Existing MEMORY.md structure confirmed in researcher/writer; template documented |
| MEMO-03 | Mental model instructions baked into each agent's system prompt (read at start, notice during work, update after work) | agent-protocols skill handles this; all agents get it via `skills: [agent-protocols]` |
| MEMO-04 | Seed initial MEMORY.md files by converting existing V5 YAML expertise files to markdown | All 17 V5 YAML files confirmed empty; seeding must come from V5 agent bodies + read-only expertise files instead |
| MEMO-05 | Per-skill insights.md learning loop -- each skill appends one-line insights per run, reads at next run start | Already implemented in Phase 2; agent-protocols skill covers the protocol |
| MEMO-06 | Insight lifecycle management -- merge at 20+ entries, promote to SKILL.md at 3+ convergence | Codified in agent-protocols skill; D-11 confirms no automation -- agent self-manages |
| MEMO-07 | Exemplar curation slots in each skill's references/ directory (2-3 max per skill) | Optional per Phase 2 D-10; references/ directories exist but are not required to be populated |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Windows 11, RTX 4070 8GB VRAM** -- all file operations use Node.js `path` module, never `test -d`/`test -f`
- **No bash-only syntax** -- use PowerShell-compatible commands or Node.js one-liners for cross-platform safety
- **Project path has spaces and periods** -- use `path.resolve()`, never hardcode paths
- **Filenames: colons illegal on Windows** -- timestamps use dashes
- **GPU scripts** use conda env at `C:/Users/iorda/miniconda3/envs/perception-models/python.exe`
- **Subagents do NOT inherit CLAUDE.md** -- each agent has a `<project_context>` block instructing it to Read `./CLAUDE.md`
- **Shared behavioral protocols** injected via the `agent-protocols` skill in each agent's `skills:` field
- **User-invoked only** -- no auto-routing, no auto-dispatch

## Architecture Patterns

### Agent Definition Template (Established in Phase 1)

Every agent `.md` file in `.claude/agents/` follows this structure:

```markdown
---
name: agent-name
description: >-
  Multi-line description of what this agent does and when to invoke it.
  Include enough context for Claude to auto-delegate when appropriate.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
memory: project
color: blue
skills:
  - agent-protocols
  - domain-skill-1
  - domain-skill-2
---

<project_context>
Read ./CLAUDE.md for project-wide rules, platform constraints, and agent reference table.
</project_context>

# Agent Display Name

## Identity

[Rich persona paragraph: who you are, what you do, what you do NOT do.
Explicit domain boundaries and guardrails.]

## Channel Context

@channel/channel.md
@channel/voice-profile.md  (only if relevant to this agent)

## [Domain-Specific Procedures]

[Core procedures adapted from V5 agent body]

## Python Scripts Available

[Script invocation details -- marked as "may not yet be fully connected in V0.6"]

## File Conventions

[Where this agent reads from and writes to]

## Task Classification

[DETERMINISTIC vs HEURISTIC tagging for subtasks]
```

[VERIFIED: existing researcher.md and writer.md in `.claude/agents/`]

### V5-to-V0.6 Adaptation Pattern

Each V5 agent `.md` file maps to the V0.6 template as follows:

| V5 Element | V0.6 Equivalent | Transformation |
|------------|-----------------|----------------|
| YAML `name:` | Frontmatter `name:` | Keep as-is (lowercase-hyphenated) |
| YAML `model:` | Frontmatter `model: sonnet` | All workers use `sonnet` |
| YAML `expertise:` (updatable) | `memory: project` + MEMORY.md | Empty YAMLs -> seed from agent body content |
| YAML `expertise:` (read-only) | Inline in agent body OR skill | Domain knowledge absorbed into persona/procedures |
| YAML `skills:` | Frontmatter `skills: [...]` | V0.6 skills from config.json mapping |
| YAML `tools:` | Frontmatter `tools:` | Map Pi tool names to Claude Code tool names |
| YAML `domain:` | No direct equivalent | Instruction-level ("write only to X") in Phase 3; hooks in Phase 4 |
| `{{SESSION_DIR}}` | Remove entirely | Claude Code manages session state natively |
| `{{CONVERSATION_LOG}}` | Remove entirely | Not applicable in Claude Code |
| `{{EXPERTISE_BLOCK}}` / `{{SKILLS_BLOCK}}` | Remove entirely | Skills injected via frontmatter, memory via `memory: project` |
| `## Purpose` | `## Identity` | Expand into rich persona with guardrails |
| `## Instructions` | Domain-specific procedure sections | Adapt, preserve domain logic |
| Delegation rules | Remove | Subagents cannot delegate in Claude Code |

[VERIFIED: V5 agent files examined at `D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V5/.pi/multi-team/agents/`]

### Consolidation Mapping

Three agents require consolidation of multiple V5 sources:

**Strategy** (strategy-lead + market-analyst):
- V5 strategy-lead: coordination, topic synthesis, scoring rationale
- V5 market-analyst: scraping, statistical analysis, data visualization, topic brief scoring
- V0.6 strategy: unified expert who does both -- runs scripts, produces analysis, generates scored topic briefs
- Read-only expertise to absorb: `topic-generation.md` (scoring rubric), `trends-analysis.md`

**Meta** (meta-lead + pipeline-observer + ux-improver):
- V5 meta-lead: coordination, improvement proposal synthesis, approval tracking
- V5 pipeline-observer: cross-team pattern detection, bottleneck analysis, cost tracking
- V5 ux-improver: output usability review, edit sheet readability, checkpoint UX
- V0.6 meta: unified pipeline health expert -- observes, reviews UX, proposes improvements
- Note: code-reviewer is SEPARATE per D-04

**Code-Reviewer** (standalone from V5 code-reviewer):
- 1:1 mapping, no consolidation needed
- Read-only expertise to absorb: autoresearch patterns from V5 skill reference

[VERIFIED: CONTEXT.md D-01, D-04 define these consolidations]

### Tool Scoping Recommendations

Per AGNT-15, each agent's `tools` field restricts capabilities to its domain:

| Agent | Recommended Tools | Rationale |
|-------|-------------------|-----------|
| strategy | Read, Write, Edit, Bash, Grep, Glob | Needs Bash for Python scripts, Write for topic briefs and project init |
| style-extractor | Read, Write, Edit, Grep, Glob | No Bash needed -- reads scripts, writes style profiles. No Python scripts |
| editorial-lead | Read, Grep, Glob | Quality gating is read-only review. No writes (sends feedback verbally to user). No Bash |
| visual-researcher | Read, Write, Edit, Bash, Grep, Glob | Bash for crawl_images.py, wiki_screenshots.py; Write for visual_brief.json, media_leads.json |
| visual-planner | Read, Write, Edit, Bash, Grep, Glob | Bash for ia_search.py; Write for shotlist.json |
| asset-processor | Read, Write, Edit, Bash, Grep, Glob | Bash critical for embed.py, search.py, download.py (GPU scripts) |
| asset-curator | Read, Write, Edit, Bash, Grep, Glob | Bash for catalog queries; Write for library_matches.json |
| meta | Read, Write, Edit, Bash, Grep, Glob | Needs broad read access + Write for improvement proposals |
| code-reviewer | Read, Write, Edit, Bash, Grep, Glob | Bash for running tests and scripts; Write/Edit for implementing fixes |
| compiler | Read, Write, Edit, Bash, Grep, Glob | Bash for organize_assets.py; Write for edit_sheet.md |

Note: editorial-lead is the only agent restricted to read-only tools because its role is quality gating (reviewing outputs and providing verbal feedback), not producing artifacts.

[ASSUMED: Tool assignments are discretionary per CONTEXT.md. Editorial-lead read-only is a judgment call based on D-03 quality-gating scope]

### Skill-to-Agent Mapping (config.json update)

Current config.json has 8 agents mapped. Phase 3 adds 4 more and may adjust existing ones:

| Agent | Skills (from config.json + new) |
|-------|-------------------------------|
| researcher | agent-protocols, documentary-research, archive-search, crawl4ai-scraping |
| writer | agent-protocols, documentary-research, structured-output |
| strategy | agent-protocols, data-analysis, structured-output |
| style-extractor | agent-protocols |
| editorial-lead | agent-protocols, documentary-research |
| visual-researcher | agent-protocols, visual-narrative, archive-search, crawl4ai-scraping |
| visual-planner | agent-protocols, visual-narrative, archive-search, media-evaluation |
| asset-processor | agent-protocols, media-evaluation |
| asset-curator | agent-protocols, media-evaluation |
| meta | agent-protocols, autoresearch, structured-output |
| code-reviewer | agent-protocols, autoresearch |
| compiler | agent-protocols, structured-output |

[ASSUMED: New agent skill assignments based on domain analysis of V5 agent roles and available V0.6 skills]

### Color Assignments

Each agent needs a unique `color` from the 8 available: red, blue, green, yellow, purple, orange, pink, cyan.

| Agent | Color | Rationale |
|-------|-------|-----------|
| researcher | blue | Established in Phase 1 |
| writer | green | Established in Phase 1 |
| strategy | yellow | Strategy/analysis feel |
| style-extractor | pink | Creative/voice domain |
| editorial-lead | red | Quality gating, authority |
| visual-researcher | cyan | Visual/media domain |
| visual-planner | purple | Visual/creative planning |
| asset-processor | orange | Processing/execution |
| asset-curator | orange | Same domain as processor (reuse ok -- only 8 colors for 12 agents) |
| meta | red | Authority/oversight (reuse ok) |
| code-reviewer | yellow | Analysis (reuse ok) |
| compiler | cyan | Media domain (reuse ok) |

[ASSUMED: Color choices are discretionary. Only 8 colors for 12 agents means some reuse is inevitable]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Memory persistence | Custom file-based state management | `memory: project` frontmatter field | Claude Code natively manages MEMORY.md creation, auto-injection of first 200 lines, and Read/Write tool enablement |
| Skill injection | Custom loading mechanism | `skills: [skill-name]` in agent frontmatter | Claude Code injects full skill content at startup automatically |
| Agent invocation routing | Orchestrator agent with routing logic | User directly types `@agent-name` | Phase 1 D-01: user-invoked only, no auto-dispatch |
| Memory update protocol | Custom script to manage memory writes | agent-protocols skill | Already built in Phase 1; handles read-at-start, append-after-work |
| Insight lifecycle automation | Scripts to count/merge/promote insights | Behavioral instructions in agent-protocols | D-11: agent self-manages, no validation script |

## Common Pitfalls

### Pitfall 1: V5-Specific Artifacts Leaking into V0.6
**What goes wrong:** Agent bodies contain `{{SESSION_DIR}}`, `.pi/multi-team/` paths, `delegate` tool references, or active-listener skill references.
**Why it happens:** Copy-paste from V5 without careful adaptation.
**How to avoid:** Strip ALL of: `{{SESSION_DIR}}`, `{{CONVERSATION_LOG}}`, `{{EXPERTISE_BLOCK}}`, `{{SKILLS_BLOCK}}`, `.pi/` paths, Pi-specific skills (active-listener, conversational-response, zero-micro-management, precise-worker, verification-first), `delegate` tool, domain enforcement YAML blocks.
**Warning signs:** Agent references files at `.pi/multi-team/scripts/` instead of `strategy/`, `editorial/`, or `media/`.

### Pitfall 2: Delegation Language in Agent Bodies
**What goes wrong:** Agent body says "Delegate to Market Analyst when..." or "Report findings to your lead."
**Why it happens:** V5 had 3-tier delegation (orchestrator -> lead -> worker). Claude Code subagents cannot spawn subagents.
**How to avoid:** Remove ALL delegation instructions. Replace with direct action: "Run the scraping scripts yourself" instead of "Delegate scraping to Market Analyst."
**Warning signs:** Words like "delegate", "report to", "your lead", "hand off to" in agent body.

### Pitfall 3: Conflicting Consolidation Content
**What goes wrong:** Strategy agent has contradictory instructions because strategy-lead said "never run scripts" while market-analyst said "run all scripts yourself."
**Why it happens:** Mechanical merge of two V5 agent bodies without resolving conflicts.
**How to avoid:** D-08 requires "unified expert" presentation. When merging, resolve conflicts in favor of the more capable role (the agent should DO the work, not delegate it).
**Warning signs:** "You do not run scripts" alongside script invocation instructions.

### Pitfall 4: Empty MEMORY.md Seeds Disguised as Content
**What goes wrong:** MEMORY.md contains only the section headers with "(none yet)" placeholders, providing no useful domain knowledge at startup.
**Why it happens:** The V5 expertise YAMLs are all empty initial seeds. If you just convert YAML to markdown, you get empty sections.
**How to avoid:** Seed MEMORY.md from V5 agent body content and read-only expertise files, NOT from the empty expertise YAMLs. Extract key_files (what files this agent reads/writes), patterns (operational knowledge from read-only guides), and decisions (established conventions from the V5 body).
**Warning signs:** MEMORY.md with 5 headers and all "(none yet)" placeholders.

### Pitfall 5: CLAUDE.md Agent Reference Table Not Updated
**What goes wrong:** New agents exist in `.claude/agents/` but CLAUDE.md still says "(Phase 3)" next to them, or lists old agent names like `@strategy-lead`.
**Why it happens:** CLAUDE.md update forgotten as a final step.
**How to avoid:** Include CLAUDE.md agent reference table update as the final task in the plan. Update agent names (e.g., `@strategy-lead` -> `@strategy`) and remove "(Phase 3)" markers.
**Warning signs:** CLAUDE.md references agents that don't exist or marks existing agents as future.

### Pitfall 6: Forgetting to Update Existing Agent skills: Field
**What goes wrong:** Researcher and writer still have `skills: [agent-protocols]` without their domain skills from config.json.
**Why it happens:** Focus on new agents, forgetting D-12 requires existing agent updates too.
**How to avoid:** D-12 explicitly requires updating researcher and writer to inject domain skills. Add task to update their `skills:` frontmatter per config.json mapping.
**Warning signs:** Researcher agent lacks `documentary-research`, `archive-search`, `crawl4ai-scraping` in skills field.

## Code Examples

### New Agent Definition (Strategy -- Consolidated)

```markdown
---
name: strategy
description: >-
  Performs competitor analysis, trend detection, topic generation, and project
  initialization for the documentary channel. Runs Python scraping and analysis
  scripts, produces scored topic briefs, and scaffolds new project directories.
  Invoke when the user needs competitive intelligence or topic recommendations.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
memory: project
color: yellow
skills:
  - agent-protocols
  - data-analysis
  - structured-output
---

<project_context>
Read ./CLAUDE.md for project-wide rules, platform constraints, and agent reference table.
</project_context>

# Strategy Expert

## Identity

You are the strategy expert for a dark mysteries YouTube channel. You combine
competitive intelligence, statistical analysis, and content strategy into a
single capability. You scrape competitor channels, analyze trends, generate
scored topic briefs, and initialize new video projects.

You do not conduct documentary research. You do not write scripts. You do not
handle visual assets. Your domain is market position, topic selection, and
project setup.

## Channel Context

@channel/channel.md

## [Procedures adapted from V5 strategy-lead + market-analyst bodies...]
```

[VERIFIED: Pattern matches established researcher.md and writer.md structure]

### MEMORY.md Seed Template (with Domain Content)

```markdown
# Strategy Memory

## Key Files
- Competitor database: data/channel_assistant.db (SQLite)
- Topic briefs output: strategy/topic_briefs.md
- Channel DNA: channel/channel.md
- Past topics: channel/past_topics.md
- Analysis output: strategy/competitors/analysis.md
- Scraping scripts: strategy/cli.py (add, scrape, analyze, topics, init)

## Decisions
- [2026-04-10] Topics scored across 5 dimensions: obscurity, complexity, shock factor, verifiability, pillar fit
- [2026-04-10] Topic briefs always produce exactly 5 candidates ranked by total score descending
- [2026-04-10] Near-duplicates tagged and included, never silently dropped

## Patterns
- [2026-04-10] Underserved topic clusters from competitor analysis are highest-value generation targets
- [2026-04-10] Cross-product entity queries (person + institution) surface less-discovered topics than single-entity searches
- [2026-04-10] Channels with < 1K subscribers AND AI content signals indicate content farm saturation, not genuine coverage

## Observations
(none yet)

## Open Questions
(none yet)
```

[VERIFIED: Structure matches existing researcher/writer MEMORY.md format; content sourced from V5 agent bodies and read-only expertise]

### Updated Existing Agent Frontmatter (Researcher)

```yaml
---
name: researcher
description: >-
  Conducts deep documentary research on dark history, true crime, and unsolved
  mystery topics. Produces research dossiers with sourced claims and entity
  indexes. Invoke when the user asks to research a topic for a documentary.
model: sonnet
memory: project
color: blue
skills:
  - agent-protocols
  - documentary-research
  - archive-search
  - crawl4ai-scraping
---
```

[VERIFIED: Skills from config.json agent_skills.researcher]

## MEMORY.md Seeding Strategy

### Source Material Inventory

All 17 V5 expertise YAML files (`*-mm.yaml`) are **empty initial seeds** -- they contain only skeleton headers with empty arrays. There is zero accumulated runtime knowledge in any of them.

The actual domain knowledge available for seeding comes from:

| Source Type | Location | Content | Agents That Use |
|-------------|----------|---------|-----------------|
| V5 agent body `.md` files | `.pi/multi-team/agents/*.md` | Procedures, domain rules, quality criteria | All 12 agents |
| V5 read-only expertise | `.pi/multi-team/expertise/read-only/` | Operational guides, scoring rubrics, extraction rules | Subset of agents |

### V5 Read-Only Expertise -> MEMORY.md Mapping

| Read-Only File | Target Agent | Content for MEMORY.md |
|----------------|-------------|----------------------|
| topic-generation.md | strategy | Scoring rubric anchors, generation anti-patterns |
| trends-analysis.md | strategy | Trend interpretation framework |
| extraction.md | style-extractor | Auto-caption detection signals, reconstruction rules |
| survey-evaluation.md | researcher | Source evaluation criteria, verdict framework |
| synthesis.md | researcher | Dossier structure, entity index format |
| generation.md | writer | Hook formula, chapter structure rules |
| search-queries.md | visual-researcher | Entity cross-product query patterns |
| youtube-evaluation.md | visual-planner | Hard filters, AI content detection, scoring criteria |
| operational-guide.md | asset-processor | FFmpeg safety, embedding performance, memory budget |
| pe-core-usage.md | asset-processor | Model loading, VRAM budget, encode patterns |
| scoring-guide.md | asset-processor | Cosine similarity ranges, query refinement |
| known-issues.md | asset-processor | Known failure modes to check before pipeline runs |
| taxonomy-global.yaml | asset-curator | Global asset category taxonomy |

### Seeding Protocol Per Agent

For each agent's MEMORY.md:

1. **key_files**: Extract from V5 agent body -- which files does this agent read and write? Update paths from `.pi/multi-team/scripts/` to V0.6 paths (`strategy/`, `editorial/`, `media/`)
2. **decisions**: Extract established conventions from V5 agent body instructions (e.g., "Score across 5 dimensions", "4-7 chapters", "equilibrium rules")
3. **patterns**: Extract operational knowledge from V5 read-only expertise files that apply to this agent (scoring thresholds, failure patterns, query strategies)
4. **observations**: Start empty -- "(none yet)" -- observations accumulate from runtime
5. **open_questions**: Start empty or seed with genuine open questions identified from V5 content

[VERIFIED: All V5 expertise YAMLs confirmed empty via Read tool inspection of all 17 files]

## V5 Content Strip-List

The following V5-specific content MUST be removed during adaptation:

| Pattern | Example | Replacement |
|---------|---------|-------------|
| `{{SESSION_DIR}}` | `"{{SESSION_DIR}}"` | Remove entirely |
| `{{CONVERSATION_LOG}}` | `Read the conversation log` | Remove entirely |
| `{{EXPERTISE_BLOCK}}` | `### Expertise\n\n{{EXPERTISE_BLOCK}}` | Remove entire section |
| `{{SKILLS_BLOCK}}` | `### Skills\n\n{{SKILLS_BLOCK}}` | Remove entire section |
| `.pi/` paths | `.pi/multi-team/scripts/media/` | `media/` |
| `.pi/multi-team/expertise/` | (any reference) | Remove -- absorbed into skills/memory |
| Pi skills | `active-listener`, `conversational-response`, `zero-micro-management`, `precise-worker`, `verification-first`, `doc-sync-workflow`, `skill-observation` | Remove -- behavioral protocols replaced by `agent-protocols` skill |
| Delegation instructions | "Delegate to Market Analyst", "Report to your lead" | Remove -- agent does the work directly |
| `delegate` tool | `tools: [delegate]` | Remove from tools list |
| `domain:` YAML block | Path-based permissions | Remove -- instruction-level in body; hooks in Phase 4 |
| `## Variables` section | Session Dir, Conversation Log | Remove entire section |
| `model: anthropic/claude-opus-4-6` | Full model ID | `model: sonnet` (all workers) |

[VERIFIED: V5 agent files contain all these patterns -- confirmed via direct inspection]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in (no framework -- raw test scripts) |
| Config file | None -- tests are standalone `.js` files |
| Quick run command | `node tests/smoke-test-agents.js` |
| Full suite command | `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGNT-02 | Strategy agent exists with persona and tool scoping | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-05 | Style extractor agent exists with persona | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-06 | Editorial lead agent exists with persona | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-07 | Visual researcher agent exists | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-08 | Visual planner agent exists | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-09 | Asset processor agent exists | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-10 | Asset curator agent exists | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-11 | Meta agent exists with consolidated persona | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-12 | Compiler agent exists | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| AGNT-15 | Each agent has tools: field restricting capabilities | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| MEMO-01 | Each agent has `memory: project` in frontmatter | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| MEMO-02 | Each MEMORY.md has 5 standard sections | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| MEMO-03 | Each agent has `agent-protocols` in skills field | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| MEMO-04 | MEMORY.md files seeded with V5 content (not empty) | smoke | `node tests/smoke-test-agents.js` | Wave 0 |
| MEMO-05 | Insight lifecycle handled by agent-protocols skill | manual-only | N/A -- behavioral, verified by reading skill | N/A |
| MEMO-06 | Merge/promote rules in agent-protocols | manual-only | N/A -- behavioral, verified by reading skill | N/A |
| MEMO-07 | Exemplar curation is optional | manual-only | N/A -- structural choice, no test needed | N/A |

### Sampling Rate
- **Per task commit:** `node tests/smoke-test-agents.js`
- **Per wave merge:** `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/smoke-test-agents.js` -- covers AGNT-02/05-12/15, MEMO-01/02/03/04. Must validate: all 12 agent files exist, each has required frontmatter fields (name, description, model, memory: project, tools, skills with agent-protocols), each has MEMORY.md with 5 sections and non-empty key_files, no V5 paths in agent bodies, CLAUDE.md agent reference table updated

## State of the Art

| Old Approach (V5 Pi) | Current Approach (V0.6 Claude Code) | Impact |
|----------------------|--------------------------------------|--------|
| 17 separate agents with 3-tier delegation | 12 agents, flat user-invoked model | Simpler, no delegation chains to maintain |
| YAML expertise files (updatable) | `memory: project` + MEMORY.md | Claude Code native, auto-injected at startup |
| Read-only expertise files (domain knowledge) | Absorbed into agent body + skills | Domain knowledge inline, not external reference |
| `domain:` path-based read/write/delete permissions | `tools:` field + instruction-level boundaries | Phase 3 instruction-based; Phase 4 adds hooks |
| `{{VARIABLE}}` template resolution engine | Not needed -- Claude Code handles state natively | Remove all template variables |
| Pi skill system (path-based, loaded on demand) | `skills:` frontmatter (injected at startup) | Full content loaded, not on-demand |
| Active listener (read conversation log) | Not applicable (subagent isolation) | Context passed forward via invocation prompt |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Editorial-lead should be restricted to read-only tools (Read, Grep, Glob) based on quality-gating role | Tool Scoping | Low -- if editorial-lead needs Write, adding it later is trivial |
| A2 | Skill assignments for 4 new config.json entries (editorial-lead, style-extractor, code-reviewer, compiler) | Skill Mapping | Low -- config.json is easily updated; skill list can be adjusted |
| A3 | Color assignments for 12 agents with only 8 available colors | Color Assignments | None -- colors are visual only, reuse is acceptable |
| A4 | MEMORY.md seeds should come from V5 agent bodies + read-only expertise, not empty YAMLs | MEMORY.md Seeding | Medium -- if user expected YAML-to-markdown conversion as specified in D-09/D-13, they may question the approach. But empty YAML conversion produces empty MEMORY.md which violates the spirit of seeding |

## Open Questions

1. **MEMORY.md seeding from empty YAMLs**
   - What we know: D-09 says "Merge all V5 expertise YAMLs for each agent, dedupe." D-13 says researcher/writer "reseeded from V5 expertise YAML using the same merge-all-dedupe-strip strategy."
   - What's unclear: All 17 expertise YAMLs are empty. The decisions reference YAMLs, but the YAMLs have no content to merge. The read-only expertise files and agent body content are the actual knowledge sources.
   - Recommendation: Interpret D-09/D-13 as "seed MEMORY.md from all available V5 domain knowledge" rather than literally "convert empty YAML to empty markdown." The user's intent was clearly to preserve V5 expertise in MEMORY.md -- the expertise just happens to live in agent bodies and read-only files rather than the mental model YAMLs. Proceed with seeding from all V5 sources. Flag this interpretation to the user during planning.

2. **Editorial-lead write access**
   - What we know: D-03 says editorial-lead is "quality gating only." V5 editorial-lead had only read + delegate tools.
   - What's unclear: Should editorial-lead be able to write revision notes or quality reports to project directories?
   - Recommendation: Start read-only (Read, Grep, Glob). If the user needs it to write, adding tools is a one-line frontmatter change.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). Phase 3 is purely agent definition files (.md), memory files (.md), and config.json updates -- no external tools, services, or runtimes required.

## Sources

### Primary (HIGH confidence)
- V5 agent definition files at `D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V5/.pi/multi-team/agents/` -- all 17 files read
- V5 expertise YAML files at `D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V5/.pi/multi-team/expertise/` -- all 17 confirmed empty
- V5 read-only expertise files at `D:/Youtube/D. Mysteries Channel/1.2 Agents/Channel-Automation V5/.pi/multi-team/expertise/read-only/` -- 13 files cataloged
- `.planning/research/STACK.md` -- Claude Code agent frontmatter fields, memory system, skill injection
- `.planning/research/ARCHITECTURE.md` -- Agent definition template, domain enforcement patterns
- Existing agents: `.claude/agents/researcher.md`, `.claude/agents/writer.md` -- established pattern
- Existing memory: `.claude/agent-memory/researcher/MEMORY.md`, `.claude/agent-memory/writer/MEMORY.md` -- current seeds
- `.claude/skills/agent-protocols/SKILL.md` -- shared behavioral protocol
- `.planning/config.json` -- current agent_skills mapping

### Secondary (MEDIUM confidence)
- Phase 1 and Phase 2 CONTEXT.md files -- prior decisions constraining this phase

## Metadata

**Confidence breakdown:**
- Agent definition pattern: HIGH -- established template from Phase 1 with 2 working agents
- V5 adaptation: HIGH -- all 17 V5 source files read and analyzed
- Tool scoping: HIGH for most agents, MEDIUM for editorial-lead (judgment call on read-only)
- Memory seeding: HIGH on approach, MEDIUM on content quality (depends on adaptation judgment)
- Config updates: HIGH -- straightforward addition to existing mapping

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable -- agent definition format is unlikely to change)

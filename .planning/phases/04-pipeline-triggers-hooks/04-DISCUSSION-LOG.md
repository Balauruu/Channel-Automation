# Phase 4: Pipeline Triggers & Hooks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 04-pipeline-triggers-hooks
**Areas discussed:** Pipeline skill design, Domain enforcement, Session logging, Agent audit scope

---

## Pipeline Skill Design

| Option | Description | Selected |
|--------|-------------|----------|
| Agent-only mode | Agents use Claude's native capabilities, no Python scripts | ✓ |
| V5 path references | Point agents to V5 Python scripts directly | |
| Stub scripts | Placeholder scripts in V0.6 that call V5 | |

**User's choice:** Agent-only mode, but clarified that agents invoke skills (domain expertise), while pipeline commands invoke agents (workflow coordination).
**Notes:** User requested research on agent/skill relationship. Confirmed two-layer model: pipeline commands = workflow coordinators, agents = workers with injected domain skills.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Project directory convention | Stages read/write from projects/<name>/ | ✓ |
| Explicit handoff | Summary passed in delegation prompt | |
| You decide | Claude picks based on existing patterns | |

**User's choice:** Project directory convention
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-dispatch | Pipeline commands dispatch agents via Agent/Task tool | ✓ |
| Manual guidance | Pipeline commands tell user what to invoke | |
| Hybrid | Single-agent auto, multi-agent guided | |

**User's choice:** Auto-dispatch
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Present and pause | Runs agent, presents results, stops | ✓ |
| Confirm to continue | Asks Y/N to auto-advance | |
| You decide | Claude picks checkpoint approach | |

**User's choice:** Present and pause + guide to next step
**Notes:** User added: should also guide the user to what step comes next

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create | First command auto-creates projects/<name>/ | ✓ |
| /strategy creates it | Only /strategy creates project directory | |
| Separate /init | Dedicated /init command | |

**User's choice:** Auto-create
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single command | /strategy runs full pipeline | |
| Split sub-commands | Separate /strategy-scrape, etc. | |
| Both | Unified + sub-commands | ✓ |

**User's choice:** Both — single unified command + sub-commands for granular control
**Notes:** User explicitly wanted both options available

---

| Option | Description | Selected |
|--------|-------------|----------|
| Chain automatically | /visual-plan auto-chains 2 agents | ✓ |
| Two separate commands | /visual-research + /visual-plan | |
| You decide | Claude determines chaining | |

**User's choice:** Chain automatically
**Notes:** None

---

### Sub-command decisions by stage

| Stage | Sub-commands? | Rationale |
|-------|---------------|-----------|
| /research | No | 3-pass is agent's internal procedure |
| /write-script | No | Writer's internal process |
| /process-assets | Yes | Full command + /assets-download, /assets-embed, /assets-search, /assets-score |
| /visual-plan | No | Auto-chain handles sequencing |
| /compile | No | Single operation |

**Notes:** User wanted all multi-operation stages evaluated. Only /strategy and /process-assets warranted sub-commands.

---

## Domain Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Write operations only | Hook blocks writes outside allowed dirs | |
| Write + Bash | Also intercepts Bash write operations | |
| Full sandboxing | Write + Bash + restrict Read | |

**User's choice:** (Superseded — domain enforcement descoped entirely)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Path-based protection | Block writes to protected system paths | |
| Per-agent with env var | Set CLAUDE_AGENT env var, per-agent rules | |
| Skip domain enforcement | Defer — tools: field + instructions sufficient | ✓ |

**User's choice:** Skip domain enforcement
**Notes:** After research showing PreToolUse hooks can't natively identify the active agent, user decided the tools: frontmatter field + agent body instructions provide sufficient scoping. Deferred to Phase 6 if issues emerge.

---

## Session Logging

| Option | Description | Selected |
|--------|-------------|----------|
| Agent dispatches only | Log when agents are dispatched/completed | ✓ |
| All tool calls | Log every tool invocation | |
| Agent + Write operations | Log dispatches and file changes | |

**User's choice:** Agent dispatches only
**Notes:** Pipeline observability focus, not full audit trail

---

| Option | Description | Selected |
|--------|-------------|----------|
| Project root | logs/sessions.jsonl at project root | ✓ |
| Per-project directory | projects/<name>/session.jsonl | |
| .planning/ | Under .planning/ directory | |

**User's choice:** Project root
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Log start + end | PreToolUse + SubagentStop for duration tracking | ✓ |
| Start only | Only log dispatch events | |
| You decide | Claude determines best approach | |

**User's choice:** Log start + end
**Notes:** None

---

## Agent Audit Scope

| Check | Selected |
|-------|----------|
| Required frontmatter fields | ✓ |
| Tool scoping validity | ✓ |
| Skill references | ✓ |
| Memory setup | ✓ |

**User's choice:** All four validation checks
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-consistency | Check CLAUDE.md, config.json, orphan detection | ✓ |
| Individual only | Validate each agent file independently | |
| You decide | Claude determines cross-checks | |

**User's choice:** Cross-consistency checks
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Console report | Print pass/fail to terminal | |
| Report + fix suggestions | Console + actionable fix list | |
| Auto-fix mode | Detect + auto-fix | |
| Report + prompt to auto-fix | Report + suggestions + prompt for approved auto-fix | ✓ |

**User's choice:** Report with fix suggestions then a prompt to auto-fix approved changes
**Notes:** User combined options — report first, then offer auto-fix with user approval

---

## Claude's Discretion

- Pipeline command internal structure and formatting
- JSONL log schema details
- Audit report format and fix implementation
- Sub-command naming conventions
- Project directory structure

## Deferred Ideas

- Domain enforcement hooks (HOOK-01, HOOK-02) — deferred from Phase 4
- Python script invocation — Phase 6
- SIGNALS.md feedback propagation — Phase 5
- Verification gates — Phase 5

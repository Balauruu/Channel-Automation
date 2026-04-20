# Phase 1: Capture Hardening - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Battle-harden the observation hook to produce reliably valid JSONL from both main conversations and subagent events. Rewrite pipeline-observe.sh as pipeline-observe.js. The hook must capture all tool calls (main + subagent) to per-project obs.jsonl files with atomic writes, file rotation, and Windows path safety.

</domain>

<decisions>
## Implementation Decisions

### Script Architecture
- **D-01:** Pure JS rewrite (Node.js CommonJS) — `pipeline-observe.js` replaces `pipeline-observe.sh`. Matches existing hook convention (`check-memory-limit.js`). Eliminates bash+inline-Python escaping fragility. Node.js is guaranteed available (Claude Code runtime).
- **D-02:** Single file — all logic in one self-contained `pipeline-observe.js`. No helper modules. Matches project hook pattern.
- **D-03:** No legacy filter layers — all 5 bash filter layers (global disable, hook profile, cooperative skip, agent_id gate, path exclusions) are dropped. Clean slate.
- **D-04:** No secret scrubbing — regex scrubber dropped for simplicity. obs.jsonl is local-only, not shared.
- **D-05:** Keep project routing — per-project obs.jsonl directories preserved (`.claude/logs/observations/<project>/obs.jsonl`). The PROJECT.md "one file" decision was about not splitting user/subagent events into separate files, not about eliminating per-project directories.
- **D-06:** Old smoke tests deleted (deprecated version). Fresh test coverage at Claude's discretion during planning.

### Main Conversation Capture
- **D-07:** Capture everything — all tool calls (Read, Write, Bash, Grep, Glob, Agent, Edit, etc.) logged for both main conversation and subagent events. Observer in Phase 2 decides what's valuable. Volume managed by rotation (10MB cap).
- **D-08:** Lean event identity — `agent_id` field only (empty string for main conversation, populated for subagents). No redundant `source` field. Observer filters by `agent_id` presence/absence per PROJECT.md decision.

### Output Detail Level
- **D-09:** Tool-specific truncation caps:
  - Read output: 1KB (path + snippet sufficient)
  - Grep/Glob output: 1KB (file lists)
  - Bash output: 5KB (command results matter)
  - Write/Edit input: 5KB (what was written matters)
  - Agent prompt: 2KB (dispatch context)
- **D-10:** Keep thinking blocks in SubagentStop assistant_message events — 10KB cap per turn. Essential for observer to learn WHY agents made decisions, not just WHAT they did.

### Claude's Discretion
- Test coverage scope and approach for the new hook
- Exact event schema field names (beyond agent_id, tool, ts, event)
- Atomic write implementation details (CAPT-04)
- Per-tool duration computation approach (CAPT-05)
- Timestamp format consistency
- Error handling strategy (hook must never block agent execution)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CAPT-01 through CAPT-07 define all capture requirements for this phase
- `.planning/PROJECT.md` — Key decisions table (single obs.jsonl, categorical confidence, pending review staging, observer model)

### Existing Code (to be rewritten)
- `.claude/hooks/pipeline-observe.sh` — Current 342-line bash+Python hook. Audit for logic to port (project slug detection, transcript parsing, event synthesis, rotation, purge). Architecture is replaced but core logic carries forward.
- `.claude/hooks/check-memory-limit.js` — Reference pattern for JS hook structure (CommonJS, try/catch wrapping, process.exit(0))

### Configuration
- `.claude/settings.json` — Hook registration for 5 event types (PreToolUse, PostToolUse, PostToolUseFailure, PermissionDenied, SubagentStop). Must be updated from bash to node invocation.

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — JS naming (kebab-case), CommonJS require(), error handling patterns for hooks
- `.planning/codebase/STACK.md` — Runtime details (Node.js, Windows 11 + Git Bash, CLAUDE_PROJECT_DIR env var)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipeline-observe.sh` lines 77-91: Project slug detection logic (regex on cwd, tool_input, prompt, transcript path) — port to JS
- `pipeline-observe.sh` lines 97-106: File rotation logic (10MB cap, timestamped archive) — port to JS
- `pipeline-observe.sh` lines 108-113: Auto-purge logic (30-day archive cleanup) — port to JS
- `pipeline-observe.sh` lines 173-333: SubagentStop transcript parsing and event synthesis (dispatch, assistant_message, complete events) — port to JS
- `check-memory-limit.js`: JS hook pattern (stdin JSON parsing, try/catch, process.exit(0))

### Established Patterns
- Hooks read JSON from stdin, process, and exit 0 (never block)
- CommonJS with Node.js stdlib only (fs, path) — zero npm dependencies
- JSONL format with one JSON object per line
- Timestamps use dash-separated format (Windows-safe): `2026-04-17T10-00-00-000Z`

### Integration Points
- `settings.json` hook registration — must change from `bash ... pipeline-observe.sh` to `node ... pipeline-observe.js`
- `.claude/logs/observations/<project>/obs.jsonl` — output location (existing directories: `_channel`, `duplessis-orphans`, etc.)
- Phase 2 observer reads obs.jsonl — schema must be stable and documented

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants an "audit and rework" — not incremental patching of the bash script
- Project routing is about pipeline runs being useful context, not about user/subagent separation
- The "one file" decision in PROJECT.md means: don't split by event source (user vs subagent). Per-project directories are a separate concern and should stay.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-capture-hardening*
*Context gathered: 2026-04-20*

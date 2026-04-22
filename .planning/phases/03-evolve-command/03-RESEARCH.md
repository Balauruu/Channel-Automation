# Phase 3: Evolve Command - Research

**Researched:** 2026-04-21
**Domain:** Claude Code Skill + Node.js helper script (memory promotion and user review UX)
**Confidence:** HIGH

## Summary

The /evolve command is a Claude Code skill (`.claude/skills/evolve/SKILL.md`) paired with a Node.js helper script (`.claude/scripts/memory/evolve.js`) that orchestrates the full memory promotion lifecycle: dispatch the @observer subagent for new events, auto-promote all Pending Review entries to Permanent sections across 20 target files, display a numbered summary grouped by file type, and offer a single revert interaction. The implementation is entirely within the existing Claude Code harness -- no external dependencies, no npm packages, no API calls.

The primary technical challenges are: (1) deterministic markdown section manipulation in evolve.js (finding `## Pending Review` and `## Permanent` headings, moving entries between them, stripping evidence pointers); (2) ensuring `## Permanent` sections exist in all 20 target files (currently only PLAYBOOK.md has one -- the other 19 files have `## Pending Review` but no `## Permanent`); and (3) the revert operation which must cleanly remove specific entries from `## Permanent` sections by index without corrupting surrounding content.

**Primary recommendation:** Structure implementation in 2 plans: (1) evolve.js script with scan/promote/revert subcommands and `## Permanent` section bootstrapping, (2) evolve SKILL.md with observer dispatch, summary display, and revert interaction flow.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** File-at-a-time presentation -- entries grouped by target file per EVLV-02 ordering (insights.md files first, then MEMORY.md files, then PLAYBOOK.md).
- **D-02:** Auto-promote with batch override -- no per-entry human gate. /evolve auto-promotes ALL Pending Review entries to Permanent, then shows a numbered summary. User can revert specific entries by number after the fact.
- **D-03:** Promote-first, show-after -- auto-promote immediately, then display what was promoted. Git history is the safety net for recovery.
- **D-04:** No "edit" option -- actions are promote (automatic) or reject (revert/delete). Simplifies the UX to a single post-summary interaction.
- **D-05:** Always observe first -- every /evolve invocation dispatches @observer for new events, then promotes all Pending Review entries (including any from prior observer runs).
- **D-06:** Quick exit on empty state -- "No new events. No pending entries. Nothing to do." and exit immediately.
- **D-07:** Current project only -- use CLAUDE_PROJECT_DIR env var to derive project slug and locate obs.jsonl. Same project detection logic as pipeline-observe.js.
- **D-08:** Brief inline stats from observer -- show key numbers after observer completes.
- **D-09:** Revert = delete from Permanent section -- simple removal via Edit tool (or JS script). No git-level revert.
- **D-10:** Numbered revert prompt -- after showing the summary, plain text prompt: "Revert any? (enter numbers, or press Enter to keep all)".
- **D-11:** Skill + JS helper -- `.claude/skills/evolve/SKILL.md` + `.claude/scripts/memory/evolve.js`.
- **D-12:** Script location at `.claude/scripts/memory/evolve.js` -- new `memory/` subdirectory.
- **D-13:** Three subcommands -- `scan`, `promote`, `revert`. All output structured JSON.
- **D-14:** Same promotion pattern for all files -- all 21 memory files use ## Pending Review -> ## Permanent. insights.md entries use the same pattern (no special merge into main body).
- **D-15:** Strip evidence pointer on promote -- `- [HIGH] researcher: insight text (2026-04-18T10:22)` becomes `- [HIGH] researcher: insight text` after promotion.

### Claude's Discretion
- JS script internal structure (function decomposition, error handling)
- Exact JSON output schema for scan/promote/revert commands
- Skill prompt structure and observer dispatch prompt
- How to handle edge cases (malformed entries, missing ## Pending Review headings)
- Commit strategy for promoted changes

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVLV-01 | Single /evolve command dispatches observer for new runs then reviews ## Pending Review entries | Skill invokes @observer via Agent tool, then calls evolve.js scan/promote subcommands. Observer agent definition verified at `.claude/agents/observer.md`. Modified per D-02: auto-promote, not per-entry review. |
| EVLV-02 | Review presents entries grouped by target file (insights.md files, then MEMORY.md files, then PLAYBOOK.md) | evolve.js scan/promote output ordered by file type; skill formats numbered list. 7 insights.md + 12 MEMORY.md + 1 PLAYBOOK.md = 20 target files. |
| EVLV-03 | For each entry, user can: promote, edit, revert | Modified per D-02/D-04: auto-promote all entries immediately, then user can revert by number. No edit option. evolve.js revert subcommand removes entries from ## Permanent by file:index. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Observer dispatch | Claude Code skill (SKILL.md) | -- | Skill orchestrates the Agent tool call to dispatch @observer |
| File scanning (find Pending Review entries) | Node.js script (evolve.js) | -- | Deterministic fs operations; LLM judgment not needed |
| Entry promotion (move between sections) | Node.js script (evolve.js) | -- | Deterministic text manipulation; must be atomic and reliable |
| Evidence pointer stripping | Node.js script (evolve.js) | -- | Regex-based text transformation on promote |
| Summary display and UX | Claude Code skill (SKILL.md) | -- | Skill formats and presents the JSON output to user |
| Revert interaction | Claude Code skill (SKILL.md) | Node.js script | Skill captures user input; script performs the file edit |
| Project detection | Node.js script (evolve.js) | -- | Reuses detectProject() from pipeline-observe.js |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js (stdlib: fs, path) | v24.13.0 | File I/O, path manipulation | Already available; zero-dependency constraint per project convention [VERIFIED: `node -v` on this machine] |

### Supporting

No additional packages needed. The entire implementation uses Node.js stdlib only, matching the established project pattern (pipeline-observe.js, obs-summarize.js). [VERIFIED: codebase grep shows zero npm dependencies in `.claude/scripts/` and `.claude/hooks/`]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js fs for file manipulation | Python script | Project convention is Node.js CommonJS for all pipeline scripts; Python would break consistency |
| Manual regex for pointer stripping | unified/remark (AST markdown parser) | Overkill for simple line-level operations; adds npm dependency |
| JSON output from script | Markdown output | JSON is machine-parseable by the skill; matches obs-summarize.js pattern |

## Architecture Patterns

### System Architecture Diagram

```
User runs /evolve
       |
       v
+------------------+
| evolve SKILL.md  |  (orchestration layer)
+------------------+
       |
       | 1. Dispatch @observer via Agent tool
       v
+------------------+
| @observer agent  |  (reads obs.jsonl, writes to ## Pending Review)
+------------------+
       |
       | 2. Observer completes, skill parses completion report
       v
+------------------+
| evolve SKILL.md  |  (continues)
+------------------+
       |
       | 3. Run: node evolve.js scan
       v
+------------------+     reads 20 files
| evolve.js scan   |---> .claude/skills/*/insights.md
|                  |---> .claude/agent-memory/*/MEMORY.md
|                  |---> .claude/PLAYBOOK.md
+------------------+
       |
       | JSON: {files: [{path, entries: [...]}], total: N}
       v
+------------------+
| evolve SKILL.md  |  (checks: if total == 0, quick exit per D-06)
+------------------+
       |
       | 4. Run: node evolve.js promote
       v
+------------------+     edits 20 files
| evolve.js promote|---> moves entries: ## Pending Review -> ## Permanent
|                  |---> strips evidence pointers per D-15
|                  |---> creates ## Permanent if absent
+------------------+
       |
       | JSON: {promoted: [{path, entries: [...]}], total: N}
       v
+------------------+
| evolve SKILL.md  |  (displays numbered summary grouped by file type)
+------------------+
       |
       | 5. Prompt: "Revert any? (numbers, or Enter to keep all)"
       v
  User input: "2,4" (or Enter)
       |
       | 6. If numbers provided: node evolve.js revert --entries "file:idx,file:idx"
       v
+------------------+
| evolve.js revert |---> removes specific entries from ## Permanent
+------------------+
       |
       v
  Done. Skill commits promoted changes.
```

### Recommended Project Structure

```
.claude/
  skills/
    evolve/
      SKILL.md          # User-invocable skill (/evolve command)
  scripts/
    memory/
      evolve.js         # Deterministic file operations (scan, promote, revert)
```

### Pattern 1: Script Subcommand Dispatch

**What:** Single evolve.js file with subcommand routing via process.argv[2]
**When to use:** When a script needs multiple operations but shares common utilities (file discovery, section parsing)
**Example:**
```javascript
// Source: pipeline-observe.js pattern (process.argv[2] dispatch)
'use strict';
const fs = require('fs');
const path = require('path');

const COMMAND = process.argv[2]; // scan | promote | revert

switch (COMMAND) {
  case 'scan':    scan(); break;
  case 'promote': promote(); break;
  case 'revert':  revert(process.argv.slice(3)); break;
  default:
    process.stderr.write('Usage: node evolve.js <scan|promote|revert> [args]\n');
    process.exit(1);
}
```
[VERIFIED: pipeline-observe.js uses this exact pattern at line 76]

### Pattern 2: Markdown Section Extraction

**What:** Find content between two `##` headings in a markdown file
**When to use:** When reading or manipulating entries within a specific markdown section
**Example:**
```javascript
// Parse a markdown file into sections by ## heading
function parseSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      if (current) current.endLine = i - 1;
      current = {
        heading: lines[i].replace(/^## /, '').trim(),
        startLine: i,
        endLine: lines.length - 1,
        entries: []
      };
      sections.push(current);
    } else if (current && lines[i].startsWith('- ')) {
      current.entries.push({ line: i, text: lines[i] });
    }
  }
  return sections;
}
```
[ASSUMED: Standard markdown parsing approach; no library needed for this level of complexity]

### Pattern 3: Evidence Pointer Stripping

**What:** Remove the timestamp evidence pointer from promoted entries per D-15
**When to use:** During the promote operation
**Example:**
```javascript
// MEMORY.md/PLAYBOOK.md format:
//   Before: "- [HIGH] researcher: insight text (2026-04-18T10:22)"
//   After:  "- [HIGH] researcher: insight text"
// insights.md format:
//   Before: "- [2026-04-20] [MED] insight text (from: researcher, 2026-04-20T10:15)"
//   After:  "- [2026-04-20] [MED] insight text"

function stripPointer(entry) {
  // MEMORY.md/PLAYBOOK.md: strip trailing " (YYYY-MM-DDThh:mm)"
  const memoryRe = / \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
  if (memoryRe.test(entry)) return entry.replace(memoryRe, '');

  // insights.md: strip trailing " (from: agent-name, YYYY-MM-DDThh:mm)"
  const insightRe = / \(from: [a-z][-a-z]*, \d{4}-\d{2}-\d{2}T\d{2}:\d{2}\)$/;
  if (insightRe.test(entry)) return entry.replace(insightRe, '');

  return entry; // No pointer found -- return unchanged
}
```
[VERIFIED: Entry formats confirmed via observer.md lines 157-175 and eval-observer.js regex patterns]

### Pattern 4: Skill Dispatching a Subagent

**What:** Skill uses the Agent tool to dispatch @observer
**When to use:** When a skill needs to invoke a subagent and process its output
**Example:**
```markdown
## Step 1: Dispatch Observer

Use the Agent tool to dispatch @observer:

Prompt: "Process new events for project <project_slug>. Read the cursor at
.claude/logs/observations/<slug>/.observer-cursor and process new runs from
.claude/logs/observations/<slug>/obs.jsonl"

After the observer completes, extract key numbers from its completion report:
- Runs processed
- Entries written
- Candidates rejected

Display a brief summary to the user.
```
[VERIFIED: observer.md completion report format at lines 304-318]

### Anti-Patterns to Avoid

- **Using Edit tool for bulk section moves:** The Edit tool is designed for small, targeted changes. Moving entries between sections across 20 files should be done by the JS script which can read, transform, and write atomically. The skill should call the script, not attempt 20+ Edit operations.
- **Parsing markdown with regex for nested structures:** For this use case, line-by-line processing with `##` heading detection is sufficient. Do not attempt to parse nested lists, code blocks, or other complex markdown structures -- the entries are always single-line bullet points.
- **Prompting user per-entry:** D-02 and D-04 explicitly reject per-entry interaction. The UX is: auto-promote all, show summary, single revert prompt. Any per-entry gate violates the locked decisions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON output from script | Custom string formatting | `JSON.stringify()` with structured objects | Reliable, parseable, matches obs-summarize.js pattern |
| File discovery (find all memory files) | Recursive directory walk | Hardcoded path patterns (known, stable list) | Only 20 files across 3 known directory patterns; dynamic discovery adds complexity for no benefit |
| Project slug detection | New detection logic | Reuse `detectProject()` from pipeline-observe.js | Identical logic needed; copy the function |
| Markdown section parsing | Full AST parser (unified/remark) | Line-by-line `##` heading detection | Entries are single-line bullets; AST parsing is overkill |

**Key insight:** The memory file structure is well-defined and stable (20 files across 3 patterns). The evolve.js script can hardcode the file discovery patterns rather than implementing generic directory traversal.

## Common Pitfalls

### Pitfall 1: Missing ## Permanent Sections

**What goes wrong:** evolve.js tries to append promoted entries to `## Permanent` but the heading doesn't exist in 19 of 20 target files. Only PLAYBOOK.md has `## Permanent` currently.
**Why it happens:** Phase 2 only bootstrapped `## Pending Review` sections. D-14 declares "all 21 memory files use ## Pending Review -> ## Permanent" but this is the DESIRED end state, not the current state.
**How to avoid:** evolve.js promote must create `## Permanent` section if absent -- insert it immediately before `## Pending Review` in the file. This is a Wave 0 concern: either create sections upfront or handle dynamically during first promote.
**Warning signs:** Promoted entries appear at wrong location in file, or promote silently fails.

### Pitfall 2: File Count Mismatch (20 vs 21)

**What goes wrong:** CONTEXT.md says "21 memory files" but the actual count is 20. The autoresearch skill has been deprecated and manually deleted (noted in CONTEXT.md specifics section).
**Why it happens:** The 21 count comes from 12 MEMORY.md + 8 insights.md + 1 PLAYBOOK.md. But autoresearch/insights.md no longer exists, making it 12 + 7 + 1 = 20.
**How to avoid:** evolve.js should discover files dynamically from the filesystem rather than hardcoding a list of 21. Check for file existence before attempting operations.
**Warning signs:** Script errors on missing file; count in summary is wrong.

### Pitfall 3: Entry Index Stability During Revert

**What goes wrong:** After promote, the skill shows numbered entries (1-N). User says "revert 3,5". But if revert removes entry 3 first, then entry 5's position has shifted.
**Why it happens:** Removing entries from a file changes line numbers for subsequent entries.
**How to avoid:** Process reverts in reverse order (highest index first) or use the file:line-number addressing from the promote output and recalculate positions for each removal. Alternatively, collect all entries to revert and remove them in a single pass.
**Warning signs:** Wrong entry reverted; file corruption from off-by-one.

### Pitfall 4: MEMORY.md Section Order Assumption

**What goes wrong:** evolve.js assumes `## Pending Review` is always the last section, but some MEMORY.md files may have content after it.
**Why it happens:** Phase 2 appended `## Pending Review` at the end of files, but manual edits could add content after it.
**How to avoid:** Parse sections properly -- find `## Pending Review` by heading text, not by position. Extract entries between `## Pending Review` and the next `##` heading (or EOF).
**Warning signs:** Entries from wrong section included in scan; content after `## Pending Review` treated as entries.

### Pitfall 5: insights.md Has Different Structure Than MEMORY.md

**What goes wrong:** insights.md files have a preamble, `## Lifecycle` section, `<!-- Append -->` comment, existing entries in the main body, and then `## Pending Review` at the end. MEMORY.md files have 5 named sections followed by `## Pending Review`.
**Why it happens:** Two different file schemas across the same pipeline.
**How to avoid:** D-14 says "Same promotion pattern for all files" -- this means ALL files get the same `## Pending Review` -> `## Permanent` flow. insights.md entries do NOT merge into the main body during promote. They stay in `## Permanent`. The evolve.js script treats all files uniformly.
**Warning signs:** insights.md entries end up in the main body instead of `## Permanent`.

### Pitfall 6: Observer Returns No New Events But Pending Entries Exist

**What goes wrong:** D-06 says quick exit on "No new events. No pending entries." But these are independent conditions. Observer may find no new events while prior observer runs left unreviewed Pending Review entries.
**Why it happens:** Conflating "observer found nothing new" with "nothing to promote".
**How to avoid:** After observer completes, always run `evolve.js scan`. Only quick-exit if BOTH observer found no new events AND scan returns 0 entries.
**Warning signs:** Stale Pending Review entries never get promoted because observer reports nothing new.

### Pitfall 7: Windows Path Handling in evolve.js

**What goes wrong:** Path separators differ between Windows (`\`) and POSIX (`/`). `path.join()` on Windows produces backslashes, but Claude Code's Bash tool uses MSYS2 which normalizes to forward slashes.
**Why it happens:** Platform mismatch between script runtime (Node.js on Windows) and skill invocation context (MSYS2 bash).
**How to avoid:** Use `path.resolve()` and `path.join()` consistently. When outputting paths in JSON, use forward slashes or normalize. The skill receives JSON and doesn't need to manipulate paths directly.
**Warning signs:** File not found errors when skill tries to reference paths from script output.

## Code Examples

### File Discovery Pattern

```javascript
// Source: Verified against actual filesystem layout (ls output 2026-04-21)
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CLAUDE_DIR = path.join(PROJECT_ROOT, '.claude');

function discoverTargetFiles() {
  const files = [];

  // 1. insights.md files (skills layer)
  const skillsDir = path.join(CLAUDE_DIR, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of fs.readdirSync(skillsDir)) {
      const insightsPath = path.join(skillsDir, skill, 'insights.md');
      if (fs.existsSync(insightsPath)) {
        files.push({ path: insightsPath, type: 'insights' });
      }
    }
  }

  // 2. MEMORY.md files (agent layer)
  const agentMemDir = path.join(CLAUDE_DIR, 'agent-memory');
  if (fs.existsSync(agentMemDir)) {
    for (const agent of fs.readdirSync(agentMemDir)) {
      const memPath = path.join(agentMemDir, agent, 'MEMORY.md');
      if (fs.existsSync(memPath)) {
        files.push({ path: memPath, type: 'memory' });
      }
    }
  }

  // 3. PLAYBOOK.md (orchestration layer)
  const playbookPath = path.join(CLAUDE_DIR, 'PLAYBOOK.md');
  if (fs.existsSync(playbookPath)) {
    files.push({ path: playbookPath, type: 'playbook' });
  }

  return files;
}
```
[VERIFIED: File paths confirmed via Glob and fs.existsSync checks against actual directory listing]

### Scan Subcommand Output Schema

```javascript
// scan output JSON schema
{
  "command": "scan",
  "files": [
    {
      "path": ".claude/skills/pipeline-design/insights.md",
      "type": "insights",          // insights | memory | playbook
      "entries": [
        {
          "index": 0,
          "line": 14,              // 0-based line number in file
          "text": "- [2026-04-21] [HIGH] insight text (from: researcher, 2026-04-21T10:22)"
        }
      ]
    }
  ],
  "total": 3                      // total entries across all files
}
```
[ASSUMED: Schema design; follows obs-summarize.js output pattern]

### Promote Subcommand Output Schema

```javascript
// promote output JSON schema
{
  "command": "promote",
  "promoted": [
    {
      "path": ".claude/skills/pipeline-design/insights.md",
      "type": "insights",
      "entries": [
        {
          "global_index": 1,       // 1-based global index for revert reference
          "original": "- [2026-04-21] [HIGH] insight text (from: researcher, 2026-04-21T10:22)",
          "promoted": "- [2026-04-21] [HIGH] insight text"  // pointer stripped
        }
      ]
    }
  ],
  "total": 3,
  "permanent_sections_created": 2  // files where ## Permanent was added
}
```
[ASSUMED: Schema design]

### Revert Subcommand Invocation

```javascript
// Invocation: node evolve.js revert 2 5 7
// Removes entries with global_index 2, 5, 7 from their respective ## Permanent sections
// Output:
{
  "command": "revert",
  "reverted": [
    {
      "global_index": 2,
      "path": ".claude/agent-memory/researcher/MEMORY.md",
      "entry": "- [HIGH] researcher: insight text"
    }
  ],
  "total": 3
}
```
[ASSUMED: Schema design]

### Skill UX Flow

```markdown
## After observer completes and entries are promoted:

**Memory Evolution Summary**

Observer processed 3 runs, wrote 5 entries, rejected 2.

All entries auto-promoted to Permanent sections:

**insights.md files:**
  1. [pipeline-design] [HIGH] Pin interpreter to venv path
  2. [crawl4ai-scraping] [MED] Use wait_for selector for BAnQ

**MEMORY.md files:**
  3. [researcher] [HIGH] Verify Wikipedia dates against primary sources
  4. [writer] [MED] Read large dossiers by section heading

**PLAYBOOK.md:**
  5. [LOW] Wait for visual-planner completion before starting edit sheet

Revert any? (enter numbers, or press Enter to keep all):
```
[VERIFIED: Matches preview mockup referenced in CONTEXT.md specifics]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| signals.yaml cross-agent feedback | Observer writes to Pending Review sections | Phase 2 (2026-04-20) | Signals system is deprecated but still referenced in agent-protocols; Phase 4 will clean up |
| memory-candidates/ staging directory | ## Pending Review sections in memory files | Phase 2 (2026-04-20) | No staging directory needed; entries stage in-file |
| Per-entry human review gate | Auto-promote with optional revert (D-02) | Phase 3 context (2026-04-21) | Faster UX; git history is the safety net |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | evolve.js scan/promote/revert JSON output schemas as designed above | Code Examples | Low -- schemas are Claude's discretion per CONTEXT.md; planner can adjust |
| A2 | `## Permanent` sections should be created dynamically during first promote if absent | Pitfall 1 | Medium -- could alternatively be a Wave 0 bootstrap task; affects plan structure |
| A3 | Markdown section parsing via line-by-line `##` detection is sufficient (no AST parser needed) | Architecture Patterns | Low -- entry format is strict single-line bullets; edge cases are minimal |
| A4 | 20 target files (not 21) due to autoresearch deprecation | Pitfall 2 | Low -- explicitly noted in CONTEXT.md specifics |

## Open Questions

1. **Should `## Permanent` sections be pre-created (Wave 0 task) or created dynamically during first promote?**
   - What we know: Only PLAYBOOK.md currently has `## Permanent`. D-14 says all files should use the pattern.
   - What's unclear: Whether the planner should add a bootstrap task or let evolve.js handle it dynamically.
   - Recommendation: Dynamic creation in evolve.js is simpler (single code path, no separate bootstrap plan). The script checks for `## Permanent` heading and creates it if absent, placing it immediately before `## Pending Review`.

2. **Should evolve.js commit promoted changes, or should the skill handle commits?**
   - What we know: D-09 says "Git history is already the safety net." The skill has access to Bash tool for git operations.
   - What's unclear: Whether the script should auto-commit or the skill should commit after user confirms (or after revert opportunity passes).
   - Recommendation: The skill should commit after the revert interaction completes -- this way, reverted entries are never committed. A single commit containing all promoted (non-reverted) changes is cleanest.

3. **What happens if observer dispatch fails or times out?**
   - What we know: Observer has 8-run cap and context pressure guardrail (stops early if reasoning degrades).
   - What's unclear: How the skill should handle a failed observer dispatch.
   - Recommendation: If observer dispatch fails, log the error, then proceed to scan/promote any existing Pending Review entries from prior runs. Observer failure should not block promotion of already-written entries.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js assert-free (custom test runner, same pattern as eval-observer.js) |
| Config file | None -- standalone scripts with inline test runner |
| Quick run command | `node .claude/tests/eval-evolve.js` |
| Full suite command | `node .claude/tests/eval-evolve.js && node .claude/tests/eval-observer.js` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVLV-01 | /evolve dispatches observer then reviews entries | integration (manual) | Manual -- requires Agent tool | N/A |
| EVLV-02 | Entries grouped by file type (insights, memory, playbook) | unit | `node .claude/tests/eval-evolve.js` | Wave 0 |
| EVLV-03 | Auto-promote all, revert by number | unit | `node .claude/tests/eval-evolve.js` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node .claude/tests/eval-evolve.js`
- **Per wave merge:** `node .claude/tests/eval-evolve.js && node .claude/tests/eval-observer.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `.claude/tests/eval-evolve.js` -- covers EVLV-02, EVLV-03 (scan output ordering, promote with pointer stripping, revert by index)
- [ ] `.claude/tests/fixtures/evolve/` -- test fixture files (sample MEMORY.md, insights.md, PLAYBOOK.md with Pending Review entries)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- local file operations only |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A -- operates on user's own files |
| V5 Input Validation | yes | Validate subcommand args; validate entry indices for revert are integers within range |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via crafted file paths | Tampering | Use path.resolve() with PROJECT_ROOT prefix; validate all paths are within .claude/ |
| Malformed markdown injection via entries | Tampering | Entries are read from files the observer wrote; no external user input in entry content |
| Integer overflow in revert indices | Tampering | Validate indices are positive integers within promoted entry count |

## Sources

### Primary (HIGH confidence)
- `.claude/hooks/pipeline-observe.js` -- project slug detection, CommonJS pattern, truncation approach
- `.claude/scripts/obs-summarize.js` -- CommonJS script structure, JSON output pattern, subcommand dispatch
- `.claude/agents/observer.md` -- observer agent definition, completion report format, entry format specs
- `.claude/PLAYBOOK.md` -- confirmed `## Pending Review` and `## Permanent` sections exist
- `.claude/agent-memory/*/MEMORY.md` -- confirmed `## Pending Review` exists, `## Permanent` does NOT exist
- `.claude/skills/*/insights.md` -- confirmed `## Pending Review` exists, `## Permanent` does NOT exist
- `.claude/tests/eval-observer.js` -- test pattern reference, entry format regex patterns

### Secondary (MEDIUM confidence)
- `.planning/phases/02-observer-agent/02-01-PLAN.md` -- Phase 2 bootstrap only added `## Pending Review`, not `## Permanent`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero external dependencies; all Node.js stdlib; matches existing patterns exactly
- Architecture: HIGH -- skill + script split is a locked decision (D-11); subcommand pattern verified in codebase
- Pitfalls: HIGH -- each pitfall verified against actual file state (Grep/Read confirmed section presence/absence)

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable -- no external dependencies to drift)

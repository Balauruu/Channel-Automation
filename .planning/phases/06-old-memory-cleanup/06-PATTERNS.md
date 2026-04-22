# Phase 6: Old Memory Cleanup - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 5 (modified/updated) + 8 (deleted) + 3 (regenerated)
**Analogs found:** 5 / 5 (modified files; deletions and regenerations need no analog)

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `CLAUDE.md` | config | reference doc (agent-read) | `CLAUDE.md` (current) | self-update |
| `.gitignore` | config | exclusion list | `.gitignore` (current) | self-update |
| `.planning/PROJECT.md` | config | reference doc (planner-read) | `.planning/PROJECT.md` (current) | self-update |
| Historical `.planning/phases/**/*.md` | docs | reference (narrative) | Phase 4 plan 04-03 Task 2 (audit pattern) | role-match |
| Verification grep audit | operation | validation pass | Phase 4 plan 04-03 Task 2 (grep audit) | exact |
| 8 files to delete (`git rm`) | operation | cleanup | N/A (standard git rm) | N/A |
| `.planning/codebase/ARCHITECTURE.md` | config | regenerated | N/A (via `/gsd-map-codebase`) | N/A |
| `.planning/codebase/STRUCTURE.md` | config | regenerated | N/A (via `/gsd-map-codebase`) | N/A |
| `.planning/codebase/CONCERNS.md` | config | regenerated | N/A (via `/gsd-map-codebase`) | N/A |

## Pattern Assignments

### `CLAUDE.md` (config, reference doc -- targeted edit)

**Analog:** Current file (55 lines)

This is a targeted edit of the Folder Map section. Two entries removed, two entries added (or modified). The rest of the file is untouched.

**Current Folder Map section to modify** (lines 8-21):
```markdown
## Folder Map

- `channel/` -- Channel identity (voice, style, visual guide)
- `.claude/agents/` -- Agent definitions
- `.claude/skills/` -- Shared skills (agent-protocols)
- `.claude/agent-memory/` -- Per-agent persistent memory (universal, cross-project)
- `.claude/project-memories/` -- Per-project agent notes (project-scoped, archived with project)
- `.claude/references/` -- Reference guides (skill crafting)
- `.claude/feedback/` -- Cross-agent feedback signals (signals.yaml)
- `.claude/logs/` -- Agent dispatch/completion session logs
- `.claude/tests/` -- Smoke tests and validation scripts
- `.claude/hooks/` -- Pre/PostToolUse and SubagentStop hooks
- `.claude/scripts/` -- Python scripts (strategy/, editorial/, media/ subdirs)
- `.claude/rules/` -- Modular on-demand rules (git-workflow, etc.). Read when relevant; not auto-loaded.
- `data/` -- SQLite databases (channel_assistant.db, asset_catalog.db)
- `docs/` -- plans & specs
- `channel/strategy/` -- Strategy outputs (competitors.json, analysis, topics)
- `channel/voice-analysis/` -- Style-extractor workspace (reconstructed scripts)
- `projects/` -- Per-documentary outputs
```

**Entries to REMOVE:**
- Line 12: `.claude/project-memories/` -- directory deleted, system removed
- Line 14: `.claude/feedback/` -- signals.yaml system removed, directory gitignored and unused

**Entries to ADD/UPDATE (per D-01):**
- Add entry for `.claude/PLAYBOOK.md` -- cross-agent coordination (observer-managed)
- Update `.claude/logs/` description to mention `observations/` subdirectory for obs.jsonl
- Add entry for `.claude/orchestration/` if it is the PLAYBOOK.md parent (or adjust based on current PLAYBOOK.md location)

**Pattern:** Each Folder Map entry follows this format (one per line):
```
- `<path>/` -- <brief description> (<parenthetical detail if needed>)
```

Exact wording is at Claude's discretion per CONTEXT.md.

---

### `.gitignore` (config, exclusion list -- single line removal)

**Analog:** Current file (44 lines)

**Entry to REMOVE** (lines 25-26):
```gitignore
# -- Project-scoped agent memories ------------------------------------------
.claude/project-memories/
```

Remove both the comment header (line 25) and the entry (line 26). The `project-memories/` directory no longer exists and will not be recreated.

**Section pattern:** Entries in `.gitignore` are grouped by section with `# -- Section header --` comment lines. When removing an entry, remove both the comment and the rule if the section becomes empty.

---

### `.planning/PROJECT.md` (config, reference doc -- section rewrite)

**Analog:** Current file (118 lines)

The `### Current State (Broken)` section (lines 46-53) describes the old broken system. It must be rewritten to reflect the working unified memory system. The section heading itself should change from "Current State (Broken)" to "Current State" (the system is no longer broken).

**Current section to rewrite** (lines 46-53):
```markdown
### Current State (Broken)

- pipeline-observe.sh exists (342 lines) but only captures subagent events -- main conversation is invisible
- No actual logging is happening in practice
- Information bleeds between layers: agent-specific knowledge ends up in PLAYBOOK.md
- agent-protocols skill still references deleted `project-memories/` directory and `signals.yaml`
- 11 agent MEMORY.md files and 8 skill insights.md files exist but aren't systematically maintained
- PLAYBOOK.md skeleton exists but isn't populated by any automated system
```

**Pattern for replacement:** Same markdown list format, but describing the live system state. Exact wording at Claude's discretion. Should reference:
- pipeline-observe.js as the active capture hook
- obs.jsonl as the log path
- @observer as the analysis agent
- /evolve as the human review gate
- PLAYBOOK.md Open/Resolved lifecycle
- 3-layer scope-test classification

Also review the `### What Failed (Prior Attempts)` section (lines 55-60) -- the `obs.js` reference there is historical narrative and should remain per D-08. However, verify that no other PROJECT.md sections contain actionable stale references.

---

### Historical `.planning/phases/**/*.md` (docs, narrative -- selective path fixes)

**Analog:** Phase 4 plan 04-03 established the precedent for handling historical planning artifacts.

**Decision D-08:** Leave historical phase artifacts in place but fix actionable references (paths pointing to dead locations). Narrative context stays intact.

**Actionable vs narrative distinction:**
- **Actionable:** A file path in a `read_first`, `files_modified`, `interfaces`, or `action` block that points to a deleted file -- misleads future executors. Fix these.
- **Narrative:** A mention of `obs.js` or `project-memories` in a discussion log, context summary, or "what failed" section -- provides historical context. Leave these.

**Files with old-system references in `.planning/`** (30 files found by grep). The planner should scope which subset is actionable by checking whether paths appear in:
1. YAML frontmatter `files_modified` arrays
2. `<read_first>` blocks
3. `<interfaces>` blocks
4. `<action>` blocks with file path instructions

Historical summaries, discussion logs, context docs, and research docs are narrative and should not be edited.

**Grep patterns for the audit** (reuse from Phase 4 plan 04-03):
```
project-memories
signals.yaml
obs.js
logs/runs
scratchpad
check-definition-signals
```

---

### Verification Grep Audit (operation, validation pass)

**Analog:** Phase 4 plan 04-03 Task 2 (lines 347-403) -- exact pattern to follow.

**Phase 4 established this audit pattern:**
1. Run grep for each old-system term across the entire repo (D-07 expands scope from `.claude/` to full repo including `.planning/`)
2. For each match: classify as actionable (live config/code) vs narrative (historical docs)
3. Zero matches expected in live files after cleanup
4. Historical matches documented as acceptable

**Grep commands (expanded from Phase 4 to full repo per D-07):**
```bash
grep -r "project-memories" . --include="*.md" --include="*.js" --include="*.json" --include="*.yaml" --include="*.sh" -l
grep -r "signals\.yaml" . --include="*.md" --include="*.js" --include="*.json" --include="*.yaml" --include="*.sh" -l
grep -r "obs\.js" . --include="*.md" --include="*.js" --include="*.json" --include="*.yaml" --include="*.sh" -l
grep -r "logs/runs" . --include="*.md" --include="*.js" --include="*.json" --include="*.yaml" --include="*.sh" -l
grep -r "scratchpad" . --include="*.md" --include="*.js" --include="*.json" --include="*.yaml" --include="*.sh" -l
grep -r "check-definition-signals" . --include="*.md" --include="*.js" --include="*.json" --include="*.yaml" --include="*.sh" -l
```

**Expected results after cleanup:**
- `CLAUDE.md` -- zero matches (after Folder Map update)
- `.gitignore` -- zero matches (after entry removal)
- `PROJECT.md` -- may retain narrative mentions in "What Failed" section (acceptable)
- `.planning/phases/**` -- narrative mentions in historical artifacts (acceptable per D-08)
- `.planning/codebase/**` -- zero matches (after regeneration)
- `.claude/**` -- zero matches in live files (already cleaned by Phase 4)

---

## Shared Patterns

### Git Deletion Pattern
**Source:** Phase 1 plan 01-03 (established `git rm` for tracked file deletion)
**Apply to:** All 8 files to delete (D-03, D-04)

```bash
git rm .claude/hooks/obs.js
git rm .claude/hooks/check-definition-signals.js
git rm .claude/skills/autoresearch/SKILL.md
git rm .claude/skills/autoresearch/insights.md
git rm .claude/tests/fixtures/observability/tool-events.jsonl
git rm .claude/tests/fixtures/observability/transcript-errored.jsonl
git rm .claude/tests/fixtures/observability/transcript-stopped.jsonl
git rm .claude/tests/fixtures/observability/transcript.jsonl
```

Single commit per D-03. Note: these files already show as deleted in `git status` (unstaged deletions). `git rm` stages the deletion. If they are already deleted from disk, use `git rm --cached` or `git add -u` on specific paths.

### Markdown Folder Map Entry Format
**Source:** `CLAUDE.md` lines 8-21
**Apply to:** CLAUDE.md Folder Map edits

```
- `<path>/` -- <Brief description> (<parenthetical detail if needed>)
```

Consistent format: backtick-wrapped path, double-dash separator, sentence-case description. Directories end with `/`. Files do not have trailing `/`.

### PROJECT.md Section Structure
**Source:** `.planning/PROJECT.md` lines 44-60
**Apply to:** PROJECT.md "Current State" rewrite

The Context section uses `###` subheadings:
```markdown
## Context

### Current State
[bullet list of current system facts]

### What Failed (Prior Attempts)
[bullet list of historical failures -- narrative, do not modify]
```

### Codebase Map Regeneration
**Source:** `/gsd-map-codebase` command
**Apply to:** ARCHITECTURE.md, STRUCTURE.md, CONCERNS.md

These files are regenerated by the GSD mapping tool, not manually edited. Regeneration must happen AFTER all file deletions and CLAUDE.md/.gitignore updates, so the maps reflect the final clean state. The executor invokes the command; no manual pattern needed.

### Grep Audit Verification Pattern
**Source:** Phase 4 plan 04-03, Task 2 (lines 357-403)
**Apply to:** Final verification step

Pattern: Run N grep commands for old-system terms. Classify results as actionable (bug) or narrative (acceptable). All live files must return zero matches. Historical planning docs with narrative mentions are documented as acceptable.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | | | All operations have clear precedents in this codebase |

Every file modification has a self-analog (current version) and the verification grep has an exact-match analog from Phase 4 plan 04-03. No novel patterns are required for this cleanup phase.

## Execution Order Constraint

Per CONTEXT.md specifics section:
1. **First:** Git rm all 8 deletions + commit
2. **Second:** Update CLAUDE.md Folder Map, .gitignore, PROJECT.md Current State
3. **Third:** Fix actionable references in historical planning artifacts (if any)
4. **Fourth:** Regenerate codebase maps via `/gsd-map-codebase`
5. **Fifth:** Full grep audit to verify zero stale references in live files

Regeneration must be last (before audit) because the maps describe the codebase -- they must reflect all prior changes.

## Metadata

**Analog search scope:** `CLAUDE.md`, `.gitignore`, `.planning/`, `.claude/`, `.planning/phases/04-agent-consumption/`
**Files scanned:** 12 (CLAUDE.md, .gitignore, PROJECT.md, ROADMAP.md, STATE.md, ARCHITECTURE.md, STRUCTURE.md, CONCERNS.md, 04-03-PLAN.md, 04-PATTERNS.md, 06-CONTEXT.md, 06-DISCUSSION-LOG.md)
**Pattern extraction date:** 2026-04-21

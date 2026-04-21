---
phase: 04-agent-consumption
reviewed: 2026-04-21T14:23:10Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - .claude/PLAYBOOK.md
  - .claude/agents/observer.md
  - .claude/scripts/obs-summarize.js
  - .claude/skills/agent-observability/SKILL.md
  - .claude/skills/agent-protocols/SKILL.md
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-21T14:23:10Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the phase 04 agent-consumption changes: PLAYBOOK.md routing log, observer agent prompt, obs-summarize.js summarizer script, agent-observability SKILL.md, and agent-protocols SKILL.md.

The JavaScript in obs-summarize.js is structurally sound with one crash-risk bug (unchecked `obs.jsonl` existence during sort). The observer.md prompt logic is internally consistent and the PLAYBOOK routing section is correctly specified. The main issues are stale skill name references in observer.md (`autoresearch` is deleted), and a field name inconsistency in the debug recipes in SKILL.md (`tool_name` vs `tool`).

No security vulnerabilities, authentication issues, or data-loss paths found.

---

## Warnings

### WR-01: `resolveObsFile` crashes when a project dir has no `obs.jsonl`

**File:** `.claude/scripts/obs-summarize.js:45`

**Issue:** When called with no argument, the code sorts all project subdirectories by `obs.jsonl` mtime. The sort comparator calls `fs.statSync(path.join(obsDir, b, 'obs.jsonl'))` unconditionally. If any project subdirectory exists but has no `obs.jsonl` (e.g. a freshly created project dir, or the archive subdirectory `rejections.archive/` appearing at the wrong level), `fs.statSync` throws `ENOENT` and the entire process crashes before any output is produced.

The same issue applies to the `.filter()` check on line 42 — it filters for directories but does not verify that `obs.jsonl` exists inside them before the sort.

**Fix:**
```js
// Line 42-46: filter out project dirs that have no obs.jsonl, then sort
const projects = fs.readdirSync(obsDir)
  .filter(f => {
    const fp = path.join(obsDir, f);
    return fs.statSync(fp).isDirectory() && fs.existsSync(path.join(fp, 'obs.jsonl'));
  });
if (!projects.length) throw new Error(`no project dirs with obs.jsonl in ${obsDir}`);
projects.sort((a, b) =>
  fs.statSync(path.join(obsDir, b, 'obs.jsonl')).mtimeMs -
  fs.statSync(path.join(obsDir, a, 'obs.jsonl')).mtimeMs
);
```

---

### WR-02: observer.md skill allowlist includes deleted `autoresearch` skill

**File:** `.claude/agents/observer.md:114`

**Issue:** The Q1 scope-test instruction tells the observer to classify candidates against a hard-coded skill list:

> `archive-search, autoresearch, crawl4ai-scraping, data-analysis, media-evaluation, pipeline-design, structured-output, visual-narrative`

The `autoresearch` skill has been deleted (both `SKILL.md` and `insights.md` are staged for deletion in the current branch). If the observer encounters a candidate that would have mapped to `autoresearch`, it will either attempt to write to a non-existent file (caught by the "target-file-corrupt" guardrail, Step 8) or, more likely, the skill will correctly be excluded — but the allowlist gives the observer a false reference point and will cause unnecessary reasoning overhead or incorrect Q1 classifications.

The list is also incomplete: `assets-download`, `assets-embed`, `assets-score`, `assets-search`, `compile`, `evolve`, `process-assets`, `strategy`, `strategy-analyze`, `strategy-scrape`, `strategy-topics`, `visual-plan`, and `write-script` all exist as skills but are absent from the allowlist. Candidates that belong to those skills would be incorrectly forced toward Q2/Q3 or rejected.

**Fix:** Replace the inline allowlist on line 114 with the actual current skill directory contents, or instruct the observer to verify the allowlist dynamically:

```markdown
- You must identify WHICH skill. Verify the skill exists by checking
  `.claude/skills/<skill>/` before accepting a Q1 classification. Do not
  rely on a hardcoded list — the set of skills changes over time.
```

If a static list is preferred, update it to the current set (removing `autoresearch`, adding the missing skills listed above).

---

### WR-03: Debug recipes in agent-observability SKILL.md use wrong field name `tool_name`

**File:** `.claude/skills/agent-observability/SKILL.md:191,200,205,229`

**Issue:** The debug recipe snippets reference `e.tool_name` in several places:

```js
// Line 191 (slowest tool calls):
.forEach(e => console.log(e.duration_ms+'ms', e.tool_name, ...));

// Line 200 (find all failures):
.forEach(e => console.log(e.ts, e.agent_id||'(main)', e.tool_name, ...));

// Line 205 (permission denials):
.forEach(e => console.log(e.ts, e.agent_id||'(main)', e.tool_name));

// Line 229 (reasoning timeline):
.forEach(e => console.log(e.ts, e.event, e.tool_name || ''));
```

The event schema (documented in the same file, and confirmed by obs-summarize.js) uses `tool` as the field name, not `tool_name`. The `tool_pre`, `tool_post`, `tool_fail`, and `permission_denied` events all use `e.tool` (see obs-summarize.js lines 73-75, 94-95, 143-144). These recipes will silently output `undefined` for every tool name, making the debug output useless without indicating why.

**Fix:** Replace all `e.tool_name` references in the debug recipes with `e.tool`:

```js
// e.g. line 191:
.forEach(e => console.log(e.duration_ms+'ms', e.tool, (e.input||'').slice(0,80)));
```

Apply the same replacement on lines 200, 205, and 229.

---

## Info

### IN-01: observer.md description frontmatter references `obs.jsonl event logs` but dispatching context has changed

**File:** `.claude/agents/observer.md:3-4`

**Issue:** The `description` frontmatter still says "Reads obs.jsonl event logs from completed agent runs". This is accurate, but the description also says "writes tagged entries to Pending Review sections" — which is still true for MEMORY.md/insights.md but omits the new PLAYBOOK Open/Resolved lifecycle that is now a first-class responsibility. Agents and skills that read this description to decide when to invoke the observer may have an incomplete picture.

**Fix:** Update the description to mention the PLAYBOOK routing:

```yaml
description: >-
  Reads obs.jsonl event logs from completed agent runs, extracts reusable
  learnings, classifies each to the correct memory tier via scope-test
  questions, writes tagged entries to Pending Review sections, and routes
  cross-agent insights through PLAYBOOK.md Open/Resolved lifecycle.
  Do NOT invoke manually -- dispatched by /evolve command only.
```

Note: this is already the description in the file. No action needed — this is a confirmation that the frontmatter matches the body.

(Downgrading to no-op: on re-read the description already includes PLAYBOOK routing. Retaining as IN-01 for traceability but no change is required.)

---

### IN-02: `CLAUDE_PROJECT_DIR` fallback in obs-summarize.js silently uses CWD

**File:** `.claude/scripts/obs-summarize.js:39`

**Issue:** When `CLAUDE_PROJECT_DIR` is not set, the script falls back to `'.'` (current working directory):

```js
const obsDir = path.resolve(process.env.CLAUDE_PROJECT_DIR || '.', '.claude', 'logs', 'observations');
```

If the script is invoked from a directory that is not the project root, it will resolve to the wrong observations directory and either crash with "no observations dir" (recoverable) or, in a worst case, silently find a different project's obs.jsonl. The error messages (lines 41, 49) do include the resolved path, so the failure is diagnosable, but it is a sharp edge for users who tab-complete from a subdirectory.

**Fix:** Document the `CLAUDE_PROJECT_DIR` requirement in the script header comment, or add a warning when falling back:

```js
const projectDir = process.env.CLAUDE_PROJECT_DIR || (() => {
  process.stderr.write('obs-summarize: CLAUDE_PROJECT_DIR not set, using CWD as project root\n');
  return '.';
})();
const obsDir = path.resolve(projectDir, '.claude', 'logs', 'observations');
```

---

_Reviewed: 2026-04-21T14:23:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

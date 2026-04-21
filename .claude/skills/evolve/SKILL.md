---
name: evolve
description: >-
  Memory evolution command. Dispatches @observer for new events, auto-promotes
  all Pending Review entries to Permanent sections, scans for expired entries
  via confidence-based decay, triggers LLM consolidation at capacity threshold,
  shows a unified summary, and lets the user manage entries by number.
user-invocable: true
---

# Evolve

Run this command after pipeline sessions to promote learned insights from
Pending Review to Permanent memory, flags expired entries for removal or
re-evaluation, and triggers LLM-powered consolidation when files approach
capacity limits. Dispatches the @observer to analyze new events, auto-promotes
all pending entries, then shows a unified summary with optional revert/remove.

**Constraints:**
- Do NOT prompt the user per-entry. Auto-promote ALL entries, then offer batch revert.
- Do NOT use the Edit tool for bulk file operations. All file manipulation goes through evolve.js.
- If observer fails, still promote existing Pending Review entries.
- Do NOT auto-remove expired entries. Flag them for user decision per D-04.

## Step 1: Dispatch Observer

Use the Agent tool to dispatch `@observer` with this prompt:

```
Process new events. Read your cursor and process new runs from obs.jsonl.
Report your completion summary when done.
```

After the observer completes, parse its text output for key stats:
- Extract `Runs processed: (\d+)` into `obs_runs`
- Extract `Entries written: (\d+)` into `obs_written`
- Extract `Candidates rejected: (\d+)` into `obs_rejected`

If the Agent tool dispatch fails (error, timeout, or exception), set
`obs_runs = -1` (flag for failure), log the error text, and continue to
Step 2. Observer failure must not block promotion of already-written entries.

## Step 2: Scan for Pending Entries

Run via Bash tool:

```bash
node .claude/scripts/memory/evolve.js scan
```

Parse the JSON output. Store the result as `scan_result`.

**Quick exit (D-06):** If `scan_result.total` is 0 AND either:
- `obs_runs == 0` (observer found nothing new), or
- `obs_runs == -1` (observer failed)

Then display:

```
No new events. No pending entries. Nothing to do.
```

And STOP. Do not proceed to Step 3.

**Re-scan after observer writes:** If `scan_result.total` is 0 but
`obs_written > 0`, re-run the scan command -- the observer just wrote
entries that the first scan missed (race timing).

## Step 3: Promote All Entries

Run via Bash tool:

```bash
node .claude/scripts/memory/evolve.js promote
```

Parse the JSON output. Store the result as `promote_result`. The
`promote_result.promoted` array contains all promoted entries with their
`global_index`, `original` text, and `promoted` text (pointer stripped).

## Step 4: Decay Scan

Run via Bash tool:

```bash
node .claude/scripts/memory/evolve.js decay
```

Parse the JSON output. Store the result as `decay_result`.

The `decay_result` contains:
- `expired` -- array of files with expired entries. Each file entry has a `path`, `type`, and `entries` array. Each entry has `global_index`, `line`, `text`, `confidence`, `age_days`, and `ttl_days`.
- `capacity_warnings` -- array of files at or above 180 lines. Each has `path`, `type`, and `lines`.
- `total_expired` -- total count of expired entries across all files.

## Step 5: Consolidation Check

If `decay_result.capacity_warnings` is empty, skip directly to Step 6.

For each file in `decay_result.capacity_warnings`:

1. Read the file's current content using the Read tool.

2. Extract the `## Permanent` section text (the heading plus all entries beneath it, up to the next `##` heading or end of file).

3. Dispatch `@observer` via the Agent tool with the following consolidation prompt (substitute actual values for `{file_path}`, `{line_count}`):

```
Consolidate the ## Permanent section of {file_path}.

The file is at {line_count} lines (cap: 200). Rewrite the ## Permanent section to be
more concise while preserving all essential knowledge. You may:
- Merge entries that cover the same topic into a single, tighter entry
- Remove entries that are superseded by later, more specific entries
- Tighten wording without losing meaning
- Preserve all [HIGH] confidence entries (do not remove them)
- Preserve the entry format conventions:
  - MEMORY.md: `- [CONF] agent: insight text`
  - insights.md: `- [YYYY-MM-DD] [CONF] insight text`

Current ## Permanent section:

{current_permanent_section_content}

Output ONLY the complete rewritten ## Permanent section (heading + entries). Do not include other sections. Do not explain your changes.
```

4. Parse the observer response. The response should contain the rewritten `## Permanent` block starting with the `## Permanent` heading.

5. Show the user a before/after comparison inline:

```
Consolidation proposed for {file_path} ({line_count} lines):

--- CURRENT ---
{current_permanent_section_content}

--- PROPOSED ---
{observer_rewritten_permanent_section}

Apply this consolidation? (yes/no)
```

6. Wait for user input.
   - If `yes`: use the Edit tool to replace the current `## Permanent` section in the file with the proposed rewrite. Store the file path in a `consolidated_paths` list for Step 9.
   - If `no`: skip. The capacity warning will still appear in the unified summary in Step 6.

## Step 6: Display Unified Summary

First, display observer stats (if observer succeeded, i.e., `obs_runs >= 0`):

```
Observer processed {obs_runs} runs, wrote {obs_written} entries, rejected {obs_rejected}.
```

If the observer failed (`obs_runs == -1`), display:

```
Observer dispatch failed. Promoting existing pending entries.
```

Then display the unified summary with three sections and continuous numbering.

**Index scheme:**
- Promoted entries use the `global_index` from `promote_result` (range 1..N where N = `promote_result.total`).
- Expired entries use display number = `promote_result.total + decay_entry.global_index`.

```
All entries auto-promoted to Permanent sections:

**insights.md files:**
  1. [{skill-name}] [{CONF}] {insight text}
  2. [{skill-name}] [{CONF}] {insight text}

**MEMORY.md files:**
  3. [{agent-name}] [{CONF}] {insight text}
  4. [{agent-name}] [{CONF}] {insight text}

**PLAYBOOK.md:**
  5. [{CONF}] {insight text}

Expired entries (flagged for review):
  6. [{agent-name}] [{CONF}] {insight text} (age: {age_days}d, TTL: {ttl_days}d)
  7. [{agent-name}] [{CONF}] {insight text} (age: {age_days}d, TTL: {ttl_days}d)

Capacity warnings:
  {file_path}: {lines}/200 lines
```

To build each promoted line:
- Extract the skill or agent name from the file path (the parent directory
  name, e.g., `pipeline-design` from `.claude/skills/pipeline-design/insights.md`,
  or `researcher` from `.claude/agent-memory/researcher/MEMORY.md`).
- Extract the confidence tag and insight text from the `promoted` field in
  the JSON output.
- For PLAYBOOK.md entries, omit the name prefix.
- Use the `global_index` from the promote output as the display number.

To build each expired line:
- Extract agent name from the file path.
- Use display number = `promote_result.total + decay_entry.global_index`.
- Show `age_days` and `ttl_days` from the decay entry.

If `promote_result.permanent_sections_created > 0`, append:

```
(Created ## Permanent section in {N} files)
```

**Empty state:** If `promote_result.total` is 0 AND `decay_result.total_expired` is 0 AND `decay_result.capacity_warnings` is empty, display:

```
No promoted entries. No expired entries. No capacity warnings.
```

Then skip directly to Step 9.

## Step 7: User Interaction

**If `decay_result.total_expired` is 0** (no expired entries), display the simpler prompt:

```
Revert any? (enter numbers, or press Enter to keep all)
```

**Otherwise** (expired entries exist), display:

```
Revert any promoted? Remove any expired? (numbers, or Enter to keep all)
```

Wait for user input.

- If user presses Enter (empty input): skip to Step 8. All expired entries will be upgraded to HIGH in Step 8.
- If user provides numbers (e.g., `2,4` or `2 4` or `2, 4`): parse the input into a list of integers. Classify each number:
  - Numbers in range 1..`promote_result.total` are **promoted reverts**.
  - Numbers in range (`promote_result.total + 1`)..(`promote_result.total + decay_result.total_expired`) are **expired removals**.
  - Numbers outside both ranges: display a warning ("Number {n} is out of range -- skipped.") and skip.

## Step 8: Execute Actions

Three sequential operations:

**(a) Revert promoted** -- if any numbers fell in the promoted range:

Run via Bash tool with the promoted indices as space-separated arguments:

```bash
node .claude/scripts/memory/evolve.js revert {n1} {n2} ...
```

Parse the JSON output. Store the result as `revert_result`.

**(b) Remove expired** -- if any numbers fell in the expired range:

Map each display number back to its decay global index:
`decay_global_index = display_number - promote_result.total`

Run via Bash tool:

```bash
node .claude/scripts/memory/evolve.js decay-remove {decay_idx1} {decay_idx2} ...
```

Parse the JSON output. Store the result as `remove_result`.

**(c) Upgrade kept expired** -- identify the decay global indices that were NOT included in the removal list. These are "kept" entries. Run:

```bash
node .claude/scripts/memory/evolve.js decay-upgrade {kept_idx1} {kept_idx2} ...
```

Parse the JSON output. Store the result as `upgrade_result`.

**If user pressed Enter (kept all):** ALL expired entries get upgraded. Collect all `global_index` values from `decay_result.expired[*].entries[*].global_index` and run `decay-upgrade` with all of them.

Display action summary (omit lines with zero count):

```
{revert_result.total} entries reverted.
{remove_result.total} expired entries removed.
{upgrade_result.total} expired entries upgraded to [HIGH].
```

## Step 9: Commit Changes

Stage all modified memory files using `git add` with specific file paths.

Do NOT use `git add -A` or `git add .` -- stage only the files that were
actually modified by evolve.js or by consolidation.

Build the file list by collecting paths from:
- `promote_result.promoted` entries (paths of files written to)
- `revert_result.reverted` entries (if reverts happened)
- `remove_result.removed` entries (if decay-remove ran)
- `upgrade_result.upgraded` entries (if decay-upgrade ran)
- `consolidated_paths` list (files whose ## Permanent section was rewritten in Step 5)

Deduplicate the collected paths. Example:

```bash
git add .claude/skills/pipeline-design/insights.md
git add .claude/agent-memory/researcher/MEMORY.md
git add .claude/PLAYBOOK.md
```

Commit with a descriptive message:

- No decay actions and no consolidation:
  `evolve: promote {promote_result.total} entries to permanent memory`
- Decay actions occurred (remove and/or upgrade), no consolidation:
  `evolve: promote {promote_result.total}, decay {remove_result.total}rem/{upgrade_result.total}upg entries`
- Consolidation occurred (with or without decay actions):
  `evolve: promote {promote_result.total}, decay {remove_result.total}rem/{upgrade_result.total}upg entries, consolidate {consolidated_paths.length} files`
- If no decay actions but consolidation occurred:
  `evolve: promote {promote_result.total} entries to permanent memory, consolidate {consolidated_paths.length} files`

## Step 10: Done

Display the final evolution summary (omit zero-count items):

```
Evolution complete. {net_promoted} entries promoted, {revert_result.total} reverted, {remove_result.total} expired removed, {upgrade_result.total} upgraded to HIGH.
```

Where `net_promoted` = `promote_result.total` - `revert_result.total`.

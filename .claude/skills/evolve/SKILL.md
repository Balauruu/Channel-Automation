---
name: evolve
description: >-
  Memory evolution command. Dispatches @observer for new events, auto-promotes
  all Pending Review entries to Permanent sections across memory files, shows
  a numbered summary, and lets the user revert specific entries by number.
user-invocable: true
---

# Evolve

Run this command after pipeline sessions to promote learned insights from
Pending Review to Permanent memory. Dispatches the @observer to analyze new
events, auto-promotes all pending entries, then shows a summary with optional
revert.

**Constraints:**
- Do NOT prompt the user per-entry. Auto-promote ALL entries, then offer batch revert.
- Do NOT use the Edit tool for bulk file operations. All file manipulation goes through evolve.js.
- If observer fails, still promote existing Pending Review entries.

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

## Step 4: Display Summary

First, display observer stats (if observer succeeded, i.e., `obs_runs >= 0`):

```
Observer processed {obs_runs} runs, wrote {obs_written} entries, rejected {obs_rejected}.
```

If the observer failed (`obs_runs == -1`), display:

```
Observer dispatch failed. Promoting existing pending entries.
```

Then display promoted entries grouped by type, using this format:

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
```

To build each line:
- Extract the skill or agent name from the file path (the parent directory
  name, e.g., `pipeline-design` from `.claude/skills/pipeline-design/insights.md`,
  or `researcher` from `.claude/agent-memory/researcher/MEMORY.md`).
- Extract the confidence tag and insight text from the `promoted` field in
  the JSON output.
- For PLAYBOOK.md entries, omit the name prefix (there is no parent context).
- Use the `global_index` from the promote output as the display number.

If `promote_result.permanent_sections_created > 0`, append:

```
(Created ## Permanent section in {N} files)
```

## Step 5: Revert Prompt

Display:

```
Revert any? (enter numbers, or press Enter to keep all)
```

Wait for user input.

- If user presses Enter (empty input): skip to Step 7.
- If user provides numbers (e.g., `2,4` or `2 4` or `2, 4`): parse the
  input into a list of integers. Proceed to Step 6.

## Step 6: Execute Reverts

Run via Bash tool with the parsed indices as space-separated arguments:

```bash
node .claude/scripts/memory/evolve.js revert {n1} {n2} ...
```

Parse the JSON output. Store the result as `revert_result`.

Display what was reverted:

```
Reverted {revert_result.total} entries:
  - #{global_index}: [{name}] {entry text}
  - #{global_index}: [{name}] {entry text}
```

## Step 7: Commit Changes

Stage all modified memory files using `git add` with specific file paths
extracted from the promote output (and revert output if applicable).

Do NOT use `git add -A` or `git add .` -- stage only the files that were
actually modified by evolve.js.

Build the file list from `promote_result.promoted` paths. Example:

```bash
git add .claude/skills/pipeline-design/insights.md
git add .claude/agent-memory/researcher/MEMORY.md
git add .claude/PLAYBOOK.md
```

Commit with a descriptive message (use gross counts -- what was actually
written/removed -- so the commit reflects file operations performed):

- If no reverts: `evolve: promote {promote_result.total} entries to permanent memory`
- If reverts happened: `evolve: promote {promote_result.total} entries, revert {revert_result.total} entries`

## Step 8: Done

Display the final summary (use net promoted count so the user sees the
effective result):

```
Evolution complete. {promote_result.total - revert_result.total} entries promoted, {revert_result.total} reverted.
```

Where `promote_result.total` is the gross promoted count and
`revert_result.total` is the number of entries reverted (0 if no reverts).

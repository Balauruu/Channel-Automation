# Phase 3: Evolve Command - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 03-evolve-command
**Areas discussed:** Review interaction flow, Observer dispatch behavior, Edit and revert mechanics, Skill structure

---

## Review Interaction Flow

### Entry Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| File-at-a-time | Show all entries for one target file, then action the whole group | ✓ |
| One-at-a-time | Present each entry individually with promote/edit/revert | |
| Bulk overview | Show ALL entries across all files in one view | |

**User's choice:** File-at-a-time
**Notes:** User noted autoresearch is deprecated and manually deleted — do not use as example.

### Entry Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Per-entry AskUserQuestion | AskUserQuestion for each entry | |
| Batch number input | Type actions in one go | |
| Promote-all default | Promote all, pick exceptions | |

**User's choice:** Other — "This should be automated and done by the skill, no human gate should be present, but if recommended the optimal approach would be: batch recommendation with option to edit the recommendations."

### Human Review Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-promote all, show summary | Promote everything, show what happened | |
| Auto-promote with batch override | Auto-promote by default, show results with option to edit/revert | ✓ |
| Keep human gate (per requirements) | Preserve EVLV-03 as written | |

**User's choice:** Auto-promote with batch override
**Notes:** Changes EVLV-03 and PROJECT.md Out of Scope entry about auto-promotion.

### Promote Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Promote first, show after | Auto-promote immediately, show summary after | ✓ |
| Show plan, then promote | Show what will be promoted, confirm, then apply | |

**User's choice:** Promote first, show after

---

## Observer Dispatch Behavior

### Dispatch Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Always observe then review | Every /evolve dispatches observer first | ✓ |
| Observe + review separately | --review-only flag to skip observer | |
| Review-only by default | Observer only with --observe flag | |

**User's choice:** Always observe then review

### Empty State

| Option | Description | Selected |
|--------|-------------|----------|
| Quick exit with status | Report nothing to do and exit | ✓ |
| Show memory health summary | Display memory stats on empty state | |

**User's choice:** Quick exit with status

### Project Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Current project only | CLAUDE_PROJECT_DIR for project detection | ✓ |
| All projects | Scan all project directories | |
| User-specified | Optional project argument | |

**User's choice:** Current project only

### Observer Report Display

| Option | Description | Selected |
|--------|-------------|----------|
| Brief stats inline | Key numbers: runs, entries, rejections | ✓ |
| Full observer report | Entire completion report | |
| Silent | Skip observer output | |

**User's choice:** Brief stats inline

---

## Edit and Revert Mechanics

### Revert Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Delete from Permanent section | Simple Edit removal, git history for recovery | ✓ |
| Git revert of observer commit | Revert the specific commit | |
| Move back to Pending Review | Un-promote instead of delete | |

**User's choice:** Delete from Permanent section

### Edit Option

| Option | Description | Selected |
|--------|-------------|----------|
| Show original, ask for replacement | Display entry, user types corrected version | |
| Claude rewrites, user confirms | Claude proposes edit, user approves | |
| You decide | Let Claude design edit flow | |

**User's choice:** Other — "Editing a promoted entry shouldn't be an option, just promote or reject."
**Notes:** No edit flow needed. Simplifies to promote (auto) or reject (revert/delete) only.

### Revert UX

| Option | Description | Selected |
|--------|-------------|----------|
| Numbered revert prompt | Type numbers to revert, Enter to keep all | ✓ |
| AskUserQuestion per file group | MultiSelect per file | |
| No revert prompt | No revert option in flow | |

**User's choice:** Numbered revert prompt

---

## Skill Structure

### Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| User-invocable skill (SKILL.md only) | Single file, Claude does all file ops | |
| Skill + JS helper | SKILL.md for orchestration + evolve.js for file ops | ✓ |
| Agent definition | @evolve agent | |

**User's choice:** Skill + JS helper
**Notes:** User requested detailed pros/cons table before deciding. Deterministic file ops across 21 files justified the JS helper for reliability and testability.

### Script Location

| Option | Description | Selected |
|--------|-------------|----------|
| .claude/scripts/evolve.js | Top-level in scripts/ | |
| .claude/scripts/memory/evolve.js | New memory/ subdirectory | ✓ |
| .claude/hooks/evolve.js | In hooks/ directory | |

**User's choice:** .claude/scripts/memory/evolve.js
**Notes:** Sets up for Phase 5 lifecycle scripts.

### Script CLI

| Option | Description | Selected |
|--------|-------------|----------|
| scan + promote + revert | Three subcommands with JSON output | ✓ |
| Single command with flags | One entry point with --scan/--promote/--revert | |
| You decide | Let Claude design CLI | |

**User's choice:** scan + promote + revert

### Promotion Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Same pattern for all | ## Pending Review → ## Permanent everywhere | ✓ |
| insights.md: merge into main entries | Promoted entries merge into main body | |

**User's choice:** Same pattern for all

### Pointer Stripping

| Option | Description | Selected |
|--------|-------------|----------|
| Strip pointer on promote (per D-05) | Remove evidence pointer when moving to Permanent | ✓ |
| Keep full entry | Preserve pointer in Permanent | |

**User's choice:** Strip pointer on promote

---

## Claude's Discretion

- JS script internal structure and error handling
- Exact JSON output schema for subcommands
- Skill prompt structure and observer dispatch prompt
- Edge case handling (malformed entries, missing sections)
- Commit strategy for promoted changes

## Deferred Ideas

None — discussion stayed within phase scope

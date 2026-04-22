# Phase 6: Old Memory Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 06-old-memory-cleanup
**Areas discussed:** Live file cleanup, Uncommitted deletions, Planning docs refresh, Verification scope

---

## Live File Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Remove + update (Recommended) | Delete stale lines and add entries for new system paths (PLAYBOOK.md, logs/observations/) | ✓ |
| Remove only | Delete stale lines but don't add new entries | |
| You decide | Claude picks the best approach | |

**User's choice:** Remove + update — keep Folder Map accurate for all agents
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it (Recommended) | Dead gitignore entries add confusion | ✓ |
| Keep it | Harmless to leave | |

**User's choice:** Remove the .gitignore entry for .claude/project-memories/
**Notes:** None

---

## Uncommitted Deletions

| Option | Description | Selected |
|--------|-------------|----------|
| Commit all in Phase 6 (Recommended) | Single commit for all 8 deletions | ✓ |
| Separate commits by type | One commit per category (hooks, skill, fixtures) | |
| You decide | Claude picks commit strategy | |

**User's choice:** Commit all in Phase 6 as a single commit
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Include in Phase 6 | Already deleted on disk, commit alongside other removals | ✓ |
| Investigate first | Check what autoresearch did before committing deletion | |

**User's choice:** Include in Phase 6 — deletion was intentional
**Notes:** User confirmed: "Include in Phase 6, it was intentional"

---

## Planning Docs Refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Regenerate (Recommended) | Run /gsd-map-codebase for fresh maps | ✓ |
| Manual patch | Find-and-replace stale references in existing maps | |
| Leave as-is | Codebase maps are pre-milestone snapshots | |

**User's choice:** Regenerate codebase maps via /gsd-map-codebase
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite to current state (Recommended) | Replace "Current State (Broken)" with working system description | ✓ |
| Keep as historical | Section documents what was broken before milestone | |
| You decide | Claude picks the best approach | |

**User's choice:** Rewrite PROJECT.md to reflect current state
**Notes:** None

---

## Verification Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Grep audit (Recommended) | Automated grep across .claude/ and CLAUDE.md | |
| Full codebase grep | Grep across entire repo including .planning/ | ✓ |
| Trust prior phases | No additional verification pass | |

**User's choice:** Full codebase grep — most thorough verification
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Delete old phase artifacts | Remove completed phase directories (01-05) entirely | |
| Leave files, fix references | Keep artifacts but update actionable references (paths, file names) | ✓ |

**User's choice:** Leave files in place, fix actionable references pointing to dead locations
**Notes:** Narrative context stays intact; only paths and file names pointing to non-existent locations get updated

---

## Claude's Discretion

- Exact wording for CLAUDE.md Folder Map new entries
- Exact wording for PROJECT.md "Current State" rewrite
- Which references in historical phase artifacts are actionable vs. narrative
- Commit message wording and operation ordering

## Deferred Ideas

None — discussion stayed within phase scope

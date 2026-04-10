---
phase: 02-skills-library
reviewed: 2026-04-10T12:45:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .claude/skills/documentary-research/SKILL.md
  - .claude/skills/archive-search/SKILL.md
  - .claude/skills/crawl4ai-scraping/SKILL.md
  - .claude/skills/visual-narrative/SKILL.md
  - .claude/skills/media-evaluation/SKILL.md
  - .claude/skills/data-analysis/SKILL.md
  - .claude/skills/autoresearch/SKILL.md
  - .claude/skills/structured-output/SKILL.md
  - .claude/skills/documentary-research/insights.md
  - .claude/skills/archive-search/insights.md
  - .claude/skills/crawl4ai-scraping/insights.md
  - .claude/skills/visual-narrative/insights.md
  - .claude/skills/media-evaluation/insights.md
  - .claude/skills/data-analysis/insights.md
  - .claude/skills/autoresearch/insights.md
  - .claude/skills/structured-output/insights.md
  - .claude/references/skill-crafting-guide.md
  - tests/smoke-test-skills.js
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-10T12:45:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed 8 SKILL.md files, 8 insights.md template files, the skill-crafting-guide reference, and the smoke test script. All 82 smoke test cases pass. The skills library is well-structured: every skill has correct frontmatter, Phase 0 context loading, Reflection Phase, and both [HEURISTIC] and [DETERMINISTIC] tags. Cross-skill references (autoresearch -> documentary-research, archive-search, crawl4ai-scraping) are accurate. Channel doc references (`@channel/channel.md`, `@channel/VISUAL_STYLE_GUIDE.md`) all resolve to existing files.

One warning-level logic issue in the test file and four informational findings related to minor inconsistencies and code quality.

## Warnings

### WR-01: Redundant conditional in test runner

**File:** `tests/smoke-test-skills.js:146`
**Issue:** The `else if (!ok)` check is redundant. At this point in execution, the `if (ok)` on line 145 has already failed, so `ok` is guaranteed to be falsy. The `!ok` guard is dead logic. While this does not cause a bug today, it suggests the original intent may have been a three-way branch (pass/fail/error) that was not completed. If a future refactor changes `check()` to return non-boolean values (e.g., `undefined`, `0`, `null`), the `else if` could mask edge cases by falling through silently instead of reporting the failure.
**Fix:**
```javascript
    if (ok) passed++;
    else console.log('  Expected: true, Got: false');
```

## Info

### IN-01: Scoring scale inconsistency between archive-search and structured-output conventions

**File:** `.claude/skills/archive-search/SKILL.md:119`
**Issue:** The archive-search skill uses a 1-4 scale for its Relevance Scoring dimensions, while the structured-output skill's JSON Schema Patterns section (line 197) defines the convention as "integer 1-5 for tier/rating scales." The archive-search design is intentional (4 dimensions x 4 levels = composite 4-16), but an agent loading both skills simultaneously may be confused by the conflicting scale conventions. The media-evaluation skill uses 1-5, which aligns with the structured-output convention.
**Fix:** Add a brief note to the structured-output convention clarifying that multi-dimensional composite scoring systems may use different per-dimension ranges: `"integer 1-5 for tier/rating scales (composite multi-dimension scores may use different per-dimension ranges)"`.

### IN-02: Seven of eight skill descriptions exceed 250-character UI truncation limit

**File:** `.claude/skills/archive-search/SKILL.md:3-7` (and 6 other SKILL.md files)
**Issue:** The skill-crafting-guide states descriptions are "truncated at 250 chars in the UI." Only documentary-research (250 chars) fits within the limit. The remaining 7 skills range from 265 to 302 characters. This means the key use-case text at the end of each description may be cut off in the Claude Code UI, reducing discoverability.
**Fix:** Trim descriptions to front-load the primary use case within 250 characters. For example, archive-search (270 chars) could drop "for archival footage and documents" from the end since it is implied by the earlier text.

### IN-03: Loose frontmatter validation in smoke tests

**File:** `tests/smoke-test-skills.js:48`
**Issue:** The frontmatter checks use `content.includes()` which matches anywhere in the file body, not just within the YAML frontmatter delimiters (`---`). For example, `content.includes('user-invocable: true')` would pass even if that string appeared in a prose paragraph rather than the frontmatter. For a smoke test this is acceptable, but if the test suite is later used as a validation gate, this could produce false passes.
**Fix:** If stricter validation is needed in the future, extract the frontmatter between the first two `---` delimiters before checking:
```javascript
check: () => {
  const content = fs.readFileSync(skillMd, 'utf8');
  const frontmatter = content.split('---')[1] || '';
  return frontmatter.includes(`name: ${skill}`) && frontmatter.includes('user-invocable: true');
}
```

### IN-04: Four skills lack Phase 0 channel doc reference while four include one

**File:** `.claude/skills/crawl4ai-scraping/SKILL.md:17-20`, `.claude/skills/data-analysis/SKILL.md:18-21`, `.claude/skills/autoresearch/SKILL.md:20-23`, `.claude/skills/structured-output/SKILL.md:17-20`
**Issue:** Four skills (documentary-research, archive-search, visual-narrative, media-evaluation) include a step in Phase 0 to read a channel doc (`@channel/channel.md` or `@channel/VISUAL_STYLE_GUIDE.md`). The other four skills (crawl4ai-scraping, data-analysis, autoresearch, structured-output) only read `insights.md` in Phase 0 with no channel doc reference. This is likely intentional (not all skills need channel context), but the autoresearch skill references documentary-research and archive-search skills in its body (line 127) without loading the channel docs those skills depend on. If autoresearch drives an agent to apply documentary-research patterns, the channel context may be missing.
**Fix:** Consider adding a note in autoresearch Phase 0: "If applying documentary-research or archive-search patterns, also load relevant channel docs referenced in those skills."

---

_Reviewed: 2026-04-10T12:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---
name: archive-search
description: >-
  Internet Archive, Prelinger Collection, and YouTube archive navigation
  expertise. Source discovery patterns, rate limiting rules, relevance
  scoring for archival footage and documents. Use when searching for
  historical footage, public domain media, or archival documents.
user-invocable: true
---

# Archive Search Expertise

Domain knowledge for navigating video and document archives to find b-roll footage, historical documents, and reference material for documentary production. This skill provides archive navigation expertise -- search procedures and automation live in pipeline scripts.

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/archive-search/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read channel visual style guide: @channel/VISUAL_STYLE_GUIDE.md

## Internet Archive Navigation [DETERMINISTIC]

### Search Operators

- **Collection targeting:** Use `collection:prelinger`, `collection:newsandpublicaffairs`, `collection:opensource_movies` to scope searches to curated collections before falling back to keyword search.
- **Media type filtering:** Filter with `mediatype:movies` for video, `mediatype:texts` for documents, `mediatype:audio` for audio recordings.
- **Date range filtering:** Use `date:[1950-01-01 TO 1969-12-31]` syntax for era-specific searches.
- **Subject filtering:** Combine with `subject:keyword` to narrow within collections.
- **Advanced Search API:** Use the API endpoint for programmatic queries. Batch metadata queries (up to 50 per request) but download files individually.

### Collection Guide

| Collection | Strengths | Best For |
|-----------|-----------|----------|
| `prelinger` | 1940s-1970s American industrial/educational films | Suburban life, factory footage, Cold War imagery, classroom settings, atomic age |
| `newsandpublicaffairs` | News broadcasts and public affairs programming | Event coverage, political speeches, press conferences |
| `opensource_movies` | General public domain video | Broad searches when specific collection unknown |

### Download Rules

- **Format preference:** Prefer `.mp4` (H.264) downloads. Fall back to `.ogv` if mp4 unavailable. Avoid `.avi` (large files, codec issues).
- **Size limits:** Check file sizes before downloading. Skip files > 2GB unless specifically needed.
- **Identifier preservation:** Save the archive.org identifier (not the full URL) for reproducibility. Identifiers are URL-stable.

### Rate Limiting

- Download one file at a time with 2-second pauses between downloads
- Batch metadata queries up to 50 per request
- Respect `robots.txt` -- do not circumvent access restrictions
- On HTTP 429: stop immediately, wait at least 5 minutes before retrying

## Prelinger Collection Rules [DETERMINISTIC]

### Navigation Strategy

Browse by decade first, then by category (industrial, educational, advertising, amateur). The decade index at `archive.org/details/prelinger` is the most efficient entry point.

### Coverage Map

| Era | Coverage Quality | Notes |
|-----|-----------------|-------|
| Pre-1930s | Poor | Very limited holdings |
| 1930s-1940s | Moderate | Some educational and government films |
| 1940s-1970s | Excellent | Core strength -- industrial, educational, advertising |
| Post-1980s | Poor | Collection focus is mid-century |

### Rights Verification

- Most Prelinger items are public domain, but verify per-item
- Check the "Rights" field on each item's metadata page
- Items marked "Public Domain" or "No Known Copyright Restrictions" are safe to use
- Items with specific license terms (Creative Commons variants) must follow those terms
- When in doubt, note the rights status for the user to verify before final use

### Quality Tiers for Footage

| Quality | Description | Usability |
|---------|-------------|-----------|
| A | Clean transfer, good contrast, stable frame | Direct use in edit |
| B | Minor artifacts, slight softness, occasional frame issues | Usable with color correction |
| C | Heavy artifacts, poor contrast, unstable | Last resort -- stylize as intentional grain |
| D | Severely damaged, missing frames, unwatchable | Do not use |

## YouTube Search Strategies [HEURISTIC]

### Query Construction

- Use specific historical terms combined with "footage", "documentary", or "newsreel"
- Add year ranges directly in the query for temporal specificity
- Use period-appropriate terminology: "aeroplane" for pre-1950 British content, event names rather than modern retronyms
- Example: `"Chicago 1968 riots footage"` not `"1968 protests"`

### Channel Credibility Assessment

Prefer institutional channels over random uploaders. Reliability hierarchy:

1. **Official archives:** Museums, national archives, libraries (highest trust)
2. **News organizations:** AP, Reuters, BBC, established broadcasters
3. **Universities and researchers:** Academic channels with clear institutional affiliation
4. **Documentary producers:** Known production companies with track records
5. **Individual uploaders:** Lowest trust -- verify provenance claims independently

### AI Content Detection

Flag and skip videos showing signs of AI generation:
- Unnatural motion patterns, morphing artifacts
- Historically impossible details (modern objects in historical settings)
- Unnaturally smooth or perfect footage from eras with known film limitations
- When uncertain, note the concern in evaluation -- do not silently include

### Creative Commons Filtering

Use YouTube's Creative Commons filter when searching for reusable content. Note that CC-licensed YouTube content is CC-BY, which requires attribution in the final video credits.

## Relevance Scoring [DETERMINISTIC]

Score every search result on a 1-4 scale across four dimensions:

| Dimension | 4 (Excellent) | 3 (Good) | 2 (Fair) | 1 (Poor) |
|-----------|--------------|----------|----------|----------|
| Topic match | Directly depicts the subject | Related subject, same context | Tangentially related | Irrelevant |
| Era accuracy | Correct time period, verified | Correct era, not verified | Close era (within 10 years) | Wrong era |
| Visual quality | Broadcast-ready | Needs minor correction | Needs heavy processing | Unusable |
| Rights status | Public domain, verified | CC or licensed, clear terms | Rights unclear | Rights restricted |

**Composite scoring:**
- **Include (12-16):** Add to asset list with high confidence
- **Consider (8-11):** Add to asset list with caveats noted
- **Skip (4-7):** Do not include unless nothing better is available

## Script References

> Scripts below are documented for reference. Available after Phase 6 integration.

- `media/ia_search.py` -- Internet Archive search with metadata extraction and filtering
- `media/discover.py` -- Multi-source discovery across archives, YouTube, and web sources

## Reflection Phase

After completing archive search work:
1. Re-read your search results and evaluations from start to finish
2. Identify one specific insight about search strategies, archive quirks, or quality patterns
3. Append one line to `.claude/skills/archive-search/insights.md`: `- [YYYY-MM-DD] insight text`
4. Never skip this phase -- insights compound over time

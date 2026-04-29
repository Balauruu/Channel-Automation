# Researcher Memory

## Key Files
- Research dossier output: projects/*/research/Research.md
- Entity index output: projects/*/research/entity_index.json
- Source notes: projects/*/research/sources/
- Source manifest: projects/*/research/source_manifest.json
- Channel DNA: channel/channel.md
- Research CLI: editorial/researcher/cli.py (survey, deepen, write, status)

## Decisions
- 4-pass research pipeline: Survey (breadth) -> Deep Dive (depth) -> Gap Fill (conditional) -> Synthesize (structure). Pass 3 runs only when entities are unresolved, a planned section has zero Tier 1-3 sources, or a contradiction needs targeted resolution.
- Source hierarchy: court documents > government reports > contemporary news > books > retrospective articles > blogs > forums
- Unverifiable claims marked [UNVERIFIED] and placed in Open Questions, never in main dossier body
- Entity index uses structured IDs: P001 (people), L001 (locations), O001 (organizations), D001 (documents)
- Topic must satisfy 3 of 4 channel criteria: obscurity, complexity, shock factor, verifiable
- Source credibility table uses structured signals (type, corroboration, access quality) not scalar scores
- Dossier targets ~2,000 words of curated content regardless of raw source volume -- distill, do not summarize
- WebSearch/WebFetch are first-class tools for Pass 3 (targeted gap fill); scripts (survey, deepen, write) cover Passes 1, 2, and 4.

## Patterns
- Wikipedia is a starting point, never an endpoint -- follow its references to primary sources
- Conflicting sources presented side-by-side with assessment, not silently resolved
- Court records before 1970 are rarely digitized -- newspaper coverage is the best proxy
- Academic papers behind paywalls often have freely available preprints on ResearchGate
- Names must be verified for correct spelling across multiple sources before inclusion
- Local journalism contains details national outlets sanitize -- prioritize regional sources for names, dates, eyewitness quotes
- Pass 1 survey evaluation uses 3 criteria in priority order: primary source potential, unique perspective, contradiction signals

## Observations
- Wikipedia API (action=query with rvprop=content) is the most efficient way to pull full article text including citations for offline source tracing
- The researcher CLI scripts require crawl4ai; when it is not installed, fall back to Python urllib.request -- all core research is achievable but DDG search is lost; the Wikipedia API + targeted URL fetching via urllib is sufficient for well-documented historical topics

## Open Questions
- Install crawl4ai in the editorial conda env -- all researcher scripts fail without it; urllib.request is the fallback but loses DDG search capability
- DDG link extraction fails with CrawlerRunConfig unexpected keyword 'extract_links' -- survey script falls back to static URL list only; no keyword-driven discovery

## Archived

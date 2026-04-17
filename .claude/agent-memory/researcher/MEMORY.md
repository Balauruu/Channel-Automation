# Researcher Memory

## Key Files
- Research dossier output: projects/*/research/Research.md
- Entity index output: projects/*/research/entity_index.json
- Source notes: projects/*/research/sources/
- Source manifest: projects/*/research/source_manifest.json
- Channel DNA: channel/channel.md
- Research CLI: editorial/researcher/cli.py (survey, deepen, write, status)

## Decisions
- [2026-04-10] 3-pass research pipeline: Survey (breadth) -> Deep Dive (depth) -> Synthesis (structure)
- [2026-04-10] Source hierarchy: court documents > government reports > contemporary news > books > retrospective articles > blogs > forums
- [2026-04-10] Unverifiable claims marked [UNVERIFIED] and placed in Open Questions, never in main dossier body
- [2026-04-10] Entity index uses structured IDs: P001 (people), L001 (locations), O001 (organizations), D001 (documents)
- [2026-04-10] Topic must satisfy 3 of 4 channel criteria: obscurity, complexity, shock factor, verifiable
- [2026-04-10] Source credibility table uses structured signals (type, corroboration, access quality) not scalar scores
- [2026-04-10] Dossier targets ~2,000 words of curated content regardless of raw source volume -- distill, do not summarize

- [2026-04-16] Replaced fixed 3-pass pipeline with adaptive iterative loop driven by autoresearch skill. Depth calibrated to topic complexity (2-8 iterations). Quality gates between passes. Convergence detection stops iteration when source saturation + claim classification + entity resolution + timeline consistency are met.
- [2026-04-16] WebSearch/WebFetch added as fallback tools. Scripts remain primary; native tools used only when scripts fail or iterative loop needs search strategies scripts don't support.

## Patterns
- [2026-04-10] Wikipedia is a starting point, never an endpoint -- follow its references to primary sources
- [2026-04-10] Conflicting sources presented side-by-side with assessment, not silently resolved
- [2026-04-10] Court records before 1970 are rarely digitized -- newspaper coverage is the best proxy
- [2026-04-10] Academic papers behind paywalls often have freely available preprints on ResearchGate
- [2026-04-10] Names must be verified for correct spelling across multiple sources before inclusion
- [2026-04-10] Local journalism contains details national outlets sanitize -- prioritize regional sources for names, dates, eyewitness quotes
- [2026-04-10] Pass 1 survey evaluation uses 3 criteria in priority order: primary source potential, unique perspective, contradiction signals

## Observations
- [2026-04-11] CBC News archives are the most reliable and retrievable English-language source for Canadian institutional abuse stories from the 1990s-2000s
- [2026-04-11] Wikipedia API (action=query with rvprop=content) is the most efficient way to pull full article text including citations for offline source tracing
- [2026-04-11] Many CBC archive URLs from 2004-2010 are broken; the article format changed and old paths 404. Use the current CBC news article URL format (with article title slug) rather than the old /categories/society/ paths
- [2026-04-11] Érudit (erudit.org) uses bot-detection (Anubis) -- access academic papers through PubMed abstract or DOI metadata instead of direct crawling
- [2026-04-16] CBC Archives entry URLs (cbc.ca/archives/entry/...) only render an index landing page, not the archival content body -- use specific cbc.ca/news/canada/... article URLs instead
- [2026-04-16] CTV News article bodies are JS-rendered; basic HTTP extraction returns navigation only -- use Archive.org CDX API to find snapshot URLs for CTV articles
- [2026-04-16] New York Times articles from the 1990s are paywalled at current URLs but often fully accessible via Archive.org snapshots; search for the specific archived URL in Wikipedia's reference list
- [2026-04-16] The researcher CLI scripts require crawl4ai; when it is not installed, fall back to Python urllib.request -- all core research is achievable but DDG search is lost; the Wikipedia API + targeted URL fetching via urllib is sufficient for well-documented historical topics
- [2026-04-16] CBMH.ca (Canadian Bulletin of Medical History) domain resolves to an unrelated website -- access this journal via DOI, institutional library, or use Wikipedia's page-level citations as proxies for Tier 1 academic content

## Open Questions

- [2026-04-16] Install crawl4ai in the editorial conda env — all researcher scripts fail without it; urllib.request is the fallback but loses DDG search capability


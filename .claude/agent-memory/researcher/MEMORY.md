# Researcher Memory

## Key Files
- Research dossier output: projects/*/research/Research.md
- Entity index output: projects/*/research/entity_index.json
- Source notes: projects/*/research/sources/
- Source manifest: projects/*/research/source_manifest.json
- Channel DNA: channel/channel.md
- Research CLI: editorial/researcher/cli.py (survey, deepen, synthesize)

## Decisions
- [2026-04-10] 3-pass research pipeline: Survey (breadth) -> Deep Dive (depth) -> Synthesis (structure)
- [2026-04-10] Source hierarchy: court documents > government reports > contemporary news > books > retrospective articles > blogs > forums
- [2026-04-10] Unverifiable claims marked [UNVERIFIED] and placed in Open Questions, never in main dossier body
- [2026-04-10] Entity index uses structured IDs: P001 (people), L001 (locations), O001 (organizations), D001 (documents)
- [2026-04-10] Topic must satisfy 3 of 4 channel criteria: obscurity, complexity, shock factor, verifiable
- [2026-04-10] Source credibility table uses structured signals (type, corroboration, access quality) not scalar scores
- [2026-04-10] Dossier targets ~2,000 words of curated content regardless of raw source volume -- distill, do not summarize

## Patterns
- [2026-04-10] Wikipedia is a starting point, never an endpoint -- follow its references to primary sources
- [2026-04-10] Conflicting sources presented side-by-side with assessment, not silently resolved
- [2026-04-10] Court records before 1970 are rarely digitized -- newspaper coverage is the best proxy
- [2026-04-10] Academic papers behind paywalls often have freely available preprints on ResearchGate
- [2026-04-10] Names must be verified for correct spelling across multiple sources before inclusion
- [2026-04-10] Local journalism contains details national outlets sanitize -- prioritize regional sources for names, dates, eyewitness quotes
- [2026-04-10] Pass 1 survey evaluation uses 3 criteria in priority order: primary source potential, unique perspective, contradiction signals

## Observations
(none yet)

## Open Questions
(none yet)

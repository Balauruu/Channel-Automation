# Strategy Memory

## Key Files
- Competitor database: data/channel_assistant.db (SQLite)
- Strategy CLI: strategy/cli.py (add, scrape, analyze, topics, init)
- Topic briefs output: strategy/topic_briefs.md
- Competitor analysis output: strategy/competitors/analysis.md
- Channel DNA: channel/channel.md
- Past topics: channel/past_topics.md (if exists)
- Project directories: projects/<name>/
- Topic generation rubric: anchored scoring with 5 dimensions (obscurity, complexity, shock factor, verifiability, pillar fit)

## Decisions
- [2026-04-10] Topics scored across 5 dimensions: obscurity, complexity, shock factor, verifiability, pillar fit -- each on a 1-5 scale with anchored examples
- [2026-04-10] Topic briefs produce exactly 5 candidates ranked by total score descending -- never filter below a threshold
- [2026-04-10] Near-duplicates tagged and included, never silently dropped -- use [Similar to:] or [DIFFERENT ANGLE:] tags
- [2026-04-10] Tiebreaker order when scores are equal: shock factor > obscurity > verifiability
- [2026-04-10] Channels with < 1K subscribers AND high upload frequency flagged as potential content farms -- track for saturation analysis but do not treat as quality competitors
- [2026-04-10] Rate limiting incidents during scraping tracked in memory to inform future scraping schedules

## Patterns
- [2026-04-10] Underserved topic clusters from competitor analysis are highest-value generation targets -- proven demand with low supply
- [2026-04-10] Cross-product entity queries (person + institution, location + time period) surface less-discovered topics with higher obscurity scores
- [2026-04-10] Channels with < 1K subscribers AND AI content signals indicate content farm saturation in a topic area
- [2026-04-10] Autocomplete suggestion breadth correlates with search demand -- more suggestions indicate broader audience interest
- [2026-04-10] Topic clusters where 3+ competitors publish within 30 days signal either trending opportunity or saturation -- cross-reference with search trends to disambiguate
- [2026-04-10] Seasonal patterns exist in true crime content (anniversary coverage, holiday-themed mysteries) -- factor into timing recommendations

## Observations
(none yet)

## Open Questions
(none yet)

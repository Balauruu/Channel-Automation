# Strategy Memory

## Key Files
- Competitor database: data/channel_assistant.db (SQLite)
- Strategy CLI: .claude/scripts/strategy/channel_assistant/cli.py (add, scrape, analyze, topics)
- Topic briefs output: channel/strategy/topics.md
- Competitor analysis output: channel/strategy/analysis.md
- Competitor registry: channel/strategy/competitors.json
- Channel DNA: channel/channel.md
- Past topics: channel/past_topics.md (if exists)
- Project directories: projects/<name>/
- Topic generation rubric: anchored scoring with 5 dimensions (obscurity, complexity, shock factor, verifiability, pillar fit)

## Decisions
- Topics scored across 5 dimensions: obscurity, complexity, shock factor, verifiability, pillar fit -- each on a 1-10 scale with anchored examples (max total 50)
- Topic briefs produce exactly 5 candidates ranked by total score descending -- never filter below a threshold
- Near-duplicates tagged and included, never silently dropped -- use [Similar to:] or [DIFFERENT ANGLE:] tags
- Tiebreaker order when scores are equal: shock factor > obscurity > verifiability
- Channels with < 1K subscribers AND high upload frequency flagged as potential content farms -- track for saturation analysis but do not treat as quality competitors
- Rate limiting incidents during scraping tracked in memory to inform future scraping schedules

## Patterns
- Underserved topic clusters from competitor analysis are highest-value generation targets -- proven demand with low supply
- Cross-product entity queries (person + institution, location + time period) surface less-discovered topics with higher obscurity scores
- Channels with < 1K subscribers AND AI content signals indicate content farm saturation in a topic area
- Autocomplete suggestion breadth correlates with search demand -- more suggestions indicate broader audience interest
- Topic clusters where 3+ competitors publish within 30 days signal either trending opportunity or saturation -- cross-reference with search trends to disambiguate
- Seasonal patterns exist in true crime content (anniversary coverage, holiday-themed mysteries) -- factor into timing recommendations

## Observations
- Non-domestic geography consistently outperforms domestic-focused content in the dark mystery niche -- international cases carry novelty premium
- Long-form 25-50 min single-subject format gaining algorithm and audience share vs list-format content
- Hybrid angles (combining two pillars/themes) generate 1.5-2.5x median views vs single-theme videos in competitor data

## Open Questions

## Archived

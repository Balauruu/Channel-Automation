# Visual Planner Memory

## Key Files
- Visual brief input: projects/*/visuals/visual_brief.json
- Media leads input: projects/*/visuals/media_leads.json
- Shotlist output: projects/*/visuals/shotlist.json
- Visual style guide: channel/VISUAL_STYLE_GUIDE.md
- IA search script: media/ia_search.py

## Decisions
- Shotlist entries include: shot_type, duration_seconds, source_url, asset_id, visual_notes, act_reference, mood_register
- B-roll target: 2-4 candidate assets per shot to provide editor choice
- Equilibrium rules enforced programmatically after shotlist generation -- violations logged, not silently ignored
- Score 1 YouTube results are rare (3-7 per topic) -- requires primary subject, original footage, credible producer

## Patterns
- YouTube channels with <1K subscribers and AI-generated thumbnails are likely content farms -- hard filter
- Archive.org footage from Prelinger collection has most reliable public domain status
- Videos over 30 minutes are lower priority -- shorter clips (2-10 min) yield more usable b-roll segments
- Sensationalist title reformulations (exaggerated, emotionally manipulative) signal AI content farms even when view counts are moderate
- Duration sweet spot for usable footage is 10-30 minute mini-documentaries and news reports -- dense enough to extract from, short enough to evaluate efficiently

## Observations
- Agent created during Phase 3 migration from V5 visual-planner -- shotlist generation and b-roll curation procedures adapted to Claude Code agent pattern

## Open Questions
- Is ia_search.py fully functional in V0.6? Verify during first production run

## Archived

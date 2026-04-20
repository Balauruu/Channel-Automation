# Visual Planner Memory

## Key Files
- Visual brief input: projects/*/visuals/visual_brief.json
- Media leads input: projects/*/visuals/media_leads.json
- Shotlist output: projects/*/visuals/shotlist.json
- Shotlist edit sheet: projects/*/visuals/shotlist_edit_sheet.md
- Visual style guide: channel/VISUAL_STYLE_GUIDE.md
- IA search script: media/ia_search.py

## Decisions
- [2026-04-10] Shotlist entries include: shot_type, duration_seconds, source_url, asset_id, visual_notes, act_reference, mood_register
- [2026-04-10] B-roll target: 2-4 candidate assets per shot to provide editor choice
- [2026-04-10] Equilibrium rules enforced programmatically after shotlist generation -- violations logged, not silently ignored
- [2026-04-10] Score 1 YouTube results are rare (3-7 per topic) -- requires primary subject, original footage, credible producer

## Patterns
- [2026-04-10] YouTube channels with <1K subscribers and AI-generated thumbnails are likely content farms -- hard filter
- [2026-04-10] Archive.org footage from Prelinger collection has most reliable public domain status
- [2026-04-10] Videos over 30 minutes are lower priority -- shorter clips (2-10 min) yield more usable b-roll segments
- [2026-04-10] Sensationalist title reformulations (exaggerated, emotionally manipulative) signal AI content farms even when view counts are moderate
- [2026-04-10] Duration sweet spot for usable footage is 10-30 minute mini-documentaries and news reports -- dense enough to extract from, short enough to evaluate efficiently

## Observations
- [2026-04-10] Agent created during Phase 3 migration from V5 visual-planner -- shotlist generation and b-roll curation procedures adapted to Claude Code agent pattern

## Open Questions
- [2026-04-10] Is ia_search.py fully functional in V0.6? Verify during first production run

## Pending Review


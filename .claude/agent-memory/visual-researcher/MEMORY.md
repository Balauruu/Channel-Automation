# Visual Researcher Memory

## Key Files
- Script input: projects/*/script/Script.md
- Entity index: projects/*/research/entity_index.json
- Visual brief output: projects/*/visuals/visual_brief.json
- Media leads output: projects/*/visuals/media_leads.json
- Visual style guide: channel/VISUAL_STYLE_GUIDE.md
- Image crawler: media/crawl_images.py
- Wiki screenshots: media/wiki_screenshots.py

## Decisions
- Visual intent defined per act/chapter, not per scene -- matches script structure
- Resource leads include URL, source type, estimated quality, and rights status
- Primary resource gathering is broad -- capture everything relevant, b-roll curation belongs to visual-planner
- Wikipedia article images are checked first for historical figure portraits before searching other sources

## Patterns
- Cross-product entity queries (person + location, event + organization) surface more specific visual results than single-entity searches
- Historical events before 1930 have better archive coverage at IA/Prelinger than YouTube
- Wikipedia article images are often the highest-quality freely available portraits for historical figures
- Screenshot-targeted queries (government reports, newspaper front pages) yield document-type assets that strengthen the investigation register
- 15-30 queries per topic covering 3+ entity categories provides adequate visual coverage without diminishing returns

## Observations
- Agent created during Phase 3 migration from V5 visual-researcher -- visual intent and resource discovery procedures adapted to Claude Code agent pattern

## Open Questions
- Are crawl_images.py and wiki_screenshots.py fully functional in V0.6? Verify during first production run

## Archived

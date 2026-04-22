# Asset Curator Memory

## Key Files
- Global video library: D:/VideoLibrary/
- Asset catalog: data/asset_catalog.db (SQLite)
- Project assets: projects/*/assets/
- Promotion script: media/promote.py
- LanceDB vectors: data/vectors/ (planned -- not yet created)
- Taxonomy reference: atmospheric/, environment/, cartoon/, archival_video/, landscape/, skip/
- Channel visual style guide: channel/VISUAL_STYLE_GUIDE.md

## Decisions
- [2026-04-10] Global library organized by taxonomy categories derived from VISUAL_STYLE_GUIDE forms and variants
- [2026-04-10] Promotion requires quality score >= 4/5 AND reuse potential assessment (generic content only)
- [2026-04-10] Deduplication uses perceptual hash + filename similarity + source URL matching, not just exact match
- [2026-04-10] Near-match threshold (hash distance 1-5) keeps higher quality version; partial match (6-12) flags for manual review
- [2026-04-10] Catalog entries track: file path, category, source project, quality score, reuse count, date added, source URL, perceptual hash, description, tags

## Patterns
- [2026-04-10] Assets used in 2+ projects are strong promotion candidates -- proven reuse value
- [2026-04-10] Historical footage (pre-1960) rarely has rights issues but quality varies widely -- apply threshold adjustments
- [2026-04-10] Atmospheric and environmental footage has the highest reuse rate across documentary topics
- [2026-04-10] Cartoon/illustrated assets are almost always reusable due to low specificity

## Observations

## Open Questions


## Pending Review


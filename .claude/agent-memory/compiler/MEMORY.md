# Compiler Memory

## Key Files
- Script input: projects/*/script/Script.md
- Shotlist input: projects/*/visuals/shotlist.json
- Asset source: projects/*/assets/
- Edit sheet output: projects/*/edit/edit_sheet.md
- Manifest output: projects/*/edit/manifest.json
- Asset organizer: media/organize_assets.py
- Channel visual style guide: channel/VISUAL_STYLE_GUIDE.md

## Decisions
- [2026-04-10] Edit sheet uses markdown format with embedded timing cues in brackets: [00:00-01:30]
- [2026-04-10] Asset naming convention: {project}_{act}_{shot_number}_{descriptor}.{ext} (5 words max descriptor)
- [2026-04-10] Timing calculation base: 150 words per minute of narration, with cold open at 160-170 wpm
- [2026-04-10] Organized assets in edit/assets/ are copies, not moves -- originals preserved in assets/
- [2026-04-10] Multiple assets per shot use alphabetic suffixes: S001a_, S001b_

## Patterns
- [2026-04-10] Acts with fewer than 3 asset references signal gaps in visual planning -- flag in coverage stats
- [2026-04-10] Edit sheet should include fallback text for shots without matched assets
- [2026-04-10] Coverage percentage is the primary quality signal: below 70% warrants re-running asset processing

## Observations

## Open Questions


## Pending Review


# Style Extractor Memory

## Key Files
- Voice profile: channel/voice-profile.md
- Channel DNA: channel/channel.md
- Visual style guide: channel/VISUAL_STYLE_GUIDE.md
- Reference scripts: projects/*/script/Script.md
- Voice analysis workspace: channel/voice-analysis/
- Extraction procedure reference: extraction rules for auto-caption detection and reconstruction

## Decisions
- [2026-04-10] Auto-generated captions detected by: repetitive filler phrases, missing punctuation, run-on sentences, phonetic misspellings, bracket tags -- threshold is 3+ signals
- [2026-04-10] Voice extraction requires minimum 2 reference scripts for reliable pattern identification -- single-script patterns may be topic-specific rather than channel-universal
- [2026-04-10] Reconstructed scripts saved alongside originals (not replacing them) with _clean.md suffix for auditability
- [2026-04-10] Rules must be syntactic or mechanical instructions, not tone adjectives -- "Use declarative sentences without modal qualifiers" not "Be calm"

## Patterns
- [2026-04-10] Channel voice is clinical/neutral/deadpan -- gravity comes from the story, not from performance
- [2026-04-10] Short declarative sentences (under 10 words) serve as structural breathing points after heavy information -- do not merge with adjacent sentences
- [2026-04-10] Chapter titles use evocative register (what it feels like) not descriptive register (what happens) -- "Strangers in the Jungle" not "Two Outsiders Arrive"
- [2026-04-10] Source attribution follows a hierarchy: direct attribution for sourced claims, explicit inference markers for deductions, zero unlabed speculation
- [2026-04-10] Transition phrases carry channel-specific rhythm -- generic connectors (furthermore, notably, however) are excluded from the phrase library

## Observations
(none yet)

## Open Questions
(none yet)

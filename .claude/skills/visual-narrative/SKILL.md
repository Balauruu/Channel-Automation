---
name: visual-narrative
description: >-
  Visual storytelling expertise for documentary production: shot format
  vocabulary, mood-to-visual register mapping, primary vs b-roll selection
  rules, and visual pacing guidelines. Use when planning shots, selecting
  footage, or evaluating visual narrative coherence.
user-invocable: true
---

# Visual Narrative Expertise

Domain knowledge for translating narrative intent into visual language. This skill provides the vocabulary, mappings, and selection rules that inform visual decisions -- shot format choice, mood-to-visual mapping, primary vs b-roll balance, and pacing. The procedural workflow for shot planning (how to generate a shotlist from a script) lives in the visual-planner agent body, not here.

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/visual-narrative/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read the channel visual style guide: @channel/VISUAL_STYLE_GUIDE.md
   - This defines the channel's visual identity, asset types, shot forms, equilibrium rules, and hard constraints
   - All visual decisions must align with this guide

## Visual Format Vocabulary [DETERMINISTIC]

The channel uses five primary visual format categories. Every shot in a video uses exactly one. Understanding each format's purpose and constraints is essential for coherent visual storytelling.

### Primary Footage (action: "find")

Real footage that directly documents the subject -- photographs, archival video, document scans, press clippings.

| Attribute | Guideline |
|-----------|-----------|
| **Purpose** | Ground the narrative in reality. Primary footage says "this happened, here is proof." |
| **When to use** | Whenever narration references specific people, places, events, or evidence |
| **Duration** | 4-8 seconds typical hold. Documents can be shorter (3-5s) |
| **Transition rules** | Strong as opening shots. Can follow any format. Provides grounding between constructed visuals. |
| **Forms** | `archival_photo`, `archival_video`, `document`, `landscape` |

### Vector Silhouettes (action: "generate")

Flat silhouette compositions generated via ComfyUI. Depict scenes, actions, and interactions that cannot be photographed.

| Attribute | Guideline |
|-----------|-----------|
| **Purpose** | Scene depiction, emotional abstraction, and gap-filling when no primary footage exists |
| **When to use** | Narration describes specific actions or interactions without documentary footage; emotional beats; abstract concepts |
| **Duration** | 4-8 seconds. Sequences of 1-3 beats for transformations |
| **Transition rules** | Should not appear back-to-back with cartoon b-roll without a primary shot between them. Both are "constructed" visuals. |
| **Composition** | High contrast, no facial features, clear spatial relationships, minimal environment detail |
| **Forms** | `vector_silhouette` (variants: scene_depiction, emotional_beat, symbolic_figure, group_dynamic) |

### Old Cartoon B-Roll (action: "curate")

Public domain animated shorts used metaphorically. Fleischer-era, early Disney PD, industrial/educational animations.

| Attribute | Guideline |
|-----------|-----------|
| **Purpose** | Conceptual metaphor. Cartoons depict the concept being discussed, never the literal subject. The juxtaposition of innocent aesthetics against dark content is intentional. |
| **When to use** | Conceptual and atmospheric registers. At least 10% of total shots. |
| **Duration** | 2-5 seconds typical. Short, punchy selections. |
| **Transition rules** | Never for grounding register. Should not appear back-to-back with vectors without a primary shot between them. |
| **Source rules** | archive.org only. Point to specific episodes by name, not collections. |
| **Forms** | `broll_cartoon` (variants: authority_figure, confinement, deception, mechanical_process) |

### Atmospheric B-Roll (action: "curate")

Non-specific footage that sets mood -- empty corridors, institutional interiors, landscapes, mechanical processes, environmental textures.

| Attribute | Guideline |
|-----------|-----------|
| **Purpose** | Visual breathing room. Establishes mood, bridges sections, provides texture between specific shots. |
| **When to use** | Atmospheric and transitional visual registers. When narration needs pacing variety. |
| **Duration** | 3-6 seconds. Longer holds acceptable for transitional moments. |
| **Transition rules** | Strong as opening shots when no primary footage exists. Distribute across video, not clustered. |
| **Source rules** | archive.org only. Avoid bright, modern, or clean-looking footage. Should feel aged and heavy. |
| **Forms** | `broll_atmospheric` (variants: institutional, industrial, urban, interior), `broll_environment` (variants: nature, urban, rural, water) |

### Editor-Created Elements (action: "create")

Text cards, diagrams, timelines, and overlays created directly in DaVinci Resolve.

| Attribute | Guideline |
|-----------|-----------|
| **Purpose** | Information delivery. Quotes, dates, names, statistics, relationship diagrams, timelines. |
| **When to use** | When specific text, data, or structural relationships need explicit visual presentation |
| **Duration** | 3-5 seconds for text cards. Diagrams may hold longer (5-10s) if animated. |
| **Target allocation** | ~10% of total shots |
| **Forms** | `text_card` (variants: quote, date_location, character_intro, statistic), `diagram` (variants: relationship, timeline, comparison, process) |

### Screen-Time Distribution Target

| Format | Target % | Flexibility |
|--------|----------|------------|
| Primary footage | ~30% | Higher when abundant archival material exists |
| Vector silhouettes | ~30% | Higher when subjects lack documentary footage |
| B-roll (cartoons + atmospheric) | ~30% | Cartoons specifically at least 10% |
| Editor-created elements | ~10% | Diagrams and text cards as needed |

This is a target, not a hard rule. Adapt to what exists for each topic.

## Mood-to-Visual Register Mapping [HEURISTIC]

Visual register is the emotional quality of what the viewer sees. Each narrative mood maps to specific visual choices -- this mapping is judgment-based, not mechanical. Use these as guidelines and adapt to the specific story's needs.

### Dread / Tension

The audience should feel unease, anticipation of something wrong.

- **Visual choices:** Tight framing, slow zoom-ins, constrained compositions. Figures isolated or trapped in frame.
- **Color temperature:** Cool desaturated tones (before post-production treatment)
- **Camera movement:** Slow, deliberate. Creeping push-ins.
- **Asset preference:** Atmospheric b-roll (institutional, interior), vectors with claustrophobic composition
- **Pacing:** Slow cuts, lingering holds. Let discomfort build.

### Revelation / Shock

A truth is being uncovered or exposed. The moment of "and then they discovered..."

- **Visual choices:** Quick cuts to archival documents, close-ups of evidence. Rapid information density.
- **Color temperature:** Neutral shifting to warm (the light of discovery)
- **Camera movement:** Sharp cuts rather than smooth transitions. Snap to the evidence.
- **Asset preference:** Primary footage (documents, photographs). The reveal should feel grounded in reality.
- **Pacing:** Fast cuts at the moment of reveal, then a long slow hold on the key piece of evidence. Let it sink in.

### Investigation / Discovery

Methodical uncovering. The researcher piecing things together.

- **Visual choices:** Document montages, map overlays, timeline graphics. Visual information layering.
- **Color temperature:** Warm tones suggesting intellectual engagement
- **Camera movement:** Medium pace, methodical progression through visual evidence
- **Asset preference:** Mix of primary (documents, maps) and editor-created (timelines, diagrams). This register is where text cards and diagrams earn their screen time.
- **Pacing:** Medium, steady rhythm. Each shot delivers one piece of the puzzle.

### Melancholy / Loss

Grief, absence, the weight of what happened to real people.

- **Visual choices:** Wide compositions with negative space. Empty landscapes, abandoned locations.
- **Color temperature:** Cool, muted. Absence of warmth.
- **Camera movement:** Very slow or static. No urgency.
- **Asset preference:** Atmospheric b-roll (empty spaces, landscapes), vectors showing isolation or absence
- **Pacing:** Very slow. Lots of breathing room. Let the silence speak.

### Chaos / Breakdown

Things falling apart. Systems failing, violence erupting, order collapsing.

- **Visual choices:** Overlapping images, rapid montage, visual overload. The frame should feel unstable.
- **Color temperature:** Shifting, inconsistent. The visual palette itself is destabilized.
- **Camera movement:** Handheld feel (even in still images, achieved through rapid juxtaposition)
- **Asset preference:** Mix of multiple formats in rapid succession. Cartoons for dark irony, vectors for violence that cannot be shown, archival for grounding moments of clarity.
- **Pacing:** Accelerating. Cuts get faster as chaos builds. Then a hard stop -- silence and stillness when the dust settles.

### Calm Exposition

Straightforward information delivery. Setting the scene, providing background.

- **Visual choices:** Clean compositions, standard framing. Nothing calling attention to itself.
- **Color temperature:** Neutral, balanced
- **Camera movement:** Static or very gentle. Stability.
- **Asset preference:** Primary footage (establishing shots, portraits), editor-created (text cards for names and dates)
- **Pacing:** Medium, consistent. Informational rhythm.

### Register Transition Guidelines

- Transitions between registers should align with narrative transitions, not happen mid-sentence
- The shift from one register to another is itself a storytelling tool -- a sudden cut from melancholy to revelation creates impact
- Establish a visual "home base" register per chapter (the dominant mood) and use others as accents
- A chapter can have multiple register shifts, but each shift should serve a narrative purpose

## Primary vs B-Roll Selection [DETERMINISTIC]

### Primary Footage Rules

Primary footage carries the narrative. It directly documents the subject matter.

**What counts as primary:**
- Photographs of people, places, and objects central to the story
- Court records, letters, newspaper front pages, official reports
- Maps and location images
- Video footage of events, press conferences, news reports
- Wikipedia captures of key entities (for visual reference, not as a source)

**Selection rules:**
1. Every chapter must include at least one primary asset to anchor the narrative in reality
2. When primary footage exists for a moment, prefer it over all other format types
3. Check available media_leads before assigning alternative formats -- if research found archival photos, use them
4. Primary footage for grounding and emotional registers carries the most weight

### B-Roll Rules

B-roll supports and illustrates. It does not carry the narrative independently.

**What counts as b-roll:**
- Atmospheric footage matching the era and mood (non-specific to the subject)
- Cartoon clips used metaphorically (never literally depicting the subject)
- Environmental establishing shots (geographic anchoring)

**Selection rules:**
1. B-roll is atmospheric, never literal -- "institutional corridor footage" works for any story about institutions
2. Curate per-shot with specific search queries, matching the narrative beat
3. Quality over quantity -- one well-matched clip beats three mediocre ones
4. Cartoons match the concept being discussed, not the period or location

### Coverage Ratio Assessment

Evaluate shot distribution against these benchmarks:

| Metric | Healthy Range | Warning Signs |
|--------|--------------|---------------|
| Primary footage % | 25-40% | Below 20% = story feels ungrounded. Above 50% = slideshow risk |
| B-roll % (all types) | 25-35% | Below 15% = visual monotony. Above 40% = story lacks specificity |
| Cartoon % | 10-20% | Below 10% = missing channel signature. Above 25% = novelty wears thin |
| Consecutive same-type | Max 3 | 4+ consecutive = visual monotony regardless of type |

### Equilibrium Enforcement

These rules prevent visual monotony (from the channel's visual style guide):

1. No more than 3 consecutive shots with the same action type
2. Every chapter must include at least one `find` shot (primary asset)
3. `generate` and `curate` (cartoon) shots should not appear back-to-back without a `find` shot between them
4. B-roll distributed across the video, not clustered in one section
5. Opening shot should use `find` or `curate` (atmospheric) when possible
6. Curated b-roll (atmospheric + cartoon) should total at least 15% of shots

## Visual Pacing Guidelines [HEURISTIC]

Shot duration and cut rhythm directly affect how the audience processes information and emotion. These guidelines establish baseline pacing -- adjust based on specific narrative needs.

### Shot Duration by Content Type

| Content Type | Duration Range | Notes |
|-------------|---------------|-------|
| Talking head / interview | 5-15s | Longer holds acceptable for emotional testimony |
| Primary photo | 4-8s | Standard hold. Shorter for rapid evidence montage. |
| Primary document | 3-5s | Enough to register what it is, not to read it fully |
| B-roll atmospheric | 3-6s | Longer for transitional/breathing room moments |
| B-roll cartoon | 2-5s | Short and punchy. The metaphor registers quickly. |
| Vector silhouette | 4-8s | Longer for emotional beats, shorter for action sequences |
| Text card | 3-5s | Must be readable at natural speed |
| Diagram | 5-10s | Longer if animated/revealing information progressively |

### Cut Rhythm by Narrative Beat

| Beat Type | Rhythm | Example |
|-----------|--------|---------|
| Scene establishment | Slow, measured (6-8s per shot) | Opening a new chapter. Let the viewer orient. |
| Information delivery | Medium, steady (4-6s per shot) | Background exposition. Consistent pacing. |
| Building tension | Gradually shortening (6s -> 4s -> 3s) | Approaching a revelation. Pace accelerates. |
| Climactic reveal | Very fast then very slow (2s, 2s, 2s, then 8s hold) | Rapid cuts to evidence, then linger on the key image. |
| Emotional aftermath | Very slow (8-12s per shot) | After a disturbing revelation. Let it breathe. |
| Transition | Medium (4-5s) | Moving between topics or chapters. Atmospheric b-roll. |

### Avoiding Visual Monotony

- Vary shot duration within sections. Even during steady pacing, alternate between 4s and 6s holds rather than using exactly 5s for every shot.
- Change format types regularly. The channel's mixed-media aesthetic (primary + vectors + cartoons + atmospheric) is its visual signature.
- Use pace changes to signal narrative shifts. When the cut rhythm changes, the audience subconsciously registers that the story is entering a new phase.
- A sequence of shots at the same duration feels mechanical. Introduce micro-variations (half-second differences) for organic rhythm.

## Script References

- `.claude/scripts/media/discover.py` -- Visual source discovery across archive collections
- `.claude/scripts/media/organize_assets.py` -- Asset organization by visual role and narrative function

## Reflection Phase

After completing visual narrative work:
1. Re-read your output from start to finish
2. Identify one specific insight about what worked or what to improve
3. Append one line to `.claude/skills/visual-narrative/insights.md`: `- [YYYY-MM-DD] insight text`
4. Never skip this phase -- insights compound over time

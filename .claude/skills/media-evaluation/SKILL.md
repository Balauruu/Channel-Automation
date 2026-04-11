---
name: media-evaluation
description: >-
  Media asset quality scoring and relevance grading expertise. Provides
  1-5 scoring scales, calibration rules, technical quality assessment
  criteria, and query refinement strategies for footage evaluation. Use
  when scoring video clips, evaluating asset relevance, or calibrating
  media quality thresholds.
user-invocable: true
---

# Media Evaluation Expertise

Domain knowledge for scoring media assets, grading relevance, assessing technical quality, and refining search queries. This skill provides the evaluation vocabulary, scoring rubrics, and calibration methods that inform media decisions -- the evaluation workflow procedure (how to process a batch of assets) lives in the asset-curator agent body, not here.

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/media-evaluation/insights.md`
   - Even if empty, this confirms the learning loop is active
2. Read the channel visual style guide: @channel/VISUAL_STYLE_GUIDE.md
   - Quality standards and asset type definitions inform scoring decisions
   - Hard constraints in the style guide override any scoring generosity

## Quality Scoring Scale [DETERMINISTIC]

Score every media asset on a 1-5 scale. The score determines whether the asset reaches the editor or gets discarded.

| Score | Label | Criteria | Action |
|-------|-------|----------|--------|
| 5 | Broadcast quality | Sharp, well-lit, stable, clear audio (if applicable). Content, era, and mood all align with shot intent. No artifacts, no watermarks, no modern overlays. | Auto-promote to review |
| 4 | Good | Minor issues that do not affect usability. Slight softness, minor compression, small era mismatch. Content aligns well with shot intent. | Promote to review |
| 3 | Acceptable | Noticeable issues but usable with creative editing. Partial content match. Visible compression or grain that could be addressed in post. | Include in review with note |
| 2 | Marginal | Significant issues. Tangentially related content, heavy artifacts, wrong era feel. Use only if no alternative exists. | Skip unless nothing better |
| 1 | Reject | Unusable. Content irrelevant to shot intent, severe technical problems, or violates channel hard constraints (bright/corporate, AI photorealism). | Reject immediately |

### Scoring Decision Tree

When evaluating an asset, assess in this order:

1. **Hard constraint check** -- Does it violate any channel hard constraints? If yes, score 1 regardless of other qualities.
2. **Content match** -- Does the footage show what the shot description asks for? This is the highest-weight factor.
3. **Era accuracy** -- Does the footage look like it belongs in the correct time period?
4. **Mood alignment** -- Does the footage evoke the emotional register specified in the visual brief?
5. **Technical quality** -- Resolution, stability, artifacts, audio (assessed last because a perfect-content clip at lower resolution beats a crisp irrelevant clip).

### Score Modifiers

| Condition | Modifier |
|-----------|----------|
| Watermarked but clean version may exist | Score the clean potential, note watermark for follow-up |
| Period-appropriate imperfections (grain, soft focus on archival) | Do not penalize -- these add authenticity |
| Modern overlays on otherwise good archival footage | -1 from base score. Note overlay type. |
| Duration too short for intended shot | -1 if under 3 seconds of clean footage |

## Relevance Grading [DETERMINISTIC]

Relevance has three independent dimensions. Assess each separately, then combine into an overall relevance score.

### Topical Relevance

How closely the asset's content matches the narrative subject.

| Grade | Definition | Example |
|-------|-----------|---------|
| **Direct** | Depicts the actual subject, person, place, or event | A photograph of the specific cult compound being discussed |
| **Tangential** | Related to the topic but not the specific subject | Generic cult commune footage when discussing a specific cult |
| **Atmospheric** | Evokes the mood or era without topical connection | Empty institutional hallway for a story about any institution |

### Temporal Relevance

Whether the asset's visual era matches the narrative period.

| Grade | Definition | Guidance |
|-------|-----------|----------|
| **Era-matched** | Footage from the same decade as the narrative events | Ideal. Provides temporal grounding. |
| **Era-adjacent** | Within 20 years of narrative events | Acceptable for most uses. Note the gap. |
| **Era-mismatched** | Visually from a different period | Usable only for atmospheric/conceptual register, never for grounding. |

### Visual Relevance

Whether the asset's emotional qualities match the intended visual register.

| Grade | Definition |
|-------|-----------|
| **Register-aligned** | Footage naturally evokes the intended mood (e.g., dark institutional footage for a dread register) |
| **Register-neutral** | Footage is tonally flat -- could work with post-production treatment |
| **Register-conflicting** | Footage evokes the wrong mood (e.g., bright cheerful footage for a melancholy register) |

### Combined Relevance Score

| Topical | Temporal | Visual | Overall Score |
|---------|----------|--------|--------------|
| Direct | Era-matched | Aligned | 5 |
| Direct | Era-adjacent | Aligned | 4 |
| Direct | Any | Neutral | 3-4 |
| Tangential | Era-matched | Aligned | 3 |
| Tangential | Era-adjacent | Neutral | 2-3 |
| Atmospheric | Any | Aligned | 3 (for atmospheric/transitional register only) |
| Any | Any | Conflicting | Max 2 |
| Atmospheric | Era-mismatched | Neutral | 1-2 |

## Calibration Rules [HEURISTIC]

Scoring consistency is essential. Without calibration, scores drift over time and across sessions. These rules maintain scoring integrity.

### Anchor Calibration

Establish reference points for each score level:
- Before scoring a batch, mentally recall or review a known 5-score asset and a known 2-score asset
- Score the first 2-3 assets carefully, using them as session anchors
- If scoring feels off mid-batch, return to anchors and recalibrate

### Consistency Checks

- The same asset should score similarly across evaluations. If you find yourself re-scoring previously evaluated clips, compare against original scores.
- If an asset scores differently on re-evaluation, determine whether the discrepancy is due to changed context (different shot intent) or scoring drift.
- Track significant re-scoring events in insights.md as calibration data points.

### Threshold Adjustment by Context

Not all footage is held to the same standard. Adjust thresholds based on scarcity:

| Context | Threshold Adjustment |
|---------|---------------------|
| Rare historical footage (pre-1940, obscure events) | Lower technical standards by 1 point. A grainy, low-resolution clip of a rare event is more valuable than a crisp irrelevant clip. |
| Common topics with abundant footage | Raise standards. No reason to accept score-3 clips when score-4+ alternatives exist. |
| Highly specific shot requirements | Lower threshold if the specificity itself limits options. Note the compromise. |
| Generic atmospheric needs | Raise standards. Atmospheric footage is abundant -- accept only score-4+. |

### User Feedback Calibration

User approval/rejection of assets is ground truth. Adjust scoring based on feedback:

- User approves clips you scored 3 --> your threshold may be too conservative. Consider scoring similar clips 4 in future.
- User rejects clips you scored 4+ --> your visual match criteria may be too loose. Tighten content match requirements.
- After 3+ calibration events pointing the same direction, update your default thresholds.
- Document calibration adjustments in insights.md with the date and specific context.

## Technical Assessment Criteria [DETERMINISTIC]

Technical quality assessment independent of content relevance. These criteria apply to all footage types.

### Resolution Requirements

| Category | Minimum | Preferred | Notes |
|----------|---------|-----------|-------|
| Primary footage (archival video) | 480p | 720p+ | Lower acceptable for rare/unique content |
| Primary footage (photographs) | 800x600 | 1280x720+ | Must be sharp enough to display at 1080p without visible pixelation |
| B-roll footage | 480p | 720p+ | Standard threshold applies |
| Documents / screenshots | Readable text | Crisp text at native resolution | Legibility is the standard, not pixel count |

### Frame Rate

- Standard: 24fps or 30fps
- Archival footage may be 18fps or irregular -- acceptable, adds authenticity
- Interlaced footage: note for post-production deinterlacing. Not a rejection criterion.

### Audio Quality (Primary Footage Only)

Audio is only assessed for footage intended as primary/sync content (interviews, news broadcasts).

- Clear speech intelligibility is the minimum standard
- Background noise acceptable if speech is discernible
- B-roll audio is not evaluated -- it will be replaced by narration

### Artifact Detection

| Artifact | Severity | Action |
|----------|----------|--------|
| Compression artifacts (blockiness, banding) | Minor: acceptable. Severe: -1 score | Note severity level |
| Interlacing / combing | Low: acceptable. Severe: note for post | Flag for deinterlacing |
| Blank frames (black/white, color bars, countdowns) | Common at start/end of archival clips | Skip these sections, evaluate content frames only |
| Watermarks | Moderate concern | Check if clean version exists before scoring |
| Modern overlays (YouTube annotations, channel branding) | -1 score penalty | Note overlay type. May be croppable. |
| Aspect ratio issues (stretched, letterboxed) | Minor: note. Severe: -1 | Flag for post-production correction |

### Content Quality Flags

- **Period-appropriate text** (title cards, intertitles, captions): Valuable. Can enhance authenticity.
- **Modern text overlays**: Negative. YouTube annotations, lower thirds, channel branding detract from archival feel.
- **Blank/leader frames**: Common in archival digitization. Not a quality issue -- just skip to content.

## Query Refinement Strategies [HEURISTIC]

When search results are poor (average score below 3.0 across returned clips), refine the search strategy before accepting mediocre results.

### Broadening Strategies

Use when too few results are returned:

| Strategy | When to Use | Example |
|----------|-------------|---------|
| Remove era-specific terms | Search is too temporally narrow | "1923 cult compound" --> "cult compound" |
| Try synonym sets | Primary terms may not match archive metadata | "asylum" --> "mental hospital" / "sanitarium" / "state hospital" |
| Search adjacent collections | Current collection lacks coverage | Prelinger Archives --> other archive.org collections |
| Generalize location | Specific location has no footage | "Jonestown, Guyana" --> "South American jungle compound" |

### Narrowing Strategies

Use when results are plentiful but irrelevant:

| Strategy | When to Use | Example |
|----------|-------------|---------|
| Add specificity | Results too generic | "prison" --> "prison 1950s women" |
| Include event names | Generic terms return wrong era | "bombing" --> "bath school bombing 1927" |
| Specify source type | Wrong media format in results | Add "newsreel" or "photograph" to query |
| Add negative terms | Consistent false matches | Exclude terms that produce irrelevant results |

### Pivoting Strategies

Use when the current source cannot serve the need:

| Strategy | When to Use | Example |
|----------|-------------|---------|
| Switch archive source | Current source exhausted | archive.org --> Library of Congress digital collections |
| Change asset type | Video unavailable, photos might exist | Video search --> image search for the same subject |
| Request upstream revision | 3 rounds of refinement failed to produce score-4+ | Escalate to user -- the shot intent may need revision |

### Refinement Tracking

- Document each refinement attempt: original query, refined query, result quality delta
- If 3 rounds of refinement fail to produce score-4+ clips, stop refining and escalate
- Refinement success/failure patterns are high-value insights -- record in insights.md

## Script References

- `.claude/scripts/media/evaluate.py` -- Automated technical quality scoring (resolution, artifacts, blank frame detection)
- `.claude/scripts/media/search.py` -- CLIP semantic search across embedded asset library
- `.claude/scripts/media/embed.py` -- CLIP embedding generation for visual assets

## Reflection Phase

After completing media evaluation work:
1. Re-read your output from start to finish
2. Identify one specific insight about what worked or what to improve
3. Append one line to `.claude/skills/media-evaluation/insights.md`: `- [YYYY-MM-DD] insight text`
4. Never skip this phase -- insights compound over time

# Strategy Agent Rework — Design Spec

## Overview

Complete rework of the strategy agent from a data-collection shell with Claude-driven reasoning into a cache-aware intelligence platform with NLP analytics, structured database, and an interactive dashboard themed to the pizzint design system.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Interaction model | Dashboard-first | Open `dashboard.html` in browser for visual overview, drill into details via agent conversation |
| Data collection | YouTube Data API v3 | Structured, reliable, unlocks search/keyword data. Replaces yt-dlp. |
| Database | SQLite (extended) | Single source of truth for raw data, computed metrics, and pipeline state |
| Pipeline automation | Smart auto with interrupt, cache-aware | Runs end-to-end but pauses at decision points; skips stages whose inputs haven't changed |
| Topic generation | Claude-driven with computed data | Python computes NLP clusters, saturation scores, trends; Claude reasons over structured results |
| Competitor scope | Two-tier: Watch List (5-10) + Landscape (15-30) | Deep analysis on direct competitors, aggregate trend data from broader niche |
| Project init | Two-phase (init + package) | Init at topic selection (dirs + metadata.json); package after script (titles + YouTube description) |
| Dashboard tech | Plotly embeds in custom HTML template | Interactive charts + pizzint-themed surrounding UI |
| NLP stack | scikit-learn + YAKE | TF-IDF clustering, keyword extraction, all CPU, deterministic |
| Architecture | Hybrid: DB for data + state, files for reports | Computed metrics in DB for queryability; dashboard.html and topics.md as generated presentation files |
| Staleness threshold | 14 days | Data older than 14 days is tagged stale; 10-14 days shows aging warning |
| analysis.md | Eliminated | Redundant with DB + dashboard; topics command queries DB directly |
| competitors.json | Eliminated | Channel registry moves to database |

---

## 1. Database Schema

Extends the existing `data/channel_assistant.db` with SQLite. WAL mode and foreign key enforcement retained.

### Kept tables (evolved)

**channels**

| Column | Type | Notes |
|--------|------|-------|
| youtube_id | TEXT PK | Channel ID from API |
| name | TEXT NOT NULL | |
| handle | TEXT | @handle |
| url | TEXT | |
| subscribers | INTEGER | |
| total_views | INTEGER | |
| description | TEXT | |
| tier | TEXT NOT NULL DEFAULT 'landscape' | 'watch_list' or 'landscape' |
| added_at | TEXT NOT NULL | ISO 8601 |
| last_scraped_at | TEXT | ISO 8601 |

**videos**

| Column | Type | Notes |
|--------|------|-------|
| video_id | TEXT PK | |
| channel_id | TEXT FK → channels | |
| title | TEXT NOT NULL | |
| url | TEXT | |
| views | INTEGER | |
| likes | INTEGER | |
| comment_count | INTEGER | New |
| upload_date | TEXT | YYYY-MM-DD |
| description | TEXT | |
| duration | INTEGER | Seconds |
| thumbnail_url | TEXT | New |
| scraped_at | TEXT | ISO 8601 |

### New tables

**video_tags** — Normalized tags replacing JSON string column

| Column | Type |
|--------|------|
| video_id | TEXT FK → videos |
| tag | TEXT NOT NULL |

Composite PK: (video_id, tag). Index on tag for frequency queries.

**scrape_log** — Per-scrape-run tracking

| Column | Type |
|--------|------|
| id | INTEGER PK AUTOINCREMENT |
| channel_id | TEXT FK → channels |
| scraped_at | TEXT NOT NULL |
| video_count | INTEGER |
| new_videos | INTEGER |
| status | TEXT NOT NULL | 'success', 'partial', 'failed' |
| error_message | TEXT |

**channel_stats_history** — Periodic snapshots for growth charts

| Column | Type |
|--------|------|
| id | INTEGER PK AUTOINCREMENT |
| channel_id | TEXT FK → channels |
| recorded_at | TEXT NOT NULL |
| subscribers | INTEGER |
| total_views | INTEGER |
| video_count | INTEGER |

Index on (channel_id, recorded_at DESC).

**topic_clusters** — NLP clustering output

| Column | Type |
|--------|------|
| cluster_id | INTEGER PK AUTOINCREMENT |
| label | TEXT NOT NULL |
| keywords | TEXT | Comma-separated top keywords |
| video_count | INTEGER |
| avg_views | REAL |
| saturation_score | REAL | 0.0-1.0 (computed via recency-weighted density) |
| status | TEXT | 'underserved', 'competitive', 'saturated' |
| computed_at | TEXT NOT NULL |

**video_clusters** — Junction: video to cluster (many-to-many)

| Column | Type |
|--------|------|
| video_id | TEXT FK → videos |
| cluster_id | INTEGER FK → topic_clusters |
| similarity | REAL | TF-IDF cosine similarity to cluster centroid |

Composite PK: (video_id, cluster_id).

**keywords** — Extracted keywords with metrics

| Column | Type |
|--------|------|
| id | INTEGER PK AUTOINCREMENT |
| keyword | TEXT NOT NULL |
| source | TEXT NOT NULL | 'title', 'description', 'tag' |
| frequency | INTEGER |
| channels_count | INTEGER |
| avg_views | REAL |
| computed_at | TEXT NOT NULL |

Index on (keyword, source). Unique constraint on (keyword, source).

**trend_signals** — Computed trend detections

| Column | Type |
|--------|------|
| id | INTEGER PK AUTOINCREMENT |
| cluster_id | INTEGER FK → topic_clusters |
| signal_type | TEXT NOT NULL | 'emerging', 'declining', 'stable', 'convergence' |
| slope | REAL | Linear regression slope of upload frequency |
| confidence | REAL | R-squared or similar |
| window_days | INTEGER | Lookback window used |
| details | TEXT | JSON blob for convergence details (channels involved, dates) |
| detected_at | TEXT NOT NULL |

**pipeline_runs** — Cache-awareness state tracking

| Column | Type |
|--------|------|
| id | INTEGER PK AUTOINCREMENT |
| stage | TEXT NOT NULL | 'scrape', 'analyze', 'dashboard', 'topics' |
| started_at | TEXT NOT NULL |
| completed_at | TEXT |
| input_hash | TEXT | MD5 of inputs that determined this run |
| status | TEXT NOT NULL | 'running', 'success', 'partial', 'failed' |
| summary | TEXT | Human-readable result summary |

Index on (stage, completed_at DESC).

**topic_briefs** — Generated topic candidates

| Column | Type |
|--------|------|
| id | INTEGER PK AUTOINCREMENT |
| title | TEXT NOT NULL |
| scores | TEXT NOT NULL | JSON: {obscurity, complexity, shock_factor, verifiability, pillar_fit} |
| total_score | INTEGER |
| pillar_primary | TEXT |
| pillar_secondary | TEXT |
| source_clusters | TEXT | JSON array of cluster_ids that informed this brief |
| hook | TEXT |
| duplicate_of | TEXT | Past topic title if near-duplicate detected |
| status | TEXT NOT NULL DEFAULT 'candidate' | 'candidate', 'selected', 'rejected' |
| generated_at | TEXT NOT NULL |
| selected_at | TEXT |

### Migration strategy

The database module will detect the current schema version and run migrations on first access. Existing data (3 channels, 76 videos) is preserved; new columns get sensible defaults.

---

## 2. Module Structure

Package: `.claude/scripts/strategy/channel_assistant/`

### Kept (rewritten)

| Module | Lines (est.) | Changes |
|--------|-------------|---------|
| `database.py` | ~400 | Full rewrite. 11-table schema, migrations, query helpers, input hash computation. |
| `models.py` | ~80 | Expanded dataclasses for all entities (Channel with tier, Cluster, TrendSignal, PipelineRun, TopicBrief). |
| `cli.py` | ~500 | Rewrite. New subcommands, cache-check-before-run logic, structured stdout reporting. |
| `project_init.py` | ~200 | Simplified init (no titles/descriptions). New `package()` function for post-script phase. |
| `topics.py` | ~200 | Rewrite. Queries DB for clusters, keywords, trends, saturation. Formats structured context for Claude. |
| `__main__.py` | ~6 | No change. |
| `__init__.py` | ~2 | No change. |

### Removed

| Module | Replacement |
|--------|-------------|
| `scraper.py` | `collector.py` (YouTube Data API) |
| `registry.py` | `database.py` (channel CRUD in DB) |
| `trend_scanner.py` | `analyzer.py` (trends computed from DB data) |

### New modules

**`collector.py`** (~300 lines)
- YouTube Data API v3 client
- Functions: `fetch_channel_details(channel_id)`, `fetch_channel_videos(channel_id, max_results)`, `search_youtube(query, max_results)`
- Handles: API key loading from env var `YOUTUBE_API_KEY`, quota tracking, pagination via `nextPageToken`, error recovery with retries
- Writes to: `channels`, `videos`, `video_tags`, `scrape_log`, `channel_stats_history`
- Tier-aware: Watch List channels fetch all videos; Landscape channels fetch latest 20
- Dependency: `google-api-python-client`

**`analyzer.py`** (~450 lines) — Full rewrite, three analysis passes:

1. **Stats pass**: Per-channel metrics (total videos, avg/median views, engagement rate, upload frequency, growth rate from `channel_stats_history`). Outlier detection (videos > 2x median). Writes summary stats to stdout.
2. **NLP pass**: TF-IDF vectorization of video titles → K-Means clustering (auto-k via silhouette score). YAKE keyword extraction from titles + descriptions. Title pattern classification via regex (question, number, emotional, declarative). Writes to `topic_clusters`, `video_clusters`, `keywords`.
3. **Trends pass**: Rolling 30-day upload frequency per cluster. Linear regression slope for trend direction. Convergence detection (3+ channels in 30-day window on same cluster). Saturation scoring (recency-weighted video density per cluster, normalized 0-1). Writes to `trend_signals`, updates `topic_clusters.saturation_score`.

Dependencies: `scikit-learn`, `yake`, `numpy` (transitive)

**`dashboard.py`** (~350 lines)
- Reads all computed data from DB
- Generates Plotly figures:
  - KPI scorecards (custom HTML, not Plotly)
  - Horizontal bar chart: competitor median views (watch list)
  - Line chart: upload frequency trends (30-day rolling)
  - Bubble chart: topic cluster saturation map (x=avg views, y=opportunity, size=video count, color=saturation)
  - Progress bars: pillar gap scores
  - Table: top keywords with opportunity highlighting
  - Alert cards: convergence signals
- Composes final HTML template with pizzint theming:
  - Fonts loaded via `@font-face` with base64-encoded TTF data URIs (VT323-Regular, Geist-Regular, GeistMono-Regular) for full offline capability. The `dashboard.py` module reads TTF files from `docs/pizzint-design/fonts/` at generation time and encodes them inline.
  - Background `#1a202c`, surface `#1e2939`, accent `#00b7d7`, border `#4a5565`
  - Plotly charts use matching dark template
- Writes to: `channel/strategy/dashboard.html`
- Dependency: `plotly`, `pandas`

**`pipeline.py`** (~150 lines)
- Orchestrates stage execution with cache checking
- Functions: `check_freshness(stage)` → returns fresh/aging/stale with age, `compute_input_hash(stage)` → MD5 of relevant DB state, `run_pipeline(stages, force=False)` → execute stages in order with skip logic, `get_status()` → formatted pipeline state
- Freshness thresholds: <14 days = fresh, 10-14 days = aging (yellow), >14 days = stale (red)
- Records all runs to `pipeline_runs` table

**`config.py`** (~50 lines)
- `YOUTUBE_API_KEY`: loaded from `os.environ`
- `DB_PATH`: `data/channel_assistant.db`
- `DASHBOARD_PATH`: `channel/strategy/dashboard.html`
- `TOPICS_PATH`: `channel/strategy/topics.md`
- `PAST_TOPICS_PATH`: `channel/past_topics.md`
- `FONT_DIR`: `docs/pizzint-design/fonts/`
- `SCRAPE_FRESHNESS_HOURS`: 24
- `STALENESS_DAYS`: 14
- `AGING_DAYS`: 10
- `WATCH_LIST_MAX_VIDEOS`: None (all)
- `LANDSCAPE_MAX_VIDEOS`: 20
- `CLUSTER_MIN_K`: 3
- `CLUSTER_MAX_K`: 25
- `OUTLIER_MULTIPLIER`: 2.0
- `CONVERGENCE_WINDOW_DAYS`: 30
- `CONVERGENCE_MIN_CHANNELS`: 3
- `SATURATION_DECAY_LAMBDA`: 0.01 (half-life ~70 days)

### Dependency summary

| Package | Purpose | Install |
|---------|---------|---------|
| `google-api-python-client` | YouTube Data API v3 | `pip install google-api-python-client` |
| `plotly` | Dashboard chart generation | `pip install plotly` |
| `pandas` | Data manipulation for Plotly | `pip install pandas` |
| `scikit-learn` | TF-IDF, K-Means, silhouette | `pip install scikit-learn` |
| `yake` | Keyword extraction | `pip install yake` |

Total: 5 new packages. All CPU-only. No conda env needed (unlike asset-processor).

---

## 3. Dashboard Design

Single-page interactive HTML at `channel/strategy/dashboard.html`.

### Theming

Follows the pizzint design system (`docs/pizzint-design/DESIGN.md`):
- Background: `#1a202c`
- Surface/cards: `#1e2939`
- Accent: `#00b7d7`
- Border: `#4a5565`
- Text primary: `#ffffff`
- Text muted: `#364153`
- Success: `#00c758`
- Warning: `#edb200`
- Danger: `#fb2c36`
- Info: `#3b82f6`
- Fonts: VT323 (headings, labels), Geist (body), Geist Mono (data values) — loaded as base64-encoded TTF data URIs for offline capability
- Spacing: 4px grid
- Border radius: 4px for cards
- No blur/backdrop-blur effects
- No zebra striping on tables

Plotly charts use a custom `plotly.graph_objects.layout.Template` matching these colors (dark paper/plot backgrounds, white gridlines at 10% opacity, accent color sequence).

### Layout (4 rows)

**Row 1 — KPI Scorecards** (5 cards, equal width)
- Competitors tracked (watch list + landscape breakdown)
- Videos indexed (delta since last scrape)
- Topic clusters (underserved/saturated breakdown)
- Niche avg engagement rate
- Pipeline freshness (last update time, fresh/stale indicator)

**Row 2 — Competitor Analysis** (2 panels, 50/50)
- Left: Horizontal bar chart — watch list channels by median views per video
- Right: Line chart — upload frequency trends (30-day rolling, per watch list channel)

**Row 3 — Topic Intelligence** (2 panels, 66/33)
- Left: Bubble chart — topic cluster saturation map. X-axis = avg views, Y-axis = opportunity score (inverse saturation), bubble size = video count, color = saturation level (green/yellow/red)
- Right: Progress bars — pillar gap scores (higher = more opportunity)

**Row 4 — Keywords & Alerts** (2 panels, 50/50)
- Left: Sortable table — top keywords by frequency, with columns: keyword, frequency, channels, avg views. Rows with high views + low channel count highlighted green (opportunity)
- Right: Alert cards — convergence signals categorized as Opportunity (green), Trending (yellow), Saturation Warning (red)

### Interactivity

All Plotly charts support: hover tooltips, zoom, pan, box-select, PNG export. Non-Plotly elements (KPI cards, alerts, progress bars) are static HTML styled with pizzint tokens.

---

## 4. Agent Definition

File: `.claude/agents/strategy.md`

### Frontmatter

```yaml
name: strategy
description: >-
  Competitive intelligence platform for the documentary channel. Tracks
  competitor channels via YouTube Data API, runs NLP analysis (clustering,
  keyword extraction, trend detection), generates an interactive dashboard,
  and produces scored topic recommendations. Cache-aware pipeline skips
  stages whose inputs haven't changed.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
memory: project
color: yellow
skills:
  - agent-protocols
  - data-analysis
  - structured-output
  - pizzint-design
```

### CLI subcommands

| Command | Action | Cache behavior |
|---------|--------|----------------|
| `add <url> [--tier watch_list\|landscape]` | Register competitor via YouTube API, fetch initial data | Always runs. Marks scrape as stale. |
| `remove <name>` | Remove competitor and their videos from DB | Always runs. Marks analysis as stale. |
| `promote <name>` | Landscape → Watch List (triggers deeper scrape next run) | Always runs. Marks analysis as stale. |
| `demote <name>` | Watch List → Landscape | Always runs. Marks analysis as stale. |
| `scrape [--force]` | Refresh video data from all tracked channels | Skips if last scrape <24h (override with --force) |
| `analyze [--force]` | Run stats + NLP + trends + saturation | Skips if input hash unchanged AND <14 days old |
| `dashboard` | Generate/refresh dashboard.html | Regenerates if analysis newer than last dashboard |
| `topics` | Format computed data as context for Claude topic reasoning | Always runs (Claude heuristic) |
| `init <topic_num>` | Create project directory with metadata.json | Always runs |
| `package <project>` | Post-script: generate title variants + YouTube description | Always runs |
| `status` | Show pipeline state (fresh/aging/stale per stage) | Always runs |

### Invocation

```
PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant <subcommand> [args]
```

### Environment

Requires `YOUTUBE_API_KEY` environment variable set with a valid YouTube Data API v3 key.

### File conventions

| File | Purpose |
|------|---------|
| `data/channel_assistant.db` | Single source of truth (11 tables) |
| `channel/strategy/dashboard.html` | Generated interactive dashboard (pizzint themed) |
| `channel/strategy/topics.md` | Generated topic briefs for review |
| `channel/past_topics.md` | Append-only topic history (dedup source) |

### Eliminated files

- `channel/strategy/competitors.json` — registry now in DB
- `channel/strategy/analysis.md` — redundant with DB + dashboard
- `channel/strategy/competitor_data.md` — redundant with DB

---

## 5. Pipeline Flow

### Smart auto with interrupt

When the agent runs the pipeline (e.g., user says "analyze competitors" or "generate topics"):

```
1. Check scrape freshness
   ├─ Fresh (<24h) → skip, report "Using data from Xh ago"
   └─ Stale → run collector.scrape_all(), report new video count

2. Check analysis freshness (input_hash + 14-day threshold)
   ├─ Fresh → skip, report "Analysis current (last run Xd ago)"
   └─ Stale → run analyzer.run_all()
        ├─ Stats pass → per-channel metrics, outliers
        ├─ NLP pass → TF-IDF clusters, YAKE keywords, title patterns
        └─ Trends pass → slopes, convergence, saturation scores
        PAUSE: Report cluster summary + any new trend signals.
               "Found N clusters. M underserved. New trend: [signal]."
               "Proceed to dashboard, or deep-dive a cluster?"

3. User says proceed → check dashboard freshness
   ├─ Current → skip, report "Dashboard still current"
   └─ Stale → run dashboard.generate(), report file path

4. If topics requested → run topics.format_context()
   → Claude reasons over structured data, generates 5 briefs
   → Writes to topics.md and topic_briefs table
   PAUSE: Present candidates. "Select a topic number to init."
```

### Cache input hashes

| Stage | Hash computed from |
|-------|--------------------|
| scrape | Channel list (sorted youtube_ids) + date |
| analyze | Row count of videos + MAX(scraped_at) from videos |
| dashboard | MAX(completed_at) from pipeline_runs WHERE stage='analyze' |

### Freshness thresholds

| State | Age | Indicator |
|-------|-----|-----------|
| Fresh | <10 days | Green |
| Aging | 10-14 days | Yellow |
| Stale | >14 days | Red |

### Edge cases

- `add`/`remove`/`promote`/`demote` immediately mark downstream stages as stale
- `--force` on any command ignores cache
- API quota exhaustion mid-scrape: commit partial results, mark run as `partial`, next scrape resumes
- If `YOUTUBE_API_KEY` is not set, agent reports error and stops (no fallback)

---

## 6. Downstream Hand-offs

### Strategy → Researcher (at topic init)

Output: `projects/<name>/metadata.json`

```json
{
  "title": "Topic Title",
  "slug": "topic-slug",
  "date_selected": "2026-04-16",
  "scores": {
    "obscurity": 5,
    "complexity": 4,
    "shock_factor": 5,
    "verifiability": 4,
    "pillar_fit": 5,
    "total": 23
  },
  "pillars": {
    "primary": "Institutional Corruption & Cover-ups",
    "secondary": "Cults & Psychological Control"
  },
  "source_clusters": [3, 7],
  "production": {
    "estimated_runtime_min": 35
  }
}
```

No title variants or YouTube description at this stage.

### Strategy → Writer (package phase, post-script)

`@strategy package <project>` reads the approved script and competitor title patterns from DB, then updates `metadata.json` to add:

```json
{
  "youtube": {
    "title_variants": [
      {"title": "...", "hook_type": "question|statement|number", "recommended": false},
      {"title": "...", "hook_type": "...", "recommended": true, "recommendation_reason": "..."}
    ],
    "description": "..."
  }
}
```

### Agent definition changes required

| Agent | Change |
|-------|--------|
| `@researcher` | Update to read `metadata.json` instead of `metadata.md` for topic context |
| All others | No changes |

---

## 7. Scoring Rubric

Resolves the current discrepancy (agent says 1-5, output shows 1-10).

**Standardized scale: 1-5 per dimension, max 25.**

| Dimension | 1 | 3 | 5 |
|-----------|---|---|---|
| Obscurity | Jack the Ripper saturation | Some English coverage, no definitive doc | Zero English documentary treatment |
| Complexity | Single actor, single event | 2 intersecting systems | 3+ intersecting systems |
| Shock Factor | Mundane crime | Strong emotional impact | Involuntary physical reaction |
| Verifiability | Entirely speculative | Mixed primary/secondary | Primary recordings, FOIA, confessions |
| Pillar Fit | Tangential connection | Clear alignment | Perfect pillar exemplar |

Tiebreaker order: shock_factor > obscurity > verifiability.

---

## 8. Migration Plan

### Data preservation

- Existing 3 channels and 76 videos in `channel_assistant.db` are preserved
- New columns added with defaults (`tier='watch_list'` for existing channels since they were hand-picked)
- `competitors.json` data merged into DB during migration (notes field preserved in channel description)
- Existing `topics.md` content preserved as-is (historical reference)

### Environment setup

```
pip install google-api-python-client plotly pandas scikit-learn yake
```

User must set `YOUTUBE_API_KEY` environment variable before first use.

### Breaking changes

- `competitors.json` no longer used (data migrated to DB)
- `analysis.md` no longer generated
- `competitor_data.md` no longer generated
- `metadata.md` replaced by `metadata.json` in project init
- All yt-dlp references removed from strategy agent
- CLI subcommands renamed/restructured

# External Integrations

**Analysis Date:** 2026-04-22

## APIs & External Services

**Web Scraping (crawl4ai):**
- Used for: Research source fetching, DuckDuckGo search result extraction, YouTube search page scraping, image extraction from web pages, Wikipedia screenshots
- SDK/Client: `crawl4ai` (`AsyncWebCrawler`, `BrowserConfig`, `CrawlerRunConfig`)
- Auth: None (public web scraping)
- Key files:
  - `.claude/scripts/editorial/researcher/fetcher.py` — Source URL fetching with retry logic
  - `.claude/scripts/editorial/researcher/cli.py` — DDG search + link extraction (`_fetch_ddg_with_links`)
  - `.claude/scripts/media/crawl_images.py` — Batch image extraction from URLs
  - `.claude/scripts/media/wiki_screenshots.py` — Wikipedia viewport screenshots
  - `.claude/scripts/strategy/channel_assistant/trend_scanner.py` — YouTube search results scraping

**DuckDuckGo Search:**
- Used for: Research topic discovery (Pass 1 survey)
- SDK/Client: `crawl4ai` for HTML endpoint (`https://html.duckduckgo.com/html/`), `ddgs` library as fallback
- Auth: None
- Key files:
  - `.claude/scripts/editorial/researcher/cli.py` — `_fetch_ddg_with_links()`, `_parse_ddg_result_urls()`
  - `.claude/scripts/editorial/researcher/url_builder.py` — `make_ddg_url()`

**Wikipedia:**
- Used for: Initial research source for every topic (first URL in survey pass)
- Access: Direct HTTPS requests via crawl4ai
- Auth: None
- Key file: `.claude/scripts/editorial/researcher/url_builder.py` — `build_survey_urls()`

**YouTube Data (via yt-dlp):**
- Used for: Competitor channel metadata scraping, video metadata extraction, video downloads
- SDK/Client: `yt-dlp` CLI subprocess calls
- Auth: Browser cookie extraction (Brave auto-detected, configurable via `--cookies-from-browser` or `--cookies` file)
- Key files:
  - `.claude/scripts/strategy/channel_assistant/scraper.py` — Channel scraping with retry (`scrape_channel()`, `scrape_all_channels()`)
  - `.claude/scripts/media/download.py` — YouTube + archive.org video downloads with rate limiting
  - `.claude/scripts/strategy/channel_assistant/cli.py` — `cmd_add()` resolves channel info via yt-dlp

**YouTube Autocomplete (Google API):**
- Used for: Trend scanning keyword suggestions
- Endpoint: `https://clients1.google.com/complete/search?client=youtube&hl=en&q={keyword}`
- SDK/Client: `urllib.request` (stdlib)
- Auth: None (public endpoint, JSONP response)
- Key file: `.claude/scripts/strategy/channel_assistant/trend_scanner.py` — `scrape_autocomplete()`

**Internet Archive:**
- Used for: B-roll footage discovery and downloads
- SDK/Client: `internetarchive` Python library
- Auth: None (public API)
- Cache: `data/ia_cache.json` — Metadata cache to avoid redundant API calls
- Key files:
  - `.claude/scripts/media/ia_search.py` — `search_ia()` with metadata caching
  - `.claude/scripts/media/download.py` — `download_archive_org()` via yt-dlp

**PE-Core CLIP Model (Local):**
- Used for: Video frame embedding and text-image semantic search
- Location: `C:/Users/iorda/repos/perception_models` (added to `sys.path` at import time)
- Model: `PE-Core-L14-336` — 768-dim embeddings, 336x336 image input
- Runtime: CUDA GPU (RTX 4070 Laptop)
- Key files:
  - `.claude/scripts/media/embed.py` — `load_model()`, `embed_frames()`, `embed_video()`
  - `.claude/scripts/media/search.py` — `encode_text_queries()`, `search()`
  - `.claude/scripts/media/discover.py` — `classify_frames()` for zero-shot taxonomy classification

## Data Storage

**Databases:**
- SQLite — Channel assistant data
  - Location: `data/channel_assistant.db`
  - Client: `sqlite3` (stdlib) via `Database` class in `.claude/scripts/strategy/channel_assistant/database.py`
  - Tables: `channels` (youtube_id PK), `videos` (video_id PK, FK to channels)
  - Config: WAL journal mode, foreign keys ON
  - Schema created via `Database.init_db()` with idempotent `CREATE TABLE IF NOT EXISTS`

- SQLite — Asset catalog
  - Location: `data/asset_catalog.db`
  - Purpose: Global video library management (used by `@asset-curator` agent)

**Embedding Cache (File-based):**
- Two-pool architecture managed by `PoolIndex` class in `.claude/scripts/media/pool.py`:
  - Project pool: `<project_dir>/.broll-index/` — Per-documentary embeddings
  - Global pool: `~/.broll-index/global/` — Cross-project reusable footage
- Storage format per video hash:
  - `<hash>/embeddings.npy` — float16 frame embeddings [N, 768]
  - `<hash>/timestamps.npy` — float64 timestamps
  - `<hash>/meta.json` — Source path, duration, extract date
  - `index.json` — Pool-level index mapping hash to metadata

**File Storage:**
- Local filesystem only — All outputs written to `projects/<name>/` subdirectories
  - `research/` — Source JSON files, `source_manifest.json`, `synthesis_input.md`, `Research.md`
  - `assets/` — Downloaded videos, extracted clips
  - `script/` — Generated scripts
  - `visuals/` — Visual briefs, media leads, shotlists

**Caching:**
- Internet Archive metadata cache: `data/ia_cache.json`
- crawl4ai cache: Explicitly bypassed (`CacheMode.BYPASS`) in all fetch calls
- Embedding cache: PoolIndex dedup by file hash (SHA-256 of first 64KB + file size)

## Authentication & Identity

**Auth Provider:**
- None — No user authentication system
- YouTube cookie extraction for yt-dlp (optional):
  - Auto-detects Brave browser cookies on Windows
  - Supports `--cookies-from-browser` (chrome, firefox, edge, brave, opera)
  - Supports `--cookies` file (Netscape format)
  - Implementation: `.claude/scripts/media/download.py` — `detect_browser_for_cookies()`

## Monitoring & Observability

**Pipeline Observability:**
- Custom JSONL-based event logging system
- Hook: `.claude/hooks/pipeline-observe.js` (Node.js) — Captures all tool calls within subagent sessions
- Events: `tool_pre`, `tool_post`, `tool_fail`, `permission_denied`, `subagent_stop` (and optionally `dispatch`, `assistant_message`, `complete`)
- Output: `.claude/logs/observations/<project>/obs.jsonl` (rolling, 10MB rotation, 30-day archive purge)
- Secret scrubbing: Regex-based redaction of API keys, tokens, passwords in logged data
- Summarizer: `.claude/scripts/obs-summarize.js` — Compresses obs.jsonl into ~2-5KB markdown summary

**Memory Learning:**
- Observer: `.claude/agents/observer.md` — Reads obs.jsonl, extracts learnings, writes Pending Review sections
- Trigger: User invokes `/evolve` skill → dispatches `@observer` → presents pending entries
- Promotion: User approves/edits/reverts via `evolve.js` UI with git-based rollback

**Agent Memory Monitoring:**
- Hook: `.claude/hooks/check-memory-limit.js` — Warns if agent `MEMORY.md` exceeds 200 lines (SubagentStop)

**Error Tracking:**
- No external error tracking service (Sentry, etc.)
- Errors logged to stderr and captured in observability JSONL

**Logs:**
- `.claude/logs/observations/` — Structured JSONL per project (gitignored)
- Console stdout/stderr — All scripts print progress to stdout with `flush=True`

## CI/CD & Deployment

**Hosting:**
- Local development workstation only (Windows 11)

**CI Pipeline:**
- None — No GitHub Actions, no automated testing pipeline
- Smoke tests run manually: `node .claude/tests/smoke-test-observe.js`

## Environment Configuration

**Required env vars:**
- `PYTHONUTF8=1` — System-wide UTF-8 output (pre-configured)
- `PYTHONPATH` — Set per-invocation for module resolution (editorial or strategy scripts)
- `CLAUDE_PROJECT_DIR` — Used by hooks to resolve project root

**Optional env vars:**
- `PIPELINE_OBSERVE_DISABLED=1` — Disable observability hooks
- `PIPELINE_HOOK_PROFILE=minimal` — Skip detailed hook logging
- `PIPELINE_SKIP_OBSERVE=1` — Cooperative hook skip for specific calls
- `PIPELINE_OBSERVE_SKIP_PATHS` — Comma-separated paths to exclude from logging
- `PIPELINE_PY` — Override Python binary for observability hook

**Secrets location:**
- `.env` file at project root (gitignored)

## Webhooks & Callbacks

**Incoming:**
- None — No HTTP server, no webhook endpoints

**Outgoing:**
- None — No outbound webhook calls
- All external communication is pull-based (scraping, API queries)

## Claude Code Hook Integration

**Registered Hooks (`.claude/settings.json`):**

| Event | Hook | Timeout | Purpose |
|-------|------|---------|---------|
| PreToolUse * | `pipeline-observe.js tool_pre` | 5s (async) | Log tool inputs to obs.jsonl |
| PostToolUse * | `pipeline-observe.js tool_post` | 5s (async) | Log tool outputs to obs.jsonl |
| PostToolUseFailure * | `pipeline-observe.js tool_fail` | 5s (async) | Log tool failures to obs.jsonl |
| PermissionDenied * | `pipeline-observe.js permission_denied` | 5s (async) | Log denied actions to obs.jsonl |
| SubagentStop | `pipeline-observe.js subagent_stop` | 15s (sync) | Synthesize agent completion event |
| SubagentStop | `check-memory-limit.js` | 5s (sync) | Warn if MEMORY.md > 200 lines |

All hooks are Node.js scripts invoked via `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/<hook>.js <event>`.

---

*Integration audit: 2026-04-22*

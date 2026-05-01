---
name: crawl4ai-scraping
description: >-
  Web scraping and content extraction expertise for JS-heavy research
  sites. Extraction strategies, anti-bot handling, content selection
  patterns, and rate limiting rules. Use when gathering information from
  websites that require browser automation or structured data extraction.
user-invocable: true
---

# Web Scraping Expertise

Domain knowledge for extracting content from web pages, particularly JavaScript-heavy sites that require browser automation. This skill provides scraping expertise and pattern knowledge -- it does NOT define a scraping procedure. Agents apply these patterns using Claude's native WebFetch/Bash capabilities or crawl4ai scripts.

## Phase 0: Context Loading

Before starting work:
1. Read `insights.md` from this skill directory for accumulated learnings
   - Path: `.claude/skills/crawl4ai-scraping/insights.md`
   - Even if empty, this confirms the learning loop is active

## Extraction Strategy Selection

Choose the right extraction approach based on the target site's characteristics.

### Decision Matrix

| Signal | Strategy | Tool |
|--------|----------|------|
| Static HTML, no JS required | Simple fetch | `web_fetch` or `curl` |
| Content loads via JS/AJAX | Browser automation | crawl4ai `AsyncWebCrawler` |
| Single Page Application (React, Vue, Angular) | Browser automation with wait-for | crawl4ai with `wait_for` selector |
| Infinite scroll / lazy loading | Browser automation with scroll script | crawl4ai with `js_code` scroll injection |
| Login-gated content | Session-based browser automation | crawl4ai with cookie/session handling |
| Structured data (tables, listings) | CSS selector extraction | crawl4ai `JsonCssExtractionStrategy` |
| JSON-LD or schema.org markup | Metadata extraction | Parse `<script type="application/ld+json">` from page source |

## Anti-Bot Handling

### Rate Limiting Rules

- **Default pace:** Minimum 1.5-second delay between requests to the same domain
- **Respect `robots.txt`:** Always check before scraping. If `Disallow`, do not scrape that path.
- **HTTP 429 response:** Stop immediately. Wait at least 5 minutes before retrying. Log the domain and time.
- **HTTP 403 response:** Do not retry. The site is actively blocking. Move to alternative sources.
- **Session budgets:** Track total requests per domain per session. Report usage.

### User-Agent Policy

- Use a realistic browser user-agent string for browser automation
- Do not rotate user-agents rapidly within a session (looks like bot behavior)
- Example: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`

### CAPTCHA Detection

- If a CAPTCHA or challenge page is detected, abort the scrape immediately
- Do not attempt to solve CAPTCHAs programmatically
- Log the URL and move to the next source
- Report blocked URLs so the user can access them manually if needed

### Cookie Consent

- Many sites require cookie acceptance before showing content
- Use JavaScript injection to click consent buttons: `document.querySelector('.cookie-accept')?.click()`
- Wait for the main content container to appear after accepting: `wait_for="css:.main-content"`

## Content Selection Patterns

### Identifying Main Content vs Boilerplate

Distinguish article content from navigation, ads, and chrome:

- **Main content signals:** Long text blocks, paragraph tags, heading hierarchy (h1 > h2 > h3), article semantic tags
- **Boilerplate signals:** Navigation elements, footer content, sidebar widgets, ad containers, cookie banners, social share buttons
- **Rule of thumb:** If the text block is shorter than 50 words and surrounded by links, it is likely boilerplate

### Date and Attribution Extraction

- Check multiple locations for dates: `<time>` tags, meta tags, bylines, URL patterns (`/2024/03/15/`)
- Prefer machine-readable dates (`datetime` attributes) over displayed text
- When multiple dates exist (published, modified, accessed), record all with labels
- Record the source URL and access timestamp for every extracted page

### Content Quality Assessment

Before passing extracted content downstream, verify:

- Text is complete (not truncated by paywalls or lazy loading)
- Encoding is correct (no mojibake or garbled characters)
- Images referenced in text are noted (even if not downloaded)
- Links within the content are preserved as absolute URLs

## Deduplication

- Before adding a new extraction, check if the same URL has already been processed
- If the same content appears on multiple URLs, keep the canonical version (check `rel="canonical"`)
- Track all URLs that point to the same content for provenance

## Rate Limit Budgets by Source Type

When agents use web scraping for media gathering, apply these per-session budgets:

| Source | Budget | Delay | Notes |
|--------|--------|-------|-------|
| YouTube (via yt-dlp) | 50 calls/session | 3-8s jittered between calls, 15s pause every 10 calls | Stop on first 429. Report remaining budget on completion. |
| Archive.org | 200 calls/session | 1.5s between requests | Parallel OK (5 workers max). Respect robots.txt. |
| Wikimedia Commons API | 100 calls/session | 1s between requests | Use API, not scraping. |
| General web (crawl4ai) | 50 pages/domain/session | 1.5s minimum between same-domain requests | Stop on 429 or 403. |

Agents consuming rate-limited resources (visual-planner for YouTube, visual-researcher for web pages) should track and report their usage so downstream agents know the remaining budget.

## Platform Notes

- **Operating system:** Windows 11
- **Python environment:** conda environments at `C:\Users\iorda\venvs\` (standard) or `C:/Users/iorda/miniconda3/envs/perception-models/python.exe` (GPU-dependent operations)
- **crawl4ai:** Python library using Playwright for browser automation. Standard Python sufficient for scraping (no GPU needed).
- **Path handling:** Project path contains spaces and periods. Always use `path.resolve()` or equivalent -- never hardcode paths.
- **Filenames:** Colons are illegal on Windows. Timestamps in filenames must replace colons with dashes.

## Reflection Phase

After completing web scraping work:
1. Re-read your extraction results and any issues encountered
2. Identify one specific insight about site patterns, selector strategies, or anti-bot behavior
3. Append one line to `.claude/skills/crawl4ai-scraping/insights.md`: `- [YYYY-MM-DD] insight text`
4. Never skip this phase -- insights compound over time

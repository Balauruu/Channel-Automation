# Technology Stack

**Analysis Date:** 2026-04-22

## Languages

**Primary:**
- Python 3.12+ — All pipeline scripts (editorial, media, strategy); uses modern syntax (`str | None`, `frozenset[str]`, `match/case`-era features)
- Markdown — Agent definitions (`.claude/agents/*.md`), skill specifications (`.claude/skills/*/SKILL.md`), project outputs

**Secondary:**
- JavaScript (Node.js) — Hooks (`pipeline-observe.js`, `check-memory-limit.js`), smoke tests (`smoke-test-*.js`), evaluation scripts (`eval-*.js`), observability summarizer (`obs-summarize.js`), memory management (`evolve.js`)

## Runtime

**Environment:**
- Python via Conda — `C:/Users/iorda/miniconda3/Scripts/conda.exe`
- GPU/ML Python env: `C:/Users/iorda/miniconda3/envs/perception-models/python.exe` (CLIP embeddings, CUDA inference)
- General Python envs: `C:\Users\iorda\venvs\<env-name>` (via `--prefix`)
- Node.js — Required for hooks and smoke tests (runs via `node` directly, no package.json)
- Windows 11 + Git Bash — hooks and shell scripts use bash syntax

**Package Manager:**
- Conda — Primary Python environment manager
- No `package.json`, `requirements.txt`, or `pyproject.toml` at project root — dependencies are managed per-environment, not per-project

## Frameworks

**Core:**
- Claude Code Agent SDK — Orchestrates all agents via `.claude/agents/*.md` definitions with skills in `.claude/skills/*/SKILL.md`
- crawl4ai — Async web crawler for research (editorial) and trend scanning (strategy); used with Chromium headless browser
- PE-Core-L14-336 (Perception Encoder) — Custom CLIP-based vision-language model for video frame embeddings; loaded from `C:/Users/iorda/repos/perception_models`

**Build/Dev:**
- No build system — Scripts are run directly via `python -m <module>` or `node <script.js>`
- No bundler, transpiler, or build step

**Testing:**
- Custom JavaScript smoke tests — `smoke-test-observe.js`, `smoke-test-evolve.js`
- Custom JavaScript evaluation scripts — `eval-observer.js`, `eval-evolve.js`
- Python unit tests — `.claude/scripts/strategy/tests/` directory

## Key Dependencies

**Critical (Python - Editorial):**
- `crawl4ai` — Web scraping with headless Chromium; used by researcher (`fetcher.py`), trend scanner, image crawler, wiki screenshots
- `ddgs` — DuckDuckGo search fallback library (optional, imported with try/except in `cli.py`)

**Critical (Python - Media):**
- `torch` — PyTorch for GPU-accelerated CLIP inference in `embed.py` and `search.py`
- `numpy` — Embedding storage (float16 `.npy` files), frame processing, scoring
- `Pillow` (PIL) — Image preprocessing for CLIP, PNG-to-JPEG conversion
- `tqdm` — Progress bars for batch video embedding
- `scikit-learn` — DBSCAN clustering in `discover.py` for unknown footage classification
- `pyyaml` — Taxonomy file parsing in `discover.py`
- `internetarchive` — Internet Archive API client in `ia_search.py`

**Critical (Python - Strategy):**
- `sqlite3` (stdlib) — Channel assistant database layer (`database.py`)

**Infrastructure (External CLI tools):**
- `yt-dlp` — YouTube/archive.org video downloads and channel metadata scraping
- `ffmpeg` / `ffprobe` — Video decoding, frame extraction, re-encoding to 24fps, clip export, validation

**Infrastructure (JavaScript):**
- `fs`, `path`, `child_process`, `os` (Node.js stdlib) — All JS files use only Node.js built-ins, zero npm dependencies

## Configuration

**Environment:**
- `.env` file present — contains environment configuration (existence noted, contents not read)
- `PYTHONUTF8=1` — Set system-wide for Unicode output handling
- `PYTHONPATH` — Must be set per-invocation to resolve module imports:
  - Editorial: `PYTHONPATH=.claude/scripts/editorial`
  - Strategy: `PYTHONPATH=.claude/scripts/strategy`
- `CLAUDE_PROJECT_DIR` — Used by hooks to resolve project root

**Claude Code Settings:**
- `.claude/settings.json` — Hook registration (PreToolUse, PostToolUse, PostToolUseFailure, PermissionDenied, SubagentStop)
- `.claude/settings.local.json` — Local-only settings (gitignored)

**Build:**
- No build config files — no `tsconfig.json`, `webpack.config.js`, etc.

## Platform Requirements

**Development:**
- Windows 11 with Git Bash (hooks use bash-compatible syntax via Node.js)
- NVIDIA GPU with CUDA (RTX 4070 Laptop, 8GB VRAM) — Required for PE-Core CLIP model inference
- Conda with `perception-models` environment for GPU/ML scripts
- `yt-dlp` on PATH — Required for strategy scraping and media downloads
- `ffmpeg` / `ffprobe` on PATH — Required for video processing
- Chromium (managed by crawl4ai) — Required for web scraping
- Brave browser (optional) — Cookie extraction for authenticated YouTube downloads

**Production:**
- Local development only — No deployment target, no CI/CD pipeline
- All LLM calls route through Claude Code subagent dispatches (Claude Max subscription); direct API calls are prohibited per `CLAUDE.md` billing rules

---

*Stack analysis: 2026-04-22*

# Phase 6: Integration & End-to-End Validation - Research

**Researched:** 2026-04-11
**Domain:** Python script migration, GPU environment validation, database setup, agent path wiring
**Confidence:** HIGH

## Summary

Phase 6 wires the complete documentary pipeline end-to-end by copying Python scripts from V5 into V0.6's `.claude/scripts/` directory, copying SQLite databases and registry files into `data/`, creating the global video library directory, updating all agent body script paths, updating all domain skill script references, and writing smoke tests to validate everything connects. The user performs the actual pipeline run manually -- Phase 6 delivers the infrastructure.

The research reveals several critical integration details: (1) V5 scripts use `AGENTS.md` as a project root marker that does not exist in V0.6 -- the scripts will fall back to `cwd()` which is correct behavior since Claude Code agents run from the project root; (2) the strategy CLI requires not just the database but also a `strategy/competitors/competitors.json` registry file that must be copied or recreated; (3) `internetarchive` Python package is missing from the perception-models conda env, affecting `ia_search.py`; (4) the `init` subcommand referenced in the strategy agent body does not exist in the CLI -- it is aspirational.

**Primary recommendation:** Copy scripts with full directory structure preserving `__init__.py` and `__main__.py` module files, copy both databases and the competitors registry, update all agent paths from `domain/script.py` to `.claude/scripts/domain/script.py`, remove all "not yet connected in V0.6" caveats, and write a comprehensive `smoke-test-integration.js` following the existing testCases pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Python scripts copied from V5 into `.claude/scripts/` with domain subdirectories: `strategy/`, `editorial/`, `media/`. Scripts stay unmodified.
- **D-02:** Old top-level directories (`strategy/`, `editorial/`, `media/`) in CLAUDE.md folder map replaced by `.claude/scripts/{strategy,editorial,media}/`.
- **D-03:** `.claude/scripts/` already contains `audit-agents.js` -- Python scripts join as natural extension.
- **D-04:** Agent bodies own script invocation -- paths updated from `strategy/cli.py` to `.claude/scripts/strategy/cli.py` (and similar). Remove "not yet connected" caveats.
- **D-05:** Pipeline skills stay as pure routers -- zero script knowledge, no changes needed.
- **D-06:** Domain skills keep reference-only script docs -- paths updated, "Available after Phase 6" notes removed.
- **D-07:** Scripts primary, no fallback. Script failure = agent reports error and stops.
- **D-08:** Both SQLite databases copied from V5 `data/` to V0.6 `data/`. Historical data preserved.
- **D-09:** `D:/VideoLibrary/` created as empty directory. Assets accumulate over time.
- **D-10:** Critical-path scripts only (~15 of ~30) validated. Niche scripts deferred.
- **D-11:** Smoke-test level validation -- importable, `--help` works, conda env has deps, dbs open, agent paths point to real files.
- **D-12:** No automated E2E test run. User validates full pipeline manually.

### Claude's Discretion
- Exact file copy strategy (full directory copy vs cherry-pick critical path files)
- Python dependency validation approach (import checks vs full test suite)
- Smoke test script structure and implementation details
- Order of script migration (strategy first, then editorial, then media -- or parallel)
- Whether to add `__init__.py` files if missing for module imports
- CLAUDE.md folder map update format

### Deferred Ideas (OUT OF SCOPE)
- Niche script validation (wiki_screenshots, crawl_images, export_clips, trend_scanner, promote, organize_assets, pool)
- Configurable VideoLibrary path (currently hardcoded to D:/VideoLibrary/)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTG-01 | All Python scripts invocable by agents via Bash tool | Script copy strategy, PYTHONPATH mapping, module invocation patterns all documented. Agent path references identified and mapped. |
| INTG-02 | GPU conda environment accessible for CLIP operations | perception-models env verified: Python 3.12.13, torch 2.5.1+cu124, CUDA available, RTX 4070 detected, PE-Core model imports OK. Missing dep: `internetarchive`. |
| INTG-03 | SQLite databases accessible by relevant agents | Both databases inspected: channel_assistant.db (3 channels, 76 videos), asset_catalog.db (32 clips). Schema and path resolution documented. |
| INTG-04 | Global video library accessible by Asset Curator | D:/VideoLibrary/ does not exist yet -- must be created. Category taxonomy documented in asset-curator agent. |
| INTG-05 | End-to-end pipeline validated | Smoke test architecture documented. All 12 agent files inventoried for path updates. All 4 domain skills with script refs identified. CLAUDE.md folder map changes specified. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Platform:** Windows 11, RTX 4070 8GB VRAM
- **Path handling:** Project path has spaces and periods -- use `path.resolve()`, never hardcode paths
- **GPU scripts:** Use `C:/Users/iorda/miniconda3/envs/perception-models/python.exe`
- **File operations:** Use Node.js `path` module. Never use `test -d`/`test -f` (bash builtins)
- **Filenames:** Colons illegal on Windows -- timestamps must replace colons with dashes
- **Scripts stay unmodified:** Only invocation layer changes (per PROJECT.md constraint)
- **Conda binary:** `C:/Users/iorda/miniconda3/Scripts/conda.exe`
- **Module invocation:** Prefer `python -m <package>` over `python path/to/script.py` when package has `__main__.py`

## Standard Stack

This phase involves no new libraries or dependencies. It is a file migration, path wiring, and validation phase.

### Tools Already Available

| Tool | Version | Purpose | Verified |
|------|---------|---------|----------|
| Python (system) | 3.13.11 | Strategy/editorial scripts, SQLite | [VERIFIED: `python --version`] |
| Python (perception-models) | 3.12.13 | GPU CLIP scripts | [VERIFIED: conda env python] |
| PyTorch | 2.5.1+cu124 | CLIP embedding/search | [VERIFIED: `import torch`] |
| NumPy | 2.1.2 | Embedding arrays | [VERIFIED: `import numpy`] |
| Pillow | 11.0.0 | Image processing | [VERIFIED: `import PIL`] |
| tqdm | 4.67.3 | Progress bars | [VERIFIED: `import tqdm`] |
| scikit-learn | 1.8.0 | DBSCAN clustering (discover.py) | [VERIFIED: `import sklearn`] |
| PyYAML | 6.0.3 | YAML parsing (discover.py) | [VERIFIED: `import yaml`] |
| FFmpeg | 6.0.1 | Video frame extraction | [VERIFIED: `ffmpeg -version`] |
| yt-dlp | 2026.03.17 | YouTube downloads | [VERIFIED: `yt-dlp --version`] |
| Node.js | 24.13.0 | Smoke tests | [VERIFIED: `node --version`] |
| SQLite | 3.51.0 | Databases | [VERIFIED: `import sqlite3`] |
| PE-Core model | L14-336 | CLIP embeddings | [VERIFIED: `import core.vision_encoder.pe`] |

### Missing Dependencies

| Package | Required By | Environment | Status |
|---------|------------|-------------|--------|
| internetarchive | `media/ia_search.py` | perception-models | **MISSING** -- not installed in conda env [VERIFIED: ImportError] |

**Note:** `ia_search.py` is listed as a niche script in D-10, so this is a deferred concern. However, it is referenced in the `archive-search` domain skill and `visual-planner` agent. If the planner wants to address it, install via: `"C:/Users/iorda/miniconda3/envs/perception-models/python.exe" -m pip install internetarchive`

## Architecture Patterns

### Script Directory Structure After Migration

```
.claude/scripts/
  audit-agents.js                    # Existing (Phase 4)
  strategy/
    channel_assistant/
      __init__.py
      __main__.py
      cli.py
      analyzer.py
      database.py
      models.py
      project_init.py
      registry.py
      scraper.py
      topics.py
      trend_scanner.py               # Niche -- deferred validation
  editorial/
    researcher/
      __init__.py
      __main__.py
      cli.py
      fetcher.py
      tiers.py
      url_builder.py
      writer.py
    writer/
      __init__.py
      __main__.py
      cli.py
  media/
    embed.py                         # GPU -- critical path
    search.py                        # GPU -- critical path
    download.py                      # Critical path
    evaluate.py                      # Critical path
    ingest.py                        # Critical path (dependency of embed.py)
    pool.py                          # Critical path (dependency of embed.py, search.py)
    discover.py                      # Critical path
    ia_search.py                     # Niche -- deferred
    organize_assets.py               # Niche -- deferred
    promote.py                       # Niche -- deferred
    wiki_screenshots.py              # Niche -- deferred
    crawl_images.py                  # Niche -- deferred
    export_clips.py                  # Niche -- deferred
```

### Data Directory Structure After Migration

```
data/
  channel_assistant.db               # Copied from V5 (3 channels, 76 videos)
  asset_catalog.db                   # Copied from V5 (32 clips)
```

### Additional Data Files

```
strategy/competitors/competitors.json  # Registry file -- strategy CLI reads this
```

**CRITICAL FINDING:** The strategy CLI resolves the competitors registry at `{project_root}/strategy/competitors/competitors.json`. This file must either be copied from V5 or the path reference in the CLI's `_default_registry_path()` must be understood. Since scripts stay unmodified (PROJECT.md constraint), the file must exist at the expected relative path. [VERIFIED: registry.py + cli.py source code]

### Script Invocation Patterns

Three distinct invocation patterns exist across the script domains:

**Pattern 1: Module invocation (strategy)**
```bash
# V5 invocation:
PYTHONPATH=".pi/multi-team/scripts/strategy" python -m channel_assistant add <url>

# V0.6 invocation (after migration):
PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant add <url>
PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant scrape
PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant analyze
PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant topics
```
[VERIFIED: V5 `__main__.py` and `cli.py` source, tested `--help`]

**Pattern 2: Module invocation (editorial)**
```bash
# V0.6 invocation:
PYTHONPATH=".claude/scripts/editorial" python -m researcher survey "<topic>"
PYTHONPATH=".claude/scripts/editorial" python -m researcher deepen "<topic>"
PYTHONPATH=".claude/scripts/editorial" python -m researcher synthesize "<topic>"

PYTHONPATH=".claude/scripts/editorial" python -m writer load "<project>"
PYTHONPATH=".claude/scripts/editorial" python -m writer generate "<project>"
PYTHONPATH=".claude/scripts/editorial" python -m writer revise "<project>"
```
[VERIFIED: editorial `__main__.py`, `cli.py` docstrings, import structure]

**Pattern 3: Direct script invocation (media)**
```bash
# V0.6 GPU scripts:
"C:/Users/iorda/miniconda3/envs/perception-models/python.exe" .claude/scripts/media/embed.py <args>
"C:/Users/iorda/miniconda3/envs/perception-models/python.exe" .claude/scripts/media/search.py <args>

# V0.6 non-GPU media scripts (can use either env):
python .claude/scripts/media/download.py <args>
python .claude/scripts/media/evaluate.py <args>
```
[VERIFIED: media scripts use `sys.path.insert(0, os.path.dirname(__file__))` for local imports, no `__main__.py`]

### Project Root Resolution

V5 scripts use `_get_project_root()` which walks up from `__file__` looking for `AGENTS.md`. V0.6 does NOT have `AGENTS.md`. The fallback is `Path.cwd()`, which is correct because Claude Code agents execute from the project root directory. [VERIFIED: both `cli.py` files in strategy and editorial]

**Key implication:** All relative path references in scripts (`data/channel_assistant.db`, `strategy/competitors/competitors.json`, `projects/`) resolve correctly from `cwd()` because agents run Bash commands from the project root.

### Agent Path Update Map

| Agent File | Current Path References | New Path References |
|-----------|------------------------|-------------------|
| `strategy.md` | `strategy/cli.py add/scrape/analyze/topics/init` | `.claude/scripts/strategy/cli.py` -- BUT actual invocation uses `PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant <cmd>` |
| `researcher.md` | `editorial/researcher/cli.py survey/deepen/synthesize` | `PYTHONPATH=".claude/scripts/editorial" python -m researcher <cmd>` |
| `writer.md` | `editorial/writer/cli.py load/generate/revise` | `PYTHONPATH=".claude/scripts/editorial" python -m writer <cmd>` |
| `asset-processor.md` | `media/embed.py`, `media/search.py`, `media/download.py`, `media/evaluate.py` | `.claude/scripts/media/embed.py`, `.claude/scripts/media/search.py`, etc. |
| `asset-curator.md` | `media/promote.py` | `.claude/scripts/media/promote.py` |
| `compiler.md` | `media/organize_assets.py` | `.claude/scripts/media/organize_assets.py` |
| `visual-researcher.md` | `media/crawl_images.py`, `media/wiki_screenshots.py` | `.claude/scripts/media/crawl_images.py`, `.claude/scripts/media/wiki_screenshots.py` |
| `visual-planner.md` | `media/ia_search.py` | `.claude/scripts/media/ia_search.py` |

[VERIFIED: grep of all agent .md files for `.py` references]

### Domain Skill Update Map

| Skill File | Current References | New References |
|-----------|-------------------|---------------|
| `documentary-research/SKILL.md` | `editorial/researcher/cli.py survey/deepen/synthesize` | `.claude/scripts/editorial/researcher/cli.py` (or module invocation format) |
| `data-analysis/SKILL.md` | `strategy/analyzer.py`, `strategy/topics.py`, `strategy/scraper.py` | `.claude/scripts/strategy/channel_assistant/analyzer.py`, etc. |
| `media-evaluation/SKILL.md` | `media/evaluate.py`, `media/search.py`, `media/embed.py` | `.claude/scripts/media/evaluate.py`, etc. |
| `archive-search/SKILL.md` | `media/ia_search.py`, `media/discover.py` | `.claude/scripts/media/ia_search.py`, `.claude/scripts/media/discover.py` |
| `visual-narrative/SKILL.md` | `media/discover.py`, `media/organize_assets.py` | `.claude/scripts/media/discover.py`, `.claude/scripts/media/organize_assets.py` |

[VERIFIED: grep of all SKILL.md files for `.py` references]

### CLAUDE.md Folder Map Update

Current (remove these):
```
- `strategy/` -- Strategy Python scripts
- `editorial/` -- Editorial Python scripts
- `media/` -- Media Python scripts
```

Replacement:
```
- `.claude/scripts/` -- Python scripts and utility scripts (strategy/, editorial/, media/ subdirs)
- `data/` -- SQLite databases (channel_assistant.db, asset_catalog.db)
```

Also update the `.claude/scripts/` entry from "Utility scripts (Phase 4)" to reflect its expanded role.

### Caveats to Remove from Agent Bodies

All 6 agents with script sections contain this pattern:
```
These scripts provide [automated/automation] capabilities. They may not yet be fully connected in V0.6:
```
And:
```
Scripts may not yet be fully connected in V0.6. Check script help (`--help`) for current capabilities.
```

These must be replaced with definitive invocation instructions per D-04.

[VERIFIED: grep of agent .md files confirmed all 6 contain these caveats]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File copy from V5 to V0.6 | Custom copy script | Node.js `fs.cpSync` / `fs.copyFileSync` with `path.resolve` | Windows path handling, recursive copy |
| SQLite database validation | Manual SQL queries | `python -c "import sqlite3; ..."` one-liners | Consistent, scriptable, already proven in smoke tests |
| Module import validation | Full test suite | `python -c "import module_name"` + `python -m module --help` | Smoke-test level per D-11 |
| Path string replacement in files | Regex-based search-replace | Targeted Edit tool operations | Agent .md files have varied context around paths |

## Common Pitfalls

### Pitfall 1: AGENTS.md Project Root Marker Missing
**What goes wrong:** V5 scripts (`cli.py` in both strategy and editorial) walk up directories looking for `AGENTS.md` to find the project root. V0.6 does not have `AGENTS.md`.
**Why it happens:** V0.6 is a new directory structure that uses `CLAUDE.md` as its entry point, not `AGENTS.md`.
**How to avoid:** The scripts fall back to `Path.cwd()` when `AGENTS.md` is not found. Since Claude Code agents run Bash commands from the project root, `cwd()` IS the correct project root. Do NOT create a dummy `AGENTS.md` -- that would be confusing. The fallback works correctly.
**Warning signs:** If scripts report "data directory not found" or similar, check what `cwd()` is during script execution.
[VERIFIED: source code of `_get_project_root()` in both strategy and editorial CLIs]

### Pitfall 2: Competitors Registry File Missing
**What goes wrong:** Strategy CLI expects `strategy/competitors/competitors.json` at the project root. If this file doesn't exist, `Registry.load()` returns an empty list, so `add` and `scrape` commands work fine (they'll create it). But previously registered channels would be lost.
**Why it happens:** The registry is a JSON file, not in the SQLite database. It needs to be copied separately from the database.
**How to avoid:** Copy `strategy/competitors/competitors.json` from V5 to V0.6 at the same relative path, OR accept that the registry starts empty in V0.6 (channels are still in the database; the registry is just a convenience file for tracking which channels to scrape).
**Warning signs:** `strategy/cli.py scrape` reports 0 channels to scrape.
[VERIFIED: registry.py and cli.py source code]

### Pitfall 3: PYTHONPATH Not Set for Module Invocation
**What goes wrong:** Running `python -m channel_assistant` without `PYTHONPATH=".claude/scripts/strategy"` fails with `ModuleNotFoundError`.
**Why it happens:** Python's `-m` flag requires the package to be on the Python path. The scripts are not installed packages -- they are local directories.
**How to avoid:** Every module-invoked script MUST have `PYTHONPATH` set in the agent body instructions. The pattern is: `PYTHONPATH=".claude/scripts/{domain}" python -m {package} {subcommand}`.
**Warning signs:** `ModuleNotFoundError: No module named 'channel_assistant'` or similar.
[VERIFIED: tested V5 invocation pattern, confirmed PYTHONPATH requirement]

### Pitfall 4: Media Scripts Local Import via sys.path
**What goes wrong:** Media scripts like `embed.py` and `search.py` use `sys.path.insert(0, os.path.dirname(__file__))` to import `pool.py` and `ingest.py` from the same directory. If `pool.py` or `ingest.py` are not copied, these scripts fail silently or with confusing import errors.
**Why it happens:** Media scripts are flat files (no package structure), not modules. They use `sys.path` manipulation for local imports.
**How to avoid:** Copy ALL media scripts to `.claude/scripts/media/`, not just the critical-path ones. The import chain requires `pool.py` and `ingest.py` even for "just" running `embed.py` or `search.py`. Cost of copying all 14 files is negligible.
**Warning signs:** `ModuleNotFoundError: No module named 'pool'` when running embed.py.
[VERIFIED: embed.py line 15-16: `from pool import PoolIndex...` and `from ingest import extract_frames`]

### Pitfall 5: Strategy Agent References Non-Existent `init` Subcommand
**What goes wrong:** The strategy agent body documents `strategy/cli.py init <project-name>` but this subcommand does not exist in the CLI. The CLI only has: `add`, `scrape`, `analyze`, `topics`.
**Why it happens:** `project_init.py` exists as a library module imported by the CLI, but no `init` subcommand is wired up in the argparser. The agent body is aspirational.
**How to avoid:** When updating agent path references, also note that `init` is not a valid subcommand. The agent body should either remove it or note it as "not yet implemented as CLI subcommand -- use project_init functions directly."
**Warning signs:** `error: argument command: invalid choice: 'init'` when running the CLI.
[VERIFIED: cli.py argparser has only add, scrape, analyze, topics subcommands]

### Pitfall 6: Windows Path Spaces in PYTHONPATH
**What goes wrong:** The project path contains spaces (`D. Mysteries Channel`). If PYTHONPATH is not properly quoted, the shell splits it at spaces.
**Why it happens:** Windows + spaces + environment variables is a classic integration pitfall.
**How to avoid:** Agent body instructions must use quoted paths in PYTHONPATH. Since agents run from the project root, the relative `.claude/scripts/strategy` path has no spaces and works fine. Avoid absolute paths in PYTHONPATH.
**Warning signs:** `No module named 'D.'` or similar path-fragment errors.
[VERIFIED: project path confirmed to contain spaces]

### Pitfall 7: PE-Core Model Requires External sys.path
**What goes wrong:** `embed.py` hardcodes `sys.path.insert(0, "C:/Users/iorda/repos/perception_models")` to import the PE-Core model. If this directory doesn't exist or is moved, embedding fails.
**Why it happens:** PE-Core is not pip-installed -- it's a local repo imported via sys.path manipulation.
**How to avoid:** Verify `C:/Users/iorda/repos/perception_models` exists during smoke testing. This path is hardcoded in `embed.py` and cannot be changed (scripts stay unmodified per PROJECT.md constraint).
**Warning signs:** `ModuleNotFoundError: No module named 'core'` when running embed.py.
[VERIFIED: embed.py line 25: `_sys.path.insert(0, "C:/Users/iorda/repos/perception_models")`; import test passed]

## Code Examples

### Smoke Test Pattern (established in prior phases)
```javascript
// Source: tests/smoke-test-pipeline.js (verified in codebase)
const fs = require('fs');
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

const testCases = [];

testCases.push({
  name: 'scripts/strategy/channel_assistant_exists',
  check: () => fs.existsSync(path.join(projectRoot, '.claude', 'scripts', 'strategy', 'channel_assistant', 'cli.py'))
});

// Run all tests
let passed = 0;
const total = testCases.length;
for (const tc of testCases) {
  try {
    const ok = tc.check();
    console.log(ok ? 'PASS' : 'FAIL', tc.name);
    if (ok) passed++;
  } catch (e) {
    console.log('FAIL', tc.name);
    console.log('  Error:', e.message);
  }
}
console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
```

### Script Importability Check Pattern
```javascript
// Use child_process.execSync for Python import checks
const { execSync } = require('child_process');

testCases.push({
  name: 'strategy/module_importable',
  check: () => {
    try {
      execSync('python -c "import sys; sys.path.insert(0, \'.claude/scripts/strategy\'); import channel_assistant"', {
        cwd: projectRoot,
        timeout: 10000,
        stdio: 'pipe'
      });
      return true;
    } catch { return false; }
  }
});
```

### Agent Path Reference Pattern (after update)
```markdown
## Python Scripts

Run strategy commands via module invocation:
- `PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant add <url>`
- `PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant scrape`
- `PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant analyze`
- `PYTHONPATH=".claude/scripts/strategy" python -m channel_assistant topics`

Run scripts via the Bash tool. Store competitor data in `data/channel_assistant.db`.
```

### File Copy with Windows Path Safety
```javascript
// Node.js copy pattern for smoke test validation
const src = path.resolve('D:', 'Youtube', 'D. Mysteries Channel', '1.2 Agents', 
                         'Channel-Automation V5', '.pi', 'multi-team', 'scripts', 'strategy');
const dst = path.resolve(projectRoot, '.claude', 'scripts', 'strategy');
// Use fs.cpSync for recursive directory copy (Node 16+)
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `fs` + `child_process` (no test framework) |
| Config file | none -- direct script execution |
| Quick run command | `node tests/smoke-test-integration.js` |
| Full suite command | `node tests/smoke-test-paths.js && node tests/smoke-test-skills.js && node tests/smoke-test-agents.js && node tests/smoke-test-pipeline.js && node tests/smoke-test-feedback.js && node tests/smoke-test-integration.js` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-01 | Scripts exist at new paths, importable, `--help` works | smoke | `node tests/smoke-test-integration.js` | Wave 0 |
| INTG-02 | perception-models env available, torch+cuda imports, PE-Core importable | smoke | `node tests/smoke-test-integration.js` (GPU section) | Wave 0 |
| INTG-03 | SQLite databases exist, expected tables present, non-empty | smoke | `node tests/smoke-test-integration.js` (DB section) | Wave 0 |
| INTG-04 | D:/VideoLibrary/ directory exists, writable | smoke | `node tests/smoke-test-integration.js` (library section) | Wave 0 |
| INTG-05 | All agent paths updated, no stale references, no "not yet connected" caveats | smoke | `node tests/smoke-test-integration.js` (agent section) | Wave 0 |

### Sampling Rate
- **Per task commit:** `node tests/smoke-test-integration.js`
- **Per wave merge:** Full suite (all 6 smoke test files)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/smoke-test-integration.js` -- covers INTG-01 through INTG-05 (must be created)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python (system) | Strategy/editorial scripts | Yes | 3.13.11 | -- |
| Python (perception-models) | CLIP scripts | Yes | 3.12.13 | -- |
| PyTorch + CUDA | embed.py, search.py | Yes | 2.5.1+cu124 | -- |
| PE-Core model repo | embed.py | Yes | -- | -- |
| FFmpeg | ingest.py (frame extraction) | Yes | 6.0.1 | -- |
| yt-dlp | download.py | Yes | 2026.03.17 | -- |
| Node.js | Smoke tests | Yes | 24.13.0 | -- |
| SQLite | Databases | Yes | 3.51.0 | -- |
| internetarchive | ia_search.py | **No** | -- | Deferred (niche script per D-10) |
| D:/VideoLibrary/ | Asset Curator | **No** (does not exist) | -- | Created during phase |
| data/ directory | Databases | **No** (does not exist in V0.6) | -- | Created during phase |

**Missing dependencies with no fallback:**
- None blocking -- all critical-path dependencies are available

**Missing dependencies with fallback:**
- `internetarchive` package: deferred per D-10 (niche script)
- `D:/VideoLibrary/`: created as part of phase execution
- `data/` directory: created as part of phase execution

## Security Domain

No applicable security concerns for this phase. It involves copying files within the local filesystem, not exposing APIs, handling user input, or network operations. The Python scripts are unchanged and already battle-tested in V5.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Claude Code agents run Bash commands with `cwd` set to the project root | Architecture Patterns | HIGH -- all relative path references in scripts break if cwd is elsewhere |
| A2 | `strategy/competitors/competitors.json` is needed for strategy CLI to have pre-existing channel data | Pitfall 2 | LOW -- scrape command just finds 0 channels, not a crash |
| A3 | The `init` CLI subcommand was never implemented in V5 | Pitfall 5 | LOW -- agent body documentation is aspirational, not functional |

**A1 verification note:** This is the standard Claude Code behavior documented in their agent system. All prior phases have relied on this. Risk is very low in practice.

## Open Questions

1. **Should `strategy/competitors/competitors.json` be copied from V5?**
   - What we know: The strategy CLI reads this file for its channel registry. The SQLite database has the actual channel data (3 channels, 76 videos). The registry is a convenience file listing which channels to track.
   - What's unclear: Whether the user wants to preserve the V5 registry or start fresh.
   - Recommendation: Copy it. The data is small and preserves the operational state. If not needed, the user can delete it.

2. **Should we copy ALL media scripts (including niche ones) to preserve the import chain?**
   - What we know: `embed.py` imports from `pool.py` and `ingest.py`. `search.py` imports from `pool.py`. `discover.py` imports from `pool.py`. The import chain means even "niche" scripts like `pool.py` are hard dependencies of critical-path scripts.
   - What's unclear: Whether to cherry-pick only critical-path scripts or copy the entire directory.
   - Recommendation: Copy the entire `media/` directory. Cost is negligible (14 files). Import chain dependencies make cherry-picking fragile. Niche scripts are simply not validated, not excluded.

3. **Strategy agent body lists `strategy/cli.py init` -- how to handle?**
   - What we know: The `init` subcommand does not exist in the CLI. `project_init.py` provides library functions but is not wired as a CLI subcommand.
   - Recommendation: Remove `init` from the CLI subcommand list in the agent body. Note that `project_init.py` functions are available for direct import if needed.

## Sources

### Primary (HIGH confidence)
- V5 strategy script source: `D:\Youtube\D. Mysteries Channel\1.2 Agents\Channel-Automation V5\.pi\multi-team\scripts\strategy\channel_assistant\cli.py` -- invocation patterns, project root resolution, DB path, registry path
- V5 editorial scripts: `editorial/researcher/cli.py`, `editorial/writer/cli.py` -- PYTHONPATH requirements, module structure
- V5 media scripts: `embed.py`, `search.py`, `ingest.py`, `pool.py`, `download.py`, `evaluate.py` -- import chains, GPU requirements, dependency map
- V0.6 agent definitions: all 12 `.claude/agents/*.md` files -- current path references, caveats to remove
- V0.6 domain skills: `documentary-research`, `data-analysis`, `media-evaluation`, `archive-search`, `visual-narrative` SKILL.md files -- script path references
- V0.6 existing smoke tests: `tests/smoke-test-pipeline.js`, `tests/smoke-test-feedback.js` -- testCases pattern

### Secondary (MEDIUM confidence)
- conda env probe: `perception-models` environment verified via direct Python import tests
- SQLite database inspection: both databases verified via `sqlite3` schema and count queries
- Tool version checks: ffmpeg, yt-dlp, node, python all verified via command-line version flags

### Tertiary (LOW confidence)
- None -- all claims in this research verified against source code or runtime probes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all verified via runtime probes
- Architecture: HIGH -- all invocation patterns verified against V5 source code and tested
- Pitfalls: HIGH -- every pitfall discovered from source code inspection, not speculation
- Path mapping: HIGH -- all agent and skill files grepped for script references

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- no external dependencies that change)

# Roadmap

Future features and planned capabilities for the documentary production pipeline.

---

## Pipeline Parallelism

**Status:** Planned

Currently the pipeline is sequential and user-invoked per step. Future automation:

- After research completes, writer and visual-researcher could run in parallel
- After shotlist, asset-processor, asset-curator, compiler is a natural chain
- Vector generation (below) could run parallel with the asset pipeline

---

## Vector Silhouette Generation

**Status:** Not yet implemented

Generate flat silhouette vector compositions from shotlist briefs using ComfyUI.

- **Workflow:** generate then edit (max 2 sequential edits per base image)
- **Beat structure:** Beat 1 (base composition), Beat 2+ (edits for state changes)
- **Scope:** Vector/silhouette only. Realistic AI imagery violates channel constraints.
- **Output:** `projects/<name>/assets/vectors/` + generation log
- **GPU budget:** Must fit within RTX 4070 8GB VRAM alongside CLIP model
- **Edit model rules:** Name subjects directly, state what stays unchanged, max 2 edits to avoid artifact drift

---

## Pipeline Design & Maintenance

**Status:** Planned

Work items for keeping the pipeline coherent and preventing drift. Framework lives in the `pipeline-design` skill.

### Entry 1 — Pipeline audit rollout

Use the `pipeline-design` skill to audit each agent and each global skill one at a time. Do not bulk-audit — the skill's workflow is explicitly human-in-the-loop. Suggested order:
- @writer
- @visual-researcher
- @visual-planner
- @asset-processor
- @asset-curator
- @compiler
- @editorial-lead
- @style-extractor
- @strategy
- @code-reviewer

After each audit, append a line to `.claude/skills/pipeline-design/insights.md` with new anti-patterns discovered.

### Entry 2 — Strip duplicated `<project_context>` blocks from agent bodies

Every agent under `.claude/agents/` carries a 3-line `<project_context>` block at the top instructing the agent to read `./CLAUDE.md`. The `agent-protocols` skill (which all agents already load) issues the same instruction in its "Project Context" section. This is anti-pattern #6 (skill boilerplate replicated in agent bodies).

Affected files (10): `writer.md`, `compiler.md`, `asset-curator.md`, `asset-processor.md`, `visual-planner.md`, `code-reviewer.md`, `researcher.md`, `strategy.md`, `style-extractor.md`, `visual-researcher.md`.

Fix: in a single sweep, delete the `<project_context>...</project_context>` block (and its trailing blank line) from each agent body. Verify each agent's first non-frontmatter line becomes its `# <Agent Name>` heading or `## Identity` section. No procedural change — `agent-protocols` already covers the behavior.

### Entry 3 — Crawl4ai conda migration

The venv at `C:/Users/iorda/venvs/crawl4ai/` was created with `python -m venv` (per its `pyvenv.cfg`), not `conda create`. This violates the global CLAUDE.md rule ("Always use conda. Never use plain python -m venv."). Migrate:

1. `conda create -p C:/Users/iorda/miniconda3/envs/crawl4ai python=3.13 -y`
2. Activate the env; `pip install crawl4ai ddgs` (plus `playwright install` if crawl4ai needs the browser binary).
3. Validate: `C:/Users/iorda/miniconda3/envs/crawl4ai/python.exe -c "import crawl4ai; print(crawl4ai.__version__)"`.
4. Update the pinned interpreter path in:
   - `.claude/agents/researcher.md`
   - `_ARCHIVE/Channel-automation V4/.claude/skills/researcher/SKILL.md` (if V4 archive runnability matters)
5. Remove `C:/Users/iorda/venvs/crawl4ai/` after validation.
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

### Entry 2 — Crawl4ai conda migration

The venv at `C:/Users/iorda/venvs/crawl4ai/` was created with `python -m venv` (per its `pyvenv.cfg`), not `conda create`. This violates the global CLAUDE.md rule ("Always use conda. Never use plain python -m venv."). Migrate:

1. `conda create -p C:/Users/iorda/miniconda3/envs/crawl4ai python=3.13 -y`
2. Activate the env; `pip install crawl4ai ddgs` (plus `playwright install` if crawl4ai needs the browser binary).
3. Validate: `C:/Users/iorda/miniconda3/envs/crawl4ai/python.exe -c "import crawl4ai; print(crawl4ai.__version__)"`.
4. Update the pinned interpreter path in:
   - `.claude/agents/researcher.md`
   - `_ARCHIVE/Channel-automation V4/.claude/skills/researcher/SKILL.md` (if V4 archive runnability matters)
5. Remove `C:/Users/iorda/venvs/crawl4ai/` after validation.

### Entry 3 — Agent-observability: hooks not firing for subagent dispatches

Empirically confirmed (2026-04-17/18 session): both foreground and backgrounded `Agent`-tool dispatches fail to produce `.claude/logs/runs/` entries. Manual stdin-piped hook invocation works. Debug scope:
- Test CC's PreToolUse `Agent`-matcher support in the current version
- Test whether `async: true` on the dispatch hook is the problem
- Consider an alternative observability channel: each custom subagent writes a `_trace.json` at start and end of its run (contract-based, not hook-based)

### Entry 4 — Observability simplification

Current `.claude/hooks/obs.js` has:
- Pointer indirection (`.active/<agent_id>.ptr`)
- Schema versioning
- Per-run 100MB size cap with sidecar marker
- Orphan-tmp sweep routine
- Atomic-rewrite merge at SubagentStop

…but the hooks don't fire for real dispatches. The system is over-engineered for what it currently delivers. Proposed simpler v2:
- A single hook that appends to one JSONL per dispatch. No pointer, no merge, no `.active/`.
- Drop schema versioning until there's a breaking change.
- Drop size cap until runs actually exceed reasonable sizes.

If and when the hooks start firing reliably, re-evaluate whether the sophistication earns its keep.

### Entry 5 — Short-form design rules (portable context)

These rules emerged during the 2026-04-18 session and are seed context for any follow-up conversation on pipeline design:
- "Agents own their domain knowledge. Global skills are meta or shared."
- "Environment broken → stop. Process blocked → fall back."
- "Test pipeline agents on ≥2 maximally different topics before locking."
- "Tags like `[DETERMINISTIC]`/`[HEURISTIC]` are thinking patterns — don't leak them into agent outputs."
- Full framework: `.claude/skills/pipeline-design/SKILL.md`.

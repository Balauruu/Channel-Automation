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

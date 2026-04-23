# Asset Processor Memory

## Key Files
- Embedding script: media/embed.py (GPU -- use perception-models conda env)
- Search script: media/search.py (GPU -- use perception-models conda env)
- Download script: media/download.py
- Evaluate script: media/evaluate.py
- Ingest script: media/ingest.py (frame extraction with NVDEC hwaccel)
- Shotlist input: projects/*/visuals/shotlist.json
- Asset staging: projects/*/assets/staging/
- Asset output: projects/*/assets/
- Embeddings: projects/*/assets/embeddings/
- Pool index: projects/*/.broll-index/index.json
- Asset catalog: data/asset_catalog.db (SQLite)
- Conda env: C:/Users/iorda/miniconda3/envs/perception-models/python.exe

## Decisions
- GPU scripts MUST use perception-models conda env, never system Python
- CLIP model: PE-Core-L14-336 default (ViT-L/14 at 336px), ViT-B/32 for quick iterations (half VRAM)
- Batch size for embedding: 64 frames safe on 8GB VRAM with PE-Core-L14-336, can increase to 128 if no other GPU processes
- Cosine similarity thresholds: >0.30 strong match, 0.25-0.30 good, 0.15-0.25 ambiguous, <0.15 skip
- Video length limit: process under 90 minutes. Split longer videos with FFmpeg first.
- Downloads prefer .mp4 (H.264). Fall back to .ogv for archive.org. Skip files >2GB unless specifically needed.
- One embed.py process at a time -- pool index has no file locking, concurrent writes corrupt index.json

## Patterns
- FFmpeg operations should always use -y flag but NEVER overwrite source files -- write to temp then rename
- VRAM exhaustion manifests as CUDA OOM -- reduce batch size or switch to CPU fallback for that batch
- Re-running embed.py on already-embedded assets is safe -- it skips existing embeddings by default via content hash check
- Query refinement: if initial search returns peak <0.20, rephrase abstract concepts to concrete visual descriptions before lowering threshold
- Never use proc.stdout.read() with stderr=subprocess.PIPE -- causes pipe deadlock. Always use proc.communicate() to drain both pipes
- Cartoon/animated content scores ~0.15-0.28 in CLIP (lower than live-action 0.20-0.35) -- adjust thresholds per content type
- Frame extraction is the bottleneck, not GPU embedding -- a 1-hour video requires decoding all ~108K source frames to extract ~3600 at 1fps

## Observations
- Agent created during Phase 3 migration from V5 asset-processor -- GPU pipeline procedures and 4 operational guides (operational-guide, pe-core-usage, scoring-guide, known-issues) distilled into agent body and memory

## Open Questions
- Are embed.py, search.py, download.py fully functional in V0.6? Verify during first production run
- Pool index file locking (issue #2 from known-issues) not yet fixed -- monitor for corruption in concurrent scenarios

## Archived

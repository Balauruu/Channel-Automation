---
name: assets-embed
description: >-
  Generate CLIP embeddings for downloaded assets. Granular sub-command
  of /process-assets.
disable-model-invocation: true
---

# Assets Embed

Generate CLIP embeddings for semantic search capability.

## Instructions

1. Dispatch @asset-processor with the following task:

   "Generate CLIP embeddings for assets in `projects/$ARGUMENTS/assets/raw/`. Write embeddings index to `projects/$ARGUMENTS/assets/embeddings.json`."

2. Present a summary of embedding results (assets processed, embedding dimensions, index size).

---
name: assets-score
description: >-
  Score assets for relevance and quality. Granular sub-command
  of /process-assets.
disable-model-invocation: true
---

# Assets Score

Score and rank assets by relevance and quality.

## Instructions

1. Dispatch @asset-processor with the following task:

   "Score assets for project '$ARGUMENTS'. Read search results at `projects/$ARGUMENTS/assets/search_results.json`. Evaluate each asset on topical relevance, temporal relevance, and visual quality. Write scored manifest to `projects/$ARGUMENTS/assets/asset_manifest.json`."

2. Present scoring summary (total assets scored, quality distribution, top-ranked assets per shot).

---
name: assets-search
description: >-
  Run semantic search against shotlist requirements. Granular sub-command
  of /process-assets.
disable-model-invocation: true
---

# Assets Search

Match assets to shots using semantic similarity search.

## Instructions

1. Dispatch @asset-processor with the following task:

   "Run semantic search for project '$ARGUMENTS'. Read the shotlist at `projects/$ARGUMENTS/visuals/shotlist.json`. Read embeddings at `projects/$ARGUMENTS/assets/embeddings.json`. Match assets to shots by semantic similarity. Write search results to `projects/$ARGUMENTS/assets/search_results.json`."

2. Present search results summary (shots matched, average similarity scores, unmatched shots).

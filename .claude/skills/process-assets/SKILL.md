---
name: process-assets
description: >-
  Run the full asset processing pipeline: download, embed, search, and score
  assets. For individual operations, use /assets-download, /assets-embed,
  /assets-search, or /assets-score.
disable-model-invocation: true
---

# Process Assets Pipeline

Run the complete asset processing pipeline.

## Instructions

1. Verify `projects/$ARGUMENTS/visuals/shotlist.json` exists. If not, tell the user: "Shotlist not found. Run `/visual-plan $ARGUMENTS` first."

2. Dispatch @asset-processor with the following task:

   "Process assets for project '$ARGUMENTS'. Read the shotlist at `projects/$ARGUMENTS/visuals/shotlist.json`. For each shot:
   a) Download candidate assets to `projects/$ARGUMENTS/assets/raw/`.
   b) Generate CLIP embeddings for downloaded assets.
   c) Run semantic search against the shotlist requirements.
   d) Score each asset for relevance and quality.
   Write the asset manifest to `projects/$ARGUMENTS/assets/asset_manifest.json`."

3. **CHECKPOINT**: Present the processed assets to the user. Show asset count, quality distribution, coverage gaps.

4. **STOP HERE. Do not continue. Wait for the user to review and approve the assets.**

5. Guide the user: "Asset review complete. Run `/compile $ARGUMENTS` to generate the DaVinci Resolve edit sheet."

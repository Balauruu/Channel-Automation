---
name: visual-plan
description: >-
  Run the full visual planning pipeline: visual research then shotlist
  generation. Dispatches @visual-researcher followed by @visual-planner.
disable-model-invocation: true
---

# Visual Plan Pipeline

Run the complete visual planning pipeline with sequential two-agent chaining.

## Instructions

1. Verify `projects/$ARGUMENTS/script/Script.md` exists. If not, tell the user: "Script not found. Run `/write-script $ARGUMENTS` first."

2. Dispatch @visual-researcher with the following task:

   "Define visual intent and gather primary resources for project '$ARGUMENTS'. Read the script at `projects/$ARGUMENTS/script/Script.md`. Read the entity index at `projects/$ARGUMENTS/research/entity_index.json`. Write the visual brief to `projects/$ARGUMENTS/visuals/visual_brief.json`. Write media leads to `projects/$ARGUMENTS/visuals/media_leads.json`."

3. After @visual-researcher completes, dispatch @visual-planner with the following task:

   "Generate shotlist from visual brief for project '$ARGUMENTS'. Read the visual brief at `projects/$ARGUMENTS/visuals/visual_brief.json`. Read the media leads at `projects/$ARGUMENTS/visuals/media_leads.json`. Read the script at `projects/$ARGUMENTS/script/Script.md`. Write the shotlist to `projects/$ARGUMENTS/visuals/shotlist.json`."

4. Present a summary (shot count, asset categories, estimated b-roll needs).

5. Guide the user: "Visual planning complete. Run `/process-assets $ARGUMENTS` to download and process assets for these shots."

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

1. **Verification Gate: Script Completeness**

   Before dispatching visual research, verify the script stage is complete. Check each item in order -- if ANY check fails, STOP and show the failure message. Do not dispatch any agents.

   a. Check `projects/$ARGUMENTS/script/Script.md` exists.
      If not: "Script not found. Run `/write-script $ARGUMENTS` first."

   b. Check `projects/$ARGUMENTS/script/metadata.json` exists.
      If not: "Script metadata not found at `projects/$ARGUMENTS/script/metadata.json`. Re-run `/write-script $ARGUMENTS`."

   c. Check `projects/$ARGUMENTS/research/entity_index.json` exists.
      If not: "Entity index not found. Visual research needs entity context. Run `/research $ARGUMENTS` first."

   d. Read Script.md and verify it contains a `## Hook` heading.
      If not: "Script is missing the Hook section. The script may be incomplete."

   e. Read Script.md and count headings matching `## Chapter`. Verify there are at least 2.
      If not: "Script has fewer than 2 chapters. The script may be incomplete. Re-run `/write-script $ARGUMENTS`."

   f. Verify Script.md is at least 1000 words long (rough count).
      If not: "Script appears too short (under 1000 words). The script may be incomplete."

   If ALL checks pass, proceed to step 2.

2. Dispatch @visual-researcher with the following task:

   "Define visual intent and gather primary resources for project '$ARGUMENTS'. Read the script at `projects/$ARGUMENTS/script/Script.md`. Read the entity index at `projects/$ARGUMENTS/research/entity_index.json`. Write the visual brief to `projects/$ARGUMENTS/visuals/visual_brief.json`. Write media leads to `projects/$ARGUMENTS/visuals/media_leads.json`."

3. After @visual-researcher completes, dispatch @visual-planner with the following task:

   "Generate shotlist from visual brief for project '$ARGUMENTS'. Read the visual brief at `projects/$ARGUMENTS/visuals/visual_brief.json`. Read the media leads at `projects/$ARGUMENTS/visuals/media_leads.json`. Read the script at `projects/$ARGUMENTS/script/Script.md`. Write the shotlist to `projects/$ARGUMENTS/visuals/shotlist.json`."

4. Present a summary (shot count, asset categories, estimated b-roll needs).

5. Guide the user: "Visual planning complete. Run `/process-assets $ARGUMENTS` to download and process assets for these shots."
